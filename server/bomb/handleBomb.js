import { Rooms } from "../moduls/room.js";
import { io } from "../server.js";
import { updateLife } from "./updateLives.js";
import { UpdateMap } from "../movement/board.js";
const bombTimer = 2500;

function handleBomb(roomUuid, bombInfo) {
  let currentRoom = Rooms[roomUuid];
  let x = currentRoom.playerPosition[bombInfo.playerNbr - 1].x;
  let y = currentRoom.playerPosition[bombInfo.playerNbr - 1].y;
  let player = currentRoom.Players[bombInfo.playerNbr - 1];

  Rooms[roomUuid].map[y][x] = 5;

  setTimeout(() => {
    // Nothing in here is wrapped by the socket handler's try/catch any more, so
    // a room that was torn down while this bomb was ticking would throw out of
    // the timer and take the whole process with it.
    if (!Rooms[roomUuid]) return;
    currentRoom.map[y][x] = 1;
    Explode(x, y, bombInfo.playerNbr, currentRoom.Uuid, bombInfo);
    UpdateMap(io, currentRoom.Uuid);
    player.numberbomb++;
  }, bombTimer);
}

export default handleBomb;

function Explode(x, y, playerNbr, roomUuid) {
  let currentRoom = Rooms[roomUuid];
  if (!currentRoom) return;
  let NumberOfPlayers = currentRoom.Players.length;
  let range = currentRoom.Players[playerNbr - 1].Range;

  isPlayerWallInExplosionRange(
    currentRoom.playerPosition,
    currentRoom.map,
    { x, y },
    range,
    roomUuid,
    NumberOfPlayers
  );
}

function getBiasedRandom() {
  const rand = Math.random(); // generates a number between 0 and 1

  if (rand < 0.2) {
    return 1;
  } else {
    const options = [6, 7, 8];
    let b = Math.floor(Math.random() * options.length);
    return options[b];
  }
}

function isPlayerWallInExplosionRange(
  Players,
  map,
  bomb,
  range,
  roomUuid,
  NumberOfPlayers
) {
  let explosionCords = [];
  // Victims are collected, not settled on the spot: updateLife() emits the
  // "lives" event, and emitting a death before the "explode" event below meant
  // the client tore the game down for the losing player before it had ever
  // drawn the blast that killed them.
  let victims = new Set();
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, -1],
    [0, 1],
  ];
  explosionCords.push({ x: bomb.x, y: bomb.y });

  // check bomb position
  checkPlayer(Players, bomb.x, bomb.y, NumberOfPlayers, victims);

  // check curren pos of bomb
  dirs.forEach(([dx, dy]) => {
    for (let i = 1; i <= range; i++) {
      let x = dx * i + bomb.x;
      let y = dy * i + bomb.y;
      const isBlock = map[y][x] == 2;
      // A block stops the blast, so only look for a victim on a tile the fire
      // actually reaches. Checking first meant players were killed through
      // walls, up to `range` tiles away.
      if (!isBlock) {
        checkPlayer(Players, x, y, NumberOfPlayers, victims);
      }
      if (map[y][x] != 0) {
        explosionCords.push({ x, y });

        // in case if there is a block
        if (isBlock) {
          map[y][x] = getBiasedRandom();
          // the block absorbs the explosion: nothing behind it is hit
          break;
        }
      } else {
        break;
      }
    }
  });

  io.to(roomUuid).emit("explode", explosionCords);

  // The fire is on its way to every client before anyone is told they died.
  victims.forEach((playerNbr) => updateLife(playerNbr, roomUuid));
}

function checkPlayer(players, x, y, NumberOfPlayers, victims) {
  for (let i = 0; i < NumberOfPlayers; i++) {
    const player = players[i];
    if (player.x === x && player.y === y) {
      victims.add(i + 1);
    }
  }
}
