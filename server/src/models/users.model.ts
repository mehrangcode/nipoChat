import { db, now } from '../db';
import { UserRow } from '../types';

export const usersModel = {
  create(params: {
    username: string;
    nickname: string;
    passwordHash: string;
  }): UserRow {
    const ts = now();
    const info = db
      .prepare(
        `INSERT INTO users (username, nickname, password_hash, avatar_url, created_at, last_seen_at)
         VALUES (@username, @nickname, @passwordHash, NULL, @ts, @ts)`
      )
      .run({ ...params, ts });
    return this.byId(Number(info.lastInsertRowid))!;
  },

  byId(id: number): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  },

  byUsername(username: string): UserRow | undefined {
    return db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username.toLowerCase()) as UserRow | undefined;
  },

  /** Prefix search by username or nickname, excluding the requester. */
  search(query: string, excludeUserId: number, limit = 20): UserRow[] {
    const like = `${query.toLowerCase()}%`;
    return db
      .prepare(
        `SELECT * FROM users
         WHERE id != ? AND (username LIKE ? OR LOWER(nickname) LIKE ?)
         ORDER BY username ASC
         LIMIT ?`
      )
      .all(excludeUserId, like, like, limit) as UserRow[];
  },

  updateProfile(id: number, fields: { nickname?: string; avatarUrl?: string | null }): void {
    if (fields.nickname !== undefined) {
      db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(fields.nickname, id);
    }
    if (fields.avatarUrl !== undefined) {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(fields.avatarUrl, id);
    }
  },

  updatePassword(id: number, passwordHash: string): void {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  },

  touchLastSeen(id: number, ts = now()): void {
    db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(ts, id);
  },
};
