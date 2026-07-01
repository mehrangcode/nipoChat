import { io, Socket } from 'socket.io-client';
import { getToken } from './api/client';

let socket: Socket | null = null;

/** Get (and lazily create) the singleton socket, authenticated with the JWT. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      autoConnect: false,
      auth: (cb) => cb({ token: getToken() }),
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  // Refresh auth token then connect.
  s.auth = { token: getToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
