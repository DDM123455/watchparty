import { useCallback, useEffect, useRef } from 'react';
import type { TmdbMovie } from '../../types/movieNight';

const SEG_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e91e63', '#ff5722', '#00bcd4',
  '#4caf50', '#ff9800', '#8bc34a', '#03a9f4',
];

interface Props {
  movies: TmdbMovie[];
  spinning: boolean;
  onSpinEnd: (winner: TmdbMovie) => void;
  size?: number;
}

export function MovieWheel({ movies, spinning, onSpinEnd, size = 380 }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rotRef     = useRef(0);
  const velRef     = useRef(0);
  const rafRef     = useRef(0);
  const activeRef  = useRef(false);
  const onEndRef   = useRef(onSpinEnd);
  onEndRef.current = onSpinEnd;

  const n        = movies.length;
  const segAngle = n > 0 ? (2 * Math.PI) / n : 0;

  const draw = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas || n === 0) return;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r  = cx - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < n; i++) {
      const start = rotation + i * segAngle - Math.PI / 2;
      const end   = start + segAngle;

      // Segment
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = SEG_COLORS[i % SEG_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#0d0d13';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text (radial, from edge toward center)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + segAngle / 2);
      ctx.textAlign  = 'right';
      ctx.fillStyle  = '#fff';
      const fontSize = Math.max(9, 14 - Math.floor(n / 4));
      ctx.font       = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur  = 3;
      const label     = (movies[i].display_title).length > 16
        ? movies[i].display_title.slice(0, 15) + '…'
        : movies[i].display_title;
      ctx.fillText(label, r - 14, fontSize / 3);
      ctx.restore();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = 3;
    ctx.stroke();

    // Center cap
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle   = '#0d0d13';
    ctx.fill();
    ctx.strokeStyle = 'var(--accent, #3b6ef8)';
    ctx.lineWidth   = 3;
    ctx.stroke();

    // Center icon
    ctx.fillStyle  = '#fff';
    ctx.font       = '14px serif';
    ctx.textAlign  = 'center';
    ctx.fillText('🎬', cx, cy + 5);
  }, [movies, n, segAngle]);

  // Initial draw
  useEffect(() => { draw(rotRef.current); }, [draw]);

  // Spin when `spinning` flips to true
  useEffect(() => {
    if (!spinning || activeRef.current) return;
    activeRef.current = true;
    // Initial velocity: 0.18–0.30 rad/frame @60fps ≈ 10–18 rad/s
    velRef.current    = 0.18 + Math.random() * 0.12;

    const frame = () => {
      velRef.current  *= 0.982;
      rotRef.current  += velRef.current;
      draw(rotRef.current);

      if (velRef.current > 0.002) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        activeRef.current = false;
        // Winner: segment under the top pointer
        const norm  = ((-rotRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const idx   = Math.floor(norm / segAngle) % n;
        onEndRef.current(movies[idx]);
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      activeRef.current = false; // reset so StrictMode double-run works
    };
  }, [spinning, draw, movies, n, segAngle]);

  if (n === 0) return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--surface-2)', border: '2px solid var(--border)',
      display: 'grid', placeItems: 'center', color: 'var(--text-faint)', fontSize: 14,
    }}>
      No movies loaded
    </div>
  );

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Pointer arrow at top */}
      <div style={{
        position: 'absolute', top: -4, left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '11px solid transparent',
        borderRight: '11px solid transparent',
        borderTop: '26px solid var(--accent, #3b6ef8)',
        zIndex: 5,
        filter: 'drop-shadow(0 2px 6px rgba(59,110,248,0.5))',
      }} />
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ display: 'block', borderRadius: '50%', boxShadow: 'var(--shadow-lg)' }}
      />
    </div>
  );
}
