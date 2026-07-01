import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import { conversationsModel } from '../models/conversations.model';
import { messagesModel } from '../models/messages.model';
import { usersModel } from '../models/users.model';
import { serializeConversation } from '../services/serialize';
import { toMessageDTO } from '../types';

export const conversationsRoutes = Router();

conversationsRoutes.use(requireAuth);

// GET /api/conversations — list with peer, last message, unread count
conversationsRoutes.get('/', (req, res) => {
  const viewerId = req.userId!;
  const convs = conversationsModel
    .listForUser(viewerId)
    .map((c) => serializeConversation(c, viewerId))
    .filter((c): c is NonNullable<typeof c> => c !== null)
    // Most recent activity first.
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt ?? a.createdAt;
      const bt = b.lastMessage?.createdAt ?? b.createdAt;
      return bt - at;
    });
  res.json({ conversations: convs });
});

const createSchema = z.object({ peerId: z.number().int().positive() });

// POST /api/conversations { peerId } — get-or-create a 1-on-1 conversation
conversationsRoutes.post('/', (req, res, next) => {
  try {
    const { peerId } = createSchema.parse(req.body);
    if (peerId === req.userId) {
      res.status(400).json({ error: 'Cannot start a conversation with yourself.' });
      return;
    }
    if (!usersModel.byId(peerId)) {
      res.status(404).json({ error: 'Peer user not found.' });
      return;
    }
    const conv = conversationsModel.getOrCreate(req.userId!, peerId);
    res.status(201).json({ conversation: serializeConversation(conv, req.userId!) });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:id/messages?before=&after=&limit=
conversationsRoutes.get('/:id/messages', (req, res) => {
  const viewerId = req.userId!;
  const convId = Number(req.params.id);
  if (!conversationsModel.isParticipant(convId, viewerId)) {
    res.status(403).json({ error: 'Not a participant in this conversation.' });
    return;
  }
  const before = req.query.before ? Number(req.query.before) : undefined;
  const after = req.query.after ? Number(req.query.after) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const rows = messagesModel.listForConversation(convId, viewerId, { before, after, limit });
  res.json({ messages: rows.map(toMessageDTO) });
});
