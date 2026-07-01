import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import CallPanel from '../components/CallPanel';
import ConversationList from '../components/ConversationList';
import MessageComposer from '../components/MessageComposer';
import MessageList from '../components/MessageList';
import PresenceDot from '../components/PresenceDot';
import ThemeToggle from '../components/ThemeToggle';
import UserSearch from '../components/UserSearch';
import { useAuthStore } from '../store/auth.store';
import { useCallStore } from '../store/call.store';
import { useChatStore } from '../store/chat.store';
import { useFeaturesStore } from '../store/features.store';
import { usePresenceStore } from '../store/presence.store';
import { lastSeenText } from '../utils/format';

export default function ChatPage() {
  const navigate = useNavigate();
  const params = useParams();
  const user = useAuthStore((s) => s.user)!;

  const { conversations, activeId, messages, typing, online, loadConversations, openConversation, setActive } =
    useChatStore();
  const presenceOnline = usePresenceStore((s) => s.online);
  const lastSeen = usePresenceStore((s) => s.lastSeen);
  const features = useFeaturesStore();
  const startCall = useCallStore((s) => s.startCall);
  const [mobilePane, setMobilePane] = useState<'list' | 'thread'>('list');

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Sync active conversation from the URL (deep links + push notification clicks).
  useEffect(() => {
    const idFromUrl = params.conversationId ? Number(params.conversationId) : null;
    if (idFromUrl && idFromUrl !== activeId) {
      void openConversation(idFromUrl);
      setMobilePane('thread');
    }
  }, [params.conversationId, activeId, openConversation]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const select = (id: number) => {
    void openConversation(id);
    setMobilePane('thread');
    navigate(`/chat/${id}`);
  };

  const callsEnabled = features.voiceCall || features.videoCall;
  const peerOnline = activeConv ? presenceOnline.has(activeConv.peer.id) : false;
  const threadMessages = activeId ? messages[activeId] ?? [] : [];

  return (
    <div className="chat-shell">
      {!online && <div className="offline-banner">آفلاین هستید — پیام‌های ذخیره‌شده نمایش داده می‌شوند</div>}

      <div className={`chat-grid pane-${mobilePane}`}>
        {/* Sidebar */}
        <aside className="sidebar">
          <header className="sidebar-header">
            <div className="me">
              <Avatar name={user.nickname} url={user.avatarUrl} size={38} />
              <div className="me-text">
                <strong>{user.nickname}</strong>
                <span dir="ltr">@{user.username}</span>
              </div>
            </div>
            <div className="sidebar-actions">
              <ThemeToggle />
              <button className="icon-btn" title="تنظیمات" onClick={() => navigate('/settings')}>
                ⚙️
              </button>
            </div>
          </header>

          <UserSearch onOpened={select} />
          <ConversationList activeId={activeId} onSelect={select} />
        </aside>

        {/* Thread */}
        <main className="thread">
          {activeConv ? (
            <>
              <header className="thread-header">
                <button className="icon-btn back" onClick={() => { setActive(null); setMobilePane('list'); navigate('/'); }}>
                  ›
                </button>
                <Avatar name={activeConv.peer.nickname} url={activeConv.peer.avatarUrl} size={40} />
                <div className="thread-peer">
                  <div className="thread-name">
                    {activeConv.peer.nickname} <PresenceDot online={peerOnline} />
                  </div>
                  <div className="thread-status">
                    {typing[activeConv.id]
                      ? 'در حال نوشتن…'
                      : lastSeenText(peerOnline, lastSeen[activeConv.peer.id] ?? activeConv.peer.lastSeenAt)}
                  </div>
                </div>

                {callsEnabled && (
                  <div className="thread-call-actions">
                    {features.voiceCall && (
                      <button
                        className="icon-btn"
                        title="تماس صوتی"
                        onClick={() => startCall(activeConv.peer.id, activeConv.peer.nickname, 'audio')}
                      >
                        📞
                      </button>
                    )}
                    {features.videoCall && (
                      <button
                        className="icon-btn"
                        title="تماس تصویری"
                        onClick={() => startCall(activeConv.peer.id, activeConv.peer.nickname, 'video')}
                      >
                        🎥
                      </button>
                    )}
                  </div>
                )}
              </header>

              <MessageList
                messages={threadMessages}
                myUserId={user.id}
                peerTyping={!!typing[activeConv.id]}
              />

              <MessageComposer conversationId={activeConv.id} peerId={activeConv.peer.id} />
            </>
          ) : (
            <div className="thread-empty">
              <div className="thread-empty-logo">💬</div>
              <p>یک گفتگو را انتخاب کنید یا کاربری را جستجو کنید تا شروع کنید</p>
            </div>
          )}
        </main>
      </div>

      {callsEnabled && <CallPanel />}
    </div>
  );
}
