import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRooms } from '../hooks/useRooms';
import { useToast } from '../components/Toast';
import CreateRoomModal from '../components/CreateRoomModal';
import { MovieNightTab } from '../components/movie-night/MovieNightTab';
import {
  Logo, Avatar, ThemeToggle, IconBtn, Btn, Badge, LiveDot,
  IcLogout, IcPlus, IcSearch, IcFilm, IcLock, IcPlay, IcPause, IcX,
} from '../components/ui';
import type { Room, CreateRoomData } from '../types/room';

type Tab = 'rooms' | 'movie-night';

export default function HomePage() {
  const { user, logout } = useAuth();
  const { rooms, loading, error, createRoom, deleteRoom } = useRooms();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [query,      setQuery]      = useState('');
  const [tab,        setTab]        = useState<Tab>('rooms');
  const navigate = useNavigate();

  const handleCreateRoom = async (data: CreateRoomData): Promise<Room> => {
    const room = await createRoom(data);
    toast('Đã tạo phòng!', 'success');
    return room;
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await deleteRoom(roomId);
      toast('Đã xoá phòng', 'success');
    } catch {
      toast('Không thể xoá phòng', 'error');
    }
  };

  const filtered = rooms.filter((r) =>
    (r.name + (r.host?.displayName ?? '')).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto', padding: '0 28px', height: 62,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <Logo size={19} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              to="/about"
              style={{
                fontSize: 13.5, fontWeight: 600, color: 'var(--text-muted)',
                textDecoration: 'none', padding: '6px 12px', borderRadius: 8,
                transition: 'color .15s, background .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              Giới thiệu
            </Link>
            <ThemeToggle />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 6px', borderRadius: 999 }}>
              <Avatar name={user?.displayName ?? '?'} src={user?.avatar} size={30} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', display: 'none' }}
                className="sm:inline">{user?.displayName}</span>
            </div>
            <IconBtn onClick={logout} title="Đăng xuất"><IcLogout size={16} /></IconBtn>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px 70px' }}>

        {/* ── Tab bar ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 4, padding: '16px 0 0', marginBottom: 28,
          borderBottom: '1px solid var(--border)',
        }}>
          {([
            { key: 'rooms',       label: '🎬 Phòng xem' },
            { key: 'movie-night', label: '🍿 Movie Night' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '9px 18px', borderRadius: '10px 10px 0 0',
                border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: tab === t.key ? 'var(--surface)' : 'transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Movie Night Tab ──────────────────────────────────── */}
        {tab === 'movie-night' && <MovieNightTab />}

        {/* ── Rooms Tab ───────────────────────────────────────── */}
        {tab === 'rooms' && <>

        {/* Page head */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap', marginBottom: 26,
        }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: 26, fontWeight: 700,
              fontFamily: 'var(--font-display)', letterSpacing: '-0.025em', color: 'var(--text)',
            }}>Phòng công khai</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
              {loading ? 'Đang tải…' : `${filtered.length} phòng đang mở · vào xem cùng mọi người`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
              background: 'var(--field)', borderRadius: 10,
              border: '1.5px solid var(--border)', width: 220,
            }}>
              <IcSearch size={15} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm phòng hoặc chủ phòng…"
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  padding: '10px 0', fontSize: 13.5, color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>
            <Btn kind="primary" onClick={() => setShowCreate(true)}>
              <IcPlus size={15} /> Tạo phòng
            </Btn>
          </div>
        </div>

        {/* Error */}
        {!loading && error && (
          <div style={{
            border: '1.5px dashed var(--border)', borderRadius: 18, padding: '64px 24px',
            display: 'grid', placeItems: 'center', textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{error}</p>
            <button onClick={() => window.location.reload()} style={{
              marginTop: 12, fontSize: 14, color: 'var(--accent-text)', background: 'none',
              border: 'none', cursor: 'pointer',
            }}>Thử lại</button>
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px,1fr))', gap: 18 }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{
            border: '1.5px dashed var(--border)', borderRadius: 18,
            padding: '64px 24px', display: 'grid', placeItems: 'center', textAlign: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, maxWidth: 320 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center',
                background: 'color-mix(in oklab, var(--accent) 12%, var(--surface-2))',
                color: 'var(--accent-text)', marginBottom: 6,
              }}>
                <IcFilm size={24} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {query ? 'Không tìm thấy phòng nào' : 'Chưa có phòng nào'}
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                {query ? 'Thử từ khóa khác, hoặc' : ''} Tạo phòng mới và mời bạn bè cùng xem.
              </p>
              <div style={{ marginTop: 10 }}>
                <Btn kind="soft" onClick={() => setShowCreate(true)}><IcPlus size={15} /> Tạo phòng mới</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Room grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px,1fr))', gap: 18 }}>
            {filtered.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                onJoin={() => navigate(`/room/${r.roomId}`)}
                onDelete={user?.id === r.hostId ? () => handleDeleteRoom(r.roomId) : undefined}
              />
            ))}
          </div>
        )}

        </>}

        {/* ── About strip ─────────────────────────────────────── */}
        <div style={{
          marginTop: 52, borderTop: '1px solid var(--border)', paddingTop: 32, paddingBottom: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text)' }}>WatchParty</strong> — xem phim cùng bạn bè theo thời gian thực,
              có chat, voice, chia sẻ màn hình và nhiều hơn nữa.
            </p>
          </div>
          <Link
            to="/about"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', borderRadius: 10, flexShrink: 0,
              border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text-muted)',
              fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent-text)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            ✦ Xem tính năng &amp; giới thiệu →
          </Link>
        </div>
      </main>

      {showCreate && (
        <CreateRoomModal onClose={() => setShowCreate(false)} onSubmit={handleCreateRoom} />
      )}
    </div>
  );
}

