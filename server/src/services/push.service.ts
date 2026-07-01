import webpush from 'web-push';
import { env, pushEnabled } from '../config/env';
import { subscriptionsModel } from '../models/subscriptions.model';

if (pushEnabled) {
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
} else {
  console.warn(
    '[push] VAPID keys not set — push notifications are disabled. Run `npm run vapid` and fill server/.env.'
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export const pushService = {
  enabled: pushEnabled,
  publicKey: env.vapid.publicKey,

  /**
   * Send a push to every subscription belonging to a user.
   * Expired/invalid subscriptions (404/410) are pruned automatically.
   */
  async notifyUser(userId: number, payload: PushPayload): Promise<void> {
    if (!pushEnabled) return;
    const subs = subscriptionsModel.listForUser(userId);
    const json = JSON.stringify(payload);

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            json,
            { TTL: 60 * 60, urgency: 'high' }
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription no longer valid — remove it.
            subscriptionsModel.removeByEndpoint(s.endpoint);
          } else {
            console.error('[push] send failed:', statusCode, (err as Error).message);
          }
        }
      })
    );
  },
};
