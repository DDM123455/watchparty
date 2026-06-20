import { useState } from 'react';
import type { ProviderInfo, TmdbMovie } from '../../types/movieNight';
import { StreamingBadge } from './StreamingBadge';

interface Props {
  movie: TmdbMovie;
  streaming?: ProviderInfo[];
  onNext?: () => void;
  loading?: boolean;
  highlight?: boolean;
}

const LANG_LABELS: Record<string, string> = {
  en: '🇺🇸 English', ja: '🇯🇵 Japanese', ko: '🇰🇷 Korean',
  fr: '🇫🇷 French',  es: '🇪🇸 Spanish',  zh: '🇨🇳 Chinese',
  hi: '🇮🇳 Hindi',   de: '🇩🇪 German',   it: '🇮🇹 Italian',
};

export function MovieCard({ movie, streaming = [], onNext, loading = false, highlight = false }: Props) {
  const [imgError, setImgError] = useState(false);

  const stars = Math.round(movie.vote_average / 2);
  const lang = LANG_LABELS[movie.original_language] ?? movie.original_language?.toUpperCase();

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: highlight ? '0 0 0 2px var(--accent), var(--shadow-lg)' : 'var(--shadow-lg)',
      transition: 'box-shadow 0.3s, border-color 0.3s',
      maxWidth: 480,
      width: '100%',
      animation: 'wpRise 0.4s ease',
    }}>
      {/* Backdrop */}
      {movie.backdrop_url && (
        <div style={{
          height: 180, overflow: 'hidden', position: 'relative', background: 'var(--player-bg)',
        }}>
          <img
            src={movie.backdrop_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, var(--surface))',
          }} />
        </div>
      )}

      <div style={{ padding: 20, display: 'flex', gap: 16 }}>
        {/* Poster */}
        <div style={{ flexShrink: 0, width: 90, height: 135, borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
          {movie.poster_url && !imgError ? (
            <img
              src={movie.poster_url}
              alt={movie.display_title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-faint)', fontSize: 28 }}>
              🎬
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
              color: 'var(--accent)', background: 'rgba(59,110,248,0.12)', padding: '2px 8px', borderRadius: 99,
            }}>
              {movie.media_type === 'tv' ? 'TV Show' : 'Movie'}
            </span>
            {movie.display_year && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{movie.display_year}</span>
            )}
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, lineHeight: 1.3, color: 'var(--text)' }}>
            {movie.display_title}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ color: '#f59e0b', fontSize: 14 }}>
              {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
              {movie.vote_average.toFixed(1)}
            </span>
            {lang && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{lang}</span>}
          </div>

          {movie.overview && (
            <p style={{
              fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6,
              margin: '0 0 12px',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {movie.overview}
            </p>
          )}

          {/* Streaming */}
          {streaming.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {streaming.slice(0, 4).map(p => (
                <StreamingBadge key={p.id} provider={p} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      {onNext && (
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
          <button
            onClick={onNext}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Loading...' : '🎲 Try Another'}
          </button>
        </div>
      )}
    </div>
  );
}

export function MovieCardSkeleton() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden', maxWidth: 480, width: '100%',
    }}>
      <div style={{ height: 180, background: 'var(--ph-a)' }} />
      <div style={{ padding: 20, display: 'flex', gap: 16 }}>
        <div style={{ width: 90, height: 135, borderRadius: 8, background: 'var(--ph-a)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, width: '40%', background: 'var(--ph-a)', borderRadius: 8, marginBottom: 10 }} />
          <div style={{ height: 22, width: '80%', background: 'var(--ph-b)', borderRadius: 8, marginBottom: 10 }} />
          <div style={{ height: 14, width: '60%', background: 'var(--ph-a)', borderRadius: 8, marginBottom: 8 }} />
          <div style={{ height: 14, width: '100%', background: 'var(--ph-a)', borderRadius: 8, marginBottom: 6 }} />
          <div style={{ height: 14, width: '90%', background: 'var(--ph-a)', borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}
