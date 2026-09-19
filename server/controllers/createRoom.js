import { getPlayer, InsertPlayerToRoom, Players } from "../moduls/player.js";
import { AddPlayerToRoom } from "../moduls/room.js";
import { CreateRoom, Rooms } from "../moduls/room.js";
import { deepCopy } from "../service/deepClone.js";

function JoinRRoom(res, player) {

  let room = AddPlayerToRoom(player);
  InsertPlayerToRoom(player, room);
  Players[player.Uuid] = deepCopy(player)

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ room: room, nbr: player.Nbr }));
}

function CreateJoinRoom(res, player) {
  //prepare room
  let room = CreateRoom();
  room.IsCreated = true;
  room.Players.push(player);
  Rooms[room.Uuid] = room;

  InsertPlayerToRoom(player, room);

  Players[player.Uuid] = deepCopy(player)
  /* */
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ room: room, nbr: player.Nbr }));
}

function JoinRoom(res, player, roomUuid) {
  let room = Rooms[roomUuid];

  // A started room must not accept latecomers: pushing into Players while the
  // match runs adds a phantom player that the explosion checks can "kill",
  // which drops AlivePlayers and ends the running game early.
  // (Array.isArray also rejects the prototype object a "room=__proto__" query
  // would otherwise resolve to.)
  if (room && !room.IsStart && Array.isArray(room.Players) && room.Players.length < 4) {
    room.Players.push(player);
    InsertPlayerToRoom(player, room);
    Players[player.Uuid] = deepCopy(player)
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ room: room, nbr: player.Nbr }));
  } else {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Room is Full or Not Found !!" }));
  }
}

function createRoomrHandler(req, res) {
  const fullUrl = new URL(req.url, `http://${req.headers.host}`);
  const params = fullUrl.searchParams;
  const uuid = params.get("uuid");
  const type = params.get("type");
  const roomUuid = params.get("room");

  let player = getPlayer(uuid);
  if (player) {
    // Already seated somewhere: hand that seat back instead of a second one.
    // A uuid lives in localStorage, so every tab of the same browser is the
    // same player; seating it twice let one tab's death mark the account out
    // while its other seat was still alive, and the game ended in a false draw.
    const current = Rooms[player.JoinedRoom];
    const seat = current?.Players.findIndex((p) => p.Uuid === player.Uuid) ?? -1;
    if (seat !== -1) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ room: current, nbr: seat + 1 }));
      return;
    }

    switch (type) {
      case "RR":
        JoinRRoom(res, player);
        break;
      case "CR":
        CreateJoinRoom(res, player);
        break;
      case "JR":
        JoinRoom(res, player, roomUuid);
        break;
    }
  } else {
    res.statusCode = 400;
    res.end();
  }
}

export default createRoomrHandler;
