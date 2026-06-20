import { Helmet } from 'react-helmet-async';
import { Logo, ThemeToggle, Btn } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

const FEATURES = [
  {
    emoji: '🎬',
    title: 'Xem phim cùng nhau',
    desc: 'Tạo phòng, dán link video, mời bạn bè — tất cả xem đồng bộ theo thời gian thực dù ở cách nhau hàng nghìn km.',
    color: '#3b82f6',
  },
  {
    emoji: '💬',
    title: 'Chat trực tiếp',
    desc: 'Nhắn tin, phản ứng khi đang xem. Không cần app ngoài, không cần thoát tab.',
    color: '#8b5cf6',
  },
  {
    emoji: '🍿',
    title: 'Movie Night Generator',
    desc: 'Hết "xem gì bây giờ?". Chọn thể loại, xoay wheel, battle phim hoặc ghép sở thích cặp đôi.',
    color: '#e91e63',
  },
  {
    emoji: '🔒',
    title: 'Phòng riêng tư',
    desc: 'Đặt mật khẩu cho phòng để chỉ những ai được mời mới vào được.',
    color: '#f59e0b',
  },
];

const MOVIE_MODES = [
  { emoji: '🎡', title: 'Spin the Wheel', desc: 'Spin ngẫu nhiên để chọn phim', href: '/movie-night/wheel', color: '#e91e63' },
  { emoji: '⚔',  title: 'Movie Battle',   desc: '10 vòng đối đầu chọn phim hay nhất', href: '/movie-night/battle', color: '#e67e22' },
  { emoji: '💑', title: 'Couple Mode',    desc: 'Tìm phim phù hợp sở thích cả hai', href: '/movie-night/couple', color: '#8b5cf6' },
];

const GENRES = [
  { label: 'Horror',  emoji: '😱', href: '/random-horror-movie-generator' },
  { label: 'Comedy',  emoji: '😂', href: '/random-comedy-movie-generator' },
  { label: 'Action',  emoji: '💥', href: '/random-action-movie-generator' },
  { label: 'Anime',   emoji: '🎌', href: '/random-anime-generator' },
  { label: 'Netflix', emoji: '🔴', href: '/random-netflix-movie-generator' },
  { label: 'TV Show', emoji: '📺', href: '/random-tv-show-generator' },
  { label: 'Family',  emoji: '👨‍👩‍👧', href: '/random-family-movie-generator' },
  { label: 'Random',  emoji: '🎲', href: '/random-movie-generator' },
];

