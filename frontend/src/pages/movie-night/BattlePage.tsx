import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Logo, ThemeToggle } from '../../components/ui';
import confetti from 'canvas-confetti';
import { BattleCard } from '../../components/movie-night/BattleCard';
import { MovieCard } from '../../components/movie-night/MovieCard';
import { FilterPanel } from '../../components/movie-night/FilterPanel';
import type { FilterState, TmdbMovie, ProviderInfo } from '../../types/movieNight';
import { DEFAULT_FILTER } from '../../types/movieNight';
import { movieNightApi } from '../../services/movieNight';

const TOTAL_ROUNDS = 10;

function makePairs(movies: TmdbMovie[]): [TmdbMovie, TmdbMovie][] {
  const shuffled = [...movies].sort(() => Math.random() - 0.5);
  const pairs: [TmdbMovie, TmdbMovie][] = [];
  for (let i = 0; i < TOTAL_ROUNDS && i * 2 + 1 < shuffled.length; i++) {
    pairs.push([shuffled[i * 2], shuffled[i * 2 + 1]]);
  }
  return pairs;
}

type Phase = 'setup' | 'battle' | 'reveal';

export default function BattlePage() {
  const navigate = useNavigate();
  const [phase,       setPhase]       = useState<Phase>('setup');
  const [pairs,       setPairs]       = useState<[TmdbMovie, TmdbMovie][]>([]);
  const [round,       setRound]       = useState(0);
  const [scores,      setScores]      = useState<Map<number, number>>(new Map());
  const [picked,      setPicked]      = useState<number | null>(null);
  const [winner,      setWinner]      = useState<TmdbMovie | null>(null);
  const [streaming,   setStreaming]   = useState<ProviderInfo[]>([]);
  const [filters,     setFilters]     = useState<FilterState>(DEFAULT_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  async function startBattle() {
    setLoading(true);
    setError('');
    try {
      const movies = await movieNightApi.candidates(filters, TOTAL_ROUNDS * 2);
      if (movies.length < 4) { setError('Not enough movies found. Try different filters.'); return; }
      const newPairs = makePairs(movies);
      setPairs(newPairs);
      setRound(0);
      setScores(new Map());
      setPicked(null);
      setPhase('battle');
    } catch {
      setError('Failed to load movies. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function pick(movie: TmdbMovie) {
    if (picked !== null) return;
    setPicked(movie.id);

    const newScores = new Map(scores);
    newScores.set(movie.id, (newScores.get(movie.id) ?? 0) + 1);
    setScores(newScores);

    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= pairs.length) {
        // Find winner from all movies in pairs
        const allMovies = pairs.flat();
        const unique = Array.from(new Map(allMovies.map(m => [m.id, m])).values());
        const top = unique.sort((a, b) => (newScores.get(b.id) ?? 0) - (newScores.get(a.id) ?? 0));
        const w = top[0];
        setWinner(w);
        setPhase('reveal');
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.4 } });
        movieNightApi.getMovieProviders(w.id, w.media_type)
          .then(setStreaming)
          .catch(() => {});
      } else {
        setRound(nextRound);
        setPicked(null);
      }
    }, 600);
  }

  function reset() {
    setPhase('setup');
    setPairs([]);
    setRound(0);
    setScores(new Map());
    setPicked(null);
    setWinner(null);
    setStreaming([]);
  }

  const currentPair = pairs[round];
  const progress    = pairs.length > 0 ? (round / pairs.length) * 100 : 0;

  return (
    <>
      <Helmet>
        <title>Movie Battle — Pick Your Favourite in 10 Rounds</title>
      </Helmet>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onApply={startBattle}
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

        <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px 60px' }}>

          {/* Header */}
          <div style={{ padding: '0 0 28px', textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>⚔ Movie Battle</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
              10 head-to-head rounds. Your taste decides the winner.
            </p>
          </div>

          {/* SETUP */}
          {phase === 'setup' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                padding: '48px 24px', borderRadius: 16,
                background: 'var(--surface)', border: '1px solid var(--border)',
                marginBottom: 24,
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⚔</div>
                <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Ready to battle?</h2>
                <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', fontSize: 14 }}>
                  We'll show you 10 pairs of movies. Pick the one you'd rather watch.
                  The most-picked movie wins.
                </p>
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
                    onClick={startBattle}
                    disabled={loading}
                    style={{
                      padding: '11px 32px', borderRadius: 10,
                      background: '#e67e22', color: '#fff', border: 'none',
                      fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {loading ? 'Loading...' : '⚔ Start Battle'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BATTLE */}
          {phase === 'battle' && currentPair && (
            <div>
              {/* Progress */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Round {round + 1} / {pairs.length}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {picked !== null ? 'Moving on…' : 'Pick your favourite'}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-2)' }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: 'var(--accent)',
                    width: `${progress}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>

              {/* VS cards */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', marginBottom: 24 }}>
                <BattleCard
                  movie={currentPair[0]}
                  onPick={pick}
                  disabled={picked !== null}
                  winner={picked === currentPair[0].id}
                />

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-faint)',
                }}>
                  VS
                </div>

                <BattleCard
                  movie={currentPair[1]}
                  onPick={pick}
                  disabled={picked !== null}
                  winner={picked === currentPair[1].id}
                />
              </div>
            </div>
          )}

          {/* REVEAL */}
          {phase === 'reveal' && winner && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 36 }}>🏆</span>
                <h2 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 800 }}>Battle Winner!</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                  {winner.display_title} won {scores.get(winner.id) ?? 0} of {pairs.length} rounds.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
                <MovieCard movie={winner} streaming={streaming} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={startBattle}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: '#e67e22', color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  🔁 Battle Again
                </button>
                <button
                  onClick={reset}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
