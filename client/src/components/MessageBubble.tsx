import { useState } from 'react';
import { useChatStore } from '../store/chat.store';
import { MessageDTO } from '../types';
import { formatSize, formatTime } from '../utils/format';

interface Props {
  message: MessageDTO;
  mine: boolean;
}

export default function MessageBubble({ message, mine }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteMessage = useChatStore((s) => s.deleteMessage);

  const onDelete = async (scope: 'self' | 'all') => {
    setMenuOpen(false);
    await deleteMessage(message, scope);
  };

  const meta = (message.mediaMeta ?? {}) as {
    name?: string;
    size?: number;
    durationMs?: number;
  };

  return (
    <div className={`bubble-row ${mine ? 'mine' : 'peer'}`}>
      <div className={`bubble ${mine ? 'bubble-me' : 'bubble-peer'}`}>
        {message.deletedForAll ? (
          <span className="bubble-deleted">🚫 این پیام حذف شد</span>
        ) : (
          <>
            {message.type === 'text' && <span className="bubble-text">{message.body}</span>}

            {message.type === 'image' && message.mediaUrl && (
              <a href={message.mediaUrl} target="_blank" rel="noreferrer">
                <img className="bubble-image" src={message.mediaUrl} alt={meta.name ?? 'image'} />
              </a>
            )}

            {message.type === 'file' && message.mediaUrl && (
              <a className="bubble-file" href={message.mediaUrl} target="_blank" rel="noreferrer" download>
                <span className="file-icon">📎</span>
                <span className="file-info">
                  <span className="file-name">{meta.name ?? 'فایل'}</span>
                  {meta.size != null && <span className="file-size">{formatSize(meta.size)}</span>}
                </span>
              </a>
            )}

            {message.type === 'voice' && message.mediaUrl && (
              <audio className="bubble-audio" src={message.mediaUrl} controls preload="metadata" />
            )}

            {message.body && message.type !== 'text' && (
              <span className="bubble-caption">{message.body}</span>
            )}
          </>
        )}

        <span className="bubble-meta">
          <span className="bubble-time">{formatTime(message.createdAt)}</span>
          {mine && !message.deletedForAll && (
            <span className={`ticks ${message.readAt ? 'read' : ''}`}>
              {message.pending ? '🕓' : message.failed ? '⚠️' : message.readAt ? '✓✓' : '✓'}
            </span>
          )}
        </span>

        {!message.deletedForAll && !message.pending && (
          <button className="bubble-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="گزینه‌ها">
            ⋯
          </button>
        )}

        {menuOpen && (
          <div className="bubble-menu" onMouseLeave={() => setMenuOpen(false)}>
            <button onClick={() => onDelete('self')}>حذف برای من</button>
            {mine && <button className="danger" onClick={() => onDelete('all')}>حذف برای همه</button>}
          </div>
        )}
      </div>
    </div>
  );
}
