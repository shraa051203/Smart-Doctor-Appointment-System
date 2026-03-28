import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';
import { ProfileCardSkeleton } from '../components/Skeleton';
import Alert from '../components/Alert';

export default function DoctorProfile() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/doctors/${id}`);
      setDoctor(data.doctor);
    } catch (err) {
      setDoctor(null);
      setError(getErrorMessage(err, 'Unable to load this doctor.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <ProfileCardSkeleton />;
  }

  if (error || !doctor) {
    return (
      <div className="max-w-2xl space-y-4">
        <Alert type="error">{error || 'Doctor not found.'}</Alert>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => load()} className="sda-btn-secondary py-2 text-sm">
            Try again
          </button>
          <Link to="/doctors" className="sda-btn-primary py-2 text-sm">
            Back to doctors
          </Link>
        </div>
      </div>
    );
  }

  const canBook = isAuthenticated && user?.role === 'patient';

  return (
    <div className="max-w-2xl">
      <Link
        to="/doctors"
        className="text-sm font-medium text-brand-600 transition hover:text-brand-800 hover:underline"
      >
        ← Back to doctors
      </Link>
      <div className="sda-card mt-6 p-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">{doctor.name}</h1>
        <p className="mt-1 text-lg font-medium text-brand-700">{doctor.specialization}</p>
        <p className="mt-2 text-sm text-ink-500">
          {doctor.experienceYears != null ? `${doctor.experienceYears} years experience` : null}
        </p>
        {doctor.bio ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-700">{doctor.bio}</p>
        ) : null}
        <div className="mt-6 border-t border-slate-100 pt-6 text-sm text-ink-500">
          <p>{doctor.email}</p>
          {doctor.phone ? <p className="mt-1">{doctor.phone}</p> : null}
        </div>
        {canBook ? (
          <Link to={`/book/${doctor._id}`} className="sda-btn-primary mt-8 inline-flex">
            Book appointment
          </Link>
        ) : (
          <p className="mt-8 text-sm text-ink-500">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="font-semibold text-brand-600 hover:text-brand-800 hover:underline"
                >
                  Sign in
                </Link>{' '}
                as a patient to book.
              </>
            ) : (
              'Only patients can book appointments.'
            )}
          </p>
        )}
      </div>
    </div>
  );
}
