import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { getErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import { TableSkeleton } from '../components/Skeleton';

const statusBadge = {
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-700',
};

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/appointments/user');
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load appointments.'));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="sda-page-title">My appointments</h1>
          <p className="text-sm text-ink-500">Your bookings and their status.</p>
        </div>
        <Link to="/doctors" className="sda-btn-primary w-full justify-center py-2 sm:w-auto">
          Book another
        </Link>
      </div>
      {error && (
        <div className="mt-4 space-y-3">
          <Alert type="error">{error}</Alert>
          <button type="button" onClick={() => load()} className="sda-btn-secondary py-2 text-sm">
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Specialization</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-ink-500">
                    No appointments yet.{' '}
                    <Link to="/doctors" className="font-semibold text-brand-600 hover:underline">
                      Browse doctors
                    </Link>
                  </td>
                </tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-ink-900">{a.doctor?.name}</td>
                    <td className="px-4 py-3 text-ink-600">{a.specialization || '—'}</td>
                    <td className="px-4 py-3">{a.date}</td>
                    <td className="px-4 py-3">{a.time}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge[a.status] || 'bg-slate-100'}`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
