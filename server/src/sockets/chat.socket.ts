import { conversationsModel } from '../models/conversations.model';
import { messagesModel } from '../models/messages.model';
import { usersModel } from '../models/users.model';
import { presence } from '../services/presence.service';
import { pushService } from '../services/push.service';
import { MessageType, toMessageDTO } from '../types';
import { emitToUser } from './registry';
import { AppSocket } from './types';

interface SendPayload {
  conversationId?: number;
  peerId?: number; // alternative: start-or-use conversation with this peer
  type?: MessageType;
  body?: string | null;
  mediaUrl?: string | null;
  mediaMeta?: Record<string, unknown> | null;
  clientId?: string; // client-generated id for optimistic UI reconciliation
}

const VALID_TYPES: MessageType[] = ['text', 'image', 'file', 'voice'];

export function registerChat(socket: AppSocket): void {
  const { userId } = socket.data;

  socket.on('message:send', (payload: SendPayload, ack?: (res: unknown) => void) => {
    try {
      // Resolve conversation (by id, or get-or-create by peer).
      let conversationId = payload.conversationId;
      if (!conversationId && payload.peerId) {
        conversationId = conversationsModel.getOrCreate(userId, payload.peerId).id;
      }
      if (!conversationId) throw new Error('conversationId or peerId is required.');

      const conv = conversationsModel.byId(conversationId);
      if (!conv || !conversationsModel.isParticipant(conv.id, userId)) {
        throw new Error('Not a participant in this conversation.');
      }

      const type: MessageType = VALID_TYPES.includes(payload.type as MessageType)
        ? (payload.type as MessageType)
        : 'text';

      const hasContent =
        (type === 'text' && (payload.body ?? '').trim().length > 0) ||
        (type !== 'text' && !!payload.mediaUrl);
      if (!hasContent) throw new Error('Message has no content.');

      const row = messagesModel.create({
        conversationId: conv.id,
        senderId: userId,
        type,
        body: payload.body ?? null,
        mediaUrl: payload.mediaUrl ?? null,
        mediaMeta: payload.mediaMeta ?? null,
      });
      const dto = toMessageDTO(row);
      const peerId = conversationsModel.peerId(conv, userId);

      // Deliver to peer (all their devices) and echo to sender's other devices.
      emitToUser(peerId, 'message:new', { message: dto });
      emitToUser(userId, 'message:new', { message: dto, clientId: payload.clientId });

      ack?.({ ok: true, message: dto, clientId: payload.clientId });

      // If peer is offline, send a push notification.
      if (!presence.isOnline(peerId)) {
        const sender = usersModel.byId(userId);
        const preview =
          type === 'text' ? (payload.body ?? '') : `[${typeLabel(type)}]`;
        void pushService.notifyUser(peerId, {
          title: sender?.nickname ?? 'New message',
          body: preview.slice(0, 140),
          tag: `conv-${conv.id}`,
          data: { url: `/chat/${conv.id}`, conversationId: conv.id },
        });
      }
    } catch (err) {
      ack?.({ ok: false, error: (err as Error).message });
    }
  });

  socket.on('message:read', (payload: { conversationId: number }) => {
    const conv = conversationsModel.byId(payload.conversationId);
    if (!conv || !conversationsModel.isParticipant(conv.id, userId)) return;
    const ids = messagesModel.markRead(conv.id, userId);
    if (ids.length === 0) return;
    const peerId = conversationsModel.peerId(conv, userId);
    // Tell the sender their messages were read.
    emitToUser(peerId, 'message:read', { conversationId: conv.id, messageIds: ids, readerId: userId });
  });

  socket.on('typing', (payload: { conversationId: number; typing: boolean }) => {
    const conv = conversationsModel.byId(payload.conversationId);
    if (!conv || !conversationsModel.isParticipant(conv.id, userId)) return;
    const peerId = conversationsModel.peerId(conv, userId);
    emitToUser(peerId, 'typing', {
      conversationId: conv.id,
      userId,
      typing: !!payload.typing,
    });
  });
}

function typeLabel(type: MessageType): string {
  switch (type) {
    case 'image':
      return 'Photo';
    case 'file':
      return 'File';
    case 'voice':
      return 'Voice message';
    default:
      return 'Message';
  }
}
