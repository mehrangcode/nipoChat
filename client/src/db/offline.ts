import Dexie, { Table } from 'dexie';
import { ConversationDTO, MessageDTO } from '../types';

/**
 * Local offline cache. We render from here first (instant + works offline),
 * then reconcile with the server. Messages are keyed by their server id;
 * optimistic (pending) messages use a negative/clientId key until confirmed.
 */
class NipoDB extends Dexie {
  conversations!: Table<ConversationDTO, number>;
  messages!: Table<MessageDTO, number>;

  constructor() {
    super('nipo-chat');
    this.version(1).stores({
      conversations: 'id',
      // index by conversationId + createdAt for range queries
      messages: 'id, conversationId, createdAt',
    });
  }
}

export const offlineDb = new NipoDB();

export const offline = {
  async saveConversations(convs: ConversationDTO[]) {
    await offlineDb.conversations.bulkPut(convs);
  },
  async getConversations(): Promise<ConversationDTO[]> {
    return offlineDb.conversations.toArray();
  },
  async saveMessages(msgs: MessageDTO[]) {
    if (msgs.length) await offlineDb.messages.bulkPut(msgs);
  },
  async getMessages(conversationId: number): Promise<MessageDTO[]> {
    const rows = await offlineDb.messages
      .where('conversationId')
      .equals(conversationId)
      .toArray();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
  async deleteMessage(messageId: number) {
    await offlineDb.messages.delete(messageId);
  },
  async clear() {
    await Promise.all([offlineDb.conversations.clear(), offlineDb.messages.clear()]);
  },
};
