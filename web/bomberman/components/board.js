import { h } from "../../framework1/index.js";
import { ref } from "../utils/refs.js";

function Player(nbr) {
  return h(
    "div",
    {
      key: "player" + nbr.toString(),
      id: "player" + nbr.toString(),
      class: "player",
      ref: ref("player" + nbr.toString()),
    },
    []
  );
}

function checkIfInexplosionRange(app, y, x) {
  let explosionCords = app.getState("explosionCords");
  if (explosionCords) {
    for (let i = 0; i < explosionCords?.length; i++) {
      let pos = explosionCords[i];
      if (pos.x == x && pos.y == y) {
        return true;
      }
    }
  }
  return false;
}

export function board(app) {
  let boardTile = app.getState("map");

  if (!boardTile) return null;

  let tiles = [];

  for (let i = 0; i < boardTile.length; i++) {
    for (let j = 0; j < boardTile[i].length; j++) {
      tiles.push(chooseItems(app, boardTile[i][j], i, j));
    }
  }
  let playerNbr = app.getState("Players")?.length || 0;

  if (playerNbr > 0) {
    tiles.push(chooseItems(app, 11));
  }
  if (playerNbr > 1) {
    tiles.push(chooseItems(app, 22));
  }
  if (playerNbr > 2) {
    tiles.push(chooseItems(app, 33));
  }
  if (playerNbr > 3) {
    tiles.push(chooseItems(app, 44));
  }
  if (
    app.getState("explosionCords") &&
    app.getState("explosionCords").length > 0
  ) {
    setTimeout(() => {
      app.setState("explosionCords", []);
    }, 1200);
  }

  return h("div", { key: "board", class: "grid" }, tiles);
}

function chooseItems(app, cell, y, x) {
  // Keys keep every tile — and above all the four player elements the game
  // loop moves imperatively — bound to the same DOM node across re-renders.
  const key = y + "-" + x;
  let tile = null;
  switch (cell) {
    case 0:
      tile = h("div", { key, class: "tile wall" }, []);
      break;
    case 1:
      tile = h("div", { key, class: "tile" }, []);
      break;
    case 2:
      tile = h("div", { key, class: "tile wall2" }, []);
      break;
    case 11:
    case 22:
    case 33:
    case 44:
      return Player(cell / 11);
    case 5:
      tile = h("div", { key, class: "tile bomb" }, []);
      break;
    case 6:
      tile = h("div", { key, class: "tile Power Speed" }, []);
      break;
    case 7:
      tile = h("div", { key, class: "tile Power Flame" }, []);
      break;
    case 8:
      tile = h("div", { key, class: "tile Power Bomb" }, []);
      break;
  }
  if (checkIfInexplosionRange(app, y, x) == true) {
    if (tile) {
      tile.attrs["class"] = tile.attrs["class"] + " fire";
    }
  }

  return tile;
}
