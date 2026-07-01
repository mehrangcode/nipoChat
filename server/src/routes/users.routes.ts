import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { usersModel } from '../models/users.model';
import { presence } from '../services/presence.service';
import { toPublicUser } from '../types';

export const usersRoutes = Router();

usersRoutes.use(requireAuth);

// GET /api/users/search?username=foo
usersRoutes.get('/search', (req, res) => {
  const q = String(req.query.username ?? '').trim();
  if (q.length < 1) {
    res.json({ users: [] });
    return;
  }
  const rows = usersModel.search(q, req.userId!);
  res.json({ users: rows.map((u) => toPublicUser(u, presence.isOnline(u.id))) });
});

// GET /api/users/:id/presence
usersRoutes.get('/:id/presence', (req, res) => {
  const id = Number(req.params.id);
  const user = usersModel.byId(id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({ userId: id, online: presence.isOnline(id), lastSeenAt: user.last_seen_at });
});

// GET /api/users/online — list of currently online user ids
usersRoutes.get('/online/ids', (_req, res) => {
  res.json({ online: presence.onlineUserIds() });
});
