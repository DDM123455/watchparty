import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import RoomPage from './pages/RoomPage';
import MovieNightHubPage from './pages/movie-night/MovieNightHubPage';
import RandomPickerPage from './pages/movie-night/RandomPickerPage';
import WheelPage from './pages/movie-night/WheelPage';
import BattlePage from './pages/movie-night/BattlePage';
import CouplePage from './pages/movie-night/CouplePage';
import { SeoPickerPage } from './pages/seo/SeoPickerPage';
import { SEO_CONFIGS } from './pages/seo/seoConfigs';

const Spinner = () => (
  <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center' }}>
    <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
  </div>
);

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <LandingPage />;
  return <HomePage />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ErrorBoundary><RootRoute /></ErrorBoundary>} />
            <Route
              path="/room/:id"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <RoomPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            {/* Movie Night — public routes (no auth required) */}
            <Route path="/movie-night"        element={<MovieNightHubPage />} />
            <Route path="/movie-night/pick"   element={<RandomPickerPage />} />
            <Route path="/movie-night/wheel"  element={<WheelPage />} />
            <Route path="/movie-night/battle" element={<BattlePage />} />
            <Route path="/movie-night/couple" element={<CouplePage />} />

            {/* About / Landing page (accessible when logged in) */}
            <Route path="/about" element={<LandingPage />} />

            {/* SEO landing pages */}
            <Route path="/random-movie-generator"          element={<SeoPickerPage config={SEO_CONFIGS.random} />} />
            <Route path="/random-horror-movie-generator"   element={<SeoPickerPage config={SEO_CONFIGS.horror} />} />
            <Route path="/random-comedy-movie-generator"   element={<SeoPickerPage config={SEO_CONFIGS.comedy} />} />
            <Route path="/random-action-movie-generator"   element={<SeoPickerPage config={SEO_CONFIGS.action} />} />
            <Route path="/random-anime-generator"          element={<SeoPickerPage config={SEO_CONFIGS.anime} />} />
            <Route path="/random-netflix-movie-generator"  element={<SeoPickerPage config={SEO_CONFIGS.netflix} />} />
            <Route path="/random-tv-show-generator"        element={<SeoPickerPage config={SEO_CONFIGS.tv} />} />
            <Route path="/random-family-movie-generator"   element={<SeoPickerPage config={SEO_CONFIGS.family} />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
