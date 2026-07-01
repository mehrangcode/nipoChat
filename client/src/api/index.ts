import { ConversationDTO, FeatureFlags, MessageDTO, MessageType, PublicUser } from '../types';
import { api } from './client';

export const authApi = {
  signup: (username: string, nickname: string, password: string) =>
    api
      .post<{ token: string; user: PublicUser }>('/auth/signup', {
        username,
        nickname,
        password,
      })
      .then((r) => r.data),
  login: (username: string, password: string) =>
    api
      .post<{ token: string; user: PublicUser }>('/auth/login', { username, password })
      .then((r) => r.data),
  me: () => api.get<{ user: PublicUser }>('/auth/me').then((r) => r.data.user),
  updateMe: (fields: { nickname?: string; avatarUrl?: string | null }) =>
    api.patch<{ user: PublicUser }>('/auth/me', fields).then((r) => r.data.user),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
};

export const usersApi = {
  search: (username: string) =>
    api
      .get<{ users: PublicUser[] }>('/users/search', { params: { username } })
      .then((r) => r.data.users),
  onlineIds: () =>
    api.get<{ online: number[] }>('/users/online/ids').then((r) => r.data.online),
};

export const conversationsApi = {
  list: () =>
    api.get<{ conversations: ConversationDTO[] }>('/conversations').then((r) => r.data.conversations),
  create: (peerId: number) =>
    api
      .post<{ conversation: ConversationDTO }>('/conversations', { peerId })
      .then((r) => r.data.conversation),
  messages: (conversationId: number, params: { before?: number; after?: number; limit?: number } = {}) =>
    api
      .get<{ messages: MessageDTO[] }>(`/conversations/${conversationId}/messages`, { params })
      .then((r) => r.data.messages),
};

export const messagesApi = {
  remove: (messageId: number, scope: 'self' | 'all') =>
    api.delete(`/messages/${messageId}`, { params: { scope } }).then((r) => r.data),
};

export const uploadsApi = {
  upload: (file: File, extra?: { type?: MessageType }) => {
    const form = new FormData();
    form.append('file', file);
    void extra;
    return api
      .post<{ url: string; name: string; size: number; mime: string }>('/uploads', form)
      .then((r) => r.data);
  },
};

export const pushApi = {
  vapidPublicKey: () =>
    api
      .get<{ publicKey: string; enabled: boolean }>('/push/vapid-public-key')
      .then((r) => r.data),
  subscribe: (sub: PushSubscriptionJSON) => api.post('/push/subscribe', sub).then((r) => r.data),
  unsubscribe: (endpoint: string) =>
    api.delete('/push/subscribe', { data: { endpoint } }).then((r) => r.data),
};

export const featuresApi = {
  get: () => api.get<{ features: FeatureFlags }>('/features').then((r) => r.data.features),
};
