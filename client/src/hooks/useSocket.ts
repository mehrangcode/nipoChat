import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../socket';
import { useChatStore } from '../store/chat.store';
import { usePresenceStore } from '../store/presence.store';
import { MessageDTO } from '../types';

/**
 * Establishes the authenticated socket connection and wires realtime events
 * into the chat + presence stores. Mount once at the app root while logged in.
 */
export function useSocket(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const socket = connectSocket();
    const chat = useChatStore.getState();
    const presence = usePresenceStore.getState();
    const typingTimers = new Map<number, ReturnType<typeof setTimeout>>();

    const onConnect = () => chat.setOnline(true);
    const onDisconnect = () => chat.setOnline(false);

    const onSnapshot = (p: { online: number[] }) => presence.setSnapshot(p.online);
    const onPresence = (p: { userId: number; online: boolean; lastSeenAt?: number }) =>
      usePresenceStore.getState().setOnline(p.userId, p.online, p.lastSeenAt);

    const onNewMessage = (p: { message: MessageDTO; clientId?: string }) =>
      useChatStore.getState().receiveMessage(p.message, p.clientId);

    const onDeleted = (p: { conversationId: number; messageId: number; scope: 'self' | 'all' }) =>
      useChatStore.getState().applyDeletion(p.conversationId, p.messageId, p.scope);

    const onRead = (p: { conversationId: number; messageIds: number[] }) =>
      useChatStore.getState().applyRead(p.conversationId, p.messageIds);

    const onTyping = (p: { conversationId: number; typing: boolean }) => {
      useChatStore.getState().setTyping(p.conversationId, p.typing);
      const existing = typingTimers.get(p.conversationId);
      if (existing) clearTimeout(existing);
      if (p.typing) {
        typingTimers.set(
          p.conversationId,
          setTimeout(() => useChatStore.getState().setTyping(p.conversationId, false), 4000)
        );
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence:snapshot', onSnapshot);
    socket.on('presence:update', onPresence);
    socket.on('message:new', onNewMessage);
    socket.on('message:deleted', onDeleted);
    socket.on('message:read', onRead);
    socket.on('typing', onTyping);

    // Browser connectivity → drives offline banner.
    const onNetOnline = () => chat.setOnline(true);
    const onNetOffline = () => chat.setOnline(false);
    window.addEventListener('online', onNetOnline);
    window.addEventListener('offline', onNetOffline);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence:snapshot', onSnapshot);
      socket.off('presence:update', onPresence);
      socket.off('message:new', onNewMessage);
      socket.off('message:deleted', onDeleted);
      socket.off('message:read', onRead);
      socket.off('typing', onTyping);
      window.removeEventListener('online', onNetOnline);
      window.removeEventListener('offline', onNetOffline);
      typingTimers.forEach((t) => clearTimeout(t));
      disconnectSocket();
    };
  }, [enabled]);
}

export function emitTyping(conversationId: number, typing: boolean): void {
  getSocket().emit('typing', { conversationId, typing });
}
