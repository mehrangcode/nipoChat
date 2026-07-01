import type { Server } from 'socket.io';
import { presence } from '../services/presence.service';
import { AppSocket } from './types';

/**
 * Wire presence for a socket: mark online on connect, broadcast changes,
 * and mark offline when the user's last socket disconnects.
 */
export function registerPresence(io: Server, socket: AppSocket): void {
  const { userId } = socket.data;

  const { wasOffline } = presence.add(userId, socket.id);
  if (wasOffline) {
    io.emit('presence:update', { userId, online: true });
  }

  // Send the current online set to the newly connected client.
  socket.emit('presence:snapshot', { online: presence.onlineUserIds() });

  socket.on('disconnect', () => {
    const { nowOffline } = presence.remove(userId, socket.id);
    if (nowOffline) {
      io.emit('presence:update', { userId, online: false, lastSeenAt: Date.now() });
    }
  });
}
