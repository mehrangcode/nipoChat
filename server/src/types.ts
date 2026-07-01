export type MessageType = 'text' | 'image' | 'file' | 'voice';
export type DeleteScope = 'self' | 'all';

export interface UserRow {
  id: number;
  username: string;
  nickname: string;
  password_hash: string;
  avatar_url: string | null;
  created_at: number;
  last_seen_at: number;
}

/** User shape safe to expose to clients (no password hash). */
export interface PublicUser {
  id: number;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  lastSeenAt: number;
  online?: boolean;
}

export interface MessageRow {
  id: number;
  conversation_id: number;
  sender_id: number;
  type: MessageType;
  body: string | null;
  media_url: string | null;
  media_meta: string | null;
  created_at: number;
  read_at: number | null;
  deleted_at: number | null;
  deleted_scope: DeleteScope | null;
}

export interface MessageDTO {
  id: number;
  conversationId: number;
  senderId: number;
  type: MessageType;
  body: string | null;
  mediaUrl: string | null;
  mediaMeta: Record<string, unknown> | null;
  createdAt: number;
  readAt: number | null;
  deletedForAll: boolean;
}

export interface ConversationDTO {
  id: number;
  peer: PublicUser;
  lastMessage: MessageDTO | null;
  unreadCount: number;
  createdAt: number;
}

export interface PushSubscriptionRow {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: number;
}

export function toPublicUser(u: UserRow, online = false): PublicUser {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    avatarUrl: u.avatar_url,
    lastSeenAt: u.last_seen_at,
    online,
  };
}

export function toMessageDTO(m: MessageRow): MessageDTO {
  const deletedForAll = m.deleted_scope === 'all';
  return {
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    type: m.type,
    // When deleted for everyone, blank out content but keep a tombstone.
    body: deletedForAll ? null : m.body,
    mediaUrl: deletedForAll ? null : m.media_url,
    mediaMeta: deletedForAll || !m.media_meta ? null : safeParse(m.media_meta),
    createdAt: m.created_at,
    readAt: m.read_at,
    deletedForAll,
  };
}

function safeParse(json: string): Record<string, unknown> | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
