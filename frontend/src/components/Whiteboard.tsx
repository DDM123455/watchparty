import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { WbItem } from '../types/socket';

interface Props {
  socketRef: React.MutableRefObject<Socket | null>;
  roomId: string;
  initialItems: WbItem[];
  onClose: () => void;
}

const COLORS = ['#1a1a1a', '#ffffff', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad'];
const SIZES  = [3, 6, 12, 20];
const CANVAS_W = 600;
const CANVAS_H = 420;

export default function Whiteboard({ socketRef, roomId, initialItems, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool]     = useState<'pen' | 'eraser' | 'text'>('pen');
  const [color, setColor]   = useState('#1a1a1a');
  const [size, setSize]     = useState(6);
  const [textPos, setTextPos]     = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const textRef = useRef<HTMLInputElement>(null);

  // Draggable panel
  const [pos, setPos] = useState({ x: Math.max(0, window.innerWidth / 2 - 320), y: 70 });
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);

  // In-progress stroke
  const drawing  = useRef(false);
  const lastPt   = useRef<{ x: number; y: number } | null>(null);
  const curPath  = useRef<{ x: number; y: number }[]>([]);
  const itemsRef = useRef<WbItem[]>([]);

  const ctx = () => canvasRef.current?.getContext('2d') ?? null;

  const applyStroke = useCallback((c: CanvasRenderingContext2D, item: WbItem) => {
    c.save();
    if (item.tool === 'text') {
      c.fillStyle = item.color;
      c.font = `${item.fontSize ?? 18}px sans-serif`;
      c.fillText(item.text ?? '', item.x ?? 0, item.y ?? 0);
    } else {
      const pts = item.points ?? [];
      if (pts.length < 1) { c.restore(); return; }
      c.strokeStyle = item.tool === 'eraser' ? '#ffffff' : item.color;
      c.lineWidth   = item.lineWidth;
      c.lineCap     = 'round';
      c.lineJoin    = 'round';
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
      c.stroke();
      // Single-point dot
      if (pts.length === 1) {
        c.fillStyle = c.strokeStyle as string;
        c.beginPath();
        c.arc(pts[0].x, pts[0].y, item.lineWidth / 2, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
  }, []);

  // Init canvas and draw initial items
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
    itemsRef.current = [...initialItems];
    for (const item of initialItems) applyStroke(c, item);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket listeners
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onStroke = (item: WbItem) => {
      const c = ctx();
      if (!c) return;
      itemsRef.current.push(item);
      applyStroke(c, item);
    };

    const onClear = () => {
      const canvas = canvasRef.current;
      const c = ctx();
      if (!canvas || !c) return;
      itemsRef.current = [];
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('wb:stroke', onStroke);
    socket.on('wb:clear', onClear);
    return () => {
      socket.off('wb:stroke', onStroke);
      socket.off('wb:clear', onClear);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canvasXY = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width)  * CANVAS_W,
      y: ((e.clientY - rect.top)  / rect.height) * CANVAS_H,
    };
  };

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = ctx();
    if (!c) return;
    c.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    c.lineWidth   = size;
    c.lineCap     = 'round';
    c.lineJoin    = 'round';
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.stroke();
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'text') {
      const p = canvasXY(e);
      setTextPos(p);
      setTextInput('');
      setTimeout(() => textRef.current?.focus(), 0);
      return;
    }
    drawing.current = true;
    const p = canvasXY(e);
    curPath.current  = [p];
    lastPt.current   = p;
    // dot on mousedown
    const c = ctx();
    if (c) {
      c.fillStyle = tool === 'eraser' ? '#ffffff' : color;
      c.beginPath();
      c.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
      c.fill();
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !lastPt.current) return;
    const p = canvasXY(e);
    drawSegment(lastPt.current, p);
    curPath.current.push(p);
    lastPt.current = p;
  };

  const onMouseUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPt.current  = null;
    if (curPath.current.length === 0) return;

    const item: WbItem = {
      id: crypto.randomUUID(),
      tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      lineWidth: size,
      points: [...curPath.current],
    };
    itemsRef.current.push(item);
    socketRef.current?.emit('wb:stroke', { roomId, item });
    curPath.current = [];
  };

  const submitText = () => {
    if (!textPos) return;
    const text = textInput.trim();
    setTextPos(null);
    setTextInput('');
    if (!text) return;
    const c = ctx();
    const fontSize = 18;
    if (c) {
      c.fillStyle = color;
      c.font      = `${fontSize}px sans-serif`;
      c.fillText(text, textPos.x, textPos.y);
    }
    const item: WbItem = {
      id: crypto.randomUUID(),
      tool: 'text',
      color,
      lineWidth: size,
      x: textPos.x,
      y: textPos.y,
      text,
      fontSize,
    };
    itemsRef.current.push(item);
    socketRef.current?.emit('wb:stroke', { roomId, item });
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const c = ctx();
    if (!canvas || !c) return;
    itemsRef.current = [];
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, canvas.width, canvas.height);
    socketRef.current?.emit('wb:clear', { roomId });
  };

  // Drag handlers
  const onTitleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({ x: me.clientX - dragRef.current.ox, y: me.clientY - dragRef.current.oy });
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const toolBtn = (t: 'pen' | 'eraser' | 'text', label: string) => (
    <button
      key={t}
      onClick={() => setTool(t)}
      style={{
        padding: '4px 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
        border: tool === t ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
        background: tool === t
          ? 'color-mix(in oklab, var(--accent) 14%, var(--surface))'
          : 'var(--field)',
        color: tool === t ? 'var(--accent-text)' : 'var(--text-muted)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 300,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,.28)',
      overflow: 'hidden', userSelect: 'none', minWidth: 630,
    }}>
      {/* Title bar */}
      <div
        onMouseDown={onTitleMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)', cursor: 'grab',
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
          Bảng trắng
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        padding: '7px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        {toolBtn('pen',    'Bút')}
        {toolBtn('eraser', 'Tẩy')}
        {toolBtn('text',   'Chữ')}

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

        {/* Color swatches */}
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            title={c}
            style={{
              width: 20, height: 20, borderRadius: '50%', background: c,
              border: color === c ? '2.5px solid var(--accent)' : '1.5px solid var(--border)',
              cursor: 'pointer', padding: 0, flexShrink: 0,
            }}
          />
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

        {/* Size buttons */}
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            style={{
              width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center',
              border: size === s ? '1.5px solid var(--accent)' : '1.5px solid transparent',
              background: size === s ? 'color-mix(in oklab, var(--accent) 10%, var(--surface))' : 'transparent',
              cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{
              width: Math.min(s, 16), height: Math.min(s, 16),
              borderRadius: '50%', background: 'var(--text-muted)',
            }} />
          </button>
        ))}

        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={handleClear}
            style={{
              padding: '4px 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              border: '1.5px solid var(--border)', background: 'var(--field)',
              color: '#e0484f', cursor: 'pointer',
            }}
          >
            Xoá hết
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', lineHeight: 0 }}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block', cursor: tool === 'text' ? 'text' : 'crosshair',
            width: CANVAS_W, height: CANVAS_H,
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
        {textPos && (
          <input
            ref={textRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitText();
              if (e.key === 'Escape') { setTextPos(null); setTextInput(''); }
            }}
            onBlur={submitText}
            style={{
              position: 'absolute',
              left: textPos.x,
              top: textPos.y - 20,
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 18, color, fontFamily: 'sans-serif', minWidth: 80,
              caretColor: color,
            }}
          />
        )}
      </div>
    </div>
  );
}
