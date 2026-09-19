import { Component, h } from "../../framework1/index.js";
import { copy } from "../utils/copyPast.js";
import { getCurrentTime } from "../utils/helpers.js";
import { startWebSocket } from "../socket/startSocket.js";
import { INFO } from "../utils/playerStatus.js";
import { ref, getRef } from "../utils/refs.js";
import { LIMITS } from "../utils/limits.js";

function HeaderChat(players) {
  let PlayersVDom = [];

  players?.forEach((p, i) => {
    const name = (i + 1).toString() + "-" + p.Nickname;
    PlayersVDom.push(h("span", { key: "p" + i }, [name]));
  });
  return h("div", { key: "topBar", class: "topBar" }, PlayersVDom);
}

function Message(nickname, contnet, time) {
  return h("div", { class: "message" }, [
    h("span", { class: "nickname" }, [nickname]),
    h("span", { class: "text" }, [contnet]),
    h("span", { class: "time" }, [time]),
  ]);
}

function MessagePart(messages) {
  let AllMessages = [];
  messages?.forEach((msg) => {
    AllMessages.push(
      Message(msg.sender || "none", msg.content || "none", getCurrentTime())
    );
  });
  return h(
    "div",
    { key: "messages", ref: ref("messagesBox"), class: "messagesBox" },
    AllMessages
  );
}

function SendMessage(message) {
  if (message == "" || message.length > LIMITS.message) {
    return;
  }

  let socket = INFO.socket;

  let msg = {
    sender: INFO.nickname,
    content: message,
  };

  socket.emit("send-message", {
    room: INFO.roomUuid,
    message: msg,
  });
}

function InputPart() {
  return h("div", { key: "inputBar", class: "inputBar" }, [
    h("input", {
      ref: ref("inputMessages"),
      placeholder: "Type a message...",
      id: "chatInput",
      maxlength: LIMITS.message,
      onKeyUp: (e) => {
        if (e.key == "Enter") {
          SendMessage(e.target.value);
          e.target.value = "";
        }
      },
    }),
    h(
      "button",
      {
        id: "sendBtn",
        onClick: () => {
          // Read the ref when the button is clicked, not when it is rendered:
          // on the first render the input does not exist yet.
          const input = getRef("inputMessages");
          if (!input) return;
          SendMessage(input.value);
          input.value = "";
        },
      },
      ["Send 💬"]
    ),
  ]);
}

function Header(app) {
  let copyBtn = h("span", { key: "room", class: "room" }, ["general room"]);
  if (INFO.room?.IsCreated) {
    copyBtn = h(
      "button",
      {
        key: "room",
        class: "copybtn",
        onClick: () => {
          copy(INFO.room.Uuid);
        },
      },
      ["Copy Hash"]
    );
  }

  return h("div", { key: "roomHeader", class: "roomHeader" }, [
    h("span", { key: "timer", class: "timer" }, [String(app.getState("timer"))]),
    copyBtn,
  ]);
}

export class Chat extends Component {
  onMount() {
    if (!INFO.socket) {
      startWebSocket(this.app, INFO.roomUuid);
    }
  }
  onUnmount() {
    this.app.setState("messages", []);
  }
  render() {
    return h("div", { class: "chatContainer" }, [
      Header(this.app),
      HeaderChat(this.app.getState("Players")),
      MessagePart(this.app.getState("messages")),
      InputPart(),
    ]);
  }
}
