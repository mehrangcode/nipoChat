// Shared client-side DTO shapes (mirror server/src/types.ts).

export type MessageType = 'text' | 'image' | 'file' | 'voice';

export interface PublicUser {
  id: number;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  lastSeenAt: number;
  online?: boolean;
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
  // Client-only fields for optimistic messages:
  clientId?: string;
  pending?: boolean;
  failed?: boolean;
}

export interface ConversationDTO {
  id: number;
  peer: PublicUser;
  lastMessage: MessageDTO | null;
  unreadCount: number;
  createdAt: number;
}

export interface FeatureFlags {
  voiceCall: boolean;
  videoCall: boolean;
}
