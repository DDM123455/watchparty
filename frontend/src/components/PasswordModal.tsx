import { useState, useEffect } from 'react';
import api from '../services/api';
import { Btn, Field, IcLock } from './ui';

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

interface Props {
  roomId: string;
  roomName: string;
  onSuccess: (token: string) => void;
}

export default function PasswordModal({ roomId, roomName, onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const locked = cooldown > 0;
  const attemptsLeft = MAX_ATTEMPTS - attempts;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post<{ roomToken: string }>(
        `/rooms/${roomId}/join`,
        { password },
      );
      sessionStorage.setItem(`room_token_${roomId}`, data.roomToken);
      onSuccess(data.roomToken);
    } catch {
      const next = attempts + 1;
      setAttempts(next);
      setPassword('');
      if (next >= MAX_ATTEMPTS) {
        setCooldown(COOLDOWN_SECONDS);
        setAttempts(0);
        setError(`Sai quá ${MAX_ATTEMPTS} lần. Chờ ${COOLDOWN_SECONDS}s trước khi thử lại.`);
      } else {
        setError(`Mật khẩu không đúng. Còn ${MAX_ATTEMPTS - next} lần thử.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center',
      background: 'color-mix(in oklab, var(--scrim) 62%, transparent)',
      backdropFilter: 'blur(4px)', padding: 20,
      animation: 'wpFade .18s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--surface)', borderRadius: 18,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
        padding: '28px 26px 26px',
        animation: 'wpRise .22s cubic-bezier(.2,.9,.3,1)',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center',
                background: 'color-mix(in oklab, var(--warn) 14%, var(--surface-2))',
                color: 'var(--warn)', flexShrink: 0,
              }}>
                <IcLock size={17} />
              </div>
              <h2 style={{
                margin: 0, fontSize: 17, fontWeight: 700,
                fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--text)',
              }}>
                Phòng có mật khẩu
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              "{roomName}" yêu cầu mật khẩu để tham gia.
            </p>
          </div>

          <Field
            label="Mật khẩu"
            type="password"
            placeholder="Nhập mật khẩu phòng…"
            value={password}
            onChange={locked ? undefined : setPassword}
            autoFocus={!locked}
            icon={<IcLock size={15} />}
          />

          {/* Attempts bar */}
          {attempts > 0 && !locked && (
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 999,
                  background: i < attempts ? '#e0484f' : 'var(--surface-2)',
                  transition: 'background .2s',
                }} />
              ))}
            </div>
          )}

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: locked ? 'var(--warn)' : '#e0484f', lineHeight: 1.5 }}>
              {error}
            </p>
          )}

          <Btn
            kind="primary"
            size="lg"
            type="submit"
            disabled={submitting || !password || locked}
            style={{ width: '100%' }}
          >
            {locked
              ? `Chờ ${cooldown}s…`
              : submitting
              ? 'Đang vào phòng…'
              : attemptsLeft < MAX_ATTEMPTS
              ? `Thử lại (còn ${attemptsLeft} lần)`
              : 'Vào phòng'}
          </Btn>
        </form>
      </div>
    </div>
  );
}
