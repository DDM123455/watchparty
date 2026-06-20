import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useScreenShare } from '../hooks/useScreenShare';
import { useVoiceChat } from '../hooks/useVoiceChat';
import type { VoiceMember } from '../hooks/useVoiceChat';
import { useToast } from '../components/Toast';
import PasswordModal from '../components/PasswordModal';
import VideoPlayer from '../components/VideoPlayer';
import ChatPanel from '../components/ChatPanel';
import MemberList from '../components/MemberList';
import Whiteboard from '../components/Whiteboard';
import type { Room } from '../types/room';
import type { MemberInfo } from '../types/socket';
import {
  Avatar, Badge, Btn, Field, IconBtn, ThemeToggle,
  IcArrowL, IcCheck, IcFilm, IcLink, IcLock, IcMic, IcMicOff, IcMonitor, IcPencil, IcSignal, IcUsers, IcX,
} from '../components/ui';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get<Room>(`/rooms/${id}`)
      .then(({ data }) => {
        setRoom(data);
        if (!data.hasPassword) {
          setAuthorized(true);
        } else {
          const stored = sessionStorage.getItem(`room_token_${id}`);
          if (stored) setAuthorized(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Host is always authorized — runs after both room + user are loaded
  useEffect(() => {
    if (room && user && room.hostId === user.id) {
      setAuthorized(true);
    }
  }, [room, user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 42 }}>🔍</div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500, fontFamily: 'var(--font-display)' }}>
          Không tìm thấy phòng
        </p>
        <button
          onClick={() => navigate('/')}
          style={{ fontSize: 13, color: 'var(--accent-text)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Về trang chủ
        </button>
      </div>
    );
  }

  if (!authorized && room) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <PasswordModal
          roomId={room.roomId}
          roomName={room.name}
          onSuccess={() => setAuthorized(true)}
        />
      </div>
    );
  }

  if (!room || !user) return null;

  return <RoomView room={room} currentUserId={user.id} />;
}

