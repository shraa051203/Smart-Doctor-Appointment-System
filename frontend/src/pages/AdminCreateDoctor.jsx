import { useState } from 'react';
import { api } from '../api/client';
import { getErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

const initial = {
  name: '',
  email: '',
  password: '',
  specialization: '',
  experienceYears: '',
  bio: '',
  phone: '',
};

export default function AdminCreateDoctor() {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await api.post('/doctors', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        specialization: form.specialization.trim(),
        experienceYears: form.experienceYears === '' ? 0 : Number(form.experienceYears),
        bio: form.bio.trim(),
        phone: form.phone.trim(),
      });
      setMessage('Doctor account created.');
      setForm(initial);
    } catch (err) {
      setError(getErrorMessage(err, 'Request failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="sda-page-title">Create doctor (admin)</h1>
      <p className="text-sm text-ink-500">Uses POST /api/doctors with admin JWT.</p>
      <form onSubmit={handleSubmit} className="sda-card mt-6 space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}
        <div>
          <label className="block text-sm font-medium text-ink-700">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
            className="sda-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            className="sda-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            required
            minLength={6}
            className="sda-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700">Specialization</label>
          <input
            name="specialization"
            value={form.specialization}
            onChange={onChange}
            required
            className="sda-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700">Years of experience</label>
          <input
            name="experienceYears"
            type="number"
            min={0}
            value={form.experienceYears}
            onChange={onChange}
            className="sda-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700">Phone (optional)</label>
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            className="sda-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700">Bio (optional)</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={onChange}
            rows={3}
            className="sda-input min-h-[5rem] resize-y"
          />
        </div>
        <button type="submit" disabled={submitting} className="sda-btn-primary w-full">
          {submitting && <Spinner className="!h-4 !w-4 border-white border-r-transparent" />}
          Create doctor
        </button>
      </form>
    </div>
  );
}