function RoomCard({ room, onJoin, onDelete }: { room: Room; onJoin: () => void; onDelete?: () => void }) {
  const [hov, setHov] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const playing = true; // rooms don't expose live state; treat as playing

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    setConfirmDel(false);
  };

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); if (!deleting) setConfirmDel(false); }}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${confirmDel ? 'color-mix(in oklab, #e0484f 45%, var(--border))' : hov ? 'color-mix(in oklab, var(--accent) 40%, var(--border))' : 'var(--border)'}`,
        borderRadius: 16, overflow: 'hidden',
        transition: 'all .18s ease',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Thumbnail area */}
      <div style={{ position: 'relative', aspectRatio: '16/8', background: 'var(--ph-a)' }}>
        {/* Striped placeholder */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(45deg, var(--ph-a) 0 12px, var(--ph-b) 12px 24px)',
          display: 'grid', placeItems: 'center',
        }}>
          <span style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-faint)',
            background: 'var(--surface)', padding: '4px 10px', borderRadius: 7,
            border: '1px solid var(--border)',
          }}>
            {room.videoUrl.includes('youtube') ? 'youtube' : room.videoUrl.includes('.mp4') ? 'mp4' : 'video'}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'color-mix(in oklab, var(--text) 12%, transparent)' }}>
          <div style={{ width: '30%', height: '100%', background: 'var(--accent)' }} />
        </div>
        {/* Badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          {playing
            ? <Badge tone="live"><LiveDot /> ĐANG PHÁT</Badge>
            : <Badge tone="neutral"><IcPause size={11} /> TẠM DỪNG</Badge>}
        </div>
        {room.hasPassword && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <Badge tone="neutral"><IcLock size={11} /> Có mật khẩu</Badge>
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '15px 16px 16px', display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
        <h3 style={{
          margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)',
          fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{room.name}</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-faint)', minWidth: 0 }}>
          <IcFilm size={13} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {room.videoUrl.replace(/^https?:\/\//, '')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 'auto' }}>
          <Avatar name={room.host?.displayName ?? '?'} src={room.host?.avatar} size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {room.host?.displayName ?? 'Unknown'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Chủ phòng</div>
          </div>

          {confirmDel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Xoá?</span>
              <Btn
                kind="danger"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
                style={{ background: '#e0484f', color: '#fff', border: 'none', padding: '4px 10px' }}
              >
                {deleting ? '…' : 'Xoá'}
              </Btn>
              <IconBtn onClick={(e) => { e.stopPropagation(); setConfirmDel(false); }}>
                <IcX size={13} />
              </IconBtn>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {onDelete && (hov || confirmDel) && (
                <IconBtn
                  title="Xoá phòng"
                  onClick={(e) => { e.stopPropagation(); setConfirmDel(true); }}
                  style={{ color: 'var(--warn)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </IconBtn>
              )}
              <Btn kind={hov ? 'primary' : 'soft'} size="sm" onClick={onJoin}>
                <IcPlay size={13} /> Tham gia
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <div style={{ aspectRatio: '16/8', background: 'var(--surface-2)', animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ padding: '15px 16px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ height: 16, background: 'var(--surface-2)', borderRadius: 6, width: '70%' }} />
        <div style={{ height: 12, background: 'var(--surface-2)', borderRadius: 6, width: '90%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-2)' }} />
          <div style={{ flex: 1, height: 12, background: 'var(--surface-2)', borderRadius: 6 }} />
          <div style={{ width: 68, height: 30, background: 'var(--surface-2)', borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}
