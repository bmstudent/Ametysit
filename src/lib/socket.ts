import { io } from "socket.io-client";

// Use relative / same-origin in both dev and prod to work correctly behind cloud proxies
const URL = undefined;

// Use singleton pattern
export const socket = io(URL, {
  autoConnect: false,
});
