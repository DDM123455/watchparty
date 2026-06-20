import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Logo, ThemeToggle } from '../../components/ui';
import confetti from 'canvas-confetti';
import { MovieWheel } from '../../components/movie-night/MovieWheel';
import { MovieCard } from '../../components/movie-night/MovieCard';
import { FilterPanel } from '../../components/movie-night/FilterPanel';
import type { FilterState, TmdbMovie, ProviderInfo } from '../../types/movieNight';
import { DEFAULT_FILTER } from '../../types/movieNight';
import { movieNightApi } from '../../services/movieNight';

type Phase = 'setup' | 'ready' | 'spinning' | 'result';

export default function WheelPage() {
  const navigate = useNavigate();
  const [phase,       setPhase]       = useState<Phase>('setup');
  const [movies,      setMovies]      = useState<TmdbMovie[]>([]);
  const [winner,      setWinner]      = useState<TmdbMovie | null>(null);
  const [streaming,   setStreaming]   = useState<ProviderInfo[]>([]);
  const [filters,     setFilters]     = useState<FilterState>(DEFAULT_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  async function loadCandidates() {
    setLoading(true);
    setError('');
    try {
      const results = await movieNightApi.candidates(filters, 15);
      if (!results.length) { setError('No movies found. Try different filters.'); return; }
      setMovies(results);
      setPhase('ready');
    } catch {
      setError('Failed to load movies. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const handleSpinEnd = useCallback(async (movie: TmdbMovie) => {
    setWinner(movie);
    setPhase('result');
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    try {
      const providers = await movieNightApi.getMovieProviders(movie.id, movie.media_type);
      setStreaming(providers);
    } catch { /* streaming info is non-critical */ }
  }, []);

  function reset() {
    setPhase('setup');
    setMovies([]);
    setWinner(null);
    setStreaming([]);
  }

  return (
    <>
      <Helmet>
        <title>Movie Wheel — Spin to Pick a Movie Tonight</title>
      </Helmet>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onApply={loadCandidates}
          loading={loading}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* App header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            maxWidth: 720, margin: '0 auto', padding: '0 20px', height: 62,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ← Quay lại
            </button>
            <Logo size={17} />
            <div style={{ marginLeft: 'auto' }}><ThemeToggle /></div>
          </div>
        </header>

        <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px 60px' }}>

          {/* Header */}
          <div style={{ padding: '0 0 28px', textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>🎡 Spin the Wheel</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
              Load movies, spin, and let fate decide.
            </p>
          </div>

          {/* SETUP phase */}
          {phase === 'setup' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 380, height: 380, borderRadius: '50%', margin: '0 auto 28px',
                background: 'var(--surface-2)', border: '2px dashed var(--border)',
                display: 'grid', placeItems: 'center', color: 'var(--text-faint)',
              }}>
                <div>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🎬</div>
                  <p style={{ margin: 0, fontSize: 14 }}>Load movies to spin</p>
                </div>
              </div>

              {error && (
                <p style={{ color: 'var(--warn)', fontSize: 14, marginBottom: 16 }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => setShowFilters(true)}
                  style={{
                    padding: '11px 20px', borderRadius: 10,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  ⚙ Filters
                </button>
                <button
                  onClick={loadCandidates}
                  disabled={loading}
                  style={{
                    padding: '11px 28px', borderRadius: 10,
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', fontSize: 14, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Loading...' : '🎬 Load Movies'}
                </button>
              </div>
            </div>
          )}

          {/* READY + SPINNING phase */}
          {(phase === 'ready' || phase === 'spinning') && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 28px', display: 'inline-block' }}>
                <MovieWheel
                  movies={movies}
                  spinning={phase === 'spinning'}
                  onSpinEnd={handleSpinEnd}
                  size={Math.min(380, window.innerWidth - 48)}
                />
              </div>

              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
                {movies.length} movies loaded
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => setShowFilters(true)}
                  disabled={phase === 'spinning'}
                  style={{
                    padding: '11px 18px', borderRadius: 10,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 14, fontWeight: 600,
                    cursor: phase === 'spinning' ? 'not-allowed' : 'pointer',
                    opacity: phase === 'spinning' ? 0.5 : 1,
                  }}
                >
                  ⚙ Filters
                </button>
                <button
                  onClick={() => setPhase('spinning')}
                  disabled={phase === 'spinning'}
                  style={{
                    padding: '11px 36px', borderRadius: 10,
                    background: '#e91e63', color: '#fff', border: 'none',
                    fontSize: 16, fontWeight: 800, letterSpacing: 1,
                    cursor: phase === 'spinning' ? 'not-allowed' : 'pointer',
                    opacity: phase === 'spinning' ? 0.6 : 1,
                    boxShadow: phase !== 'spinning' ? '0 4px 20px rgba(233,30,99,0.4)' : 'none',
                  }}
                >
                  {phase === 'spinning' ? 'Spinning...' : 'S P I N'}
                </button>
              </div>
            </div>
          )}

          {/* RESULT phase */}
          {phase === 'result' && winner && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 32 }}>🎉</span>
                <h2 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 800 }}>Tonight's Pick!</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>The wheel has spoken.</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <MovieCard movie={winner} streaming={streaming} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => { setPhase('spinning'); setWinner(null); setStreaming([]); }}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  🔁 Spin Again
                </button>
                <button
                  onClick={loadCandidates}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  🔀 New Movies
                </button>
                <button
                  onClick={reset}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
                  }}
                >
                  ✕ Reset
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
