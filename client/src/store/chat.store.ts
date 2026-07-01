import { create } from 'zustand';
import { conversationsApi, messagesApi } from '../api';
import { offline } from '../db/offline';
import { getSocket } from '../socket';
import { ConversationDTO, MessageDTO, MessageType } from '../types';

function uid(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface SendInput {
  conversationId: number;
  peerId: number;
  type: MessageType;
  body?: string | null;
  mediaUrl?: string | null;
  mediaMeta?: Record<string, unknown> | null;
}

interface ChatState {
  conversations: ConversationDTO[];
  activeId: number | null;
  messages: Record<number, MessageDTO[]>;
  typing: Record<number, boolean>;
  online: boolean; // network connectivity

  setOnline: (v: boolean) => void;
  loadConversations: () => Promise<void>;
  upsertConversation: (c: ConversationDTO) => void;
  setActive: (id: number | null) => void;
  openConversation: (id: number) => Promise<void>;
  sendMessage: (input: SendInput) => void;
  receiveMessage: (message: MessageDTO, clientId?: string) => void;
  applyDeletion: (conversationId: number, messageId: number, scope: 'self' | 'all') => void;
  applyRead: (conversationId: number, messageIds: number[]) => void;
  setTyping: (conversationId: number, typing: boolean) => void;
  deleteMessage: (message: MessageDTO, scope: 'self' | 'all') => Promise<void>;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: {},
  typing: {},
  online: navigator.onLine,

  setOnline: (v) => set({ online: v }),

  loadConversations: async () => {
    // Render cache immediately, then reconcile with server.
    const cached = await offline.getConversations();
    if (cached.length) set({ conversations: sortConvs(cached) });
    try {
      const fresh = await conversationsApi.list();
      set({ conversations: sortConvs(fresh) });
      await offline.saveConversations(fresh);
    } catch {
      /* offline — keep cache */
    }
  },

  upsertConversation: (c) =>
    set((s) => {
      const rest = s.conversations.filter((x) => x.id !== c.id);
      return { conversations: sortConvs([c, ...rest]) };
    }),

  setActive: (id) => set({ activeId: id }),

  openConversation: async (id) => {
    set({ activeId: id });
    const cached = await offline.getMessages(id);
    if (cached.length) set((s) => ({ messages: { ...s.messages, [id]: cached } }));
    try {
      const fresh = await conversationsApi.messages(id, { limit: 100 });
      set((s) => ({ messages: { ...s.messages, [id]: mergeMessages(s.messages[id] ?? [], fresh) } }));
      await offline.saveMessages(fresh);
      // Mark as read on the server + optimistically clear unread badge.
      getSocket().emit('message:read', { conversationId: id });
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch {
      /* offline — keep cache */
    }
  },

  sendMessage: (input) => {
    const clientId = uid();
    const optimistic: MessageDTO = {
      id: -Date.now(),
      conversationId: input.conversationId,
      senderId: -1, // replaced on confirmation; UI uses `pending`
      type: input.type,
      body: input.body ?? null,
      mediaUrl: input.mediaUrl ?? null,
      mediaMeta: input.mediaMeta ?? null,
      createdAt: Date.now(),
      readAt: null,
      deletedForAll: false,
      clientId,
      pending: true,
    };
    set((s) => ({
      messages: {
        ...s.messages,
        [input.conversationId]: [...(s.messages[input.conversationId] ?? []), optimistic],
      },
    }));

    getSocket().emit(
      'message:send',
      {
        conversationId: input.conversationId,
        peerId: input.peerId,
        type: input.type,
        body: input.body,
        mediaUrl: input.mediaUrl,
        mediaMeta: input.mediaMeta,
        clientId,
      },
      (res: { ok: boolean; message?: MessageDTO; clientId?: string; error?: string }) => {
        if (!res?.ok) {
          // Mark the optimistic message as failed.
          set((s) => ({
            messages: {
              ...s.messages,
              [input.conversationId]: (s.messages[input.conversationId] ?? []).map((m) =>
                m.clientId === clientId ? { ...m, pending: false, failed: true } : m
              ),
            },
          }));
        }
        // Success is handled by the incoming `message:new` event (receiveMessage).
      }
    );
  },

  receiveMessage: (message, clientId) => {
    set((s) => {
      const convId = message.conversationId;
      const list = s.messages[convId] ?? [];
      // Reconcile with an optimistic message if clientId matches.
      let replaced = false;
      const next = list.map((m) => {
        if (clientId && m.clientId === clientId) {
          replaced = true;
          return { ...message };
        }
        return m;
      });
      if (!replaced && !next.some((m) => m.id === message.id)) next.push(message);

      // Bump conversation ordering / last message.
      const conversations = s.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              lastMessage: message,
              unreadCount:
                s.activeId === convId ? 0 : c.unreadCount + (message.senderId === -1 ? 0 : 1),
            }
          : c
      );

      void offline.saveMessages([message]);
      return { messages: { ...s.messages, [convId]: next }, conversations: sortConvs(conversations) };
    });
  },

  applyDeletion: (conversationId, messageId, scope) => {
    set((s) => {
      const list = s.messages[conversationId] ?? [];
      let next: MessageDTO[];
      if (scope === 'all') {
        next = list.map((m) =>
          m.id === messageId
            ? { ...m, deletedForAll: true, body: null, mediaUrl: null, mediaMeta: null }
            : m
        );
      } else {
        next = list.filter((m) => m.id !== messageId);
        void offline.deleteMessage(messageId);
      }
      return { messages: { ...s.messages, [conversationId]: next } };
    });
  },

  applyRead: (conversationId, messageIds) => {
    const ids = new Set(messageIds);
    const now = Date.now();
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          ids.has(m.id) ? { ...m, readAt: now } : m
        ),
      },
    }));
  },

  setTyping: (conversationId, typing) =>
    set((s) => ({ typing: { ...s.typing, [conversationId]: typing } })),

  deleteMessage: async (message, scope) => {
    // Optimistic local removal / tombstone, then persist.
    get().applyDeletion(message.conversationId, message.id, scope);
    if (message.id > 0) {
      await messagesApi.remove(message.id, scope);
    }
  },

  reset: () => set({ conversations: [], activeId: null, messages: {}, typing: {} }),
}));

function sortConvs(convs: ConversationDTO[]): ConversationDTO[] {
  return [...convs].sort((a, b) => {
    const at = a.lastMessage?.createdAt ?? a.createdAt;
    const bt = b.lastMessage?.createdAt ?? b.createdAt;
    return bt - at;
  });
}

function mergeMessages(existing: MessageDTO[], fresh: MessageDTO[]): MessageDTO[] {
  const byId = new Map<number, MessageDTO>();
  // Keep any still-pending optimistic messages that the server list doesn't include yet.
  for (const m of existing) if (m.pending) byId.set(m.id, m);
  for (const m of fresh) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}
