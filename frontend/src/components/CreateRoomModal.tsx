import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Field, IcPlus, IcX, IcLink, IcLock, IcGlobe, IcCheck, IcUsers } from './ui';
import type { Room, CreateRoomData } from '../types/room';

interface Props {
  onClose: () => void;
  onSubmit: (data: CreateRoomData) => Promise<Room>;
}

type Stage = 'form' | 'success';

export default function CreateRoomModal({ onClose, onSubmit }: Props) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('form');
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [name, setName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [password, setPassword] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [mode, setMode] = useState<'host_only' | 'collaborative'>('host_only');

  const roomLink = createdRoom
    ? `${import.meta.env.VITE_APP_URL ?? 'http://localhost:5173'}/room/${createdRoom.roomId}`
    : '';

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const room = await onSubmit({
        name: name.trim(),
        videoUrl: videoUrl.trim(),
        ...(password ? { password } : {}),
        isPublic,
        mode,
      });
      setCreatedRoom(room);
      setStage('success');
    } catch {
      setFormError('Không thể tạo phòng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'grid', placeItems: 'center',
        background: 'color-mix(in oklab, var(--scrim) 58%, transparent)',
        backdropFilter: 'blur(4px)', padding: 20,
        animation: 'wpFade .18s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430,
          background: 'var(--surface)', borderRadius: 18,
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
          padding: '26px 26px 24px',
          animation: 'wpRise .22s cubic-bezier(.2,.9,.3,1)',
        }}
      >
        {stage === 'form' ? (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <h2 style={{
                  margin: 0, fontSize: 19, fontWeight: 700,
                  fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--text)',
                }}>Tạo phòng mới</h2>
                <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
                  Dán link video và mời bạn bè cùng xem.
                </p>
              </div>
              <CloseBtn onClick={onClose} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 17 }}>
              <Field label="Tên phòng" placeholder="Tối thứ 6 xem gì?" value={name} onChange={setName} autoFocus />
              <Field label="Link video" icon={<IcLink size={15} />} placeholder="https://youtube.com/watch?v=…" value={videoUrl} onChange={setVideoUrl} />

              {/* Public / Private */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 7 }}>Quyền truy cập</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { v: true,  icon: <IcGlobe size={15} />, t: 'Công khai', d: 'Ai cũng thấy phòng' },
                    { v: false, icon: <IcLock size={15} />,  t: 'Riêng tư',  d: 'Chỉ ai có link' },
                  ] as const).map((o) => (
                    <button
                      key={o.t} type="button" onClick={() => setIsPublic(o.v)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                        padding: '11px 13px', borderRadius: 11, cursor: 'pointer', textAlign: 'left',
                        border: isPublic === o.v ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                        background: isPublic === o.v
                          ? 'color-mix(in oklab, var(--accent) 9%, var(--surface))'
                          : 'var(--field)',
                        transition: 'all .15s', fontFamily: 'var(--font-body)',
                      }}
                    >
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        fontSize: 13.5, fontWeight: 700,
                        color: isPublic === o.v ? 'var(--accent-text)' : 'var(--text)',
                      }}>{o.icon} {o.t}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{o.d}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Control mode */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 7 }}>Chế độ điều khiển</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { v: 'host_only'     as const, icon: <IcLock size={15} />,  t: 'Chỉ host',   d: 'Mình bạn điều khiển video' },
                    { v: 'collaborative' as const, icon: <IcUsers size={15} />, t: 'Bình đẳng',  d: 'Ai cũng play/pause/tua được' },
                  ]).map((o) => (
                    <button
                      key={o.v} type="button" onClick={() => setMode(o.v)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                        padding: '11px 13px', borderRadius: 11, cursor: 'pointer', textAlign: 'left',
                        border: mode === o.v ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                        background: mode === o.v
                          ? 'color-mix(in oklab, var(--accent) 9%, var(--surface))'
                          : 'var(--field)',
                        transition: 'all .15s', fontFamily: 'var(--font-body)',
                      }}
                    >
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        fontSize: 13.5, fontWeight: 700,
                        color: mode === o.v ? 'var(--accent-text)' : 'var(--text)',
                      }}>{o.icon} {o.t}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{o.d}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Mật khẩu" hint="(không bắt buộc)" type="password" icon={<IcLock size={15} />} placeholder="Để trống nếu phòng mở" value={password} onChange={setPassword} />

              {formError && (
                <p style={{ margin: 0, fontSize: 13, color: '#e0484f' }}>{formError}</p>
              )}

              <Btn kind="primary" size="lg" type="submit" disabled={!name.trim() || !videoUrl.trim() || submitting} style={{ width: '100%', marginTop: 2 }}>
                <IcPlus size={16} /> {submitting ? 'Đang tạo…' : 'Tạo phòng'}
              </Btn>
            </div>
          </form>
        ) : (
          <div>
            {/* Success header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <h2 style={{
                  margin: 0, fontSize: 19, fontWeight: 700,
                  fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--text)',
                }}>Phòng đã tạo!</h2>
                <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
                  "{createdRoom?.name}" sẵn sàng.
                </p>
              </div>
              <CloseBtn onClick={onClose} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 17 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 7 }}>Chia sẻ link phòng</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly value={roomLink}
                    style={{
                      flex: 1, background: 'var(--field)', border: '1.5px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)',
                      outline: 'none', fontFamily: 'var(--font-body)', minWidth: 0,
                    }}
                  />
                  <Btn kind="soft" onClick={handleCopy} style={{ flexShrink: 0 }}>
                    {copied ? <><IcCheck size={14} /> Đã chép!</> : 'Sao chép'}
                  </Btn>
                </div>
              </div>

              <Btn kind="primary" size="lg" onClick={() => navigate(`/room/${createdRoom!.roomId}`)} style={{ width: '100%' }}>
                Vào phòng ngay
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32, borderRadius: 9, border: 'none',
        background: hov ? 'var(--surface-2)' : 'transparent',
        color: 'var(--text-faint)', cursor: 'pointer',
        display: 'grid', placeItems: 'center', transition: 'background .15s',
      }}>
      <IcX size={17} />
    </button>
  );
}
