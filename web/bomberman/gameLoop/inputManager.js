import { INFO } from "../utils/playerStatus.js";
let tileSize = 50;

export var playerPosition = [
  { x: 1 * tileSize, y: 1 * tileSize },
  { x: 15 * tileSize, y: 1 * tileSize },
  { x: 1 * tileSize, y: 13 * tileSize },
  { x: 15 * tileSize, y: 13 * tileSize },
];

export class InputManager {
  constructor() {
    this.Keys = new Set();
    this.AllowedKeys = {
      ArrowRight: "r",
      ArrowLeft: "l",
      ArrowUp: "t",
      ArrowDown: "b",
    };
    this.moveInterval = null;
    this.#initEvents();
  }

  #initEvents() {
    document.addEventListener("keydown", this.#handleKeyDown);
    document.addEventListener("keyup", this.#handleKeyUp);
  }

  removeEvents() {
    // The handlers are instance arrow-function fields, so these are the very
    // same references #initEvents registered. It used to pass boundKeyDown /
    // boundKeyUp, which are never assigned, so nothing was ever removed.
    document.removeEventListener("keydown", this.#handleKeyDown);
    document.removeEventListener("keyup", this.#handleKeyUp);
    this.#stopMoving(); // Optional: also stop any ongoing movement
  }
  isSetEmpty() {
    return this.Keys.size === 0;
  }

  getLastOfSet() {
    if (this.Keys.size === 0) return null;
    let last = null;
    for (const item of this.Keys) {
      last = item;
    }
    return last;
  }

  deleteKey(key) {
    return this.Keys.delete(key);
  }

  moveToLastOfSet(item) {
    this.Keys.delete(item);
    this.Keys.add(item);
  }

  #startMoving() {
    if (this.moveInterval) return;

    this.moveInterval = setInterval(() => {
      const newKeys = { r: false, l: false, t: false, b: false };
      const lastKey = this.getLastOfSet();
      if (lastKey) {
        newKeys[lastKey] = true;
      }

      sendToServer(newKeys, {
        x: playerPosition[INFO.playerNbr - 1].x,
        y: playerPosition[INFO.playerNbr - 1].y,
      });
    }, 10); // ~60fps
  }

  #stopMoving() {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }

  #handleKeyDown = (e) => {
    const key = this.AllowedKeys[e.key];
    if (!key) return;

    this.moveToLastOfSet(key);
    this.#startMoving();
  };

  #handleKeyUp = (e) => {
    const key = this.AllowedKeys[e.key];
    if (!key) return;

    this.deleteKey(key);

    if (this.isSetEmpty()) {
      this.#stopMoving();

      sendToServer(
        { r: false, l: false, t: false, b: false },
        {
          x: playerPosition[INFO.playerNbr - 1].x,
          y: playerPosition[INFO.playerNbr - 1].y,
        }
      );
    }
  };
}

function sendToServer(newKeys, position) {
  if (!INFO.socket) return
  INFO.socket.emit("moving", {
    room: INFO.roomUuid,
    moveInfo: {
      keys: newKeys,
      playerNbr: INFO.playerNbr,
      position: position,
    },
  });
}
