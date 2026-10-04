import { io } from "socket.io-client";
import { SERVER_URL } from "./serverUrl.js";

let socket = null;

export function connectSocket(token) {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: true, auth: { token } });
  }
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not connected yet - call connectSocket() first");
  return socket;
}

/** Tears down the current connection so a later connectSocket() starts fresh
 *  (used on logout - otherwise the old, now-stale-token socket would linger). */
export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
