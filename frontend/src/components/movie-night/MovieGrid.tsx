import { useState } from 'react';
import type { ProviderInfo, TmdbMovie } from '../../types/movieNight';
import { StreamingBadge } from './StreamingBadge';
import { movieNightApi } from '../../services/movieNight';

interface Props {
  movies: TmdbMovie[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export function MovieGrid({ movies, loading, hasMore, onLoadMore, loadingMore }: Props) {
  if (loading) return <MovieGridSkeleton />;
  if (!movies.length) return (
    <div style={{
      padding: '40px 20px', textAlign: 'center',
      color: 'var(--text-faint)', fontSize: 14,
    }}>
      Không tìm thấy phim nào. Thử thể loại khác nhé!
    </div>
  );

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: hasMore ? 16 : 0,
      }}>
        {movies.map(m => <MovieTile key={m.id} movie={m} />)}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            style={{
              padding: '9px 28px', borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? 'Đang tải…' : 'Xem thêm →'}
          </button>
        </div>
      )}
    </div>
  );
}

function MovieTile({ movie }: { movie: TmdbMovie }) {
  const [imgErr,    setImgErr]    = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [streaming, setStreaming] = useState<ProviderInfo[] | null>(null);
  const [loadingWp, setLoadingWp] = useState(false);

  async function handleClick() {
    setExpanded(v => !v);
    if (!streaming) {
      setLoadingWp(true);
      try {
        const providers = await movieNightApi.getMovieProviders(movie.id, movie.media_type);
        setStreaming(providers);
      } catch { setStreaming([]); }
      finally { setLoadingWp(false); }
    }
  }

  const stars = Math.round(movie.vote_average / 2);

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'var(--surface)', borderRadius: 10, overflow: 'hidden',
        border: `1.5px solid ${expanded ? 'var(--accent)' : 'var(--border)'}`,
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: expanded ? '0 0 0 1px var(--accent)30, var(--shadow-sm)' : 'var(--shadow-sm)',
      }}
    >
      {/* Poster */}
      <div style={{ position: 'relative', aspectRatio: '2/3', background: 'var(--player-bg)' }}>
        {movie.poster_url && !imgErr ? (
          <img
            src={movie.poster_url}
            alt={movie.display_title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 32, color: 'var(--text-faint)' }}>
            🎬
          </div>
        )}
        {/* Rating badge */}
        {movie.vote_average > 0 && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            borderRadius: 6, padding: '2px 6px',
            fontSize: 11, fontWeight: 700, color: '#f59e0b',
          }}>
            ★ {movie.vote_average.toFixed(1)}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{
          margin: '0 0 3px', fontSize: 12.5, fontWeight: 700,
          lineHeight: 1.3, color: 'var(--text)',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {movie.display_title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{movie.display_year}</span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
            {'★'.repeat(stars)}
          </span>
        </div>

        {/* Expanded: overview + streaming */}
        {expanded && (
          <div style={{ marginTop: 8, animation: 'wpRise 0.2s ease' }}>
            {movie.overview && (
              <p style={{
                margin: '0 0 8px', fontSize: 11.5, color: 'var(--text-muted)',
                lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {movie.overview}
              </p>
            )}
            {loadingWp && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Đang tải…</div>
            )}
            {streaming && streaming.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {streaming.slice(0, 3).map(p => (
                  <StreamingBadge key={p.id} provider={p} size="sm" />
                ))}
              </div>
            )}
            {streaming && streaming.length === 0 && !loadingWp && (
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Không có trên streaming</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MovieGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: 12,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--surface)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ aspectRatio: '2/3', background: 'var(--ph-a)' }} />
          <div style={{ padding: '8px 10px 10px' }}>
            <div style={{ height: 12, background: 'var(--ph-a)', borderRadius: 6, marginBottom: 6 }} />
            <div style={{ height: 10, width: '60%', background: 'var(--ph-b)', borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
