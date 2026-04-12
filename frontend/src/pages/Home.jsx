import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700';
const btnSecondary =
  'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-slate-50';

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 px-8 py-16 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Appointo: smart Doctor booking system
          </h1>
          <p className="mt-4 text-lg text-brand-100">
            Book trusted specialists in minutes. 
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/doctors"
              className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow hover:bg-brand-50"
            >
              Find a doctor
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="inline-flex items-center rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Create account
              </Link>
            )}
            {isAuthenticated && user?.role === 'patient' && (
              <Link
                to="/patient"
                className="inline-flex items-center rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                My appointments
              </Link>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </section>

      <section aria-labelledby="how-it-works-heading">
        <h2 id="how-it-works-heading" className="font-display text-xl font-bold text-ink-900">
          Get started
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-ink-900">For patients</h3>
            <p className="mt-2 flex-1 text-sm text-ink-500">
              Filter by specialization, open a profile, and book a time that is open on the doctor’s
              calendar.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link to="/doctors" className={btnPrimary}>
                Browse doctors
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className={btnSecondary}>
                  Register as patient
                </Link>
              )}
              {isAuthenticated && user?.role === 'patient' && (
                <Link to="/patient" className={btnSecondary}>
                  My appointments
                </Link>
              )}
            </div>
          </article>

          <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-ink-900">For doctors</h3>
            <p className="mt-2 flex-1 text-sm text-ink-500">
              Log in to set available dates and times, see bookings, and mark visits completed or
              cancelled.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link to="/login" className={btnPrimary}>
                Doctor login
              </Link>
              {!isAuthenticated && (
                <Link to="/register?role=doctor" className={btnSecondary}>
                  Register as doctor
                </Link>
              )}
              {isAuthenticated && user?.role === 'doctor' && (
                <Link to="/doctor" className={btnSecondary}>
                  Open dashboard
                </Link>
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
