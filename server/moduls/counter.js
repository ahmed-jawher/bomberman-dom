import { io } from "../server.js";
import { Rooms } from "./room.js";
export async function start20Timer(roomUuid) {
  let currentRoom = Rooms[roomUuid];

  if (!currentRoom || currentRoom.Players.length < 2) {
    return;
  }

  let timer = 0;
  let id;
  function counter() {
    let currentRoom = Rooms[roomUuid];
    // The room can be deleted mid-countdown; without this the tick throws out
    // of the timer and the process exits.
    if (!currentRoom) return;

    timer++;
    io.to(roomUuid).emit("timer", { timer });
    if (currentRoom.Players.length == 4 || timer == 20) {
      clearTimeout(id);
      start10Timer(roomUuid);
      return;
    }
    setTimeout(counter, 1000);
  }

  id = setTimeout(counter, 1000);
}

async function start10Timer(roomUuid) {
  let timer = 10 + 1;
  let id;

  function counter() {
    const currentRoom = Rooms[roomUuid];
    if (!currentRoom) return;

    timer--;
    if (timer == 0) {
      clearTimeout(id);
      currentRoom.IsStart = true;
      currentRoom.AlivePlayers = currentRoom.Players.length
    }

    io.to(roomUuid).emit("timer", { timer });

    if (timer != 0) {
      setTimeout(counter, 1000);
    }
  }

  id = setTimeout(counter, 1000);
}
