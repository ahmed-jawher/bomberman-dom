import { InputManager, playerPosition } from "./inputManager.js";
import { INFO } from "../utils/playerStatus.js";
import { getRef } from "../utils/refs.js";

let tileSize = 50;
let inputManager;
let id;
const framePerStep = 10;
const maxFrames = 4;

let PlayersMovement = [
  { r: false, l: false, t: false, b: false },
  { r: false, l: false, t: false, b: false },
  { r: false, l: false, t: false, b: false },
  { r: false, l: false, t: false, b: false },
];

// Only `y` is read: it is the row of the sprite sheet for that direction and
// never changes. The column is per-player, in frameIndex below — it used to be
// stored here, which made all four players share one animation phase.
export const playerDirection = {
  right: { x: 0, y: tileSize * 2 },
  left: { x: 0, y: tileSize },
  up: { x: 0, y: tileSize * 3 },
  down: { x: 0, y: 0 },
};

export let playerFacing = ["down", "down", "down", "down"];

// Animation state is per player: one shared counter was advanced once per
// *moving* player per frame, so the walk cycle ran N times too fast and only
// the last player to trip it actually got a new sprite frame.
let frameCount = [0, 0, 0, 0];
let frameIndex = [0, 0, 0, 0];

// 🔧 Named function for keydown so we can remove it later
function handleKeyDown(e) {
  if (e.key.toLowerCase() === "x") {
    if (!INFO.socket)return
    INFO.socket.emit("bomb", {
      room: INFO.roomUuid,
      bombInfo: {
        x: playerPosition[INFO.playerNbr - 1].x,
        y: playerPosition[INFO.playerNbr - 1].y,
        playerNbr: INFO.playerNbr,
      },
    });
  }
}

function updatePosition(players) {
  players.forEach(({ index, element }) => {
    element.style.transform = `translate(${playerPosition[index].x}px, ${playerPosition[index].y}px)`;
  });
}

function updateFacingPosition(players) {
  players.forEach(({ index, element }) => {
    const keys = PlayersMovement[index];

    // Determine facing direction
    if (keys.r) playerFacing[index] = "right";
    else if (keys.l) playerFacing[index] = "left";
    else if (keys.t) playerFacing[index] = "up";
    else if (keys.b) playerFacing[index] = "down";

    const isMoving = keys.r || keys.l || keys.t || keys.b;
    if (isMoving) {
      if (++frameCount[index] >= framePerStep) {
        frameCount[index] = 0;
        frameIndex[index] = (frameIndex[index] + 1) % maxFrames;
      }

      const dir = playerFacing[index];
      const x = frameIndex[index] * tileSize;
      element.style.backgroundPosition = `-${x}px -${playerDirection[dir].y}px`;
    }
  });
}

export function updateInput22(moveInfo) {
  // Not every "moving" broadcast is a move: the server's isValidMove() returns
  // `false` when the room is gone (it is deleted the instant a game ends) and
  // server.js relays that verbatim. Reading .keys off it threw a TypeError in
  // the socket handler on every one of the 10ms packets still in flight.
  if (!moveInfo || !moveInfo.keys || !moveInfo.position) return;

  const playerNbr = moveInfo.playerNbr - 1;
  if (playerNbr < 0 || playerNbr >= PlayersMovement.length) return;

  PlayersMovement[playerNbr] = moveInfo.keys;

  if (moveInfo.keys.r) playerFacing[playerNbr] = "right";
  else if (moveInfo.keys.l) playerFacing[playerNbr] = "left";
  else if (moveInfo.keys.t) playerFacing[playerNbr] = "up";
  else if (moveInfo.keys.b) playerFacing[playerNbr] = "down";

  if (
    moveInfo.keys.r ||
    moveInfo.keys.l ||
    moveInfo.keys.t ||
    moveInfo.keys.b
  ) {
    playerPosition[playerNbr].x = moveInfo.position.x;
    playerPosition[playerNbr].y = moveInfo.position.y;
  }
}

/* Movement, facing and sprite frames are module state, so a second game in the
   same page load would otherwise start with whatever the last one left behind
   (a player frozen mid-stride, still flagged as walking left). */
function resetAnimationState() {
  for (let i = 0; i < 4; i++) {
    PlayersMovement[i] = { r: false, l: false, t: false, b: false };
    playerFacing[i] = "down";
    frameCount[i] = 0;
    frameIndex[i] = 0;
  }
}

function setPlayerPosition(room) {
  for (let i = 0; i < 4; i++) {
    // The server's pixel position is the truth. It is only missing from a
    // room snapshot taken before it existed; fall back to the tile then.
    const px = room.pixelPosition?.[i];
    playerPosition[i].x = px ? px.x : room.playerPosition[i].x * tileSize;
    playerPosition[i].y = px ? px.y : room.playerPosition[i].y * tileSize;
  }
}

export async function StartGameLoop() {
  StopGameLoop();

  // Reachable by navigating back into a game that has already been left:
  // "Play Again" clears the room, so there is nothing to start.
  if (!INFO.room?.playerPosition || !INFO.Players?.length) return;

  inputManager = new InputManager();
  document.addEventListener("keydown", handleKeyDown);

  setPlayerPosition(INFO.room);
  resetAnimationState();

  let PLayers = [];
  const playerNbr = INFO.Players.length;

  for (let i = 1; i <= playerNbr; i++) {
    const element = getRef("player" + i);
    if (!element) continue;
    element.classList.remove("loser");
    // Carry the 0-based player index with the element. Indexing this array
    // positionally instead meant one missing ref shifted every later player
    // onto the previous player's position and key state.
    PLayers.push({ index: i - 1, element });
  }

  function gameLoop() {
    updatePosition(PLayers);
    updateFacingPosition(PLayers);
    id = requestAnimationFrame(gameLoop);
  }

  id = requestAnimationFrame(gameLoop);
}

/**
 * Take the controls away without stopping the loop. A player who has just been
 * caught in a blast must not be able to walk or drop bombs any more, but their
 * sprite — and everyone else's — has to keep animating while the fire burns and
 * the body fades out, which is exactly the couple of seconds StopGameLoop()
 * used to cut short.
 */
export function StopPlayerInput() {
  // Tearing the input down belongs here, not at the end of StartGameLoop:
  // now that removeEvents() actually removes the listeners, unbinding there
  // would kill the controls the moment the loop started.
  if (inputManager) {
    inputManager.removeEvents();
    inputManager = null;
  }

  document.removeEventListener("keydown", handleKeyDown);
}

export function StopGameLoop() {
  if (id) {
    cancelAnimationFrame(id);
    id = null;
  }

  StopPlayerInput();
}
