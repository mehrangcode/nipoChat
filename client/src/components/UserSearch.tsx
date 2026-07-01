import { useEffect, useRef, useState } from 'react';
import { conversationsApi, usersApi } from '../api';
import { useChatStore } from '../store/chat.store';
import { usePresenceStore } from '../store/presence.store';
import { PublicUser } from '../types';
import Avatar from './Avatar';
import PresenceDot from './PresenceDot';

interface Props {
  onOpened: (conversationId: number) => void;
}

export default function UserSearch({ onOpened }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const online = usePresenceStore((s) => s.online);
  const upsertConversation = useChatStore((s) => s.upsertConversation);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        setResults(await usersApi.search(q));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const startChat = async (peerId: number) => {
    const conv = await conversationsApi.create(peerId);
    upsertConversation(conv);
    setQuery('');
    setResults([]);
    onOpened(conv.id);
  };

  return (
    <div className="user-search">
      <input
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="جستجوی کاربران با نام کاربری…"
      />
      {query.trim() && (
        <div className="search-results">
          {loading && <div className="search-empty">در حال جستجو…</div>}
          {!loading && results.length === 0 && (
            <div className="search-empty">کاربری یافت نشد</div>
          )}
          {results.map((u) => (
            <button key={u.id} className="search-result" onClick={() => startChat(u.id)}>
              <Avatar name={u.nickname} url={u.avatarUrl} size={40} />
              <div className="sr-text">
                <div className="sr-name">
                  {u.nickname} <PresenceDot online={online.has(u.id)} />
                </div>
                <div className="sr-username" dir="ltr">@{u.username}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
