import { generateUUID } from "../service/uuid.js";
import { prepereBaord } from "../movement/board.js";

const TILE_SIZE = 50;

export class Room {
  constructor(uuid, Map) {
    this.Uuid = uuid;
    // index  => player
    this.Players = [];
    this.NbrPlayes = this.Players.length;
    this.MaxPlayers = 4;
    this.CreatedAt = new Date();
    this.IsStart = false;
    this.TimerStarted = false;
    this.IsCreated = false;
    this.AlivePlayers = 4
    this.map = Map;
    this.playerPosition = [
      { x: 1, y: 1 }, // player 1
      { x: 15, y: 1 }, // player 2
      { x: 1, y: 13 }, // player 3
      { x: 15, y: 13 }, // player 4
    ];
    // Where each sprite actually is, in pixels. The server owns this: moving
    // from a position the client sends back meant a step could only be taken
    // once the previous one had made the round trip, so a player on a slow
    // link (a forwarded port, another country) crawled at 1px per ping.
    this.pixelPosition = this.playerPosition.map(({ x, y }) => ({
      x: x * TILE_SIZE,
      y: y * TILE_SIZE,
    }));
  }
}

export var Rooms = {};

export var AvailableRoom;

/**
 * Forget the lobby everyone just left. Without this AvailableRoom still points
 * at a deleted room, and the next random joiner is seated into a room that is
 * no longer in Rooms — they wait in a lobby nobody can ever join.
 */
export function clearAvailableRoom(roomUuid) {
  if (AvailableRoom && AvailableRoom.Uuid === roomUuid) {
    AvailableRoom = undefined;
  }
}

export function CreateRoom() {
  const uuid = generateUUID();
  return new Room(uuid, prepereBaord(4));
}

function PrepereRoom() {
  if (!AvailableRoom || AvailableRoom.NbrPlayes == 4 || AvailableRoom.IsStart) {
    AvailableRoom = CreateRoom();
    Rooms[AvailableRoom.Uuid] = AvailableRoom;
  }
}

export function AddPlayerToRoom(player) {
  PrepereRoom();
  player.JoinedRoom = AvailableRoom.Uuid;
  AvailableRoom.Players.push(player);
  player.Nbr = AvailableRoom.Players.length;
  // NbrPlayes and the countdown are handled by InsertPlayerToRoom, which every
  // join path calls right after this one.
  return AvailableRoom;
}
