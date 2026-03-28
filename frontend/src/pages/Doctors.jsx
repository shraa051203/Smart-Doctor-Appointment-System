import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { getErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import { DoctorsGridSkeleton } from '../components/Skeleton';

export default function Doctors() {
  const [filterInput, setFilterInput] = useState('');
  const debouncedFilter = useDebouncedValue(filterInput, 400);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = debouncedFilter.trim() ? { specialization: debouncedFilter.trim() } : {};
      const { data } = await api.get('/doctors', { params });
      setDoctors(data.doctors || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load doctors.'));
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="sda-page-title">Doctors</h1>
      <p className="mt-1 text-sm text-ink-500">
        Search by specialization and open a profile to book an appointment.
      </p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <label htmlFor="spec" className="block text-sm font-medium text-ink-700">
            Specialization
          </label>
          <div className="relative mt-1 max-w-md">
            <input
              id="spec"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="e.g. cardiology, dermatology"
              autoComplete="off"
              className="sda-input pr-10"
              aria-busy={loading}
            />
            {loading && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner className="!h-5 !w-5" />
              </span>
            )}
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-4 space-y-3">
          <Alert type="error">{error}</Alert>
          <button type="button" onClick={() => load()} className="sda-btn-secondary py-2 text-xs">
            Try again
          </button>
        </div>
      )}
      {loading && doctors.length === 0 ? (
        <DoctorsGridSkeleton />
      ) : !loading ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {doctors.length === 0 ? (
            <li className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-ink-500 shadow-sm">
              {debouncedFilter.trim() ? (
                <>
                  No doctors match “{debouncedFilter.trim()}”. Try another keyword or{' '}
                  <button
                    type="button"
                    className="font-semibold text-brand-600 underline hover:text-brand-700"
                    onClick={() => setFilterInput('')}
                  >
                    clear the filter
                  </button>
                  .
                </>
              ) : (
                'No doctors are listed yet. Ask an admin to add doctors or run the seed script.'
              )}
            </li>
          ) : (
            doctors.map((d) => (
              <li
                key={d._id}
                className="sda-card p-5 transition hover:border-brand-200/80 hover:shadow-md"
              >
                <h2 className="font-display text-lg font-semibold text-ink-900">{d.name}</h2>
                <p className="text-sm font-medium text-brand-700">{d.specialization}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {d.experienceYears != null ? `${d.experienceYears} yrs experience` : '\u00a0'}
                </p>
                <Link
                  to={`/doctors/${d._id}`}
                  className="mt-4 inline-flex text-sm font-semibold text-brand-600 transition hover:text-brand-800"
                >
                  View profile →
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : (
        <DoctorsGridSkeleton />
      )}
    </div>
  );
}
