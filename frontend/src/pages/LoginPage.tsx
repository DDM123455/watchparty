import { useAuth } from '../hooks/useAuth';
import { Logo, ThemeToggle, Btn } from '../components/ui';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      position: 'relative', background: 'var(--bg)', padding: 24, overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', width: 720, height: 720, borderRadius: '50%',
        background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 14%, transparent) 0%, transparent 65%)',
        top: -280, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none',
      }} />

      {/* Theme toggle */}
      <div style={{ position: 'absolute', top: 22, right: 24 }}>
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
          <Logo size={22} />
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 18, padding: '32px 30px', boxShadow: 'var(--shadow-lg)',
        }}>
          <h1 style={{
            margin: '0 0 6px', fontFamily: 'var(--font-display)',
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)',
          }}>Chào mừng trở lại</h1>
          <p style={{ margin: '0 0 26px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Đăng nhập bằng tài khoản Google để xem phim cùng bạn bè theo thời gian thực.
          </p>

          <Btn kind="primary" size="lg" onClick={loginWithGoogle} style={{ width: '100%' }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: 22, height: 22,
              borderRadius: '50%', background: '#fff', flexShrink: 0,
            }}>
              <GoogleSvg />
            </span>
            Tiếp tục với Google
          </Btn>
        </div>

        <p style={{
          textAlign: 'center', fontSize: 12.5, color: 'var(--text-faint)',
          marginTop: 22, lineHeight: 1.6,
        }}>
          Chưa có tài khoản? Đăng nhập Google lần đầu sẽ tự động tạo tài khoản mới.
        </p>
      </div>
    </div>
  );
}

function GoogleSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.35.6 4.6 1.8l3.42-3.42A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z" />
    </svg>
  );
}
