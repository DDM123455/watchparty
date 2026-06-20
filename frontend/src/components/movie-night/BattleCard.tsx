import { useState } from 'react';
import type { TmdbMovie } from '../../types/movieNight';

interface Props {
  movie: TmdbMovie;
  onPick: (movie: TmdbMovie) => void;
  disabled?: boolean;
  winner?: boolean;
}

export function BattleCard({ movie, onPick, disabled, winner }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => !disabled && onPick(movie)}
      style={{
        flex: 1, minWidth: 0, maxWidth: 280,
        background: 'var(--surface)',
        border: `2px solid ${winner ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 16,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
        boxShadow: winner ? '0 0 0 3px var(--accent), var(--shadow-lg)' : 'var(--shadow-sm)',
        transform: winner ? 'scale(1.03)' : 'scale(1)',
        overflow: 'hidden',
        animation: 'wpRise 0.35s ease',
      }}
    >
      {/* Poster */}
      <div style={{ position: 'relative', aspectRatio: '2/3', background: 'var(--player-bg)' }}>
        {movie.poster_url && !imgError ? (
          <img
            src={movie.poster_url}
            alt={movie.display_title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 48 }}>🎬</div>
        )}
        {winner && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(59,110,248,0.18)',
            display: 'grid', placeItems: 'center',
          }}>
            <span style={{ fontSize: 48 }}>✓</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 14px 16px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
          {movie.display_title}
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          {movie.display_year && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{movie.display_year}</span>
          )}
          <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
            ★ {movie.vote_average.toFixed(1)}
          </span>
        </div>
        <button
          disabled={disabled}
          style={{
            width: '100%', padding: '10px', borderRadius: 10,
            background: winner ? 'var(--accent)' : 'var(--surface-2)',
            color: winner ? '#fff' : 'var(--text)',
            border: `1.5px solid ${winner ? 'var(--accent)' : 'var(--border)'}`,
            fontWeight: 600, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {winner ? '✓ Picked' : 'I prefer this'}
        </button>
      </div>
    </div>
  );
}
