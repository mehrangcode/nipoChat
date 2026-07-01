import { FormEvent, useRef, useState } from 'react';
import { uploadsApi } from '../api';
import { emitTyping } from '../hooks/useSocket';
import { useChatStore } from '../store/chat.store';
import { MessageType } from '../types';

interface Props {
  conversationId: number;
  peerId: number;
}

export default function MessageComposer({ conversationId, peerId }: Props) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const typingStop = useRef<ReturnType<typeof setTimeout>>();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const send = (payload: {
    type: MessageType;
    body?: string | null;
    mediaUrl?: string | null;
    mediaMeta?: Record<string, unknown> | null;
  }) => {
    sendMessage({ conversationId, peerId, ...payload });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    send({ type: 'text', body });
    setText('');
    emitTyping(conversationId, false);
  };

  const onType = (v: string) => {
    setText(v);
    emitTyping(conversationId, true);
    if (typingStop.current) clearTimeout(typingStop.current);
    typingStop.current = setTimeout(() => emitTyping(conversationId, false), 1500);
  };

  const onFilePicked = async (file: File | undefined, kind: MessageType) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadsApi.upload(file);
      const type: MessageType = kind === 'image' && res.mime.startsWith('image/') ? 'image' : kind;
      send({
        type,
        mediaUrl: res.url,
        mediaMeta: { name: res.name, size: res.size, mime: res.mime },
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      if (imageRef.current) imageRef.current.value = '';
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        setUploading(true);
        try {
          const res = await uploadsApi.upload(file);
          send({
            type: 'voice',
            mediaUrl: res.url,
            mediaMeta: { name: res.name, size: res.size, mime: res.mime },
          });
        } finally {
          setUploading(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert('دسترسی به میکروفون امکان‌پذیر نیست.');
    }
  };

  return (
    <form className="composer" onSubmit={onSubmit}>
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onFilePicked(e.target.files?.[0], 'image')}
      />
      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => onFilePicked(e.target.files?.[0], 'file')}
      />

      <button
        type="button"
        className="icon-btn"
        title="ارسال تصویر"
        onClick={() => imageRef.current?.click()}
        disabled={uploading || recording}
      >
        🖼️
      </button>
      <button
        type="button"
        className="icon-btn"
        title="ارسال فایل"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || recording}
      >
        📎
      </button>

      <input
        className="composer-input"
        value={text}
        onChange={(e) => onType(e.target.value)}
        placeholder={recording ? 'در حال ضبط…' : uploading ? 'در حال ارسال…' : 'پیام بنویسید…'}
        disabled={recording}
      />

      {text.trim() ? (
        <button type="submit" className="icon-btn send" title="ارسال">
          ➤
        </button>
      ) : (
        <button
          type="button"
          className={`icon-btn ${recording ? 'recording' : ''}`}
          title={recording ? 'توقف و ارسال' : 'ضبط صدا'}
          onClick={toggleRecording}
          disabled={uploading}
        >
          {recording ? '⏹️' : '🎤'}
        </button>
      )}
    </form>
  );
}
