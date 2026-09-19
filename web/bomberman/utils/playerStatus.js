export let INFO = {
  roomUuid: undefined,
  room: undefined,
  nickname: undefined,
  Players: undefined,
  playerNbr: -1,
  socket: undefined,
};
import { startWebSocket } from "../socket/startSocket.js";

/*
---player status when page load
  
            redirect    
 1-no login    =>      "/"

 2-no room     =>      "/start"

 3-room        =>      "/chat" 

 4-room start  =>      "/game"

*/

/**
 * Point the URL at a route before the app has started. `replaceState` does not
 * fire `hashchange`, and the router reads `location.hash` when it starts, so
 * this lands on the right route with no extra history entry.
 */
function redirectTo(path) {
  history.replaceState({}, "", `/#${path}`);
}

export async function playerStatus(res, app) {
  if (res.status !== 200) {
    // Redirect to login page if status is not 200
    localStorage.removeItem("uuid");
    redirectTo("/");
  } else {
    const data = await res.json();

    INFO.nickname = data.player.Nickname;

    if (data.room) {
      INFO.room = data.room;
      INFO.roomUuid = data.room.Uuid;
      INFO.Players = data.room.Players;
      INFO.playerNbr = data.nbr;

      INFO.Players.forEach((player, index) => {
        app.setState("live" + (index + 1).toString(), player.Lives);
      });
      app.setState("map", data.room.map);
      app.setState("Players", data.room.Players);
    }

    if (data.player.JoinedRoom != "") {
      if (data.room.IsStart == true) {
        startWebSocket(app, INFO.roomUuid);
        redirectTo("/game");
      } else {
        redirectTo("/chat");
      }
    } else {
      redirectTo("/start");
    }
  }
}

export async function checkIfLogin(app) {
  const uuid = localStorage.getItem("uuid");

  // Make sure we have a UUID stored
  if (!uuid) {
    redirectTo("/");
    return;
  }

  try {
    const res = await fetch(`/checker?uuid=${uuid}`);

    await playerStatus(res, app);
  } catch (err) {
    console.error("Error checking login:", err);
    // Optionally, redirect or show an error page
    redirectTo("/");
  }
}

/*

    there is 3 type if jioning room
                                  
                                    type

    => random room             =>   RR

    => create your own room    =>   CR

    => join a created room     =>   JR


*/

export async function StartGetRoom(app, type, RoomUuid) {
  const uuid = localStorage.getItem("uuid");

  let res = await fetch(`/createroom?uuid=${uuid}&type=${type}&room=${RoomUuid}`);

  if (res.status == 200) {
    let data = await res.json();
    if (data.error) {
      console.log("error->", data.error);
      return;
    }

    INFO.room = data.room;
    INFO.roomUuid = data.room.Uuid;
    INFO.Players = data.room.Players;
    INFO.playerNbr = data.nbr;

    app.setState("Players", data.room.Players);
    app.setState("map", data.room.map);
    // The server hands a player already in a running game their seat back
    // (another tab of the same browser got there first): go straight in.
    if (data.room.IsStart) {
      data.room.Players.forEach((player, index) => {
        app.setState("live" + (index + 1).toString(), player.Lives);
      });
      if (!INFO.socket) startWebSocket(app, INFO.roomUuid);
      app.router.navigate("/game");
      return;
    }
    app.router.navigate("/chat");
  } else {
    app.router.navigate("/");
  }
}
