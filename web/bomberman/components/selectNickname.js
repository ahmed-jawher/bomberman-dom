import { Component, h } from "../../framework1/index.js";
import { INFO } from "../utils/playerStatus.js";

export class SelectNickname extends Component {
  // There is no error element in this popup, so the message goes to the
  // console. Without this method the calls below threw "showError is not a
  // function" and the rejection was swallowed by the async handler.
  showError = (message) => {
    console.error(message);
  };

  setNickname = async (nickname) => {
    if (
      typeof nickname !== "string" ||
      nickname.trim() === "" ||
      nickname.length > 50
    ) {
      this.showError("Invalid nickname. Please use 1–50 characters.");
      return;
    }

    try {
      const res = await fetch(`/login?nickname=${encodeURIComponent(nickname)}`);

      if (res.ok) {
        const data = await res.json();

        localStorage.setItem("uuid", data.uuid);

        INFO.nickname = nickname;

        this.navigate("/start");
      } else {
        const errorMsg = await res.text();
        this.showError(`Login failed: ${errorMsg || "Server error."}`);
      }
    } catch (err) {
      console.log(err);
    }
  };

  render() {
    return h("div", { class: "container" }, [
      h("div", { class: "popup" }, [
        h("h1", { class: "title" }, ["Ready to Play? Pick a Nickname!"]),
        h(
          "input",
          {
            id: "nicknameInput",
            placeholder: "Enter your alias...",
            onKeyUp: (e) => {
              if (e.key == "Enter") this.setNickname(e.target.value);
            },
          },
          []
        ),
        h(
          "button",
          {
            class: "btnNickname",
            onClick: () =>
              this.setNickname(document.getElementById("nicknameInput").value),
          },
          ["Let’s Go 🚀"]
        ),
      ]),
    ]);
  }
}
