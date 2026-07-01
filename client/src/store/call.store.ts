import { create } from 'zustand';
import { getSocket } from '../socket';

/**
 * ISOLATED voice/video call feature (WebRTC over Socket.IO signaling).
 * Everything call-related lives here + in CallPanel.tsx. When the backend
 * disables the feature (GET /api/features), this store is never initialized
 * and no signaling handlers exist server-side either.
 *
 * STUN-only (no TURN) — works on the same network / simple NATs. Skeleton scope.
 */

export type CallMedia = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
};

let pc: RTCPeerConnection | null = null;
let pendingCandidates: RTCIceCandidateInit[] = [];
let initialized = false;

interface CallState {
  status: CallStatus;
  media: CallMedia;
  peerId: number | null;
  peerName: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingSdp: RTCSessionDescriptionInit | null;
  error: string | null;

  init: () => void;
  startCall: (peerId: number, peerName: string, media: CallMedia) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  hangup: (notifyPeer?: boolean) => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  status: 'idle',
  media: 'audio',
  peerId: null,
  peerName: null,
  localStream: null,
  remoteStream: null,
  incomingSdp: null,
  error: null,

  init: () => {
    if (initialized) return;
    initialized = true;
    const socket = getSocket();

    socket.on(
      'call:incoming',
      (p: { fromUserId: number; fromNickname: string; media: CallMedia; sdp: RTCSessionDescriptionInit }) => {
        if (get().status !== 'idle') {
          // Busy — auto-reject.
          socket.emit('call:reject', { toUserId: p.fromUserId });
          return;
        }
        set({
          status: 'ringing',
          peerId: p.fromUserId,
          peerName: p.fromNickname,
          media: p.media,
          incomingSdp: p.sdp,
        });
      }
    );

    socket.on('call:answered', async (p: { sdp: RTCSessionDescriptionInit }) => {
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
      await flushCandidates();
      set({ status: 'connected' });
    });

    socket.on('call:ice', async (p: { candidate: RTCIceCandidateInit }) => {
      if (!p.candidate) return;
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(p.candidate)).catch(() => undefined);
      } else {
        pendingCandidates.push(p.candidate);
      }
    });

    socket.on('call:ended', () => get().hangup(false));
    socket.on('call:rejected', () => {
      set({ error: 'تماس رد شد.' });
      get().hangup(false);
    });
    socket.on('call:unavailable', () => {
      set({ error: 'کاربر آفلاین است.' });
      get().hangup(false);
    });
  },

  startCall: async (peerId, peerName, media) => {
    try {
      set({ error: null, media, peerId, peerName, status: 'calling' });
      await setupPeer(peerId, media, set);
      const offer = await pc!.createOffer();
      await pc!.setLocalDescription(offer);
      getSocket().emit('call:offer', { toUserId: peerId, sdp: offer, media });
    } catch (err) {
      set({ error: (err as Error).message });
      get().hangup(false);
    }
  },

  acceptCall: async () => {
    const { peerId, media, incomingSdp } = get();
    if (!peerId || !incomingSdp) return;
    try {
      await setupPeer(peerId, media, set);
      await pc!.setRemoteDescription(new RTCSessionDescription(incomingSdp));
      await flushCandidates();
      const answer = await pc!.createAnswer();
      await pc!.setLocalDescription(answer);
      getSocket().emit('call:answer', { toUserId: peerId, sdp: answer });
      set({ status: 'connected', incomingSdp: null });
    } catch (err) {
      set({ error: (err as Error).message });
      get().hangup(false);
    }
  },

  rejectCall: () => {
    const { peerId } = get();
    if (peerId) getSocket().emit('call:reject', { toUserId: peerId });
    teardown();
    set({ status: 'idle', peerId: null, peerName: null, incomingSdp: null });
  },

  hangup: (notifyPeer = true) => {
    const { peerId } = get();
    if (notifyPeer && peerId) getSocket().emit('call:end', { toUserId: peerId });
    teardown();
    set({
      status: 'idle',
      peerId: null,
      peerName: null,
      localStream: null,
      remoteStream: null,
      incomingSdp: null,
    });
  },
}));

async function setupPeer(
  peerId: number,
  media: CallMedia,
  set: (partial: Partial<CallState>) => void
): Promise<void> {
  const local = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: media === 'video',
  });
  set({ localStream: local });

  pc = new RTCPeerConnection(ICE_SERVERS);
  pendingCandidates = [];

  local.getTracks().forEach((track) => pc!.addTrack(track, local));

  const remote = new MediaStream();
  set({ remoteStream: remote });
  pc.ontrack = (ev) => {
    ev.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
  };

  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      getSocket().emit('call:ice', { toUserId: peerId, candidate: ev.candidate.toJSON() });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc && ['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
      useCallStore.getState().hangup(false);
    }
  };
}

async function flushCandidates(): Promise<void> {
  if (!pc) return;
  for (const c of pendingCandidates) {
    await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => undefined);
  }
  pendingCandidates = [];
}

function teardown(): void {
  const { localStream } = useCallStore.getState();
  localStream?.getTracks().forEach((t) => t.stop());
  if (pc) {
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onconnectionstatechange = null;
    pc.close();
    pc = null;
  }
  pendingCandidates = [];
}
