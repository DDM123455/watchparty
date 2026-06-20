import type { ProviderInfo } from '../../types/movieNight';

const COLORS: Record<string, string> = {
  netflix:  '#e50914',
  prime:    '#00a8e0',
  disney:   '#113ccf',
  hulu:     '#1ce783',
  apple:    '#000000',
  hbo:      '#5d22ad',
  peacock:  '#f7b226',
  paramount:'#0064ff',
};

interface Props {
  provider: ProviderInfo;
  size?: 'sm' | 'md';
}

export function StreamingBadge({ provider, size = 'md' }: Props) {
  const bg = COLORS[provider.key] ?? '#333';
  const px = size === 'sm' ? '6px 10px' : '6px 14px';
  const fs = size === 'sm' ? 11 : 12;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: bg, color: '#fff',
      padding: px, borderRadius: 6,
      fontSize: fs, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {provider.logo_path && (
        <img
          src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
          alt=""
          style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }}
        />
      )}
      {provider.name}
    </span>
  );
}
