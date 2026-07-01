import type { Server } from 'socket.io';

/**
 * Holds the Socket.IO server instance so non-socket code (REST routes) can
 * emit realtime events. Each authenticated socket joins the room `user:<id>`,
 * so emitting to a user reaches all their devices/tabs.
 */
let ioRef: Server | null = null;

export function setIo(io: Server): void {
  ioRef = io;
}

export function userRoom(userId: number): string {
  return `user:${userId}`;
}

export function emitToUser(userId: number, event: string, payload: unknown): void {
  ioRef?.to(userRoom(userId)).emit(event, payload);
}
