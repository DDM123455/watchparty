import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MovieCard, MovieCardSkeleton } from '../../components/movie-night/MovieCard';
import type { ProviderInfo, TmdbMovie } from '../../types/movieNight';
import { movieNightApi } from '../../services/movieNight';

export interface SeoPageConfig {
  slug: string;          // e.g. 'horror'
  title: string;
  metaDesc: string;
  h1: string;
  description: string;
  preset?: string;       // backend preset name (defaults to slug)
  relatedPages: { label: string; href: string }[];
}

export function SeoPickerPage({ config }: { config: SeoPageConfig }) {
  const [movie,     setMovie]     = useState<TmdbMovie | null>(null);
  const [streaming, setStreaming] = useState<ProviderInfo[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [generated, setGenerated] = useState(false);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: config.h1,
    description: config.metaDesc,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const preset = config.preset ?? config.slug;
      const result = preset === 'random'
        ? await movieNightApi.random()
        : await movieNightApi.preset(preset);

      if (!result.movie) { setError('No movies found. Try again!'); return; }
      setMovie(result.movie);
      setStreaming(result.streaming);
      setGenerated(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{config.title}</title>
        <meta name="description" content={config.metaDesc} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 16px 80px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* Breadcrumb */}
          <div style={{ padding: '24px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
            <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</a>
            {' / '}
            <a href="/movie-night" style={{ color: 'inherit', textDecoration: 'none' }}>Movie Night</a>
            {' / '}
            <span style={{ color: 'var(--text-muted)' }}>{config.h1}</span>
          </div>

          {/* Hero */}
          <div style={{ padding: '32px 0 28px' }}>
            <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>
              {config.h1}
            </h1>
            <p style={{ margin: '0 0 28px', color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, maxWidth: 540 }}>
              {config.description}
            </p>

            <button
              onClick={generate}
              disabled={loading}
              style={{
                padding: '14px 40px', borderRadius: 12,
                background: 'var(--accent)', color: '#fff', border: 'none',
                fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: loading ? 'none' : '0 4px 20px rgba(59,110,248,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Picking…' : generated ? '🎲 Pick Another' : '🎲 Generate'}
            </button>
          </div>

          {/* Result */}
          {loading && <MovieCardSkeleton />}

          {!loading && error && (
            <div style={{
              padding: '16px 20px', borderRadius: 12,
              background: 'rgba(245,158,11,0.08)', border: '1px solid var(--warn)',
              color: 'var(--warn)', fontSize: 14, marginBottom: 24,
            }}>
              {error}
            </div>
          )}

          {!loading && movie && (
            <div style={{ marginBottom: 36, animation: 'wpRise 0.4s ease' }}>
              <MovieCard movie={movie} streaming={streaming} onNext={generate} loading={loading} />
            </div>
          )}

          {/* Mode links */}
          <div style={{
            padding: '20px', borderRadius: 14,
            background: 'var(--surface)', border: '1px solid var(--border)',
            marginBottom: 28,
          }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
              More Ways to Pick
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: '🎡 Spin the Wheel', href: '/movie-night/wheel' },
                { label: '⚔ Movie Battle',   href: '/movie-night/battle' },
                { label: '🎬 All Generators', href: '/movie-night' },
              ].map(l => (
                <a key={l.href} href={l.href} style={{
                  fontSize: 13, padding: '7px 14px', borderRadius: 99,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', textDecoration: 'none',
                }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Related pages */}
          <div>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
              Related Generators
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {config.relatedPages.map(l => (
                <a key={l.href} href={l.href} style={{
                  fontSize: 12, padding: '5px 12px', borderRadius: 99,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', textDecoration: 'none',
                }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
