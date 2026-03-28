import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

function CenterSpinner() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

function dashboardPathForRole(role) {
  if (role === 'doctor') return '/doctor';
  if (role === 'admin') return '/admin/analytics';
  return '/patient';
}

/** Avoid sending a patient to /doctor (or vice versa) after login with a stale `from` path. */
function canRoleAccessPath(role, path) {
  if (!path || path === '/login') return false;
  if (path.startsWith('/admin')) return role === 'admin';
  if (path.startsWith('/doctor')) return role === 'doctor';
  if (path.startsWith('/book') || path.startsWith('/patient')) return role === 'patient';
  return true;
}

export default function Login() {
  const { login, logout, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname;
  /** True when router sent user here because a protected page required sign-in */
  const redirectedFromProtected = Boolean(fromPath);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Only auto-redirect when we arrived from a protected route (session was missing).
   * If user opened /login while already signed in as someone else, stay on this page so they
   * can sign out or submit the form to switch accounts (e.g. patient → doctor).
   */
  useEffect(() => {
    if (loading || !isAuthenticated || !user) return;
    if (!redirectedFromProtected) return;
    const dest =
      user.role === 'doctor'
        ? '/doctor'
        : user.role === 'admin'
          ? '/admin/analytics'
          : fromPath && canRoleAccessPath(user.role, fromPath)
            ? fromPath
            : '/patient';
    navigate(dest, { replace: true });
  }, [loading, isAuthenticated, user, navigate, redirectedFromProtected, fromPath]);

  if (loading) return <CenterSpinner />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      const dest =
        u.role === 'doctor'
          ? '/doctor'
          : u.role === 'admin'
            ? '/admin/analytics'
            : redirectedFromProtected && fromPath && canRoleAccessPath(u.role, fromPath)
              ? fromPath
              : '/patient';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-bold text-ink-900">Sign in</h1>
      <p className="mt-1 text-sm text-ink-500">
        No account?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Register
        </Link>
      </p>

      {isAuthenticated && user ? (
        <div className="mt-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>
            You’re already signed in as <strong>{user.name}</strong> ({user.role}). To use a
            different account (for example a doctor account), sign out first or submit this form with
            other credentials—you’ll be switched to that account.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate(dashboardPathForRole(user.role))}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Go to your dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                setError('');
              }}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100/80"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="sda-card mt-8 space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sda-input"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sda-input"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="sda-btn-primary w-full"
        >
          {submitting && <Spinner className="!h-4 !w-4 border-white border-r-transparent" />}
          Sign in
        </button>
      </form>
    </div>
  );
}
