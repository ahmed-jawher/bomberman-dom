import { io } from "../server.js";
import { Rooms, clearAvailableRoom } from "./room.js";
import { Players } from "./player.js";
import { standingsOf } from "../bomb/updateLives.js";

/**
 * A player leaves a room without being blown up: they closed the tab, or the
 * socket dropped.
 *
 * Mid-game the roster is never spliced. Every client has already baked its
 * 1-based `Nbr` into INFO.playerNbr, and the lives/moving/bomb payloads are all
 * indexed by it, so removing an element would silently re-point every later
 * player at someone else's position and lives. The player keeps their seat and
 * is marked absent instead — `JoinedRoom = ''`, the same marker updateLife()
 * already uses for an eliminated player and already understands when it looks
 * for a winner.
 */
/**
 * How long a dropped socket has to come back before the seat is given up.
 *
 * A page reload drops the socket exactly like closing the tab does, and the
 * game itself reloads on purpose when a match ends. Acting immediately would
 * evict players for pressing F5, so departures are only confirmed once nobody
 * has reclaimed the uuid.
 */
const LEAVE_GRACE_MS = 10000;

// uuid -> pending timer
const pending = new Map();

/** A socket announced this uuid: whatever drop was being counted is void. */
export function cancelPendingLeave(uuid) {
  const timer = pending.get(uuid);
  if (!timer) return;
  clearTimeout(timer);
  pending.delete(uuid);
}

/** Start the grace period. Call on disconnect. */
export function schedulePlayerLeave(uuid, knownRoomUuid) {
  if (typeof uuid !== "string" || pending.has(uuid)) return;

  const timer = setTimeout(() => {
    pending.delete(uuid);
    try {
      removePlayerFromRoom(uuid, knownRoomUuid);
    } catch (err) {
      // Nothing catches a throw from a timer: it would end the process.
      console.error("leave cleanup failed:", err);
    }
  }, LEAVE_GRACE_MS);

  // Do not hold the process open just for this.
  if (typeof timer.unref === "function") timer.unref();
  pending.set(uuid, timer);
}

export function removePlayerFromRoom(uuid, knownRoomUuid) {
  const player = Players[uuid];
  if (!player) return;

  // `knownRoomUuid` is the room the socket joined. It matters when the player
  // has already won: winning clears JoinedRoom, so on their own disconnect the
  // player record no longer points anywhere and the finished room would leak.
  const roomUuid = player.JoinedRoom || knownRoomUuid;
  const room = Rooms[roomUuid];

  // Mark them out first: this also makes a duplicate disconnect a no-op.
  player.JoinedRoom = "";
  if (!room) return;

  const seatIndex = player.Nbr - 1;
  const seat = room.Players[seatIndex];
  if (!seat || seat.Uuid !== uuid) return;

  // Already finished here (eliminated or won) — only the room may still need
  // clearing up once the last person is gone.
  if (room.IsStart && seat.Lives <= 0) {
    discardRoomIfEmpty(room, roomUuid);
    return;
  }

  if (room.IsStart) {
    leaveStartedGame(room, seat, roomUuid);
  } else {
    leaveLobby(room, seatIndex, roomUuid);
  }
}

/**
 * Mid-game: treat them as eliminated so the match can still end. Without this
 * AlivePlayers never reaches 1 and the survivors play on forever.
 */
function leaveStartedGame(room, seat, roomUuid) {
  if (seat.Lives > 0) {
    seat.Lives = 0;
    room.AlivePlayers--;
    io.to(roomUuid).emit("lives", { playerNbr: seat.Nbr, lives: 0 });
  }

  if (room.AlivePlayers > 1) return;

  if (room.Finished) {
    discardRoomIfEmpty(room, roomUuid);
    return;
  }

  // The seat still standing, as in updateLife(): asking whether the account
  // is still in the room gets it wrong when one account holds two seats.
  const winner = room.Players.find((p) => p.Lives > 0);
  if (winner) {
    room.Finished = true;
    // Taken before JoinedRoom is cleared, so the scoreboard is the state the
    // game actually ended in.
    const standings = standingsOf(roomUuid);
    Players[winner.Uuid].JoinedRoom = "";
    // Same payload as a win by explosion: the result panel names the winner
    // and lists the final lives however the game happened to end.
    io.to(roomUuid).emit("lives", {
      win: true,
      Uuid: winner.Uuid,
      nickname: winner.Nickname,
      standings,
    });
    return;
  }

  // Nobody left to play or to win.
  discardRoomIfEmpty(room, roomUuid);
}

/**
 * Drop a started room once every seat is empty. A player who won or was
 * eliminated has already had JoinedRoom cleared, so this is what finally
 * collects the room when the last of them closes their tab.
 */
function discardRoomIfEmpty(room, roomUuid) {
  const stillHere = room.Players.some((seat) => Players[seat.Uuid]?.JoinedRoom === roomUuid);
  if (stillHere) return;

  delete Rooms[roomUuid];
  clearAvailableRoom(roomUuid);
}

/**
 * Still in the lobby: here the seat CAN be reclaimed, because nobody is playing
 * yet and the "notify" below hands every remaining client the new roster. Their
 * Nbr is refreshed from it on the next /checker call.
 */
function leaveLobby(room, seatIndex, roomUuid) {
  room.Players.splice(seatIndex, 1);

  // Renumber the seats that shifted up.
  room.Players.forEach((seat, index) => {
    seat.Nbr = index + 1;
    if (Players[seat.Uuid]) Players[seat.Uuid].Nbr = index + 1;
  });
  room.NbrPlayes = room.Players.length;

  if (room.Players.length === 0) {
    delete Rooms[roomUuid];
    clearAvailableRoom(roomUuid);
    return;
  }

  io.to(roomUuid).emit("notify", { Players: room.Players });
}
