import { Component, h } from "../../framework1/index.js";
import { StartGetRoom } from "../utils/playerStatus.js";
import { paste } from "../utils/copyPast.js";
import { ref, getRef } from "../utils/refs.js";

function Header() {
  return h("div", { key: "header", class: "header" }, [h("span", { class: "title" }, ["BomberMan"])]);
}

function JoinRandomRoom(app) {
  return h(
    "div",
    {
      key: "joinRandom",
      class: "joinRBtn",
      onClick: () => {
        StartGetRoom(app, "RR");
      },
    },
    ["Join Random Room"]
  );
}

function CreateRoom(app) {
  return h(
    "span",
    {
      key: "create",
      class: "createBtn",
      onClick: () => {
        StartGetRoom(app, "CR");
      },
    },
    ["Create Room"]
  );
}

function JoinRoom(app) {
  return h(
    "div",
    {
      key: "join",
      class: "joinBtn",
      onClick: () => {
        app.setState("isOpen", true);
      },
    },
    ["Join Room"]
  );
}

function JoinRoomPopUp(app) {
  if (!app.getState("isOpen")) {
    return null;
  }

  return h("div", { key: "popup", class: "container2" }, [
    h("div", { class: "popup2" }, [
      h(
        "span",
        {
          class: "x",
          onClick: () => {
            app.setState("isOpen", false);
          },
        },
        ["X"]
      ),
      h("h1", { class: "title2" }, ["Type the Room Hash to Jump In!"]),
      h("div", { class: "inpt" }, [
        h(
          "input",
          {
            ref: ref("JoinRInput"),
            onKeyUp: (e) => {
              if (e.key == "Enter") {
                StartGetRoom(app, "JR", getRef("JoinRInput").value);
              }
            },
            placeholder: "Paste your room code here",
          },
          []
        ),
        h(
          "span",
          {
            class: "paste",
            type: "text",
            onClick: async () => {
              // paste() resolves to undefined when the clipboard is refused;
              // concatenating that would put the string "undefined" in the box.
              getRef("JoinRInput").value += (await paste()) || "";
            },
          },
          ["paste"]
        ),
      ]),

      h(
        "button",
        {
          class: "joinBtn",
          onClick: () => {
            StartGetRoom(app, "JR", getRef("JoinRInput").value);
          },
        },
        ["Boom In 🔓"]
      ),
    ]),
  ]);
}

function instructions() {
  return h("div", { key: "instructions", class: "instructions-container" }, [
    h("h2", { class: "instructions-title" }, ["HOW TO PLAY"]),
    h("div", { class: "instructions-content" }, [
      h("div", { class: "instruction-group" }, [
        h("div", { class: "instruction-label" }, ["MOVEMENT:"]),
        h("div", { class: "key-container" }, [
          h("div", { class: "arrow-keys" }, [
            h("div", { class: "arrow-key up" }, ["↑"]),
            h("div", { class: "arrow-row" }, [
              h("div", { class: "arrow-key left" }, ["←"]),
              h("div", { class: "arrow-key down" }, ["↓"]),
              h("div", { class: "arrow-key right" }, ["→"]),
            ]),
          ]),
        ]),
      ]),
      h("div", { class: "instruction-group" }, [
        h("div", { class: "instruction-label" }, ["PLACE BOMB:"]),
        h("div", { class: "key-container" }, [
          h("div", { class: "action-key" }, [
            h("span", { class: "key-letter" }, ["X"]),
            h("span", { class: "bomb-icon" }, ["💣"]),
          ]),
        ]),
      ]),
      h("div", { class: "instruction-group abilities-group" }, [
        h("div", { class: "instruction-label" }, ["POWER-UPS:"]),
        h("div", { class: "abilities-container" }, [
          h("div", { class: "ability-item" }, [
            h("div", { class: "ability-icon bomb-ability" }, ["💣"]),
            h("div", { class: "ability-desc" }, ["Bombs: +1 bomb capacity"]),
          ]),
          h("div", { class: "ability-item" }, [
            h("div", { class: "ability-icon flame-ability" }, ["🔥"]),
            h("div", { class: "ability-desc" }, ["Flames: +1 explosion range"]),
          ]),
          h("div", { class: "ability-item" }, [
            h("div", { class: "ability-icon speed-ability" }, ["⚡"]),
            h("div", { class: "ability-desc" }, ["Speed: Faster movement"]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

export class Start extends Component {
  onUnmount() {
    // `isOpen` lives in the shared store, so an open popup would still be open
    // the next time this route is shown (after "Play Again", say).
    this.app.setState("isOpen", false);
  }
  render() {
    return h("div", { class: "startbox" }, [
      Header(),
      JoinRandomRoom(this.app),
      CreateRoom(this.app),
      JoinRoom(this.app),
      JoinRoomPopUp(this.app),
      instructions(),
    ]);
  }
}
