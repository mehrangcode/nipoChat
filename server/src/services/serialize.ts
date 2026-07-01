import { conversationsModel, ConversationRow } from '../models/conversations.model';
import { messagesModel } from '../models/messages.model';
import { usersModel } from '../models/users.model';
import { ConversationDTO, toMessageDTO, toPublicUser } from '../types';
import { presence } from './presence.service';

/** Build a ConversationDTO from the viewer's perspective (peer + last message + unread). */
export function serializeConversation(
  conv: ConversationRow,
  viewerId: number
): ConversationDTO | null {
  const peerId = conversationsModel.peerId(conv, viewerId);
  const peer = usersModel.byId(peerId);
  if (!peer) return null;

  const last = messagesModel.lastVisibleForConversation(conv.id, viewerId);
  return {
    id: conv.id,
    peer: toPublicUser(peer, presence.isOnline(peer.id)),
    lastMessage: last ? toMessageDTO(last) : null,
    unreadCount: messagesModel.unreadCount(conv.id, viewerId),
    createdAt: conv.created_at,
  };
}
