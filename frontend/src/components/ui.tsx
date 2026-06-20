import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// ── Icons ────────────────────────────────────────────────────
type IconProps = { size?: number; sw?: number; fill?: string; style?: React.CSSProperties };

function Icon({ d, size = 18, sw = 1.8, fill = 'none', style, children }: IconProps & { d?: string; children?: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const IcPlay   = (p: IconProps) => <Icon {...p} fill="currentColor" sw={0} d="M8 5.5v13l11-6.5z" />;
export const IcPause  = (p: IconProps) => <Icon {...p}><rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" /></Icon>;
export const IcPlus   = (p: IconProps) => <Icon {...p} d="M12 5v14M5 12h14" />;
export const IcLock   = (p: IconProps) => <Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>;
export const IcGlobe  = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" /></Icon>;
export const IcUsers  = (p: IconProps) => <Icon {...p}><circle cx="9" cy="8" r="3.4" /><path d="M2.8 20c.6-3.4 3.1-5.4 6.2-5.4s5.6 2 6.2 5.4" /><path d="M16 5.2a3.4 3.4 0 0 1 0 5.9M18.4 14.9c1.7.8 2.7 2.4 3 4.4" /></Icon>;
export const IcSearch = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></Icon>;
export const IcSend   = (p: IconProps) => <Icon {...p} d="M4 12l16-7-5 16-3.5-6.5z" />;
export const IcLink   = (p: IconProps) => <Icon {...p}><path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4L11.4 6.6" /><path d="M14 10a4.5 4.5 0 0 0-6.4-.4L5 12.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></Icon>;
export const IcX      = (p: IconProps) => <Icon {...p} d="M6 6l12 12M18 6L6 18" />;
export const IcSun    = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19" /></Icon>;
export const IcMoon   = (p: IconProps) => <Icon {...p} d="M20 13.5A8.2 8.2 0 0 1 10.5 4 8.4 8.4 0 1 0 20 13.5z" />;
export const IcLogout = (p: IconProps) => <Icon {...p}><path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" /><path d="M10 12h11M17.5 8.5L21 12l-3.5 3.5" /></Icon>;
export const IcFilm   = (p: IconProps) => <Icon {...p}><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M8 4.5v15M16 4.5v15M3 9.5h5M3 14.5h5M16 9.5h5M16 14.5h5" /></Icon>;
export const IcCheck  = (p: IconProps) => <Icon {...p} d="M5 12.5l4.5 4.5L19 7.5" />;
export const IcSignal = (p: IconProps) => <Icon {...p}><path d="M12 19.5h.01" /><path d="M8.8 16.2a4.6 4.6 0 0 1 6.4 0M5.9 13.1a8.8 8.8 0 0 1 12.2 0M3 10a13 13 0 0 1 18 0" /></Icon>;
export const IcArrowL  = (p: IconProps) => <Icon {...p} d="M19 12H5M11 6l-6 6 6 6" />;
export const IcVolume  = (p: IconProps) => <Icon {...p}><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z" fill="currentColor" stroke="none" /><path d="M15.5 9a4.4 4.4 0 0 1 0 6M18 6.7a8 8 0 0 1 0 10.6" /></Icon>;
export const IcMonitor = (p: IconProps) => <Icon {...p}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></Icon>;
export const IcPencil  = (p: IconProps) => <Icon {...p} d="M4 20l4.5-1 10.7-10.7a2 2 0 0 0 0-2.8l-1.7-1.7a2 2 0 0 0-2.8 0L4 14.5z" />;
export const IcExpand = (p: IconProps) => <Icon {...p} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />;
export const IcMic    = (p: IconProps) => <Icon {...p}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M9 21h6"/></Icon>;
export const IcMicOff = (p: IconProps) => <Icon {...p}><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.9 13A7 7 0 0 0 5 10M15 9.4V6a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 5.1 2.1M12 17v4M9 21h6"/></Icon>;

// ── Logo ─────────────────────────────────────────────────────
export function Logo({ size = 20, onClick }: { size?: number; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9,
      cursor: onClick ? 'pointer' : 'default', userSelect: 'none'
    }}>
      <div style={{
        width: size + 10, height: size + 10, borderRadius: 9,
        display: 'grid', placeItems: 'center',
        background: 'var(--accent)', color: '#fff',
        boxShadow: '0 4px 14px color-mix(in oklab, var(--accent) 36%, transparent)'
      }}>
        <IcPlay size={size - 2} />
      </div>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: size, letterSpacing: '-0.02em', color: 'var(--text)'
      }}>
        Watch<span style={{ color: 'var(--accent)' }}>Party</span>
      </span>
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────
const AV_COLORS = ['#2A6FDB','#27B07C','#D9A441','#E0484F','#8B5CF6','#0FA3B1'];

export function Avatar({ name, src, size = 30, ring = false }: {
  name: string; src?: string; size?: number; ring?: boolean
}) {
  if (src) {
    return (
      <img src={src} alt={name} style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        objectFit: 'cover',
        border: ring ? '2px solid var(--surface)' : '1px solid var(--border)',
      }} />
    );
  }
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const c = AV_COLORS[(name || '').length % AV_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'grid', placeItems: 'center',
      background: `color-mix(in oklab, ${c} 26%, var(--surface-2))`,
      color: c, fontWeight: 700, fontSize: size * 0.42,
      border: ring ? '2px solid var(--surface)' : '1px solid var(--border)',
      fontFamily: 'var(--font-display)',
    }}>{initial}</div>
  );
}

