import { io } from "socket.io-client";

const socket = io(undefined, {
  auth: {
    token: localStorage.getItem("token") || null,
  },
  transports: ["websocket"],
  autoConnect: false,
});

export default socket;
