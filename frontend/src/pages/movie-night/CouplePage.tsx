import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Logo, ThemeToggle } from '../../components/ui';
import { movieNightApi } from '../../services/movieNight';
import { MovieGrid } from '../../components/movie-night/MovieGrid';
import type { TmdbMovie } from '../../types/movieNight';

const GENRE_OPTIONS = [
  { id: 28,    label: 'Action',      emoji: '💥' },
  { id: 35,    label: 'Comedy',      emoji: '😂' },
  { id: 27,    label: 'Horror',      emoji: '😱' },
  { id: 10749, label: 'Romance',     emoji: '💕' },
  { id: 18,    label: 'Drama',       emoji: '🎭' },
  { id: 878,   label: 'Sci-Fi',      emoji: '🚀' },
  { id: 16,    label: 'Anime',       emoji: '🎌' },
  { id: 10751, label: 'Family',      emoji: '👨‍👩‍👧' },
  { id: 53,    label: 'Thriller',    emoji: '🔪' },
  { id: 14,    label: 'Fantasy',     emoji: '🧙' },
  { id: 12,    label: 'Adventure',   emoji: '🗺️' },
  { id: 99,    label: 'Documentary', emoji: '🎥' },
];

type Phase = 'person-a' | 'person-b' | 'loading' | 'result';

interface Prefs { genres: number[]; mediaType: 'movie' | 'tv' }

