import { db, now } from '../db';

export interface ConversationRow {
  id: number;
  user_lo: number;
  user_hi: number;
  created_at: number;
}

function ordered(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export const conversationsModel = {
  /** Get an existing 1-on-1 conversation or create it. */
  getOrCreate(userA: number, userB: number): ConversationRow {
    const [lo, hi] = ordered(userA, userB);
    const existing = db
      .prepare('SELECT * FROM conversations WHERE user_lo = ? AND user_hi = ?')
      .get(lo, hi) as ConversationRow | undefined;
    if (existing) return existing;

    const info = db
      .prepare('INSERT INTO conversations (user_lo, user_hi, created_at) VALUES (?, ?, ?)')
      .run(lo, hi, now());
    return this.byId(Number(info.lastInsertRowid))!;
  },

  byId(id: number): ConversationRow | undefined {
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
      | ConversationRow
      | undefined;
  },

  /** All conversations a user participates in. */
  listForUser(userId: number): ConversationRow[] {
    return db
      .prepare('SELECT * FROM conversations WHERE user_lo = ? OR user_hi = ?')
      .all(userId, userId) as ConversationRow[];
  },

  isParticipant(conversationId: number, userId: number): boolean {
    const row = this.byId(conversationId);
    return !!row && (row.user_lo === userId || row.user_hi === userId);
  },

  peerId(conv: ConversationRow, userId: number): number {
    return conv.user_lo === userId ? conv.user_hi : conv.user_lo;
  },
};
