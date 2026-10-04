import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, setUnauthorizedHandler } from './api';

const AuthContext = createContext(null);

/**
 * Who is signed in, and what their role lets them do.
 *
 * `permissions` comes from the server (GET /auth/me) rather than being worked
 * out here from the role, so the panel can never offer something the server
 * would refuse — the server is the copy that is enforced; this one only
 * decides what to show.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, permissions: [] });
  const [expired, setExpired] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await api.get('/auth/me');
      setState({ status: 'ready', user: me.user, permissions: me.permissions });
    } catch {
      setState({ status: 'ready', user: null, permissions: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setExpired(true);
      setState({ status: 'ready', user: null, permissions: [] });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      expired,
      can: (permission) => state.permissions.includes(permission),
      async login(email, password) {
        const me = await api.post('/auth/login', { email, password });
        setExpired(false);
        setState({ status: 'ready', user: me.user, permissions: me.permissions });
      },
      async logout() {
        try {
          await api.post('/auth/logout');
        } finally {
          setState({ status: 'ready', user: null, permissions: [] });
        }
      },
      refresh: load,
    }),
    [state, expired, load]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

/** Sends a signed-out visitor to the sign-in page, remembering where they were going. */
export function RequireAuth({ children }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    return (
      <div className="boot" role="status" aria-live="polite">
        <span className="boot-mark" aria-hidden="true" />
        <span className="sr-only">Loading the admin panel…</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

/** Renders children only when the role allows; otherwise a polite refusal. */
export function RequirePermission({ permission, children }) {
  const { can } = useAuth();
  if (can(permission)) return children;
  return (
    <div className="page">
      <div className="state state-error" role="alert">
        <h1 className="state-title">Not available to your role</h1>
        <p>Ask a super admin if you need access to this section.</p>
      </div>
    </div>
  );
}
