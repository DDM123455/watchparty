import { useEffect, useState } from 'react';
import type { FilterState, Genre, ProviderInfo } from '../../types/movieNight';
import { movieNightApi } from '../../services/movieNight';

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onApply: () => void;
  loading?: boolean;
  onClose?: () => void;
}

const RUNTIME_OPTIONS = [
  { label: 'Any', min: undefined, max: undefined },
  { label: 'Under 90 min', min: undefined, max: 90 },
  { label: '90 – 120 min', min: 90,  max: 120 },
  { label: 'Over 2 hours',  min: 120, max: undefined },
];

const LANGUAGE_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'English', value: 'en' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'Chinese', value: 'zh' },
];

const RATING_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '6+', value: 6 },
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
];

const YEAR_NOW = new Date().getFullYear();

export function FilterPanel({ filters, onChange, onApply, loading, onClose }: Props) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  useEffect(() => {
    movieNightApi.getGenres(filters.mediaType).then(setGenres);
    movieNightApi.getProviders().then(setProviders);
  }, [filters.mediaType]);

  function patch(partial: Partial<FilterState>) {
    onChange({ ...filters, ...partial });
  }

  function toggleGenre(id: number) {
    const next = filters.genres.includes(id)
      ? filters.genres.filter(g => g !== id)
      : [...filters.genres, id];
    patch({ genres: next });
  }

  function toggleProvider(id: number) {
    const next = filters.providers.includes(id)
      ? filters.providers.filter(p => p !== id)
      : [...filters.providers, id];
    patch({ providers: next });
  }

  const runtimeValue = RUNTIME_OPTIONS.findIndex(
    o => o.min === filters.runtimeMin && o.max === filters.runtimeMax
  );

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'rgba(59,110,248,0.15)' : 'var(--surface-2)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );

  const label = (text: string) => (
    <p style={{ margin: '16px 0 8px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
      {text}
    </p>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 480, maxHeight: '90vh',
        overflowY: 'auto', padding: '0 20px 24px',
        boxShadow: 'var(--shadow-lg)',
        animation: 'wpRise 0.25s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Filters</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', padding: '4px 8px' }}>×</button>
        </div>

        {/* Media type */}
        {label('Type')}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['movie', 'tv'] as const).map(t =>
            chip(t === 'movie' ? '🎬 Movie' : '📺 TV Show', filters.mediaType === t, () => patch({ mediaType: t, genres: [] }))
          )}
        </div>

        {/* Genres */}
        {label('Genre')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {genres.slice(0, 18).map(g =>
            chip(g.name, filters.genres.includes(g.id), () => toggleGenre(g.id))
          )}
        </div>

        {/* Streaming */}
        {label('Streaming Service')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {providers.map(p =>
            chip(p.name, filters.providers.includes(p.id), () => toggleProvider(p.id))
          )}
        </div>

        {/* Rating */}
        {label('Min Rating')}
        <div style={{ display: 'flex', gap: 8 }}>
          {RATING_OPTIONS.map(o =>
            chip(o.label, filters.ratingMin === o.value, () => patch({ ratingMin: o.value }))
          )}
        </div>

        {/* Runtime */}
        {label('Runtime')}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {RUNTIME_OPTIONS.map((o, i) =>
            chip(o.label, runtimeValue === i, () => patch({ runtimeMin: o.min, runtimeMax: o.max }))
          )}
        </div>

        {/* Year */}
        {label('Release Year')}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="number" min={1950} max={YEAR_NOW} placeholder="From"
            value={filters.yearFrom ?? ''}
            onChange={e => patch({ yearFrom: e.target.value ? Number(e.target.value) : undefined })}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--field)', color: 'var(--text)', fontSize: 14 }}
          />
          <span style={{ color: 'var(--text-faint)' }}>–</span>
          <input
            type="number" min={1950} max={YEAR_NOW} placeholder="To"
            value={filters.yearTo ?? ''}
            onChange={e => patch({ yearTo: e.target.value ? Number(e.target.value) : undefined })}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--field)', color: 'var(--text)', fontSize: 14 }}
          />
        </div>

        {/* Language */}
        {label('Language')}
        <select
          value={filters.language ?? ''}
          onChange={e => patch({ language: e.target.value || undefined })}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--field)', color: 'var(--text)', fontSize: 14 }}
        >
          {LANGUAGE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Family Friendly */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <input
            type="checkbox" id="family" checked={filters.familyFriendly}
            onChange={e => patch({ familyFriendly: e.target.checked })}
            style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <label htmlFor="family" style={{ fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}>
            Family Friendly (G/PG only)
          </label>
        </div>

        {/* Apply */}
        <button
          onClick={() => { onApply(); onClose?.(); }}
          disabled={loading}
          style={{
            width: '100%', marginTop: 20, padding: '13px', borderRadius: 12,
            background: 'var(--accent)', color: '#fff', border: 'none',
            fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Loading...' : 'Apply Filters →'}
        </button>
      </div>
    </div>
  );
}
