import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';

export interface AuthUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  mobile: string;
  language: string;
  accountStatus: 'pending_verification' | 'active' | 'suspended' | 'closed';
  role: 'owner' | 'reviewer' | 'admin';
  applicationId?: string | null;
  /** True when this is a local Demo Mode session (sample data, nothing saved). */
  demo?: boolean;
  businessName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string, remember: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  startDemoSession: (name: string, businessName: string) => AuthUser;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_SESSION_KEY = 'vyaparai_demo_session';

interface DemoSession {
  userId: string;
  name: string;
  businessName: string;
  createdAt: string;
}

function readDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoSession;
    return parsed?.userId && parsed?.name ? parsed : null;
  } catch {
    return null;
  }
}

function demoUserFrom(session: DemoSession): AuthUser {
  return {
    id: `demo-${session.userId}`,
    userId: session.userId,
    name: session.name,
    email: '',
    mobile: '',
    language: 'hi',
    accountStatus: 'active',
    role: 'owner',
    demo: true,
    businessName: session.businessName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const demoSession = readDemoSession();
    if (demoSession) {
      setUser(demoUserFrom(demoSession));
      return;
    }
    try {
      const res = await api.get<{ user: AuthUser | null }>('/api/auth/me');
      setUser(res?.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(api.UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(api.UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (identifier: string, password: string, remember: boolean) => {
    const res = await api.post<{ user: AuthUser }>('/api/auth/login', { identifier, password, remember });
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      await api.post('/api/auth/logout');
    } catch {
      setUser(null);
    }
  }, []);

  /**
   * Controlled Demo Mode entry: a clearly-labelled local session with sample
   * data. It never claims a real account was created or verified.
   */
  const startDemoSession = useCallback((name: string, businessName: string) => {
    const session: DemoSession = {
      userId: `VY-DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      name,
      businessName,
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    } catch {
      /* storage unavailable — session stays in memory */
    }
    const demo = demoUserFrom(session);
    setUser(demo);
    return demo;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refresh, startDemoSession }),
    [user, loading, login, logout, refresh, startDemoSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
