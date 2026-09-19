import { board } from "./board.js";
import { Component, h } from "../../framework1/index.js";
import { StartGameLoop, StopGameLoop } from "../gameLoop/playerMovement.js";
import { clearPendingResult } from "../socket/startSocket.js";
import { INFO } from "../utils/playerStatus.js";

export class Game extends Component {
  onMount() {
    // Refs are flushed in a microtask once the tree is committed, so the game
    // loop has to wait a tick before it can look the player elements up.
    queueMicrotask(() => StartGameLoop());
  }
  onUnmount() {
    StopGameLoop();
    // A result scheduled by a blast that landed as the player was leaving must
    // not fire into the next screen.
    clearPendingResult();
    if (INFO.socket) {
      INFO.socket.disconnect();
      INFO.socket = undefined;
    }
    this.app.setState("isWin", undefined);
    this.app.setState("winnerName", undefined);
    this.app.setState("winnerUuid", undefined);
    this.app.setState("standings", undefined);
    this.app.setState("isDraw", undefined);
    this.app.setState("live1", 3);
    this.app.setState("live2", 3);
    this.app.setState("live3", 3);
    this.app.setState("live4", 3);
  }
  render() {
    return h("div", { class: "game" }, [
      GameSideBar(this.app),
      board(this.app),
      GameStatus(this.app),
    ]);
  }
}

/**
 * The end-of-game panel. It is deliberately the only way out of a finished
 * game: nothing behind it navigates or reloads on a timer, so the result stays
 * on screen for as long as it takes to read it.
 */
function GameStatus(app) {
  let isWin = app.getState("isWin");
  if (isWin == undefined) {
    return null;
  }

  const winnerName = app.getState("winnerName");
  const winnerUuid = app.getState("winnerUuid");
  const isDraw = app.getState("isDraw") === true;
  const message = isDraw ? "DRAW" : isWin == true ? "YOU WIN !!!" : "GAME OVER";

  // Prefer the scoreboard the server sent with the winning event; fall back to
  // the lives tracked locally, which is all a player eliminated mid-game has.
  const standings =
    app.getState("standings") ||
    (app.getState("Players") || []).map((p, i) => ({
      playerNbr: i + 1,
      nickname: p.Nickname,
      uuid: p.Uuid,
      lives: app.getState("live" + (i + 1).toString()) ?? 0,
    }));

  const rows = standings.map((p) => {
    const isWinner = winnerUuid ? p.uuid === winnerUuid : false;
    const isMe = p.playerNbr === INFO.playerNbr;
    const status = isWinner ? "WINNER" : p.lives <= 0 ? "OUT" : p.lives + " ♥";

    let rowClass = "resultRow";
    if (isWinner) rowClass += " resultRow--winner";
    else if (p.lives <= 0) rowClass += " resultRow--out";
    if (isMe) rowClass += " resultRow--me";

    return h("li", { key: "res" + p.playerNbr, class: rowClass }, [
      h("span", { class: "resultRank" }, [isWinner ? "🏆" : "P" + p.playerNbr]),
      h("span", { class: "resultName" }, [p.nickname + (isMe ? " (you)" : "")]),
      h("span", { class: "resultStatus" }, [status]),
    ]);
  });

  return h("div", { key: "status", class: "win" }, [
    h("div", { class: "winPopUp" }, [
      h("span", { class: "winMessage" }, [message]),
      h("div", { class: "resultWinner" }, [
        isDraw
          ? "Nobody made it out — the last players went together."
          : winnerName
          ? "Winner: " + winnerName
          : "Game still running without you",
      ]),
      h("ul", { class: "resultList" }, rows),
      h(
        "div",
        {
          class: "backToHome",
          onClick: () => {
            INFO.Players = [];
            INFO.room = "";
            INFO.roomUuid = "";
            INFO.playerNbr = -1;
            // A full reload is the reliable reset here: the server has already
            // cleared this player's room, so the startup check lands them back
            // on /start with nothing left over from the finished game.
            location.reload();
          },
        },
        ["Play Again"]
      ),
    ]),
  ]);
}

function GameSideBar(app) {
  let PlayersVDom = [];

  let Players = app.getState("Players");

  Players?.forEach((p, i) => {
    let live = app.getState("live" + (i + 1).toString());
    PlayersVDom.push(
      h("li", { key: "p" + i, class: "player_holder" }, [
        p.Nickname,
        h("span", { class: "lives" }, [String(live)]),
      ])
    );
  });

  return h("div", { key: "sidebar", class: "sidebar" }, [
    h("div", { class: "title" }, [
      "players",
      h("div", { class: "players_holders" }, [
        h("ul", { class: "players_list_holder" }, PlayersVDom),
      ]),
    ]),
  ]);
}
