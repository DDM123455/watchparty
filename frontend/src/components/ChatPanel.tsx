import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types/socket';
import { Avatar, Field, IcSend } from './ui';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  currentUserId: string;
}

export default function ChatPanel({ messages, onSend, currentUserId }: Props) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <>
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
        display: 'flex', flexDirection: 'column', gap: 13, minHeight: 0,
      }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
            <span style={{
              fontSize: 11.5, color: 'var(--text-faint)',
              background: 'var(--surface-2)', padding: '3px 10px', borderRadius: 999,
            }}>
              Chưa có tin nhắn. Hãy chào nhau!
            </span>
          </div>
        )}

        {messages.map((msg) => {
          const mine = msg.user.id === currentUserId;
          return (
            <div key={msg.id} style={{
              display: 'flex', gap: 9,
              flexDirection: mine ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
            }}>
              <Avatar name={msg.user.displayName} src={msg.user.avatar} size={26} />
              <div style={{
                maxWidth: '76%', display: 'flex', flexDirection: 'column',
                gap: 3, alignItems: mine ? 'flex-end' : 'flex-start',
              }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)', padding: '0 4px' }}>
                  {msg.user.displayName}
                </span>
                <div style={{
                  padding: '8px 12px', fontSize: 13.5, lineHeight: 1.45, wordBreak: 'break-word',
                  color: mine ? '#fff' : 'var(--text)',
                  background: mine ? 'var(--accent)' : 'var(--surface-2)',
                  borderRadius: mine ? '13px 13px 4px 13px' : '13px 13px 13px 4px',
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field placeholder="Nhắn gì đó…" value={draft} onChange={setDraft} onSubmit={send} />
          </div>
          <button
            onClick={send}
            title="Gửi"
            style={{
              width: 44, borderRadius: 10, border: 'none',
              cursor: draft.trim() ? 'pointer' : 'default',
              background: draft.trim() ? 'var(--accent)' : 'var(--surface-2)',
              color: draft.trim() ? '#fff' : 'var(--text-faint)',
              display: 'grid', placeItems: 'center', transition: 'all .15s',
            }}
          >
            <IcSend size={17} />
          </button>
        </div>
      </div>
    </>
  );
}
