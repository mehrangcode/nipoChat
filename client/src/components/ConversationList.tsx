import { useChatStore } from '../store/chat.store';
import { usePresenceStore } from '../store/presence.store';
import { ConversationDTO } from '../types';
import { formatTime } from '../utils/format';
import Avatar from './Avatar';
import PresenceDot from './PresenceDot';

interface Props {
  activeId: number | null;
  onSelect: (conversationId: number) => void;
}

function preview(c: ConversationDTO): string {
  const m = c.lastMessage;
  if (!m) return 'گفتگو را شروع کنید';
  if (m.deletedForAll) return 'پیام حذف شد';
  switch (m.type) {
    case 'image':
      return '🖼️ تصویر';
    case 'file':
      return '📎 فایل';
    case 'voice':
      return '🎤 پیام صوتی';
    default:
      return m.body ?? '';
  }
}

export default function ConversationList({ activeId, onSelect }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const online = usePresenceStore((s) => s.online);

  if (conversations.length === 0) {
    return <div className="conv-empty">هنوز گفتگویی ندارید. یک کاربر را جستجو کنید.</div>;
  }

  return (
    <ul className="conv-list">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            className={`conv-item ${activeId === c.id ? 'is-active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="conv-avatar">
              <Avatar name={c.peer.nickname} url={c.peer.avatarUrl} />
              <span className="conv-dot">
                <PresenceDot online={online.has(c.peer.id)} />
              </span>
            </div>
            <div className="conv-main">
              <div className="conv-row">
                <span className="conv-name">{c.peer.nickname}</span>
                {c.lastMessage && (
                  <span className="conv-time">{formatTime(c.lastMessage.createdAt)}</span>
                )}
              </div>
              <div className="conv-row">
                <span className="conv-preview">{preview(c)}</span>
                {c.unreadCount > 0 && (
                  <span className="conv-badge">{c.unreadCount.toLocaleString('fa-IR')}</span>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
