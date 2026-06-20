import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { movieNightApi } from '../../services/movieNight';
import { MovieGrid } from './MovieGrid';
import type { TmdbMovie } from '../../types/movieNight';
import type { FilterState } from '../../types/movieNight';

const GENRES = [
  { key: 'horror',  label: 'Horror',  emoji: '😱', color: '#c0392b' },
  { key: 'comedy',  label: 'Comedy',  emoji: '😂', color: '#d4ac0d' },
  { key: 'action',  label: 'Action',  emoji: '💥', color: '#e67e22' },
  { key: 'anime',   label: 'Anime',   emoji: '🎌', color: '#8e44ad' },
  { key: 'netflix', label: 'Netflix', emoji: '🔴', color: '#e50914' },
  { key: 'tv',      label: 'TV Show', emoji: '📺', color: '#2980b9' },
  { key: 'family',  label: 'Family',  emoji: '👨‍👩‍👧', color: '#27ae60' },
  { key: 'random',  label: 'Random',  emoji: '🎲', color: '#7f8c8d' },
];

const MODES = [
  {
    emoji: '🎡', title: 'Spin the Wheel',
    desc: 'Tạo 10–15 phim, spin để chọn ngẫu nhiên',
    href: '/movie-night/wheel', color: '#e91e63',
  },
  {
    emoji: '⚔', title: 'Movie Battle',
    desc: '10 vòng đối đầu, phim nào được chọn nhiều nhất thắng',
    href: '/movie-night/battle', color: '#e67e22',
  },
  {
    emoji: '💑', title: 'Couple Mode',
    desc: 'Hai người chọn sở thích — app tìm phim phù hợp cả hai',
    href: '/movie-night/couple', color: '#e91e63',
  },
];

// map genre key → FilterState partial
const GENRE_FILTERS: Record<string, Partial<FilterState>> = {
  horror:  { genres: [27],    mediaType: 'movie' },
  comedy:  { genres: [35],    mediaType: 'movie' },
  action:  { genres: [28],    mediaType: 'movie' },
  anime:   { genres: [16],    mediaType: 'movie', language: 'ja' },
  netflix: { providers: [8],  mediaType: 'movie' },
  tv:      { mediaType: 'tv' },
  family:  { genres: [10751], mediaType: 'movie', familyFriendly: true },
  random:  { mediaType: 'movie' },
};

export function MovieNightTab() {
  const navigate    = useNavigate();
  const [movies,      setMovies]      = useState<TmdbMovie[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [page,        setPage]        = useState(1);
  const [active,      setActive]      = useState<string | null>(null);
  const [error,       setError]       = useState('');

  async function loadGenre(key: string) {
    if (active === key && movies.length > 0) return; // already loaded
    setActive(key);
    setLoading(true);
    setError('');
    setMovies([]);
    setPage(1);
    try {
      const filter = GENRE_FILTERS[key] ?? {};
      const result = await movieNightApi.getList(filter, 1, 10);
      setMovies(result.movies);
      setHasMore(result.hasMore);
    } catch {
      setError('Lỗi kết nối. Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!active) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const filter = GENRE_FILTERS[active] ?? {};
      const result = await movieNightApi.getList(filter, nextPage, 10);
      setMovies(prev => [...prev, ...result.movies]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  }

  return (
    <div style={{ animation: 'wpFade 0.25s ease' }}>

      {/* Interactive modes */}
      <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
        Chế độ tương tác
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 28 }}>
        {MODES.map(m => (
          <button
            key={m.href}
            onClick={() => navigate(m.href)}
            style={{
              padding: '18px 20px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = m.color;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${m.color}30`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `color-mix(in oklab, ${m.color} 14%, var(--surface-2))`,
              display: 'grid', placeItems: 'center', fontSize: 22,
            }}>
              {m.emoji}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, color: 'var(--text)' }}>
                {m.title}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {m.desc}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: 18, flexShrink: 0 }}>›</div>
          </button>
        ))}
      </div>

      {/* Genre quick picks */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
          Chọn thể loại
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
          {GENRES.map(g => (
            <button
              key={g.key}
              onClick={() => loadGenre(g.key)}
              disabled={loading}
              style={{
                padding: '14px 8px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                border: `1.5px solid ${active === g.key ? g.color : 'var(--border)'}`,
                background: active === g.key
                  ? `color-mix(in oklab, ${g.color} 14%, var(--surface-2))`
                  : 'var(--surface)',
                opacity: loading && active !== g.key ? 0.5 : 1,
                transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{g.emoji}</span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: active === g.key ? g.color : 'var(--text-muted)',
              }}>
                {g.label}
              </span>
              {loading && active === g.key && (
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: `2px solid ${g.color}40`,
                  borderTopColor: g.color,
                  animation: 'spin 0.7s linear infinite',
                  display: 'block',
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Result grid */}
      {(loading || movies.length > 0 || error) && (
        <div style={{ marginBottom: 28 }}>
          {/* Section header */}
          {active && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
                {GENRES.find(g => g.key === active)?.emoji} {GENRES.find(g => g.key === active)?.label}
                {!loading && movies.length > 0 && (
                  <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 8 }}>
                    · {movies.length} phim
                  </span>
                )}
              </p>
              <button
                onClick={() => loadGenre(active)}
                disabled={loading}
                style={{
                  padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                🔀 Shuffle
              </button>
            </div>
          )}

          {error && (
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'color-mix(in oklab, var(--warn) 8%, var(--surface))',
              border: '1px solid var(--warn)', color: 'var(--warn)', fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <MovieGrid
            movies={movies}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
          />
        </div>
      )}


    </div>
  );
}
