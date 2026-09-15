import { board } from "./board.js";
import { Component, h } from "../../framework1/index.js";
import { StartGameLoop, StopGameLoop } from "../gameLoop/playerMovement.js";
import { INFO } from "../utils/playerStatus.js";

export class Game extends Component {
  onMount() {
    // Refs are flushed in a microtask once the tree is committed, so the game
    // loop has to wait a tick before it can look the player elements up.
    queueMicrotask(() => StartGameLoop());
  }
  onUnmount() {
    StopGameLoop();
    if (INFO.socket) {
      INFO.socket.disconnect();
      INFO.socket = undefined;
    }
    this.app.setState("isWin", undefined);
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

function GameStatus(app) {
  let isWin = app.getState("isWin");
  if (isWin == undefined) {
    return null;
  }

  let message = "YOU LOSE !!!";
  if (isWin == true) {
    message = "YOU WIN ???";
  }
  return h("div", { key: "status", class: "win" }, [
    h("div", { class: "winPopUp" }, [
      h("span", { class: "winMessage" }, [message]),
      h(
        "div",
        {
          class: "backToHome",
          onClick: () => {
            INFO.Players = [];
            INFO.room = "";
            INFO.roomUuid = "";
            INFO.playerNbr = -1;
            app.router.navigate("/start");
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
