import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MovieCard, MovieCardSkeleton } from '../../components/movie-night/MovieCard';
import { FilterPanel } from '../../components/movie-night/FilterPanel';
import type { FilterState, ProviderInfo, TmdbMovie } from '../../types/movieNight';
import { DEFAULT_FILTER } from '../../types/movieNight';
import { movieNightApi } from '../../services/movieNight';

export default function RandomPickerPage() {
  const [movie,       setMovie]       = useState<TmdbMovie | null>(null);
  const [streaming,   setStreaming]   = useState<ProviderInfo[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [filters,     setFilters]     = useState<FilterState>(DEFAULT_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [generated,   setGenerated]   = useState(false);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const result = await movieNightApi.random(filters);
      if (!result.movie) { setError('No movies found. Try different filters.'); return; }
      setMovie(result.movie);
      setStreaming(result.streaming);
      setGenerated(true);
    } catch {
      setError('Failed to fetch. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Random Movie Picker — Find What to Watch</title>
      </Helmet>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onApply={generate}
          loading={loading}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 16px 60px' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>

          <div style={{ padding: '40px 0 28px', textAlign: 'center' }}>
            <a href="/movie-night" style={{ fontSize: 13, color: 'var(--text-faint)', textDecoration: 'none' }}>
              ← Movie Night
            </a>
            <h1 style={{ margin: '12px 0 6px', fontSize: 26, fontWeight: 800 }}>🎲 Random Picker</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
              Set filters and let us pick the perfect movie for tonight.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
            <button
              onClick={() => setShowFilters(true)}
              style={{
                padding: '11px 20px', borderRadius: 10,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ⚙ Filters
            </button>
            <button
              onClick={generate}
              disabled={loading}
              style={{
                padding: '11px 32px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Picking…' : generated ? '🎲 Pick Another' : '🎲 Generate'}
            </button>
          </div>

          {loading && <MovieCardSkeleton />}

          {!loading && error && (
            <div style={{
              padding: '16px', borderRadius: 12,
              background: 'rgba(245,158,11,0.08)', border: '1px solid var(--warn)',
              color: 'var(--warn)', fontSize: 14, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {!loading && movie && (
            <MovieCard movie={movie} streaming={streaming} onNext={generate} loading={loading} />
          )}

        </div>
      </div>
    </>
  );
}
