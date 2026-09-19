import { updateInput22 } from "../gameLoop/playerMovement.js";
import { INFO } from "../utils/playerStatus.js";
import { setBomb } from "../gameLoop/bomb.js";
import { StopGameLoop, StopPlayerInput } from "../gameLoop/playerMovement.js";
import { getRef } from "../utils/refs.js";

/**
 * How long the board stays on screen after a player is hit, before the result
 * panel replaces it. The bomb's fire animation runs for 1.2s and the body fades
 * out over 0.9s, so anything shorter would announce the death before the player
 * had seen what caused it.
 */
const RESULT_DELAY = 2200;

let resultTimer = null;

/** Paint a player as dead: the sprite fades out where it was standing. */
function markLoser(playerNbr) {
  getRef("player" + playerNbr.toString())?.classList.add("loser");
}

/**
 * Hand the game over to the result panel, but only once the blast has played
 * out. The panel then stays up until "Play Again" is clicked — nothing here
 * navigates or reloads on a timer any more.
 */
function showResultLater(app, isWin) {
  // The first result decided is the real one. A player eliminated by the same
  // explosion that ends the game gets a "lives" and a "win" event in the same
  // tick, and the later one only fills in the winner's name.
  if (resultTimer !== null) return;

  resultTimer = setTimeout(() => {
    resultTimer = null;
    StopGameLoop();
    if (INFO.socket) {
      INFO.socket.removeAllListeners();
      INFO.socket.disconnect();
      INFO.socket = undefined;
    }
    app.setState("isWin", isWin);
  }, RESULT_DELAY);
}

/** Cancel a pending result, so leaving the game cannot pop the panel later. */
export function clearPendingResult() {
  if (resultTimer !== null) {
    clearTimeout(resultTimer);
    resultTimer = null;
  }
}

export function startWebSocket(app, roomUuid) {
  console.log("START WEBSOCKET");

  const socket = io("/", {
    reconnection: false,
  });

  INFO.socket = socket;
  // Join a room
  socket.emit("join-room", roomUuid);

  const uuid = localStorage.getItem("uuid");
  socket.emit("notify", { room: roomUuid, message: { uuid: uuid } });

  socket.on("message", (msg) => {
    // The updater form matters: the store skips the notification when the new
    // value is the same reference, so pushing in place would never re-render.
    app.setState("messages", (messages) => [...(messages || []), msg]);

    let messagesBox = getRef("messagesBox");
    messagesBox?.scrollTo({
      top: messagesBox.scrollHeight,
      behavior: "smooth",
    });
  });

  socket.on("notify", (data) => {
    INFO.Players = data.Players;
    app.setState("Players", data.Players);
  });

  socket.on("moving", (moveInfo) => {
    updateInput22(moveInfo);
  });

  socket.on("bomb", (bombInfo) => {
    setBomb(bombInfo);
  });

  socket.on("map", (map) => {
    app.setState("map", map);
  });

  socket.on("timer", (timer) => {
    app.setState("timer", timer.timer);
    if (timer.timer == 0) {
      setTimeout(() => {
        app.router.navigate("/game");
      }, 1500);
    }
  });
  socket.on("explode", (data) => {
    app.setState("explosionCords", data);
  });

  socket.on("lives", (Info) => {
    if (Info.win == true) {
      const uuid = localStorage.getItem("uuid");
      // Recorded whoever won, for everyone: a player knocked out by the very
      // blast that ended the game is still here to read the panel, and the
      // first thing they ask is who took it.
      app.setState("winnerUuid", Info.Uuid);
      app.setState("isDraw", Info.draw === true);
      app.setState(
        "winnerName",
        Info.nickname ||
          INFO.Players?.find((p) => p.Uuid === Info.Uuid)?.Nickname ||
          ""
      );
      if (Info.standings) app.setState("standings", Info.standings);

      // Nobody can act any more, but the board keeps running until the panel.
      StopPlayerInput();
      showResultLater(app, uuid == Info.Uuid);
      return;
    }

    if (Info.lives <= 0) {
      markLoser(Info.playerNbr);
      if (INFO.playerNbr == Info.playerNbr) {
        StopPlayerInput();
        showResultLater(app, false);
      }
    }

    app.setState("live" + Info?.playerNbr.toString(), Math.max(Info.lives, 0));
  });
}

export function leaveRoom(socket, roomUuid) {
  socket.emit("leaveRoom", roomUuid);
}