// ── Button ───────────────────────────────────────────────────
type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

export function Btn({ children, kind = 'primary', size = 'md', onClick, style, disabled, type = 'button' }: {
  children: React.ReactNode; kind?: BtnKind; size?: BtnSize;
  onClick?: () => void; style?: React.CSSProperties;
  disabled?: boolean; type?: 'button' | 'submit';
}) {
  const [hov, setHov] = useState(false);
  const pad = size === 'sm' ? '7px 14px' : size === 'lg' ? '13px 22px' : '10px 18px';
  const fs  = size === 'sm' ? 13 : size === 'lg' ? 15 : 14;

  const kinds: Record<BtnKind, React.CSSProperties> = {
    primary: {
      background: hov ? 'color-mix(in oklab, var(--accent) 88%, #fff)' : 'var(--accent)',
      color: '#fff', border: '1px solid transparent',
      boxShadow: '0 3px 12px color-mix(in oklab, var(--accent) 28%, transparent)',
    },
    ghost: {
      background: hov ? 'var(--surface-2)' : 'transparent',
      color: 'var(--text-muted)', border: '1px solid var(--border)',
    },
    soft: {
      background: hov
        ? 'color-mix(in oklab, var(--accent) 22%, var(--surface-2))'
        : 'color-mix(in oklab, var(--accent) 14%, var(--surface-2))',
      color: 'var(--accent-text)', border: '1px solid transparent',
    },
    danger: {
      background: hov ? 'color-mix(in oklab, #e0484f 88%, #fff)' : 'transparent',
      color: hov ? '#fff' : '#e0484f',
      border: '1px solid color-mix(in oklab, #e0484f 50%, transparent)',
    },
  };

  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        justifyContent: 'center', padding: pad, fontSize: fs,
        fontWeight: 600, borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font-body)', transition: 'all .15s ease',
        opacity: disabled ? 0.45 : 1, outline: 'none',
        ...kinds[kind], ...style,
      }}
    >{children}</button>
  );
}

// ── Field ────────────────────────────────────────────────────
export function Field({ label, hint, icon, type = 'text', placeholder, value, onChange, autoFocus, onSubmit, style }: {
  label?: string; hint?: string; icon?: React.ReactNode;
  type?: string; placeholder?: string; value: string;
  onChange?: (v: string) => void; autoFocus?: boolean;
  onSubmit?: () => void; style?: React.CSSProperties;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: 'block', ...style }}>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 7 }}>
          {label}{hint && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> {hint}</span>}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px',
        background: 'var(--field)', borderRadius: 10,
        border: focus ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
        transition: 'border-color .15s ease',
        boxShadow: focus ? '0 0 0 3px color-mix(in oklab, var(--accent) 14%, transparent)' : 'none',
      }}>
        {icon && <span style={{ color: 'var(--text-faint)', display: 'flex' }}>{icon}</span>}
        <input
          type={type} placeholder={placeholder} value={value} autoFocus={autoFocus}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) onSubmit(); }}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            padding: '11px 0', fontSize: 14, color: 'var(--text)',
            fontFamily: 'var(--font-body)',
          }}
        />
      </div>
    </label>
  );
}

// ── Badge ────────────────────────────────────────────────────
type BadgeTone = 'neutral' | 'live' | 'accent' | 'green';

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: 'var(--surface-2)', fg: 'var(--text-muted)' },
    live:    { bg: 'color-mix(in oklab, #e0484f 16%, var(--surface-2))', fg: '#e0484f' },
    accent:  { bg: 'color-mix(in oklab, var(--accent) 15%, var(--surface-2))', fg: 'var(--accent-text)' },
    green:   { bg: 'color-mix(in oklab, #27b07c 15%, var(--surface-2))', fg: 'var(--ok-text)' },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3.5px 9px', borderRadius: 999,
      fontSize: 11.5, fontWeight: 700, letterSpacing: '0.02em',
      background: t.bg, color: t.fg,
    }}>{children}</span>
  );
}

// ── LiveDot ──────────────────────────────────────────────────
export function LiveDot({ color = '#e0484f' }: { color?: string }) {
  return (
    <span style={{ position: 'relative', width: 7, height: 7, display: 'inline-block' }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color }} />
      <span className="wp-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color }} />
    </span>
  );
}

// ── ThemeToggle ──────────────────────────────────────────────
export function ThemeToggle() {
  const { dark, toggleTheme } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={toggleTheme}
      title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 36, height: 36, borderRadius: 10,
        border: '1px solid var(--border)',
        background: hov ? 'var(--surface-2)' : 'transparent',
        color: 'var(--text-muted)', cursor: 'pointer',
        display: 'grid', placeItems: 'center', transition: 'background .15s',
      }}
    >
      {dark ? <IcSun size={17} /> : <IcMoon size={16} />}
    </button>
  );
}

// ── Icon-only button helper ──────────────────────────────────
export function IconBtn({ children, onClick, title, style }: {
  children: React.ReactNode; onClick?: React.MouseEventHandler<HTMLButtonElement>; title?: string; style?: React.CSSProperties;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 36, height: 36, borderRadius: 10,
        border: '1px solid var(--border)',
        background: hov ? 'var(--surface-2)' : 'transparent',
        color: 'var(--text-muted)', cursor: 'pointer',
        display: 'grid', placeItems: 'center', transition: 'background .15s',
        ...style,
      }}
    >{children}</button>
  );
}
