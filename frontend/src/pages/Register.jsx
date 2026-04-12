import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

function fieldErrors(errors) {
  if (!errors?.length) return {};
  const map = {};
  errors.forEach((e) => {
    const p = e.path || e.param;
    if (p) map[p] = e.msg;
  });
  return map;
}

export default function Register() {
  const { register, logout, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(() =>
    searchParams.get('role') === 'doctor' ? 'doctor' : 'patient'
  );

  useEffect(() => {
    setRole(searchParams.get('role') === 'doctor' ? 'doctor' : 'patient');
  }, [searchParams]);
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErr, setFieldErr] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <CenterSpinner />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErr({});
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (role === 'doctor' && !specialization.trim()) {
      setError('Specialization is required for doctors');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim(),
      };
      if (role === 'doctor') {
        payload.specialization = specialization.trim();
        payload.experienceYears = experienceYears === '' ? 0 : Number(experienceYears);
        payload.bio = bio.trim();
      }
      const result = await register(payload);
      // Supabase email confirmation required — stay on page and show message
      if (result?.needsEmailConfirmation) {
        setSuccessMsg(
          'Account created! Please check your email and click the confirmation link before signing in.'
        );
        return;
      }
      navigate(role === 'doctor' ? '/doctor' : '/doctors', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setFieldErr(fieldErrors(data.errors));
      setError(getErrorMessage(err, 'Registration failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-bold text-ink-900">Create account</h1>
      <p className="mt-1 text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
      {isAuthenticated && user ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="mb-2">
            Signed in as <strong>{user.name}</strong> ({user.role}). Registering will switch this
            browser to the new account, or you can sign out first.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100/80"
          >
            Sign out
          </button>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="sda-card mt-8 space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        {successMsg && <Alert type="success">{successMsg}</Alert>}
        <div>
          <label className="block text-sm font-medium text-ink-700">I am a</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="sda-input">
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
          </select>
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-ink-700">
            Full name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="sda-input"
          />
          {fieldErr.name && <p className="mt-1 text-xs text-red-600">{fieldErr.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sda-input"
          />
          {fieldErr.email && <p className="mt-1 text-xs text-red-600">{fieldErr.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-700">
            Password (min 6 characters)
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sda-input"
          />
          {fieldErr.password && <p className="mt-1 text-xs text-red-600">{fieldErr.password}</p>}
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-ink-700">
            Phone (optional)
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="sda-input"
          />
        </div>
        {role === 'doctor' && (
          <>
            <div>
              <label className="block text-sm font-medium text-ink-700">Specialization</label>
              <input
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Cardiology"
                className="sda-input"
              />
              {fieldErr.specialization && (
                <p className="mt-1 text-xs text-red-600">{fieldErr.specialization}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700">Years of experience</label>
              <input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="sda-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700">Bio (optional)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="sda-input min-h-[5rem] resize-y"
              />
            </div>
          </>
        )}
        <button type="submit" disabled={submitting} className="sda-btn-primary w-full">
          {submitting && <Spinner className="!h-4 !w-4 border-white border-r-transparent" />}
          Register
        </button>
      </form>
    </div>
  );
}
