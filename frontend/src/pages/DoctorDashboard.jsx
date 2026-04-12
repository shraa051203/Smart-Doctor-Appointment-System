import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';
import PageLoader from '../components/PageLoader';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

const defaultTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

export default function DoctorDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availDate, setAvailDate] = useState('');
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [savingAvail, setSavingAvail] = useState(false);
  const [availMsg, setAvailMsg] = useState('');
  const [availMsgType, setAvailMsgType] = useState('info');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingProfile, setDeletingProfile] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, aRes] = await Promise.all([
        api.get('/doctors/profile/me'),
        api.get('/appointments/doctor'),
      ]);
      setProfile(pRes.data.doctor);
      setAppointments(aRes.data.appointments || []);
    } catch (err) {
      const st = err.response?.status;
      if (st === 404) {
        setError(
          'No doctor profile is linked to this account. Register as a doctor or ask an admin to create your profile.'
        );
      } else {
        setError(getErrorMessage(err, 'Could not load dashboard.'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleTime = (t) => {
    setSelectedTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].sort()));
  };

  const addDaySlots = async (e) => {
    e.preventDefault();
    setAvailMsg('');
    if (!availDate) {
      setAvailMsgType('error');
      setAvailMsg('Pick a date.');
      return;
    }
    if (selectedTimes.length === 0) {
      setAvailMsgType('error');
      setAvailMsg('Select at least one time slot.');
      return;
    }
    setSavingAvail(true);
    try {
      const existing = profile?.availableSlots || [];
      const others = existing.filter((d) => d.date !== availDate);
      const merged = [...others, { date: availDate, slots: selectedTimes }].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      await api.put('/doctors/availability/me', { slots: merged });
      setAvailMsgType('success');
      setAvailMsg('Availability saved.');
      setSelectedTimes([]);
      await loadAll();
    } catch (err) {
      setAvailMsgType('error');
      setAvailMsg(getErrorMessage(err, 'Could not save availability.'));
    } finally {
      setSavingAvail(false);
    }
  };

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    setError('');
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update appointment.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteProfile = async () => {
    if (!profile) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete your profile and account? This will permanently delete your profile, all your appointments, and your account. This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingProfile(true);
    setError('');
    try {
      await api.delete(`/doctors/${profile._id}`);
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete profile.'));
      setDeletingProfile(false);
    }
  };

  if (loading && !profile && !error) {
    return <PageLoader message="Loading your dashboard…" />;
  }

  if (error && !profile) {
    return (
      <div className="space-y-4">
        <Alert type="error">{error}</Alert>
        <button type="button" onClick={() => loadAll()} className="sda-btn-secondary py-2 text-sm">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sda-page-title">Doctor Dashboard</h1>
          <p className="text-sm text-ink-500">
            {profile?.name} · {profile?.specialization}
          </p>
        </div>
        {profile && (
          <button
            type="button"
            onClick={deleteProfile}
            disabled={deletingProfile}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition"
          >
            {deletingProfile && <Spinner className="!h-4 !w-4 border-red-400 border-r-transparent" />}
            🗑 Delete My Profile
          </button>
        )}
      </div>
      {error ? (
        <div className="space-y-2">
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </div>
      ) : null}

      <section className="sda-card">
        <h2 className="font-display text-lg font-semibold text-ink-900">Set availability</h2>
        <p className="mt-1 text-sm text-ink-500">
          Add open slots per date. Patients only see these times when booking.
        </p>
        <form onSubmit={addDaySlots} className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="avail-date" className="block text-sm font-medium text-ink-700">
                Date
              </label>
              <input
                id="avail-date"
                type="date"
                value={availDate}
                onChange={(e) => setAvailDate(e.target.value)}
                className="sda-input w-auto min-w-[11rem]"
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-700">Time slots for this date</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {defaultTimes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTime(t)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    selectedTimes.includes(t)
                      ? 'border-brand-600 bg-brand-50 text-brand-800 shadow-sm'
                      : 'border-slate-200 text-ink-600 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {availMsg ? (
            <Alert
              type={availMsgType === 'success' ? 'success' : 'error'}
              onClose={() => setAvailMsg('')}
            >
              {availMsg}
            </Alert>
          ) : null}
          <button
            type="submit"
            disabled={savingAvail}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {savingAvail && <Spinner className="!h-4 !w-4 border-white border-r-transparent" />}
            Save day slots
          </button>
        </form>
        {profile?.availableSlots?.length > 0 && (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-ink-900">Published availability</h3>
            <ul className="mt-2 space-y-2 text-sm text-ink-600">
              {profile.availableSlots.map((d) => (
                <li key={d.date}>
                  <strong className="text-ink-800">{d.date}</strong>: {d.slots?.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink-900">Booked appointments</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-500">
                    No bookings yet.
                  </td>
                </tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a._id}>
                    <td className="px-4 py-3 font-medium">{a.patient?.name}</td>
                    <td className="px-4 py-3">{a.date}</td>
                    <td className="px-4 py-3">{a.time}</td>
                    <td className="px-4 py-3 capitalize">{a.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {a.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={updatingId === a._id}
                              onClick={() => updateStatus(a._id, 'completed')}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {updatingId === a._id ? '…' : 'Complete'}
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === a._id}
                              onClick={() => updateStatus(a._id, 'cancelled')}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-ink-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
