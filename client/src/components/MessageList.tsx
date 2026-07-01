import { useEffect, useRef } from 'react';
import { MessageDTO } from '../types';
import { formatDay } from '../utils/format';
import MessageBubble from './MessageBubble';

interface Props {
  messages: MessageDTO[];
  myUserId: number;
  peerTyping: boolean;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function MessageList({ messages, myUserId, peerTyping }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, peerTyping]);

  let lastDay = '';

  return (
    <div className="message-list">
      {messages.map((m) => {
        const dk = dayKey(m.createdAt);
        const showDay = dk !== lastDay;
        lastDay = dk;
        const mine = m.pending || m.senderId === myUserId;
        return (
          <div key={m.clientId ?? m.id}>
            {showDay && <div className="day-sep"><span>{formatDay(m.createdAt)}</span></div>}
            <MessageBubble message={m} mine={mine} />
          </div>
        );
      })}
      {peerTyping && (
        <div className="bubble-row peer">
          <div className="bubble bubble-peer typing">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