function RoomView({ room, currentUserId }: { room: Room; currentUserId: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isHost = currentUserId === room.hostId;
  const canControl = isHost || room.mode === 'collaborative';

  const { socketRef, connected, members, messages, videoState, sendMessage, changedVideoUrl, roomDeleted, wbItems, screenSharerId } =
    useSocket(room.roomId);

  const { sharing, remoteStream, sharerName, startShare, stopShare, shareError } =
    useScreenShare(socketRef, room.roomId, screenSharerId);

  const { inVoice, voiceMembers, micMuted, joinVoice, leaveVoice, toggleMic, voiceError } =
    useVoiceChat(socketRef, room.roomId);

  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoFullRef = useRef<HTMLVideoElement>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [screenView, setScreenView] = useState<'video' | 'screenshare'>('video');
  const [screenShareFullscreen, setScreenShareFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [videoUrl, setVideoUrl] = useState(room.videoUrl);
  const videoUrlRef = useRef(room.videoUrl);
  useEffect(() => { videoUrlRef.current = videoUrl; }, [videoUrl]);
  const [changingVideo, setChangingVideo] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [extractError, setExtractError] = useState<'not_found' | 'network' | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState<'members' | 'chat'>('chat');

  const prevMembersRef = useRef<MemberInfo[]>([]);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (members.length === 0) return;
    if (!initialLoadRef.current) {
      prevMembersRef.current = members;
      initialLoadRef.current = true;
      return;
    }
    const prevIds = new Set(prevMembersRef.current.map((m) => m.id));
    const currIds = new Set(members.map((m) => m.id));
    for (const m of members) {
      if (!prevIds.has(m.id) && m.id !== currentUserId) toast(`${m.displayName} đã vào phòng`, 'info');
    }
    for (const m of prevMembersRef.current) {
      if (!currIds.has(m.id) && m.id !== currentUserId) toast(`${m.displayName} đã rời phòng`, 'info');
    }
    prevMembersRef.current = members;
  }, [members]); // eslint-disable-line react-hooks/exhaustive-deps

  const wasConnectedRef = useRef(false);
  useEffect(() => {
    if (connected) {
      if (wasConnectedRef.current === false && initialLoadRef.current) toast('Đã kết nối lại', 'success');
      wasConnectedRef.current = true;
    } else if (wasConnectedRef.current) {
      toast('Mất kết nối — đang thử lại…', 'error');
    }
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!changedVideoUrl) return;
    if (changedVideoUrl !== videoUrlRef.current) setVideoLoading(true);
    setVideoUrl(changedVideoUrl);
    setChangingVideo(false);
    setSubmitting(false);
    setNewUrlInput('');
    toast('Video đã được cập nhật', 'info');
  }, [changedVideoUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (changingVideo) {
      setNewUrlInput(videoUrl);
      setExtractError(null);
    }
  }, [changingVideo, videoUrl]);

  useEffect(() => {
    if (screenVideoRef.current) screenVideoRef.current.srcObject = remoteStream;
    if (screenVideoFullRef.current) screenVideoFullRef.current.srcObject = remoteStream;
  }, [remoteStream, screenShareFullscreen]); // screenShareFullscreen: element mounts lazily, re-run to assign srcObject

  useEffect(() => {
    setScreenView(remoteStream ? 'screenshare' : 'video');
    if (!remoteStream) setScreenShareFullscreen(false);
  }, [remoteStream]);

  useEffect(() => {
    if (shareError) toast(shareError, 'error');
  }, [shareError]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (voiceError) toast(voiceError, 'error');
  }, [voiceError]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC to exit fullscreen screen share
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setScreenShareFullscreen(false);
    };
    if (screenShareFullscreen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screenShareFullscreen]);

  // Safety timeout: clear loading overlay if VideoPlayer never calls onReady (e.g. error)
  useEffect(() => {
    if (!videoLoading) return;
    const t = setTimeout(() => setVideoLoading(false), 20_000);
    return () => clearTimeout(t);
  }, [videoLoading]);

  const handleChangeVideo = async () => {
    const trimmed = newUrlInput.trim();
    if (!trimmed) return;
    if (!socketRef.current || !connected) { toast('Chưa kết nối tới server', 'error'); return; }
    setSubmitting(true);
    setVideoLoading(true);
    setExtractError(null);

    // For non-direct, non-YouTube URLs: resolve to actual video URL first so nobody
    // ever sees a broken iframe or "refused to connect" screen.
    const isDirectOrYouTube =
      /(?:youtube\.com\/watch|youtu\.be\/)/i.test(trimmed) ||
      /\.(mp4|webm|ogg|mov|m3u8|mpd)(\?|$)/i.test(trimmed);

    const PROXY_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    let finalUrl = trimmed;
    if (!isDirectOrYouTube) {
      toast('Đang trích xuất video…', 'info');
      try {
        const { data } = await api.get<{ videoUrl: string | null; type: string | null; platform?: string; needsProxy?: boolean }>(
          `/rooms/resolve-video?url=${encodeURIComponent(trimmed)}`,
        );
        if (data.videoUrl) {
          finalUrl = data.needsProxy
            ? `${PROXY_BASE}/rooms/hls-proxy?url=${encodeURIComponent(data.videoUrl)}`
            : data.videoUrl;
        } else {
          setExtractError('not_found');
          setSubmitting(false);
          setVideoLoading(false);
          return;
        }
      } catch {
        setExtractError('network');
        setSubmitting(false);
        setVideoLoading(false);
        return;
      }
    }

    socketRef.current.emit(
      'video:changeUrl',
      { roomId: room.roomId, videoUrl: finalUrl },
      (res?: { ok: boolean; error?: string }) => {
        setSubmitting(false);
        if (res?.error) {
          toast(res.error, 'error');
          setVideoLoading(false);
        }
      },
    );
  };

  // Navigate away when room is deleted by host
  useEffect(() => {
    if (roomDeleted && !isHost) {
      toast('Phòng đã bị xoá bởi chủ phòng', 'error');
      navigate('/');
    }
  }, [roomDeleted]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteRoom = async () => {
    setDeleting(true);
    try {
      await api.delete(`/rooms/${room.roomId}`);
      navigate('/');
    } catch {
      toast('Không thể xoá phòng', 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.roomId}`).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header style={{
        height: 58, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface)',
      }}>
        <button
          onClick={() => navigate('/')}
          title="Rời phòng"
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          style={{
            width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'background .15s',
          }}
        >
          <IcArrowL size={16} />
        </button>

        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{
                margin: 0, fontSize: 15.5, fontWeight: 700, fontFamily: 'var(--font-display)',
                letterSpacing: '-0.01em', color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {room.name}
              </h1>
              {room.hasPassword && <IcLock size={13} style={{ color: 'var(--warn)', flexShrink: 0 }} />}
            </div>
            <div style={{
              fontSize: 12, color: 'var(--text-faint)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {videoUrl.replace(/^https?:\/\//, '')}
            </div>
          </div>
          <Badge tone={connected ? 'green' : 'neutral'}>
            <IcSignal size={12} /> {connected ? 'Đồng bộ' : 'Đang kết nối…'}
          </Badge>
        </div>

        {/* ── Right action group ── compact icon + text buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>

          {/* Avatar stack */}
          {members.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 2 }}>
              {members.slice(0, 3).map((m, i) => (
                <div key={m.id} style={{ marginLeft: i ? -7 : 0, flexShrink: 0 }} title={m.displayName}>
                  <Avatar name={m.displayName} src={m.avatar} size={26} ring />
                </div>
              ))}
              <span style={{ marginLeft: 7, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {members.length}
              </span>
            </div>
          )}

          {/* Invite */}
          <Btn kind="soft" size="sm" onClick={handleCopyLink} style={{ flexShrink: 0 }}>
            {copied ? <IcCheck size={13} /> : <IcLink size={13} />}
            {copied ? 'Đã chép!' : 'Mời'}
          </Btn>

          {/* Collaborative badge */}
          {room.mode === 'collaborative' && !isHost && (
            <Badge tone="green"><IcUsers size={11} /> Bình đẳng</Badge>
          )}

          {/* Change video — icon only */}
          {canControl && (
            <IconBtn
              onClick={() => setChangingVideo(v => !v)}
              title="Đổi video"
              style={changingVideo ? { background: 'color-mix(in oklab,var(--accent) 14%,var(--surface-2))', color: 'var(--accent-text)', borderColor: 'transparent' } : {}}
            >
              <IcFilm size={16} />
            </IconBtn>
          )}

          {/* Whiteboard — icon only */}
          <IconBtn
            onClick={() => setShowWhiteboard(v => !v)}
            title="Bảng trắng"
            style={showWhiteboard ? { background: 'color-mix(in oklab,var(--accent) 14%,var(--surface-2))', color: 'var(--accent-text)', borderColor: 'transparent' } : {}}
          >
            <IcPencil size={16} />
          </IconBtn>

          {/* Screen share — icon only */}
          {!sharing && !sharerName && (
            <IconBtn onClick={startShare} title="Chia sẻ màn hình">
              <IcMonitor size={16} />
            </IconBtn>
          )}
          {sharing && (
            <IconBtn
              onClick={stopShare}
              title="Đang chia sẻ · Dừng"
              style={{ background: 'color-mix(in oklab,var(--accent) 14%,var(--surface-2))', color: 'var(--accent-text)', borderColor: 'transparent' }}
            >
              <IcMonitor size={16} />
            </IconBtn>
          )}
          {!sharing && sharerName && (
            <IconBtn title={`${sharerName} đang chia sẻ`} style={{ color: 'var(--ok-text)', cursor: 'default', borderColor: 'transparent', background: 'color-mix(in oklab,#27b07c 12%,var(--surface-2))' }}>
              <IcMonitor size={16} />
            </IconBtn>
          )}

          {/* Voice — icon only; leave button when active */}
          {!inVoice ? (
            <IconBtn onClick={() => { void joinVoice(); }} title="Tham gia voice chat">
              <IcMic size={16} />
            </IconBtn>
          ) : (
            <>
              <IconBtn
                onClick={toggleMic}
                title={micMuted ? 'Bỏ tắt mic' : 'Tắt mic'}
                style={micMuted
                  ? { background: 'color-mix(in oklab,var(--warn) 14%,var(--surface-2))', color: 'var(--warn)', borderColor: 'transparent' }
                  : { background: 'color-mix(in oklab,#27b07c 14%,var(--surface-2))', color: 'var(--ok-text)', borderColor: 'transparent' }
                }
              >
                {micMuted ? <IcMicOff size={16} /> : <IcMic size={16} />}
              </IconBtn>
              <IconBtn onClick={leaveVoice} title="Rời voice" style={{ color: 'var(--text-faint)' }}>
                <IcX size={14} />
              </IconBtn>
            </>
          )}

          {/* Delete room */}
          {isHost && !confirmDelete && (
            <Btn kind="danger" size="sm" onClick={() => setConfirmDelete(true)} style={{ flexShrink: 0 }}>
              Xoá
            </Btn>
          )}
          {isHost && confirmDelete && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Xoá?</span>
              <Btn kind="danger" size="sm" disabled={deleting} onClick={handleDeleteRoom}
                style={{ background: '#e0484f', color: '#fff', border: 'none' }}>
                {deleting ? '…' : 'OK'}
              </Btn>
              <IconBtn onClick={() => setConfirmDelete(false)}>
                <IcX size={14} />
              </IconBtn>
            </div>
          )}

        </div>
        <div style={{ flexShrink: 0, marginLeft: 4 }}><ThemeToggle /></div>
      </header>

      {/* ── Change video bar ────────────────────────────────────── */}
      {canControl && changingVideo && (
        <div style={{
          borderBottom: '1px solid var(--border)', background: 'var(--surface-2)',
          flexShrink: 0, display: 'flex', flexDirection: 'column',
        }}>
          {/* Input row */}
          <div style={{ padding: '10px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Field
                placeholder="Dán link video mới (YouTube, .mp4, hoặc trang web)…"
                value={newUrlInput}
                onChange={v => { setNewUrlInput(v); setExtractError(null); }}
                onSubmit={handleChangeVideo}
                icon={<IcLink size={15} />}
              />
            </div>
            <Btn kind="primary" onClick={() => { void handleChangeVideo(); }} disabled={!newUrlInput.trim() || submitting}>
              {submitting ? 'Đang xử lý…' : 'Cập nhật'}
            </Btn>
            <IconBtn onClick={() => { setChangingVideo(false); setExtractError(null); }}>
              <IcX size={15} />
            </IconBtn>
          </div>

          {/* Extraction error panel */}
          {extractError && (
            <div style={{
              margin: '0 14px 12px',
              borderRadius: 12,
              border: '1px solid color-mix(in oklab,var(--warn) 30%,var(--border))',
              background: 'color-mix(in oklab,var(--warn) 6%,var(--surface))',
              overflow: 'hidden',
            }}>
              {/* Error header */}
              <div style={{
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid color-mix(in oklab,var(--warn) 20%,var(--border))',
              }}>
                <span style={{ fontSize: 15 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {extractError === 'not_found'
                      ? 'Không trích xuất được video từ trang này'
                      : 'Lỗi kết nối khi trích xuất video'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                    {extractError === 'not_found'
                      ? 'Video có thể bị bảo vệ, yêu cầu đăng nhập, hoặc trang không hỗ trợ nhúng.'
                      : 'Hãy kiểm tra kết nối mạng hoặc thử lại sau.'}
                  </div>
                </div>
              </div>

              {/* Screen share suggestion */}
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'color-mix(in oklab,var(--accent) 16%,var(--surface-2))',
                  display: 'grid', placeItems: 'center', color: 'var(--accent-text)',
                }}>
                  <IcMonitor size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-text)', marginBottom: 2 }}>
                    Dùng Chia sẻ màn hình thay thế
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    Real-time · Có tiếng · Tất cả thành viên xem ngay — không cần link trực tiếp.
                    Nhấn nút <strong style={{ color: 'var(--text)' }}><IcMonitor size={11} style={{ verticalAlign: 'middle' }} /> Màn hình</strong> trên thanh header phía trên.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="room-body" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* Player */}
        <div className="room-player" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--player-bg)', position: 'relative' }}>

          {/* ── Screen share in-player view ── */}
          {remoteStream && (
            <div style={{
              flex: screenView === 'screenshare' ? 1 : 0,
              display: screenView === 'screenshare' ? 'flex' : 'none',
              flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0,
            }}>
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                style={{ flex: 1, width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '40px 16px 12px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, color: '#ddd', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IcMonitor size={13} /> {sharerName ?? 'Màn hình được chia sẻ'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setScreenView('video')}
                    style={{
                      padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(255,255,255,0.15)', color: '#fff',
                      fontSize: 12, backdropFilter: 'blur(4px)',
                    }}
                  >
                    ← Video gốc
                  </button>
                  <button
                    onClick={() => setScreenShareFullscreen(true)}
                    style={{
                      padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                      border: 'none', background: 'var(--accent)', color: '#fff',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    ⛶ Toàn màn hình
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Normal video player ── */}
          <div style={{
            flex: screenView === 'video' ? 1 : 0,
            display: screenView === 'video' ? 'flex' : 'none',
            flexDirection: 'column', position: 'relative',
          }}>
            <VideoPlayer
              key={videoUrl}
              videoUrl={videoUrl}
              canControl={canControl}
              roomId={room.roomId}
              socketRef={socketRef}
              connected={connected}
              initialState={videoState}
              onReady={() => setVideoLoading(false)}
            />
            {/* Screen share available — switch to it */}
            {remoteStream && !sharing && (
              <button
                onClick={() => setScreenView('screenshare')}
                style={{
                  position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                  padding: '6px 14px', borderRadius: 20, zIndex: 5,
                  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                }}
              >
                <IcMonitor size={13} /> {sharerName} đang chia sẻ màn hình · Xem
              </button>
            )}
            {videoLoading && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'color-mix(in oklab, var(--player-bg) 85%, transparent)',
                gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang tải video…</span>
              </div>
            )}
          </div>

          {/* ── Theater mode toggle (right edge) ── */}
          <button
            className="theater-toggle"
            onClick={() => setSidebarOpen(v => !v)}
            title={sidebarOpen ? 'Theater mode (ẩn sidebar)' : 'Hiện sidebar'}
            style={{
              position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
              width: 20, height: 56, zIndex: 6,
              borderRadius: sidebarOpen ? '6px 0 0 6px' : 6,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRight: sidebarOpen ? 'none' : '1px solid var(--border)',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, padding: 0,
              opacity: 0.45,
              transition: 'opacity 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--border)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.45'; e.currentTarget.style.background = 'var(--surface-2)'; }}
          >
            {sidebarOpen ? '›' : '‹'}
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className="room-sidebar"
          style={{
            width: sidebarOpen ? 330 : 0,
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            borderLeft: sidebarOpen ? '1px solid var(--border)' : 'none',
            background: 'var(--surface)', minHeight: 0,
            overflow: 'hidden',
            transition: 'width 0.2s ease',
          }}
        >
          {/* Mobile tabs */}
          <div className="room-sidebar-tabs">
            {(['members', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 13.5, fontWeight: 600,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: activeTab === tab ? 'var(--text)' : 'var(--text-faint)',
                  borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'color .15s',
                }}
              >
                {tab === 'members' ? `Thành viên · ${members.length}` : 'Trò chuyện'}
              </button>
            ))}
          </div>

          {/* Members (desktop: always visible; mobile: when tab=members) */}
          <div className={`room-sidebar-members${activeTab === 'members' ? ' active' : ''}`}>
            <MemberList members={members} hostId={room.hostId} />
          </div>

          {/* Chat — header sits outside ChatPanel so mobile tabs can hide it cleanly */}
          <div className={`room-sidebar-chat${activeTab === 'members' ? ' hidden' : ''}`}>
            <div className="chat-panel-header" style={{
              padding: '12px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                Trò chuyện
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 999,
                fontSize: 11.5, fontWeight: 700,
                background: 'var(--surface-2)', color: 'var(--text-muted)',
              }}>
                <IcUsers size={11} /> {members.length}
              </span>
            </div>
            <ChatPanel
              messages={messages}
              onSend={sendMessage}
              currentUserId={currentUserId}
            />
          </div>
        </aside>
      </div>

      {/* ── Voice chat audio elements (hidden) ──────────────────── */}
      {voiceMembers.map(m => <VoiceAudio key={m.socketId} member={m} />)}

      {/* ── Whiteboard overlay ──────────────────────────────────── */}
      {showWhiteboard && (
        <Whiteboard
          socketRef={socketRef}
          roomId={room.roomId}
          initialItems={wbItems}
          onClose={() => setShowWhiteboard(false)}
        />
      )}

      {/* ── Screen share fullscreen overlay ─────────────────────── */}
      {remoteStream && screenShareFullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: '#000',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <video
            ref={screenVideoFullRef}
            autoPlay
            playsInline
            style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 52px)', objectFit: 'contain' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          }}>
            <span style={{ fontSize: 13, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IcMonitor size={13} /> {sharerName ?? 'Màn hình được chia sẻ'}
            </span>
            <button
              onClick={() => setScreenShareFullscreen(false)}
              style={{
                padding: '5px 14px', borderRadius: 7, cursor: 'pointer',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', fontSize: 13,
              }}
            >
              Thu nhỏ ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VoiceAudio({ member }: { member: VoiceMember }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && member.stream) ref.current.srcObject = member.stream;
  }, [member.stream]);
  return <audio ref={ref} autoPlay playsInline style={{ display: 'none' }} />;
}
