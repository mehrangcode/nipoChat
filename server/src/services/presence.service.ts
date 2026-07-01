import { usersModel } from '../models/users.model';

/**
 * In-memory online presence. Maps userId -> set of live socket ids.
 * A user is "online" while they have at least one connected socket.
 * On the last disconnect we persist last_seen_at.
 */
class PresenceService {
  private online = new Map<number, Set<string>>();

  add(userId: number, socketId: string): { wasOffline: boolean } {
    const set = this.online.get(userId);
    if (set) {
      set.add(socketId);
      return { wasOffline: false };
    }
    this.online.set(userId, new Set([socketId]));
    return { wasOffline: true };
  }

  remove(userId: number, socketId: string): { nowOffline: boolean } {
    const set = this.online.get(userId);
    if (!set) return { nowOffline: false };
    set.delete(socketId);
    if (set.size === 0) {
      this.online.delete(userId);
      usersModel.touchLastSeen(userId);
      return { nowOffline: true };
    }
    return { nowOffline: false };
  }

  isOnline(userId: number): boolean {
    return this.online.has(userId);
  }

  onlineUserIds(): number[] {
    return [...this.online.keys()];
  }
}

export const presence = new PresenceService();
