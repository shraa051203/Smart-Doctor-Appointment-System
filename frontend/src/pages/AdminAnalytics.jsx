import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { getErrorMessage } from '../utils/apiError';
import PageLoader from '../components/PageLoader';
import Alert from '../components/Alert';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: d } = await api.get('/appointments/analytics');
      setData(d);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load analytics.'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <PageLoader message="Loading analytics…" />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Alert type="error">{error || 'No data.'}</Alert>
        <button type="button" onClick={() => load()} className="sda-btn-secondary py-2 text-sm">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="sda-page-title">Analytics</h1>
      <p className="text-sm text-ink-500">Appointment volume overview (admin).</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sda-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Total</p>
          <p className="mt-2 font-display text-3xl font-bold text-brand-700">{data.total}</p>
        </div>
        <div className="sda-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Pending</p>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">{data.byStatus?.pending}</p>
        </div>
        <div className="sda-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Completed</p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">{data.byStatus?.completed}</p>
        </div>
        <div className="sda-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Cancelled</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-600">{data.byStatus?.cancelled}</p>
        </div>
      </div>
      <div className="sda-card mt-10">
        <h2 className="font-display text-lg font-semibold text-ink-900">Top doctors by bookings</h2>
        <ol className="mt-4 space-y-2">
          {(data.topDoctors || []).length === 0 ? (
            <li className="text-sm text-ink-500">No data yet.</li>
          ) : (
            data.topDoctors.map((d, i) => (
              <li key={String(d.doctorId)} className="flex items-center justify-between text-sm">
                <span>
                  {i + 1}. {d.name}
                </span>
                <span className="font-semibold text-brand-700">{d.count}</span>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>
  );
}
