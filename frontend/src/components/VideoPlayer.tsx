import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { MediaPlayer as DashMediaPlayer } from 'dashjs';
import type { MediaPlayerClass as DashPlayer } from 'dashjs';
import type { Socket } from 'socket.io-client';
import type { VideoState } from '../types/socket';
import { IcPlay, IcPause, IcMonitor, LiveDot } from './ui';
import api from '../services/api';

const PROXY_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
// Drift thresholds for timeline sync
const DRIFT_SEEK_S = 4;    // hard seek when drift exceeds this
const DRIFT_RATE_S = 0.5;  // playback-rate nudge for smaller drifts

// Routes all HLS manifest + segment requests through the backend proxy so that
// CORS-restricted CDNs are accessed server-side instead of from the browser.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProxyHlsLoader = class extends (Hls.DefaultConfig.loader as any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load(ctx: any, cfg: any, cbs: any) {
    ctx.url = `${PROXY_BASE}/rooms/hls-proxy?url=${encodeURIComponent(ctx.url as string)}`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super.load(ctx, cfg, cbs);
  }
};

// Minimal YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (e: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { PLAYING: 1; PAUSED: 2; BUFFERING: 3; ENDED: 0 };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

type StreamMode = 'youtube' | 'hls' | 'dash' | 'native' | 'iframe';

