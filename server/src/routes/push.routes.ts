import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import { subscriptionsModel } from '../models/subscriptions.model';
import { pushService } from '../services/push.service';

export const pushRoutes = Router();

// GET /api/push/vapid-public-key — client needs this to subscribe
pushRoutes.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: pushService.publicKey, enabled: pushService.enabled });
});

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

// POST /api/push/subscribe — store a PushSubscription for the current user
pushRoutes.post('/subscribe', requireAuth, (req, res, next) => {
  try {
    const sub = subSchema.parse(req.body);
    subscriptionsModel.upsert({
      userId: req.userId!,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const unsubSchema = z.object({ endpoint: z.string().url() });

// DELETE /api/push/subscribe — remove a subscription
pushRoutes.delete('/subscribe', requireAuth, (req, res, next) => {
  try {
    const { endpoint } = unsubSchema.parse(req.body);
    subscriptionsModel.removeByEndpoint(endpoint);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
