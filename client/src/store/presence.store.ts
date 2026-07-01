import { create } from 'zustand';

interface PresenceState {
  online: Set<number>;
  lastSeen: Record<number, number>;
  setSnapshot: (ids: number[]) => void;
  setOnline: (userId: number, online: boolean, lastSeenAt?: number) => void;
  isOnline: (userId: number) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  online: new Set(),
  lastSeen: {},
  setSnapshot: (ids) => set({ online: new Set(ids) }),
  setOnline: (userId, online, lastSeenAt) =>
    set((state) => {
      const next = new Set(state.online);
      if (online) next.add(userId);
      else next.delete(userId);
      return {
        online: next,
        lastSeen: lastSeenAt ? { ...state.lastSeen, [userId]: lastSeenAt } : state.lastSeen,
      };
    }),
  isOnline: (userId) => get().online.has(userId),
}));
