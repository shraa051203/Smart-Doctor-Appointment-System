import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

const EXAMPLES = [
  'Book appointment with Dr. Sharma tomorrow at 5pm',
  'Schedule with Dr. Ananya Sharma next Monday at 2:30 PM',
  'Book with Dr. Rohan Mehta today at 10am',
  'Appointment with Dr. Patel on 2026-04-10 at 14:00',
];

export default function AIBooking() {
  const { user, isAuthenticated } = useAuth();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!message.trim()) {
      setError('Please enter a booking request');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/appointments/book-ai', {
        message: message.trim(),
      });
      setResult({ ...response.data, success: true });
      setMessage('');
    } catch (err) {
      const data = err.response?.data;
      if (data && !data.success) {
        // Structured error from backend
        setResult(data);
      } else {
        setError(getErrorMessage(err, 'Booking failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fillExample = (ex) => {
    setMessage(ex);
    setError('');
    setResult(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert type="error">
          Please{' '}
          <Link to="/login" className="font-semibold underline">
            sign in
          </Link>{' '}
          as a patient to use AI-powered booking.
        </Alert>
      </div>
    );
  }

  if (user?.role !== 'patient') {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert type="warning">AI booking is only available for patients.</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">
          🤖 AI-Powered Booking
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Describe your appointment in plain English and our AI will book it for you.
        </p>
      </div>

      {/* Examples */}
      <div className="sda-card space-y-3">
        <p className="text-sm font-medium text-ink-700">Try one of these examples:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => fillExample(ex)}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100 transition"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="sda-card space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <div>
          <label htmlFor="ai-message" className="block text-sm font-medium text-ink-700 mb-1">
            Your booking request
          </label>
          <textarea
            id="ai-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='e.g. "Book appointment with Dr. Sharma tomorrow at 5pm"'
            className="sda-input min-h-[5rem] resize-y"
            rows={3}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-ink-500">
            Include the doctor's name, date, and time.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="sda-btn-primary w-full"
        >
          {loading ? (
            <>
              <Spinner className="!h-4 !w-4 border-white border-r-transparent" />
              Processing…
            </>
          ) : (
            'Book Appointment'
          )}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div
          className={`rounded-2xl border p-5 space-y-3 ${
            result.success
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <h3
            className={`font-semibold text-base ${
              result.success ? 'text-emerald-800' : 'text-amber-800'
            }`}
          >
            {result.success ? '✅ Appointment Booked!' : '⚠️ Could Not Book'}
          </h3>
          <p className={`text-sm ${result.success ? 'text-emerald-700' : 'text-amber-700'}`}>
            {result.message}
          </p>

          {result.hint && (
            <p className="text-xs text-amber-600 italic">{result.hint}</p>
          )}

          {result.parsed && (
            <div className="rounded-lg bg-white/60 px-3 py-2 text-sm space-y-1">
              <p className="font-medium text-ink-700">What I understood:</p>
              <ul className="text-ink-600 space-y-0.5">
                <li>🩺 Doctor: <strong>{result.parsed.doctor_name}</strong></li>
                <li>📅 Date: <strong>{result.parsed.date}</strong></li>
                <li>🕐 Time: <strong>{result.parsed.time}</strong></li>
              </ul>
            </div>
          )}

          {result.suggestedTime && (
            <div className="rounded-lg bg-white/60 px-3 py-2 text-sm">
              <p className="font-medium text-amber-800">Suggested alternative:</p>
              <p className="text-amber-700">{result.suggestedTime}</p>
            </div>
          )}

          {result.appointment && (
            <div className="rounded-lg bg-white/60 px-3 py-2 text-sm space-y-1">
              <p className="font-medium text-emerald-800">Appointment details:</p>
              <p className="text-emerald-700">
                📋 ID: <span className="font-mono text-xs">{result.appointment._id}</span>
              </p>
              <p className="text-emerald-700">
                Status: <span className="capitalize font-semibold">{result.appointment.status}</span>
              </p>
              {result.note && (
                <p className="text-xs text-emerald-600 italic">{result.note}</p>
              )}
            </div>
          )}

          {result.success && (
            <Link to="/patient" className="inline-block sda-btn-primary text-sm py-2 mt-1">
              View my appointments →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}