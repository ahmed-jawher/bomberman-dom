import { io } from "../server.js";
import { Rooms } from "./room.js";

/**
 * Seconds on the clock once a room has enough players to start.
 *
 * One countdown, not two: the lobby used to count *up* to 20 and then restart
 * as a separate 10-second countdown, which read as a stuck clock followed by a
 * second, unexplained one.
 */
const COUNTDOWN_SECONDS = 20;

export async function start20Timer(roomUuid) {
  let currentRoom = Rooms[roomUuid];

  if (!currentRoom || currentRoom.Players.length < 2) {
    return;
  }

  let timer = COUNTDOWN_SECONDS;
  // Kept on the room so a player who joins mid-countdown can be handed the
  // clock as it stands, instead of showing 0 until the next tick.
  currentRoom.Countdown = timer;
  io.to(roomUuid).emit("timer", { timer });

  function tick() {
    const room = Rooms[roomUuid];
    // The room can be deleted mid-countdown; without this the tick throws out
    // of the timer and the process exits.
    if (!room) return;

    // Everyone else left the lobby while the clock ran. Starting here would
    // begin a one-player game with AlivePlayers already at 1 — nobody can ever
    // be declared the winner, and the first bomb tears the room down, which
    // freezes the board with no result on screen. Hold the clock instead and
    // let the next arrival start a fresh one.
    if (room.Players.length < 2) {
      room.TimerStarted = false;
      room.Countdown = undefined;
      io.to(roomUuid).emit("timer", { timer: "--" });
      return;
    }

    timer--;
    if (timer == 0) {
      room.IsStart = true;
      room.AlivePlayers = room.Players.length;
    }

    room.Countdown = timer;
    io.to(roomUuid).emit("timer", { timer });

    if (timer > 0) {
      setTimeout(tick, 1000);
    }
  }

  setTimeout(tick, 1000);
}
