import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { conversationsModel } from '../models/conversations.model';
import { messagesModel } from '../models/messages.model';
import { emitToUser } from '../sockets/registry';
import { DeleteScope } from '../types';

export const messagesRoutes = Router();

messagesRoutes.use(requireAuth);

/**
 * DELETE /api/messages/:id?scope=self|all
 *  - self: hide only for the requester ("delete for me")
 *  - all:  soft-delete for everyone (only the original sender may do this)
 */
messagesRoutes.delete('/:id', (req, res) => {
  const viewerId = req.userId!;
  const messageId = Number(req.params.id);
  const scope = (String(req.query.scope ?? 'self') as DeleteScope) === 'all' ? 'all' : 'self';

  const msg = messagesModel.byId(messageId);
  if (!msg) {
    res.status(404).json({ error: 'Message not found.' });
    return;
  }
  const conv = conversationsModel.byId(msg.conversation_id);
  if (!conv || !conversationsModel.isParticipant(conv.id, viewerId)) {
    res.status(403).json({ error: 'Not allowed.' });
    return;
  }

  if (scope === 'all') {
    if (msg.sender_id !== viewerId) {
      res.status(403).json({ error: 'Only the sender can delete a message for everyone.' });
      return;
    }
    messagesModel.deleteForAll(messageId, 'all');
    // Notify both participants so the tombstone shows everywhere.
    const peerId = conversationsModel.peerId(conv, viewerId);
    const payload = { messageId, conversationId: conv.id, scope: 'all' as const };
    emitToUser(peerId, 'message:deleted', payload);
    emitToUser(viewerId, 'message:deleted', payload);
  } else {
    messagesModel.hideForUser(messageId, viewerId);
    emitToUser(viewerId, 'message:deleted', {
      messageId,
      conversationId: conv.id,
      scope: 'self' as const,
    });
  }

  res.json({ ok: true });
});
