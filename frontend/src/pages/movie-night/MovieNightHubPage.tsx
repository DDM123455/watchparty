import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { PickerPreset } from '../../types/movieNight';
import { PRESET_EMOJIS, PRESET_LABELS } from '../../types/movieNight';

const QUICK_PRESETS: { preset: PickerPreset; href: string }[] = [
  { preset: 'horror',  href: '/random-horror-movie-generator' },
  { preset: 'comedy',  href: '/random-comedy-movie-generator' },
  { preset: 'action',  href: '/random-action-movie-generator' },
  { preset: 'anime',   href: '/random-anime-generator' },
  { preset: 'netflix', href: '/random-netflix-movie-generator' },
  { preset: 'family',  href: '/random-family-movie-generator' },
];

const MODES = [
  {
    title: '🎲 Random Pick',
    desc: 'Instant random movie with filters',
    href: '/movie-night/pick',
    accent: '#3b6ef8',
  },
  {
    title: '🎡 Spin the Wheel',
    desc: 'Generate candidates, spin to decide',
    href: '/movie-night/wheel',
    accent: '#e91e63',
  },
  {
    title: '⚔ Movie Battle',
    desc: 'Head-to-head elimination, 10 rounds',
    href: '/movie-night/battle',
    accent: '#e67e22',
  },
];

const SEO_LINKS = [
  { label: 'Random Horror Movie', href: '/random-horror-movie-generator' },
  { label: 'Random Comedy Movie', href: '/random-comedy-movie-generator' },
  { label: 'Random Action Movie', href: '/random-action-movie-generator' },
  { label: 'Random Anime',        href: '/random-anime-generator' },
  { label: 'Random Netflix Pick', href: '/random-netflix-movie-generator' },
  { label: 'Random TV Show',      href: '/random-tv-show-generator' },
  { label: 'Random Family Movie', href: '/random-family-movie-generator' },
];

export default function MovieNightHubPage() {
  const nav = useNavigate();

  return (
    <>
      <Helmet>
        <title>Movie Night Generator — Pick What to Watch Tonight</title>
        <meta name="description" content="Can't decide what to watch? Use our random movie picker, spin the wheel, or play movie battle mode." />
      </Helmet>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 16px 60px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', padding: '60px 0 40px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎬</div>
            <h1 style={{ margin: '0 0 10px', fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>
              Movie Night Generator
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 16, maxWidth: 420, marginInline: 'auto' }}>
              Can't decide what to watch tonight? Let us pick for you.
            </p>
          </div>

          {/* Mode cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
            {MODES.map(m => (
              <button
                key={m.href}
                onClick={() => nav(m.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '18px 20px', borderRadius: 14,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: 'var(--shadow-sm)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = m.accent;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1px ${m.accent}40`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <div style={{ fontSize: 28, flexShrink: 0, width: 44, textAlign: 'center' }}>
                  {m.title.split(' ')[0]}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>
                    {m.title.slice(m.title.indexOf(' ') + 1)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: 20 }}>›</div>
              </button>
            ))}
          </div>

          {/* Quick genre picks */}
          <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
            Quick Picks
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 48 }}>
            {QUICK_PRESETS.map(({ preset, href }) => (
              <button
                key={preset}
                onClick={() => nav(href)}
                style={{
                  padding: '14px 10px', borderRadius: 12,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 5 }}>{PRESET_EMOJIS[preset]}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {PRESET_LABELS[preset]}
                </div>
              </button>
            ))}
          </div>

          {/* SEO internal links */}
          <div style={{
            padding: '20px', borderRadius: 14,
            background: 'var(--surface)', border: '1px solid var(--border)',
          }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
              More Generators
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SEO_LINKS.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 99,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                >
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
