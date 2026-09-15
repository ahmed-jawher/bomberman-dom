import http from "http";
import routing from "./routes/Routes.js";
import { Server } from "socket.io";
import handleBomb from "./bomb/handleBomb.js";

import { Rooms } from "./moduls/room.js";

const PORT = 3000;

const server = http.createServer((req, res) => {
  // routing() builds a URL from the Host header, which a client controls. A
  // malformed one ("Host: [") makes `new URL` throw straight out of this
  // callback, which Node turns into an uncaught exception and exits on.
  try {
    routing(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.statusCode = 400;
    }
    res.end();
  }
});

async function deleteRoom(io, roomName) {
  try {
    const sockets = await io.in(roomName).fetchSockets();

    for (const socket of sockets) {
      socket.leave(roomName);
    }

    console.log(`Room "${roomName}" has been deleted.`);
  } catch (err) {
    console.error(`Failed to delete room "${roomName}":`, err);
  }
}

export const io = new Server(server);
import { isValidMove } from "./movement/playerMoving.js";
import { UpdateMap } from "./movement/board.js";
import {
  removePlayerFromRoom,
  schedulePlayerLeave,
  cancelPendingLeave,
} from "./moduls/leave.js";

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on("join-room", (room) => {
    socket.join(room);
  });

  // The client announces which player it is as soon as it connects. That is
  // the only thing tying a socket to a uuid, and without it a dropped
  // connection could not be attributed to anyone — so the roster kept players
  // who had closed the tab, and a game with such a ghost could never end.
  socket.on("notify", ({ room, message } = {}) => {
    const uuid = message && message.uuid;
    if (typeof uuid !== "string") return;
    socket.data.playerUuid = uuid;
    // Remembered separately: winning clears the player's own JoinedRoom, so
    // this is the only way to still identify the room on their disconnect.
    if (typeof room === "string") socket.data.roomUuid = room;
    // They are back (a reload, or a flaky connection): call off the eviction.
    cancelPendingLeave(uuid);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    // Not acted on immediately: a reload looks identical to a departure, and
    // the game reloads itself when a match ends.
    schedulePlayerLeave(socket.data.playerUuid, socket.data.roomUuid);
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    // Leaving deliberately frees the seat exactly like dropping the connection
    // does; previously it only left the socket.io room and the player stayed on
    // the roster.
    try {
      if (socket.data.playerUuid) {
        removePlayerFromRoom(socket.data.playerUuid, room);
      }
    } catch (err) {
      console.error("leaveRoom cleanup failed:", err);
    }
    console.log(`${socket.id} left room ${room}`);
  });

  // Listen for message and broadcast to the room
socket.on("send-message", ({ room, message } = {}) => {
  try {
    // Emit the message to the specified room
    io.to(room).emit("message", message);
  } catch (err) {
    console.error(err);
  }
});

  // listen for palyers moving
  socket.on("moving", ({ room, moveInfo } = {}) => {
    
    // console.log("3333333333",room, moveInfo);
    try {
    moveInfo = isValidMove(room, moveInfo);
    // isValidMove returns false for an unknown room or a bad payload; that
    // false used to be broadcast as a "moving" event and blew up every client
    // in the room on moveInfo.playerNbr.
    if (!moveInfo) return;
    //notify all
    io.to(room).emit("moving", moveInfo);
    }catch(err) {
      console.log(err)
    }

  });

  socket.on("bomb", ({ room, bombInfo } = {}) => {
    
    try {
    let currentRoom = Rooms[room];
    if (!currentRoom || !bombInfo) return;

    // Tear the room down BEFORE arming anything. This used to run after
    // handleBomb, so the last bomb of a finished game was scheduled and the
    // room deleted in the same tick; 2.5s later the timer exploded against a
    // missing room and threw out of an async boundary, killing the process.
    if (currentRoom.AlivePlayers <= 1) {
      delete Rooms[room]
      deleteRoom(io, room)
      return;
    }

    let player = currentRoom.Players[bombInfo.playerNbr - 1];
    if (!player) return;
    if (player.numberbomb > 0) {
      player.numberbomb--;

      handleBomb(room, bombInfo, socket);
      UpdateMap(io, room);
      io.to(room).emit("bomb", bombInfo);
    }
    }catch(err) {
      console.log(err)
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
