import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get<AuthUser>('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try { await api.get('/auth/logout'); } catch { /* ignore */ }
    setUser(null);
    window.location.href = '/login';
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/auth/google`;
  }, []);

  return { user, loading, logout, loginWithGoogle, refetch: fetchMe };
}
