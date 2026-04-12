import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';
import PageLoader from '../components/PageLoader';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

export default function BookAppointment() {
  const { isAuthenticated } = useAuth();
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const loadDoctor = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get(`/doctors/${profileId}`);
      setDoctor(data.doctor);
    } catch (err) {
      setDoctor(null);
      setLoadError(getErrorMessage(err, 'Unable to load doctor.'));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadDoctor();
  }, [loadDoctor]);

  const slotsForDate = useMemo(() => {
    if (!doctor?.availableSlots || !date) return [];
    const day = doctor.availableSlots.find((d) => d.date === date);
    return day?.slots || [];
  }, [doctor, date]);

  const availableSlotsForDate = useMemo(() => {
    const slots = slotsForDate;
    if (!date) return slots;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    if (date === today) {
      // Filter out past times
      return slots.filter(slot => slot > currentTime);
    }
    return slots;
  }, [slotsForDate, date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    // Auth guard — must be logged in to book an appointment
    if (!isAuthenticated) {
      alert('You must be logged in to book an appointment. Please sign in first.');
      navigate('/login', { state: { from: { pathname: `/book/${profileId}` } } });
      return;
    }

    if (!date || !time) {
      setFormError('Choose a date and time.');
      return;
    }

    // Client-side validation for past dates
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    if (date < today || (date === today && time <= currentTime)) {
      setFormError('Cannot book appointment for past date/time.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/appointments/book', {
        doctorProfileId: profileId,
        date,
        time,
        notes: notes.trim(),
      });
      setSuccess(
        'Appointment booked. If email is configured on the server, you will receive a confirmation.'
      );
      setTimeout(() => navigate('/patient'), 2200);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Booking failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader message="Loading doctor…" />;
  }

  if (loadError || !doctor) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Alert type="error">{loadError || 'Doctor not found.'}</Alert>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => loadDoctor()} className="sda-btn-secondary py-2 text-sm">
            Try again
          </button>
          <Link to="/doctors" className="sda-btn-primary py-2 text-sm">
            All doctors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        to={`/doctors/${profileId}`}
        className="text-sm font-medium text-brand-600 hover:text-brand-800 hover:underline"
      >
        ← Back to profile
      </Link>
      <h1 className="mt-6 font-display text-2xl font-bold text-ink-900">Book with {doctor.name}</h1>
      <p className="text-sm text-ink-500">{doctor.specialization}</p>
      {formError && (
        <div className="mt-4">
          <Alert type="error">{formError}</Alert>
        </div>
      )}
      {success && (
        <div className="mt-4">
          <Alert type="success">{success}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="sda-card mt-6 space-y-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-ink-700">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              setDate(e.target.value);
              setTime('');
            }}
            className="sda-input"
          />
          <p className="mt-1 text-xs text-ink-500">
            Only dates this doctor published will show times below.
          </p>
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-ink-700">
            Time slot
          </label>
          {availableSlotsForDate.length === 0 ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              {date
                ? 'No available slots for this date. Pick another date or ask the doctor to add availability.'
                : 'Select a date first.'}
            </p>
          ) : (
            <select
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="sda-input"
            >
              <option value="">Select time</option>
              {availableSlotsForDate.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-ink-700">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="sda-input min-h-[5rem] resize-y"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || availableSlotsForDate.length === 0}
          className="sda-btn-primary w-full"
        >
          {submitting && <Spinner className="!h-4 !w-4 border-white border-r-transparent" />}
          Confirm booking
        </button>
      </form>
    </div>
  );
}
