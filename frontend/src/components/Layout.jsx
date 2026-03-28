import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-600 text-white shadow-sm'
      : 'text-ink-700 hover:bg-slate-100 hover:text-ink-900'
  }`;

export default function Layout({ children }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="font-display shrink-0 text-lg font-semibold text-brand-700 transition hover:text-brand-800"
          >
            Smart Doctor
          </Link>
          <nav
            className="-mr-1 flex max-w-[calc(100vw-8rem)] flex-1 items-center justify-end gap-1 overflow-x-auto pb-0.5 pt-0.5 sm:max-w-none sm:overflow-visible"
            aria-label="Main"
          >
            <NavLink to="/" className={linkClass} end>
              Home
            </NavLink>
            <NavLink to="/doctors" className={linkClass}>
              Doctors
            </NavLink>
            {isAuthenticated && user?.role === 'patient' && (
              <NavLink to="/patient" className={linkClass}>
                My appointments
              </NavLink>
            )}
            {isAuthenticated && user?.role === 'doctor' && (
              <NavLink to="/doctor" className={linkClass}>
                Dashboard
              </NavLink>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <>
                <NavLink to="/admin/analytics" className={linkClass}>
                  Analytics
                </NavLink>
                <NavLink to="/admin/doctors/new" className={linkClass}>
                  Add doctor
                </NavLink>
              </>
            )}
            {!isAuthenticated ? (
              <>
                <NavLink to="/login" className={linkClass}>
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  Register
                </NavLink>
              </>
            ) : null}
            {isAuthenticated ? (
              <div className="ml-1 flex shrink-0 items-center gap-2 border-l border-slate-200 pl-2 sm:ml-2 sm:pl-3">
                <span className="hidden max-w-[10rem] truncate text-xs text-ink-500 lg:inline">
                  {user?.name}
                  <span className="capitalize text-ink-400"> · {user?.role}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 shadow-sm transition hover:bg-slate-50"
                >
                  Log out
                </button>
              </div>
            ) : null}
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-ink-500">
        Smart Doctor Appointment System · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
