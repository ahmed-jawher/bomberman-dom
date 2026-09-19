import { io } from "../server.js";
import { Rooms } from "../moduls/room.js";
import { Players } from "../moduls/player.js";

/**
 * The scoreboard the result panel is built from: every player of the room with
 * the lives they finished on. Sent with the winning event so a client that has
 * already been knocked out still knows how the game ended.
 */
export function standingsOf(roomUuid) {
  return Rooms[roomUuid].Players.map((p, i) => ({
    playerNbr: i + 1,
    nickname: p.Nickname,
    uuid: p.Uuid,
    lives: Math.max(p.Lives, 0),
  }));
}

export function updateLife(playerNbr, roomUuid) {

  let player = Rooms[roomUuid].Players[playerNbr - 1];

  player.Lives--;
  if (player.Lives < 0) {
    return
  }
  if (player) {
    io.to(roomUuid).emit("lives", {
      playerNbr: playerNbr,
      lives: player.Lives,
      nickname: player.Nickname,
    });
  }

  if (player.Lives == 0) {
    Rooms[roomUuid].AlivePlayers--
    Players[player.Uuid].JoinedRoom = ''
  }

  // A result is announced once. Without this, a winner caught by a stray
  // blast before the room was cleaned up had the game "won" a second time.
  if (Rooms[roomUuid].Finished) return;

  if (Rooms[roomUuid].AlivePlayers <= 1) {
    Rooms[roomUuid].Finished = true;
    // The winner is the seat still standing. This used to ask whether the
    // *account* was still in the room, and one account could hold two seats
    // (two tabs of one browser): the first seat's death cleared the account,
    // so a survivor with full lives was left out and the game called a draw.
    let winnerPlayer = Rooms[roomUuid].Players.find((p) => p.Lives > 0);
    // Read before JoinedRoom is cleared: the standings are what the panel
    // shows, and they must not depend on the bookkeeping done just below.
    const standings = standingsOf(roomUuid);

    // The last players standing went up in the same blast. Returning here left
    // every client with a dead board and no result panel at all, so the game
    // is called as a draw instead.
    if (!winnerPlayer) {
      io.to(roomUuid).emit("lives", { win: true, draw: true, Uuid: null, standings });
      return;
    }
    Players[winnerPlayer.Uuid].JoinedRoom = ''
    io.to(roomUuid).emit("lives", {
      win: true,
      Uuid: winnerPlayer.Uuid,
      nickname: winnerPlayer.Nickname,
      standings,
    });
  }
}
