import { db, now } from '../db';
import { PushSubscriptionRow } from '../types';

export const subscriptionsModel = {
  upsert(params: { userId: number; endpoint: string; p256dh: string; auth: string }): void {
    db.prepare(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
       VALUES (@userId, @endpoint, @p256dh, @auth, @ts)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         p256dh  = excluded.p256dh,
         auth    = excluded.auth`
    ).run({ ...params, ts: now() });
  },

  listForUser(userId: number): PushSubscriptionRow[] {
    return db
      .prepare('SELECT * FROM push_subscriptions WHERE user_id = ?')
      .all(userId) as PushSubscriptionRow[];
  },

  removeByEndpoint(endpoint: string): void {
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  },
};