export default function CouplePage() {
  const navigate = useNavigate();
  const [phase,  setPhase]  = useState<Phase>('person-a');
  const [prefA,  setPrefA]  = useState<Prefs>({ genres: [], mediaType: 'movie' });
  const [prefB,  setPrefB]  = useState<Prefs>({ genres: [], mediaType: 'movie' });
  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [error,  setError]  = useState('');

  function toggleA(id: number) {
    setPrefA(p => ({
      ...p,
      genres: p.genres.includes(id)
        ? p.genres.filter(g => g !== id)
        : p.genres.length < 4 ? [...p.genres, id] : p.genres,
    }));
  }

  function toggleB(id: number) {
    setPrefB(p => ({
      ...p,
      genres: p.genres.includes(id)
        ? p.genres.filter(g => g !== id)
        : p.genres.length < 4 ? [...p.genres, id] : p.genres,
    }));
  }

  async function findMovies() {
    setPhase('loading');
    setError('');
    try {
      const mediaType = prefA.mediaType === prefB.mediaType ? prefA.mediaType : 'movie';
      const intersection = prefA.genres.filter(g => prefB.genres.includes(g));
      let result: TmdbMovie[] = [];

      if (intersection.length > 0) {
        const data = await movieNightApi.getList({ genres: intersection, mediaType }, 1, 12);
        result = data.movies;
      } else if (prefA.genres.length > 0 && prefB.genres.length > 0) {
        // No genre overlap — find movies that appear in both pools
        const [dataA, dataB] = await Promise.all([
          movieNightApi.getList({ genres: prefA.genres, mediaType }, 1, 60),
          movieNightApi.getList({ genres: prefB.genres, mediaType }, 1, 60),
        ]);
        const idsB = new Set(dataB.movies.map(m => m.id));
        result = dataA.movies.filter(m => idsB.has(m.id)).slice(0, 12);

        // Still no overlap — blend both pools sorted by rating
        if (result.length < 4) {
          const seen = new Set<number>();
          result = [...dataA.movies, ...dataB.movies]
            .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
            .sort((a, b) => b.vote_average - a.vote_average)
            .slice(0, 12);
        }
      } else {
        const genres = [...prefA.genres, ...prefB.genres];
        const data = await movieNightApi.getList({ genres, mediaType }, 1, 12);
        result = data.movies;
      }

      setMovies(result);
      setPhase('result');
    } catch {
      setError('Lỗi kết nối. Thử lại nhé!');
      setPhase('result');
    }
  }

  function reset() {
    setPhase('person-a');
    setPrefA({ genres: [], mediaType: 'movie' });
    setPrefB({ genres: [], mediaType: 'movie' });
    setMovies([]);
    setError('');
  }

  const intersection     = prefA.genres.filter(g => prefB.genres.includes(g));
  const sharedGenreNames = intersection
    .map(id => GENRE_OPTIONS.find(g => g.id === id)?.label)
    .filter(Boolean) as string[];

  const STEPS = ['Người 1', 'Người 2', 'Kết quả'] as const;
  const stepIndex = phase === 'person-a' ? 0 : phase === 'person-b' ? 1 : 2;

  return (
    <>
      <Helmet>
        <title>Couple Movie Night — Tìm phim cho hai người</title>
      </Helmet>

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px', height: 62, display: 'flex', alignItems: 'center', gap: 16 }}>
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

        <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px 60px' }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800 }}>💑 Couple Mode</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
              Mỗi người chọn thể loại yêu thích — app tìm phim phù hợp cả hai
            </p>
          </div>

          {/* Step bar */}
          {phase !== 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
              {STEPS.map((label, i) => {
                const done   = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <div key={label} style={{ display: 'contents' }}>
                    <div style={{ flexShrink: 0, textAlign: 'center' }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', margin: '0 auto 4px',
                        background: done || active ? 'var(--accent)' : 'var(--surface-2)',
                        border: `2px solid ${done || active ? 'var(--accent)' : 'var(--border)'}`,
                        display: 'grid', placeItems: 'center',
                        fontSize: 12, fontWeight: 700,
                        color: done || active ? '#fff' : 'var(--text-faint)',
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? 'var(--text)' : 'var(--text-faint)' }}>
                        {label}
                      </span>
                    </div>
                    {i < 2 && (
                      <div style={{
                        flex: 1, height: 2, marginBottom: 18, marginLeft: 4, marginRight: 4,
                        background: done ? 'var(--accent)' : 'var(--border)',
                        transition: 'background 0.3s',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* PERSON A */}
          {phase === 'person-a' && (
            <PersonPicker
              label="🧑 Người 1"
              subtitle="Chọn thể loại bạn muốn xem (tối đa 4)"
              color="#e91e63"
              prefs={prefA}
              onToggleGenre={toggleA}
              onMediaType={mt => setPrefA(p => ({ ...p, mediaType: mt }))}
              onNext={() => setPhase('person-b')}
              nextLabel="Xong, chuyển cho bạn →"
            />
          )}

          {/* PERSON B */}
          {phase === 'person-b' && (
            <PersonPicker
              label="🧑 Người 2"
              subtitle="Chọn thể loại bạn muốn xem (tối đa 4)"
              color="#2196f3"
              prefs={prefB}
              onToggleGenre={toggleB}
              onMediaType={mt => setPrefB(p => ({ ...p, mediaType: mt }))}
              onNext={findMovies}
              nextLabel="🔍 Tìm phim chung"
            />
          )}

          {/* LOADING */}
          {phase === 'loading' && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', margin: '0 auto 20px',
                border: '3px solid var(--border)', borderTopColor: '#e91e63',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ margin: 0, fontSize: 15, color: 'var(--text-muted)' }}>
                Đang tìm phim phù hợp cả hai…
              </p>
            </div>
          )}

          {/* RESULT */}
          {phase === 'result' && (
            <div style={{ animation: 'wpFade 0.25s ease' }}>
              {/* Match banner */}
              <div style={{
                padding: '14px 18px', borderRadius: 12, marginBottom: 20,
                background: 'color-mix(in oklab, #e91e63 8%, var(--surface))',
                border: '1px solid color-mix(in oklab, #e91e63 25%, var(--border))',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>💑</span>
                <div>
                  {sharedGenreNames.length > 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>
                      Cả hai cùng thích:{' '}
                      <strong style={{ color: '#e91e63' }}>{sharedGenreNames.join(', ')}</strong>
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>
                      Không có thể loại chung — hiển thị phim phổ biến phù hợp cả hai
                    </p>
                  )}
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    {movies.length} phim được tìm thấy
                  </p>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                  background: 'color-mix(in oklab, var(--warn) 8%, var(--surface))',
                  border: '1px solid var(--warn)', color: 'var(--warn)', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <MovieGrid movies={movies} loading={false} hasMore={false} />

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
                <button
                  onClick={findMovies}
                  style={{
                    padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    background: '#e91e63', color: '#fff', border: 'none', cursor: 'pointer',
                  }}
                >
                  🔀 Xáo lại
                </button>
                <button
                  onClick={reset}
                  style={{
                    padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                >
                  ← Chọn lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface PickerProps {
  label: string;
  subtitle: string;
  color: string;
  prefs: Prefs;
  onToggleGenre: (id: number) => void;
  onMediaType: (mt: 'movie' | 'tv') => void;
  onNext: () => void;
  nextLabel: string;
}

function PersonPicker({ label, subtitle, color, prefs, onToggleGenre, onMediaType, onNext, nextLabel }: PickerProps) {
  return (
    <div style={{ animation: 'wpFade 0.25s ease' }}>
      <div style={{
        padding: '20px', borderRadius: 16, marginBottom: 16,
        background: 'var(--surface)',
        border: `1.5px solid color-mix(in oklab, ${color} 30%, var(--border))`,
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color }}>{label}</h2>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>

        {/* Media type */}
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>Loại</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['movie', 'tv'] as const).map(mt => (
            <button
              key={mt}
              onClick={() => onMediaType(mt)}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${prefs.mediaType === mt ? color : 'var(--border)'}`,
                background: prefs.mediaType === mt
                  ? `color-mix(in oklab, ${color} 12%, var(--surface-2))`
                  : 'var(--surface-2)',
                color: prefs.mediaType === mt ? color : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {mt === 'movie' ? '🎬 Phim' : '📺 TV'}
            </button>
          ))}
        </div>

        {/* Genres */}
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
          Thể loại
          {prefs.genres.length > 0 && (
            <span style={{ color, fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>
              · {prefs.genres.length} đã chọn
            </span>
          )}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GENRE_OPTIONS.map(g => {
            const on = prefs.genres.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => onToggleGenre(g.id)}
                style={{
                  padding: '7px 13px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${on ? color : 'var(--border)'}`,
                  background: on
                    ? `color-mix(in oklab, ${color} 12%, var(--surface-2))`
                    : 'var(--surface-2)',
                  color: on ? color : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
              >
                {g.emoji} {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onNext}
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: color, color: '#fff', border: 'none',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}
