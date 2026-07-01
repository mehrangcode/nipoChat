import { db, now } from '../db';
import { DeleteScope, MessageRow, MessageType } from '../types';

export const messagesModel = {
  create(params: {
    conversationId: number;
    senderId: number;
    type: MessageType;
    body?: string | null;
    mediaUrl?: string | null;
    mediaMeta?: Record<string, unknown> | null;
  }): MessageRow {
    const info = db
      .prepare(
        `INSERT INTO messages (conversation_id, sender_id, type, body, media_url, media_meta, created_at)
         VALUES (@conversationId, @senderId, @type, @body, @mediaUrl, @mediaMeta, @ts)`
      )
      .run({
        conversationId: params.conversationId,
        senderId: params.senderId,
        type: params.type,
        body: params.body ?? null,
        mediaUrl: params.mediaUrl ?? null,
        mediaMeta: params.mediaMeta ? JSON.stringify(params.mediaMeta) : null,
        ts: now(),
      });
    return this.byId(Number(info.lastInsertRowid))!;
  },

  byId(id: number): MessageRow | undefined {
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow | undefined;
  },

  /**
   * Page of messages for a conversation, excluding those the viewer hid ("delete for me").
   * `before` is an exclusive message id cursor (for older-history paging).
   */
  listForConversation(
    conversationId: number,
    viewerId: number,
    opts: { before?: number; after?: number; limit?: number } = {}
  ): MessageRow[] {
    const limit = Math.min(opts.limit ?? 50, 200);
    const clauses = ['m.conversation_id = ?'];
    const args: unknown[] = [conversationId];

    if (opts.before) {
      clauses.push('m.id < ?');
      args.push(opts.before);
    }
    if (opts.after) {
      clauses.push('m.id > ?');
      args.push(opts.after);
    }
    // Exclude messages the viewer deleted for themselves.
    clauses.push('m.id NOT IN (SELECT message_id FROM message_hides WHERE user_id = ?)');
    args.push(viewerId);

    const rows = db
      .prepare(
        `SELECT m.* FROM messages m
         WHERE ${clauses.join(' AND ')}
         ORDER BY m.id DESC
         LIMIT ?`
      )
      .all(...args, limit) as MessageRow[];

    // Return ascending (oldest first) for rendering convenience.
    return rows.reverse();
  },

  lastVisibleForConversation(conversationId: number, viewerId: number): MessageRow | undefined {
    return db
      .prepare(
        `SELECT m.* FROM messages m
         WHERE m.conversation_id = ?
           AND m.id NOT IN (SELECT message_id FROM message_hides WHERE user_id = ?)
         ORDER BY m.id DESC LIMIT 1`
      )
      .get(conversationId, viewerId) as MessageRow | undefined;
  },

  unreadCount(conversationId: number, viewerId: number): number {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM messages
         WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL AND deleted_scope IS NOT 'all'`
      )
      .get(conversationId, viewerId) as { c: number };
    return row.c;
  },

  markRead(conversationId: number, readerId: number, ts = now()): number[] {
    const unread = db
      .prepare(
        `SELECT id FROM messages
         WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`
      )
      .all(conversationId, readerId) as { id: number }[];
    if (unread.length === 0) return [];
    db.prepare(
      `UPDATE messages SET read_at = ?
       WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`
    ).run(ts, conversationId, readerId);
    return unread.map((r) => r.id);
  },

  /** Delete-for-me: hide only for this user. */
  hideForUser(messageId: number, userId: number): void {
    db.prepare(
      'INSERT OR IGNORE INTO message_hides (message_id, user_id) VALUES (?, ?)'
    ).run(messageId, userId);
  },

  /** Delete-for-everyone: soft delete with a tombstone. */
  deleteForAll(messageId: number, scope: DeleteScope = 'all'): void {
    db.prepare('UPDATE messages SET deleted_at = ?, deleted_scope = ? WHERE id = ?').run(
      now(),
      scope,
      messageId
    );
  },
};
