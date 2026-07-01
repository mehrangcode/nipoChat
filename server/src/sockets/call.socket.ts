import { getFeatures } from '../config/features';
import { usersModel } from '../models/users.model';
import { presence } from '../services/presence.service';
import { emitToUser } from './registry';
import { AppSocket } from './types';

/**
 * WebRTC signaling relay for 1-on-1 voice/video calls.
 *
 * ISOLATED + FEATURE-FLAGGED: these handlers are only registered when at least
 * one call feature is enabled (see config/features.ts). The server never touches
 * media — it only relays SDP offers/answers and ICE candidates between peers.
 * No TURN server is configured here (STUN only), so this is a skeleton suitable
 * for LAN / same-network testing.
 */
export function registerCall(socket: AppSocket): void {
  const { userId } = socket.data;

  const isEnabled = (kind: 'audio' | 'video'): boolean => {
    const f = getFeatures();
    return kind === 'video' ? f.videoCall : f.voiceCall;
  };

  const canReach = (peerId: number): boolean =>
    Number.isInteger(peerId) && peerId !== userId && !!usersModel.byId(peerId);

  socket.on(
    'call:offer',
    (payload: { toUserId: number; sdp: unknown; media: 'audio' | 'video' }) => {
      if (!isEnabled(payload.media) || !canReach(payload.toUserId)) return;
      if (!presence.isOnline(payload.toUserId)) {
        emitToUser(userId, 'call:unavailable', { toUserId: payload.toUserId });
        return;
      }
      const caller = usersModel.byId(userId);
      emitToUser(payload.toUserId, 'call:incoming', {
        fromUserId: userId,
        fromNickname: caller?.nickname,
        media: payload.media,
        sdp: payload.sdp,
      });
    }
  );

  socket.on('call:answer', (payload: { toUserId: number; sdp: unknown }) => {
    if (!canReach(payload.toUserId)) return;
    emitToUser(payload.toUserId, 'call:answered', { fromUserId: userId, sdp: payload.sdp });
  });

  socket.on('call:ice', (payload: { toUserId: number; candidate: unknown }) => {
    if (!canReach(payload.toUserId)) return;
    emitToUser(payload.toUserId, 'call:ice', { fromUserId: userId, candidate: payload.candidate });
  });

  socket.on('call:end', (payload: { toUserId: number; reason?: string }) => {
    if (!canReach(payload.toUserId)) return;
    emitToUser(payload.toUserId, 'call:ended', { fromUserId: userId, reason: payload.reason });
  });

  // Guard: reject a conversation-scoped call to a non-participant early (optional helper).
  socket.on('call:reject', (payload: { toUserId: number }) => {
    if (!canReach(payload.toUserId)) return;
    emitToUser(payload.toUserId, 'call:rejected', { fromUserId: userId });
  });
}