const STEPS = [
  { n: '1', title: 'Đăng nhập bằng Google', desc: 'Chỉ 1 cú click, không cần nhớ mật khẩu.' },
  { n: '2', title: 'Tạo hoặc tham gia phòng', desc: 'Dán link YouTube, mp4, hay bất kỳ video nào.' },
  { n: '3', title: 'Mời bạn bè và xem cùng', desc: 'Chia sẻ link phòng — bắt đầu ngay lập tức.' },
];

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();

  return (
    <>
      <Helmet>
        <title>WatchParty — Xem phim cùng bạn bè theo thời gian thực</title>
        <meta name="description" content="Tạo phòng xem phim, đồng bộ video với bạn bè, chat trực tiếp và khám phá phim với Movie Night Generator." />
      </Helmet>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>

        {/* ── Navbar ───────────────────────────────────────────── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Logo size={18} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a href="/random-movie-generator" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>
                Movie Night
              </a>
              <ThemeToggle />
              <Btn kind="primary" size="sm" onClick={loginWithGoogle}>Đăng nhập</Btn>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

          {/* ── Hero ─────────────────────────────────────────────── */}
          <section style={{ padding: '80px 0 72px', textAlign: 'center', position: 'relative' }}>
            {/* Glow */}
            <div style={{
              position: 'absolute', width: 600, height: 400, borderRadius: '50%',
              background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 16%, transparent) 0%, transparent 70%)',
              top: 0, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 99,
                background: 'color-mix(in oklab, var(--accent) 10%, var(--surface))',
                border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--border))',
                fontSize: 13, fontWeight: 600, color: 'var(--accent-text)',
                marginBottom: 24,
              }}>
                🎉 Hoàn toàn miễn phí · Không cần cài đặt
              </div>

              <h1 style={{
                margin: '0 0 18px', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900,
                lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--text)',
                fontFamily: 'var(--font-display)',
              }}>
                Xem phim cùng bạn bè<br />
                <span style={{ color: 'var(--accent-text)' }}>dù ở bất cứ đâu</span>
              </h1>

              <p style={{
                margin: '0 auto 36px', fontSize: 17, color: 'var(--text-muted)',
                lineHeight: 1.7, maxWidth: 520,
              }}>
                Tạo phòng xem phim, đồng bộ video theo thời gian thực, chat cùng nhau —
                và dùng Movie Night Generator để hết phân vân "xem gì bây giờ?"
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={loginWithGoogle}
                  style={{
                    padding: '14px 32px', borderRadius: 12, fontSize: 16, fontWeight: 700,
                    background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 20px color-mix(in oklab, var(--accent) 40%, transparent)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <GoogleSvg />
                  Bắt đầu với Google
                </button>
                <a
                  href="/random-movie-generator"
                  style={{
                    padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--text)', textDecoration: 'none', display: 'inline-block',
                  }}
                >
                  🎲 Thử Movie Night
                </a>
              </div>
            </div>
          </section>

          {/* ── Features ─────────────────────────────────────────── */}
          <section style={{ padding: '0 0 72px' }}>
            <SectionLabel>Tính năng</SectionLabel>
            <h2 style={sectionH2}>Tất cả những gì bạn cần để xem phim cùng nhau</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {FEATURES.map(f => (
                <div key={f.title} style={{
                  padding: '22px 20px', borderRadius: 16,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, marginBottom: 14,
                    background: `color-mix(in oklab, ${f.color} 14%, var(--surface-2))`,
                    display: 'grid', placeItems: 'center', fontSize: 22,
                  }}>
                    {f.emoji}
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{f.title}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Movie Night ───────────────────────────────────────── */}
          <section style={{ padding: '0 0 72px' }}>
            <SectionLabel>Movie Night Generator</SectionLabel>
            <h2 style={sectionH2}>Hết cảnh "xem gì bây giờ?" mãi mãi</h2>
            <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 560 }}>
              Chọn thể loại yêu thích, spin wheel ngẫu nhiên, battle phim, hoặc tìm phim phù hợp cho cả cặp đôi.
              Dữ liệu từ TMDB — hàng triệu bộ phim.
            </p>

            {/* Mode cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginBottom: 28 }}>
              {MOVIE_MODES.map(m => (
                <a
                  key={m.href}
                  href={m.href}
                  style={{
                    padding: '18px 20px', borderRadius: 14, textDecoration: 'none',
                    background: 'var(--surface)', border: `1.5px solid var(--border)`,
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = m.color;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${m.color}30`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `color-mix(in oklab, ${m.color} 14%, var(--surface-2))`,
                    display: 'grid', placeItems: 'center', fontSize: 22,
                  }}>
                    {m.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{m.title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{m.desc}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: 18, flexShrink: 0 }}>›</div>
                </a>
              ))}
            </div>

            {/* Genre links */}
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)' }}>
              Chọn theo thể loại
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GENRES.map(g => (
                <a
                  key={g.href}
                  href={g.href}
                  style={{
                    padding: '9px 16px', borderRadius: 10, textDecoration: 'none',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    fontSize: 14, fontWeight: 600, color: 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'border-color 0.12s, background 0.12s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                  }}
                >
                  <span>{g.emoji}</span> {g.label}
                </a>
              ))}
            </div>
          </section>

          {/* ── How it works ─────────────────────────────────────── */}
          <section style={{ padding: '0 0 72px' }}>
            <SectionLabel>Cách dùng</SectionLabel>
            <h2 style={sectionH2}>Bắt đầu trong 30 giây</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {STEPS.map(s => (
                <div key={s.n} style={{
                  padding: '24px 20px', borderRadius: 16,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'color-mix(in oklab, var(--accent) 14%, var(--surface-2))',
                    border: '1.5px solid color-mix(in oklab, var(--accent) 25%, var(--border))',
                    display: 'grid', placeItems: 'center',
                    fontSize: 16, fontWeight: 800, color: 'var(--accent-text)',
                  }}>
                    {s.n}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{s.title}</h3>
                    <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA ──────────────────────────────────────────────── */}
          <section style={{ padding: '0 0 80px' }}>
            <div style={{
              padding: '52px 32px', borderRadius: 24, textAlign: 'center',
              background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
              border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--border))',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', width: 400, height: 300, borderRadius: '50%',
                background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 20%, transparent) 0%, transparent 70%)',
                top: -100, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h2 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
                  Sẵn sàng xem phim cùng nhau?
                </h2>
                <p style={{ margin: '0 0 28px', fontSize: 15, color: 'var(--text-muted)' }}>
                  Miễn phí hoàn toàn. Đăng nhập bằng Google, tạo phòng, và bắt đầu ngay.
                </p>
                <button
                  onClick={loginWithGoogle}
                  style={{
                    padding: '14px 36px', borderRadius: 12, fontSize: 16, fontWeight: 700,
                    background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 20px color-mix(in oklab, var(--accent) 40%, transparent)',
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <GoogleSvg />
                  Bắt đầu miễn phí
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 24px' }}>
          <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <Logo size={15} />
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {GENRES.map(g => (
                <a key={g.href} href={g.href} style={{ fontSize: 12.5, color: 'var(--text-faint)', textDecoration: 'none' }}>
                  {g.emoji} {g.label}
                </a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--accent-text)' }}>
      {children}
    </p>
  );
}

const sectionH2: React.CSSProperties = {
  margin: '0 0 24px', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800,
  color: 'var(--text)', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)',
};

function GoogleSvg() {
  return (
    <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', background: '#fff', flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.17 3.58-8.81z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"/>
        <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z"/>
        <path fill="#EA4335" d="M12 4.76c1.76 0 3.35.6 4.6 1.8l3.42-3.42A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z"/>
      </svg>
    </span>
  );
}