interface Props {
  videoUrl: string;
  canControl: boolean;
  roomId: string;
  socketRef: React.MutableRefObject<Socket | null>;
  connected: boolean;
  initialState: VideoState | null;
  onReady?: () => void;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([^&?/#\s]+)/,
  );
  return m?.[1] ?? null;
}

function detectStreamMode(url: string): StreamMode {
  // Proxy URLs: unwrap the inner URL so we detect the real stream type
  const proxyMatch = url.match(/\/rooms\/hls-proxy\?url=([^&]+)/);
  if (proxyMatch) {
    try { return detectStreamMode(decodeURIComponent(proxyMatch[1])); } catch { /* ignore */ }
  }

  if (extractYouTubeId(url)) return 'youtube';
  // Allow / after the extension (e.g. /video.mp4/?rnd=123 — trailing slash before query)
  if (/\.(m3u8|vl)(?:[/?#]|$)/i.test(url)) return 'hls';
  if (/\.mpd(?:[/?#]|$)/i.test(url)) return 'dash';
  if (/\.(mp4|webm|ogg|mov)(?:[/?#]|$)/i.test(url)) return 'native';
  return 'iframe';
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({
  videoUrl,
  canControl,
  roomId,
  socketRef,
  connected,
  initialState,
  onReady,
}: Props) {
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<DashPlayer | null>(null);
  const suppressRef = useRef(false);
  const suppressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks when a playback-rate nudge is active so we can restore on next heartbeat
  const playbackRateRef = useRef(1.0);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [progressHover, setProgressHover] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const initialStateRef = useRef(initialState);
  useEffect(() => { initialStateRef.current = initialState; }, [initialState]);
  const initialAppliedRef = useRef(false);

  const ytReadyRef = useRef(false);
  const videoMetaReadyRef = useRef(false);

  const streamMode = detectStreamMode(videoUrl);
  const videoId = streamMode === 'youtube' ? extractYouTubeId(videoUrl) : null;
  const isYouTube = streamMode === 'youtube';
  const isDirect = streamMode === 'hls' || streamMode === 'dash' || streamMode === 'native';
  const isHls = streamMode === 'hls';
  const isDash = streamMode === 'dash';

  const suppressSync = (ms = 1500) => {
    suppressRef.current = true;
    if (suppressTimeoutRef.current !== null) clearTimeout(suppressTimeoutRef.current);
    suppressTimeoutRef.current = setTimeout(() => { suppressRef.current = false; }, ms);
  };

  const applyInitialState = useCallback(
    (state: VideoState) => {
      const corrected = state.isPlaying
        ? state.timestamp + (Date.now() - state.updatedAt) / 1000
        : state.timestamp;

      suppressSync();

      if (isYouTube && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(corrected, true);
        if (state.isPlaying) ytPlayerRef.current.playVideo();
        setIsPlaying(state.isPlaying);
      } else if (isDirect && videoRef.current) {
        videoRef.current.currentTime = corrected;
        if (state.isPlaying) void videoRef.current.play().catch(() => null);
        setIsPlaying(state.isPlaying);
      }
    },
    [isYouTube, isDirect],
  );

  // When initialState arrives AFTER the player is already ready (e.g. slow socket join),
  // the onReady/onMeta path already exited without applying state — catch it here.
  useEffect(() => {
    if (!initialState || initialAppliedRef.current) return;
    const ready = isYouTube ? ytReadyRef.current : videoMetaReadyRef.current;
    if (!ready) return;
    initialAppliedRef.current = true;
    applyInitialState(initialState);
  }, [initialState, applyInitialState, isYouTube]);

  // ── YouTube player ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isYouTube || !videoId) return;

    const initPlayer = () => {
      if (!ytContainerRef.current) return;
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId,
        playerVars: { controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, enablejsapi: 1 },
        events: {
          onReady: () => {
            ytReadyRef.current = true;
            onReady?.();
            if (!initialAppliedRef.current && initialStateRef.current) {
              initialAppliedRef.current = true;
              applyInitialState(initialStateRef.current);
            }
          },
          onStateChange: (e) => {
            if (suppressRef.current || !canControl) return;
            const yt = window.YT?.PlayerState;
            if (!yt) return;
            const t = ytPlayerRef.current!.getCurrentTime();
            if (e.data === yt.PLAYING) {
              setIsPlaying(true);
              socketRef.current?.emit('video:play', { roomId, timestamp: t });
            } else if (e.data === yt.PAUSED) {
              setIsPlaying(false);
              socketRef.current?.emit('video:pause', { roomId, timestamp: t });
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); initPlayer(); };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    return () => {
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
      ytReadyRef.current = false;
    };
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // YouTube currentTime polling (IFrame API has no timeupdate event)
  useEffect(() => {
    if (!isYouTube) return;
    const id = setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      setCurrentTime(p.getCurrentTime());
      setDuration(p.getDuration());
    }, 500);
    return () => clearInterval(id);
  }, [isYouTube]);

  // ── Direct video (HLS / DASH / native) ───────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isDirect) return;

    // Always destroy previous players on remount (key={videoUrl} guarantees fresh mount)
    hlsRef.current?.destroy();
    hlsRef.current = null;
    dashRef.current?.reset();
    dashRef.current = null;
    videoMetaReadyRef.current = false;

    if (isHls) {
      // ── HLS via hls.js ──────────────────────────────────────────────────────
      if (Hls.isSupported()) {
        let proxyAttempted = false;

        const initHls = (useProxy: boolean) => {
          hlsRef.current?.destroy();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hls = new Hls(useProxy ? { loader: ProxyHlsLoader } as any : {});
          hlsRef.current = hls;

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (!data.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !proxyAttempted) {
              proxyAttempted = true;
              initHls(true);
            } else {
              setMediaError(data.details);
            }
          });

          hls.loadSource(videoUrl);
          hls.attachMedia(video);
        };

        initHls(false);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl; // Safari native HLS
      }
    } else if (isDash) {
      // ── DASH via dash.js ─────────────────────────────────────────────────────
      let proxyAttempted = false;

      const initDash = (useProxy: boolean) => {
        dashRef.current?.reset();

        const player = DashMediaPlayer().create();
        dashRef.current = player;

        player.updateSettings({ streaming: { buffer: { fastSwitchEnabled: true } } });

        if (useProxy) {
          // Route every DASH request (manifest + segments) through the backend proxy
          // so CORS-restricted CDNs are accessed server-side.
          // Casting player to any avoids the `} as any)` pattern that confuses esbuild's TSX parser.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (player as any).addRequestInterceptor(async (req: Record<string, unknown>) => {
            const url = String(req.url ?? '');
            if (url && !url.includes('/rooms/hls-proxy')) {
              req.url = `${PROXY_BASE}/rooms/hls-proxy?url=${encodeURIComponent(url)}`;
            }
            return req;
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        player.on('error', (_e: any) => {
          if (!proxyAttempted) {
            proxyAttempted = true;
            initDash(true);
          } else {
            setMediaError('DASH playback error');
          }
        });

        const dashUrl = useProxy
          ? `${PROXY_BASE}/rooms/hls-proxy?url=${encodeURIComponent(videoUrl)}`
          : videoUrl;
        player.initialize(video, dashUrl, false);
      };

      initDash(false);
    } else {
      // ── Native mp4/webm ──────────────────────────────────────────────────────
      video.src = videoUrl;
    }

    // ── Shared event listeners for all direct-video modes ────────────────────
    const onTimeUpdate = () => setCurrentTime(video.currentTime);

    const onMeta = () => {
      videoMetaReadyRef.current = true;
      onReady?.();
      setDuration(video.duration);
      if (!initialAppliedRef.current && initialStateRef.current) {
        initialAppliedRef.current = true;
        applyInitialState(initialStateRef.current);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      if (suppressRef.current || !canControl) return;
      socketRef.current?.emit('video:play', { roomId, timestamp: video.currentTime });
    };

    const onPause = () => {
      setIsPlaying(false);
      if (suppressRef.current || !canControl) return;
      socketRef.current?.emit('video:pause', { roomId, timestamp: video.currentTime });
    };

    const onSeeked = () => {
      if (suppressRef.current || !canControl) return;
      socketRef.current?.emit('video:seek', { roomId, timestamp: video.currentTime });
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      dashRef.current?.reset();
      dashRef.current = null;
      videoMetaReadyRef.current = false;
      // Restore playback rate so the next video doesn't inherit an adjusted rate
      if (video.playbackRate !== 1.0) video.playbackRate = 1.0;
      playbackRateRef.current = 1.0;
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [isDirect]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket sync ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || streamMode === 'iframe') return;

    const applySync = (t: number) => {
      suppressSync();
      if (isYouTube) ytPlayerRef.current?.seekTo(t, true);
      else if (videoRef.current) videoRef.current.currentTime = t;
    };

    const onPlay = ({ timestamp, serverTime }: { timestamp: number; serverTime: number }) => {
      setIsSyncing(false);
      setIsPlaying(true);
      const corrected = timestamp + (Date.now() - serverTime) / 1000;
      applySync(corrected);
      if (isYouTube) ytPlayerRef.current?.playVideo();
      else videoRef.current?.play().catch(() => null);
    };

    const onPause = ({ timestamp }: { timestamp: number }) => {
      setIsSyncing(false);
      setIsPlaying(false);
      applySync(timestamp);
      if (isYouTube) ytPlayerRef.current?.pauseVideo();
      else videoRef.current?.pause();
    };

    const onSeek = ({ timestamp }: { timestamp: number }) => {
      setIsSyncing(true);
      applySync(timestamp);
      setTimeout(() => setIsSyncing(false), 1500);
    };

    const onHeartbeat = ({ timestamp, serverTime }: { timestamp: number; serverTime: number }) => {
      const corrected = timestamp + (Date.now() - serverTime) / 1000;
      const localTime = isYouTube
        ? (ytPlayerRef.current?.getCurrentTime() ?? 0)
        : (videoRef.current?.currentTime ?? 0);
      const drift = corrected - localTime; // positive = viewer is behind host

      if (Math.abs(drift) > DRIFT_SEEK_S) {
        // Large drift: instant seek
        if (!isYouTube && videoRef.current) {
          videoRef.current.playbackRate = 1.0;
          playbackRateRef.current = 1.0;
        }
        applySync(corrected);
      } else if (!isYouTube && videoRef.current && Math.abs(drift) > DRIFT_RATE_S) {
        // Small drift: nudge playback rate for a smooth catch-up (±8%)
        const rate = drift > 0 ? 1.08 : 0.92;
        if (playbackRateRef.current !== rate) {
          videoRef.current.playbackRate = rate;
          playbackRateRef.current = rate;
        }
      } else if (!isYouTube && videoRef.current && playbackRateRef.current !== 1.0) {
        // In sync: restore normal speed
        videoRef.current.playbackRate = 1.0;
        playbackRateRef.current = 1.0;
      }
    };

    socket.on('video:play', onPlay);
    socket.on('video:pause', onPause);
    socket.on('video:seek', onSeek);
    socket.on('video:heartbeat', onHeartbeat);

    return () => {
      socket.off('video:play', onPlay);
      socket.off('video:pause', onPause);
      socket.off('video:seek', onSeek);
      socket.off('video:heartbeat', onHeartbeat);
    };
  }, [connected, streamMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply initial state once it's available (covers both race directions)
  useEffect(() => {
    if (!initialState || initialAppliedRef.current) return;
    if (isYouTube && ytReadyRef.current) {
      initialAppliedRef.current = true;
      applyInitialState(initialState);
    } else if (isDirect && videoMetaReadyRef.current) {
      initialAppliedRef.current = true;
      applyInitialState(initialState);
    }
  }, [initialState, isYouTube, isDirect, applyInitialState]);

  // Heartbeat: host emits position every 2 s while playing for drift correction
  useEffect(() => {
    if (!canControl || !connected || streamMode === 'iframe') return;
    const id = setInterval(() => {
      if (!isPlayingRef.current) return;
      const t = isYouTube
        ? (ytPlayerRef.current?.getCurrentTime() ?? 0)
        : (videoRef.current?.currentTime ?? 0);
      socketRef.current?.emit('video:heartbeat', { roomId, timestamp: t });
    }, 2_000);
    return () => clearInterval(id);
  }, [canControl, connected, streamMode, isYouTube, roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ──────────────────────────────────────────────────────────────────
  const handlePlayPause = () => {
    if (!canControl) return;
    if (isPlaying) {
      if (isYouTube) ytPlayerRef.current?.pauseVideo();
      else videoRef.current?.pause();
    } else {
      if (isYouTube) ytPlayerRef.current?.playVideo();
      else videoRef.current?.play().catch(() => null);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canControl || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    if (isYouTube) ytPlayerRef.current?.seekTo(newTime, true);
    else if (videoRef.current) videoRef.current.currentTime = newTime;
    socketRef.current?.emit('video:seek', { roomId, timestamp: newTime });
  };

  const handleSeek = (delta: number) => {
    if (!canControl) return;
    const cur = isYouTube
      ? (ytPlayerRef.current?.getCurrentTime() ?? 0)
      : (videoRef.current?.currentTime ?? 0);
    const dur = isYouTube
      ? (ytPlayerRef.current?.getDuration() ?? 0)
      : (videoRef.current?.duration ?? 0);
    const newTime = Math.max(0, dur > 0 ? Math.min(dur, cur + delta) : cur + delta);
    suppressSync(1500);
    if (isYouTube) ytPlayerRef.current?.seekTo(newTime, true);
    else if (videoRef.current) videoRef.current.currentTime = newTime;
    socketRef.current?.emit('video:seek', { roomId, timestamp: newTime });
  };

  // Stable refs so the keyboard effect doesn't re-register on every render
  const handleSeekRef = useRef(handleSeek);
  handleSeekRef.current = handleSeek;
  const handlePlayPauseRef = useRef(handlePlayPause);
  handlePlayPauseRef.current = handlePlayPause;

  // Controls auto-hide: show on interaction, hide 3 s after playback starts
  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current) setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => { bumpControls(); }, [isPlaying, bumpControls]);
  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  // Keyboard shortcuts: ← / → = ±10s, Space = play/pause
  useEffect(() => {
    if (streamMode === 'iframe') return;
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); handleSeekRef.current(-10); }
      if (e.key === 'ArrowRight') { e.preventDefault(); handleSeekRef.current(+10); }
      if (e.key === ' ')          { e.preventDefault(); handlePlayPauseRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [streamMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = duration > 0 ? currentTime / duration : 0;

  // ── Iframe mode ───────────────────────────────────────────────────────────────
  if (streamMode === 'iframe') {
    return <IframePlayer videoUrl={videoUrl} canControl={canControl} roomId={roomId} socketRef={socketRef} />;
  }

  return (
    <div
      style={{ position: 'relative', width: '100%', background: 'var(--player-bg)', display: 'flex', flexDirection: 'column' }}
      onMouseMove={bumpControls}
      onMouseEnter={bumpControls}
      onMouseLeave={() => { if (isPlayingRef.current) setShowControls(false); }}
      onClick={canControl ? handlePlayPause : undefined}
    >
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
        {isYouTube ? (
          <div ref={ytContainerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        ) : (
          <video
            ref={videoRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}

        {/* Non-host guard — blocks pointer events so viewer can't accidentally seek */}
        {!canControl && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
        )}

        {isSyncing && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff',
              background: 'rgba(0,0,0,0.6)', padding: '8px 18px', borderRadius: 999,
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{
                width: 13, height: 13, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
                animation: 'spin 0.7s linear infinite',
              }} />
              Đang đồng bộ…
            </div>
          </div>
        )}

        {mediaError && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.72)',
          }}>
            <div style={{
              maxWidth: 320, textAlign: 'center', padding: '22px 26px',
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: 22 }}>⚠️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                Không thể phát{isDash ? ' DASH' : ' stream'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                Stream không tải được (CORS hoặc lỗi mạng). Proxy đã được thử tự động nhưng không thành công.
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {mediaError}
              </div>
            </div>
          </div>
        )}

        {/* ── Floating controls overlay ── */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
            padding: '52px 18px 14px',
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: showControls ? 'all' : 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div
            onClick={handleProgressClick}
            onMouseEnter={() => setProgressHover(true)}
            onMouseLeave={() => setProgressHover(false)}
            style={{
              height: progressHover ? 6 : 3, marginBottom: 12,
              borderRadius: 999, background: 'rgba(255,255,255,0.2)',
              position: 'relative', cursor: canControl ? 'pointer' : 'default',
              transition: 'height 0.15s',
            }}
          >
            <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 999, background: '#fff' }} />
            {canControl && (
              <div style={{
                position: 'absolute', left: `${progress * 100}%`, top: '50%',
                transform: 'translate(-50%, -50%)',
                width: progressHover ? 14 : 10, height: progressHover ? 14 : 10,
                borderRadius: '50%', background: '#fff',
                boxShadow: '0 0 0 3px rgba(255,255,255,0.2)',
                transition: 'width 0.15s, height 0.15s',
              }} />
            )}
          </div>

          {/* Buttons row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Time */}
            <span style={{
              fontSize: 12.5, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em',
              color: 'rgba(255,255,255,0.9)', flexShrink: 0,
            }}>
              {formatTime(currentTime)}
              <span style={{ color: 'rgba(255,255,255,0.35)', margin: '0 4px' }}>/</span>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>{formatTime(duration)}</span>
            </span>

            <span style={{ flex: 1 }} />

            {/* Seek back */}
            <button
              onClick={() => handleSeek(-10)}
              disabled={!canControl}
              title="Tua lại 10 giây (←)"
              className="player-ctrl-btn"
            >
              <IcSeekBack />
            </button>

            {/* Play / Pause */}
            <button
              onClick={handlePlayPause}
              disabled={!canControl}
              title={canControl ? (isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)') : 'Chỉ host mới điều khiển được'}
              className="player-ctrl-btn player-ctrl-play"
            >
              {isPlaying ? <IcPause size={22} /> : <IcPlay size={23} />}
            </button>

            {/* Seek forward */}
            <button
              onClick={() => handleSeek(+10)}
              disabled={!canControl}
              title="Tua tới 10 giây (→)"
              className="player-ctrl-btn"
            >
              <IcSeekFwd />
            </button>

            <span style={{ flex: 1 }} />

            {/* Status badge */}
            {canControl ? (
              <span style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.1)', borderRadius: 999,
                padding: '2px 9px',
              }}>Host</span>
            ) : (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <LiveDot color="#4ade80" /> Đồng bộ
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IcSeekBack() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
      <text x="12" y="15.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fontFamily="system-ui,sans-serif" fill="currentColor">10</text>
    </svg>
  );
}

function IcSeekFwd() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"/>
      <text x="12" y="15.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fontFamily="system-ui,sans-serif" fill="currentColor">10</text>
    </svg>
  );
}

// ─── ScreenShareTip ────────────────────────────────────────────────────────────

function ScreenShareTip({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: compact ? 'center' : 'flex-start', gap: 10,
      padding: compact ? '8px 12px' : '12px 14px',
      background: 'color-mix(in oklab,var(--accent) 9%,var(--surface-2))',
      border: '1px solid color-mix(in oklab,var(--accent) 18%,var(--border))',
      borderRadius: 11,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: 'color-mix(in oklab,var(--accent) 16%,var(--surface-2))',
        display: 'grid', placeItems: 'center', color: 'var(--accent-text)',
      }}>
        <IcMonitor size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-text)', marginBottom: 2 }}>
          Thử Chia sẻ màn hình
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
          {compact
            ? 'Real-time · Có tiếng · Mọi thành viên thấy ngay lập tức'
            : 'Video không nhúng được? Chia sẻ màn hình hỗ trợ xem real-time và có tiếng — tất cả thành viên nhìn thấy ngay lập tức, không cần link.'}
        </div>
      </div>
      <div style={{
        flexShrink: 0, fontSize: 11, color: 'var(--text-faint)',
        display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
      }}>
        <IcMonitor size={11} />
        <span>trên header ↑</span>
      </div>
    </div>
  );
}

// ─── IframePlayer ──────────────────────────────────────────────────────────────

const EMBEDDABLE_RE = /player\.vimeo\.com|dailymotion\.com\/embed|twitch\.tv\/(?:embed|player)|streamable\.com\/e\/|\/embed\/|^https?:\/\/player\./i;

function IframePlayer({
  videoUrl,
  canControl,
  roomId,
  socketRef,
}: {
  videoUrl: string;
  canControl: boolean;
  roomId: string;
  socketRef: React.MutableRefObject<Socket | null>;
}) {
  if (EMBEDDABLE_RE.test(videoUrl)) {
    return (
      <div style={{ position: 'relative', width: '100%', background: 'var(--player-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
          <iframe
            src={videoUrl}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>
        <div style={{
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--warn)' }}>⚠</span>
            Trang nhúng — sync không khả dụng. Hoặc thay thế bằng:
          </div>
          <ScreenShareTip compact />
        </div>
      </div>
    );
  }

  return (
    <ExtractFallback
      videoUrl={videoUrl}
      canControl={canControl}
      roomId={roomId}
      socketRef={socketRef}
    />
  );
}

// ─── ExtractFallback ───────────────────────────────────────────────────────────
// Shown for non-embeddable page URLs. Auto-triggers backend extraction for the
// host; guests see a waiting message. On success, the host clicks "Apply" which
// broadcasts the resolved direct URL to all room members via video:changeUrl.

function ExtractFallback({
  videoUrl,
  canControl,
  roomId,
  socketRef,
}: {
  videoUrl: string;
  canControl: boolean;
  roomId: string;
  socketRef: React.MutableRefObject<Socket | null>;
}) {
  const [status, setStatus] = useState<'extracting' | 'found' | 'error'>('extracting');
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [platform, setPlatform] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [showIframe, setShowIframe] = useState(false);
  const embedRef = useRef<HTMLIFrameElement>(null);

  const extract = async () => {
    setStatus('extracting');
    setResolvedUrl('');
    setApplyError('');
    try {
      const { data } = await api.get<{ videoUrl: string | null; platform?: string; needsProxy?: boolean }>(
        `/rooms/resolve-video?url=${encodeURIComponent(videoUrl)}`,
      );
      if (data.videoUrl) {
        // When the backend detects hotlink protection (same-origin video), route playback
        // through the backend proxy which forwards the correct Referer to the CDN.
        const playUrl = data.needsProxy
          ? `${PROXY_BASE}/rooms/hls-proxy?url=${encodeURIComponent(data.videoUrl)}`
          : data.videoUrl;
        setResolvedUrl(playUrl);
        setPlatform(data.platform ?? '');
        setStatus('found');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (canControl) void extract();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    if (!resolvedUrl || !socketRef.current) return;
    setApplying(true);
    setApplyError('');
    socketRef.current.emit(
      'video:changeUrl',
      { roomId, videoUrl: resolvedUrl },
      (res?: { ok: boolean; error?: string }) => {
        setApplying(false);
        if (res?.error) setApplyError(res.error);
      },
    );
    setTimeout(() => setApplying(false), 8000);
  };

  if (status === 'error') {
    return (
      <div style={{ width: '100%', background: 'var(--player-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: 'var(--player-bg)' }}>
          <iframe
            ref={embedRef}
            src={videoUrl}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            title="video player"
          />
          <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
            {canControl && (
              <button
                onClick={() => void extract()}
                style={{
                  padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
                  color: 'var(--text)', cursor: 'pointer', fontSize: 12,
                  backdropFilter: 'blur(4px)',
                }}
              >
                Trích xuất lại
              </button>
            )}
            <button
              onClick={() => void embedRef.current?.requestFullscreen()}
              style={{
                padding: '5px 12px', borderRadius: 7, border: 'none',
                background: 'var(--accent)', color: '#fff',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              ⛶ Phóng to
            </button>
          </div>
        </div>
        <div style={{
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--warn)' }}>⚠</span>
            Không trích xuất được video — đang hiển thị trang gốc (sync không khả dụng). Nhấn ⛶ để phóng to, hoặc dùng:
          </div>
          <ScreenShareTip />
        </div>
      </div>
    );
  }

  const center: React.CSSProperties = {
    position: 'relative', width: '100%', paddingTop: '56.25%',
    background: 'var(--player-bg)',
  };
  const inner: React.CSSProperties = {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24,
  };

  if (showIframe) {
    return (
      <div style={{ width: '100%', background: 'var(--player-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
          <iframe
            src={videoUrl}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            title="video player"
          />
          <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowIframe(false)}
              style={{
                padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
                color: 'var(--text)', cursor: 'pointer', fontSize: 12,
                backdropFilter: 'blur(4px)',
              }}
            >
              ← Quay lại
            </button>
            {canControl && (
              <button
                onClick={apply}
                disabled={applying}
                style={{
                  padding: '5px 12px', borderRadius: 7, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}
              >
                Phát với sync
              </button>
            )}
          </div>
        </div>
        <div style={{
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--warn)' }}>⚠</span>
            Trang nhúng — sync không khả dụng. Nhấn "Phát với sync" để dùng bản trích xuất, hoặc:
          </div>
          <ScreenShareTip compact />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', background: 'var(--player-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={center}>
        <div style={inner}>
          {!canControl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 380 }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                Đang chờ host trích xuất video…
              </p>
              <ScreenShareTip />
            </div>
          ) : status === 'extracting' ? (
            <>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
                animation: 'spin 0.7s linear infinite',
              }} />
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                Đang trích xuất video… (có thể mất vài giây)
              </p>
            </>
          ) : showIframe ? null : (
            <>
              <p style={{ margin: 0, color: '#27b07c', fontSize: 14, fontWeight: 600 }}>
                ✓ Tìm thấy video{platform ? ` (${platform})` : ''}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={apply}
                  disabled={applying}
                  style={{
                    padding: '8px 22px', borderRadius: 10, border: 'none', fontWeight: 600,
                    background: applying ? 'var(--surface-2)' : 'var(--accent)',
                    color: applying ? 'var(--text-muted)' : '#fff',
                    cursor: applying ? 'default' : 'pointer', fontSize: 14,
                  }}
                >
                  {applying ? 'Đang áp dụng…' : 'Phát video này'}
                </button>
                <button
                  onClick={() => setShowIframe(true)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, fontWeight: 500,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 13,
                  }}
                >
                  Xem bằng iframe
                </button>
              </div>
              {applyError && (
                <p style={{ margin: 0, color: '#e0484f', fontSize: 12 }}>{applyError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
