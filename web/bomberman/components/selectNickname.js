import { Component, h } from "../../framework1/index.js";
import { INFO } from "../utils/playerStatus.js";
import { LIMITS } from "../utils/limits.js";

/** Keeps a stable node in the tree, so showing a message never reflows the box. */
function ErrorLine(message) {
  return h("span", { key: "nicknameError", class: "fieldError" }, [message || ""]);
}

export class SelectNickname extends Component {
  // Shown under the field. This used to only reach the console, so a rejected
  // nickname looked like a dead button.
  showError = (message) => {
    this.app.setState("nicknameError", message);
  };

  setNickname = async (nickname) => {
    if (typeof nickname !== "string" || nickname.trim() === "") {
      this.showError("Pick a nickname first.");
      return;
    }
    if (nickname.length > LIMITS.nickname) {
      this.showError(`Keep it to ${LIMITS.nickname} characters or fewer.`);
      return;
    }
    // Mirrors the server's isValidNickname(), which is otherwise the first
    // place a name with a space or an accent in it fails.
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      this.showError("Letters, numbers and _ only — no spaces.");
      return;
    }
    this.showError("");

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
      this.showError("Could not reach the server. Try again.");
    }
  };

  onUnmount() {
    this.app.setState("nicknameError", "");
  }

  render() {
    return h("div", { class: "container" }, [
      h("div", { class: "popup" }, [
        h("h1", { class: "title" }, ["Ready to Play? Pick a Nickname!"]),
        h(
          "input",
          {
            id: "nicknameInput",
            placeholder: "Enter your alias...",
            maxlength: LIMITS.nickname,
            onKeyUp: (e) => {
              if (e.key == "Enter") this.setNickname(e.target.value);
            },
          },
          []
        ),
        ErrorLine(this.app.getState("nicknameError")),
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
