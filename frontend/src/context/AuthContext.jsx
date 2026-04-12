import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

const STORAGE_KEY = 'sda_token';
const USER_KEY    = 'sda_user';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Persist / clear JWT in localStorage + axios headers. */
function persistToken(token) {
  if (token) {
    setAuthToken(token);
    localStorage.setItem(STORAGE_KEY, token);
  } else {
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Persist / clear user object in localStorage. */
function persistUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else       localStorage.removeItem(USER_KEY);
}

// ────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  // ── Sync token → axios header + storage ──────────────────────────────────
  useEffect(() => { persistToken(token); }, [token]);
  useEffect(() => { persistUser(user); }, [user]);

  // ── Initialize loading state on mount ────────────────────────────────────
  useEffect(() => {
    setLoading(false);
  }, []);

  // ── Refresh user from API when a token exists ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!token) { return; }
      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled && data.user) setUser(data.user);
      } catch {
        if (!cancelled) { setToken(null); setUser(null); }
      }
    }
    refresh();
    return () => { cancelled = true; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    console.log('[AuthContext.login] Calling Express /auth/login');

    const { data } = await api.post(
      '/auth/login',
      { email: String(email).trim().toLowerCase(), password },
      { skipAuthRedirect: true }
    );

    console.log('[AuthContext.login] ✅ Login successful. User:', data.user?.email, '| Role:', data.user?.role);
    persistToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // ── register ──────────────────────────────────────────────────────────────
  /**
   * payload: { name, email, password, role, phone,
   *            [specialization, experienceYears, bio] }
   */
  const register = useCallback(async (payload) => {
    const email    = String(payload.email ?? '').trim().toLowerCase();
    const { name, password, role, phone } = payload;

    console.log('[AuthContext.register] Calling Express /auth/register for:', email, '| role:', role);

    const { data: backendData } = await api.post(
      '/auth/register',
      {
        name,
        email,
        password,
        role,
        phone: phone || '',
        ...(payload.specialization   ? { specialization: payload.specialization }     : {}),
        ...(payload.experienceYears !== undefined
          ? { experienceYears: payload.experienceYears }
          : {}),
        ...(payload.bio ? { bio: payload.bio } : {}),
      },
      { skipAuthRedirect: true }
    );
    
    console.log('[AuthContext.register] ✅ Registration successful. User:', backendData.user?.email);
    persistToken(backendData.token);
    setToken(backendData.token);
    setUser(backendData.user);
    return backendData.user;
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    console.log('[AuthContext.logout] Clearing session');
    setToken(null);
    setUser(null);
  }, []);

  // ── Global 401 handler ────────────────────────────────────────────────────
  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    return () => setUnauthorizedHandler(() => {});
  }, [logout]);

  // ─────────────────────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated: Boolean(token && user),
    }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
