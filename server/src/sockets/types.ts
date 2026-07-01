import type { Socket } from 'socket.io';

/** Data attached to each authenticated socket. */
export interface SocketData {
  userId: number;
  username: string;
}

export type AppSocket = Socket<any, any, any, SocketData>;
