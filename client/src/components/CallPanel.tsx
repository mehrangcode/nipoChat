import { useEffect, useRef } from 'react';
import { useCallStore } from '../store/call.store';

/**
 * Renders active/incoming call UI. Mounted only when a call feature is enabled.
 * All WebRTC state lives in call.store.ts — this is purely presentational + wiring
 * media streams to <video>/<audio> elements.
 */
export default function CallPanel() {
  const { status, media, peerName, localStream, remoteStream, error, init, acceptCall, rejectCall, hangup } =
    useCallStore();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (status === 'idle') return null;

  return (
    <div className="call-overlay">
      <div className="call-box">
        {status === 'ringing' ? (
          <>
            <div className="call-title">
              📞 تماس {media === 'video' ? 'تصویری' : 'صوتی'} از {peerName}
            </div>
            <div className="call-actions">
              <button className="btn btn-primary" onClick={acceptCall}>پاسخ</button>
              <button className="call-hangup" onClick={rejectCall}>رد</button>
            </div>
          </>
        ) : (
          <>
            <div className="call-title">
              {status === 'calling' ? `در حال تماس با ${peerName}…` : `${peerName}`}
            </div>

            <div className={`call-stage ${media}`}>
              {media === 'video' && (
                <video ref={remoteRef} className="remote-video" autoPlay playsInline />
              )}
              {/* Remote audio always plays via the same element (video tag renders audio too). */}
              {media === 'audio' && (
                <>
                  <div className="call-audio-badge">🎧</div>
                  <video ref={remoteRef} autoPlay playsInline style={{ display: 'none' }} />
                </>
              )}
              {media === 'video' && (
                <video ref={localRef} className="local-video" autoPlay playsInline muted />
              )}
            </div>

            <div className="call-actions">
              <button className="call-hangup" onClick={() => hangup(true)}>پایان تماس</button>
            </div>
          </>
        )}

        {error && <div className="error-text">{error}</div>}
      </div>
    </div>
  );
}
