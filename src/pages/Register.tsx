import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PhotoCapture } from '../components/PhotoCapture';
import api from '../services/api';

type RegStage = 'form' | 'photo';

export default function Register() {
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    first_name: '', last_name: '', phone: '', address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<RegStage>('form');
  const { register, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.is_admin ? '/admin' : '/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (user) return null;

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const newUser = await register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || undefined,
        address: form.address || undefined,
      });
      // Admins skip photo; voters go to photo capture
      setLoading(false);
      if (newUser.is_admin) {
        navigate('/admin');
      } else {
        setStage('photo');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
      setLoading(false);
    }
  };

  const handlePhotoCapture = async (base64: string) => {
    try {
      await api.post('/photo/upload', { photo: base64 });
    } catch { /* best-effort */ }
    navigate('/dashboard');
  };

  const handlePhotoSkip = () => {
    navigate('/dashboard');
  };

  // ── Photo stage ──
  if (stage === 'photo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <span className="text-4xl">📸</span>
            <h1 className="text-2xl font-bold text-white mt-2">Profile Photo</h1>
            <p className="text-slate-400 text-sm">Take a photo for identity verification during voting</p>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <PhotoCapture
              onCapture={handlePhotoCapture}
              onSkip={handlePhotoSkip}
              title="Capture Your Photo"
              subtitle="This photo will be shown during elections that require photo verification. A human will compare it — no AI involved."
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <span className="text-4xl">🗳️</span>
          <h1 className="text-2xl font-bold text-white mt-2">Create Account</h1>
          <p className="text-slate-400 text-sm">Register to start voting</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" className="input-field" required
                  value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" className="input-field" required
                  value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field" required
                value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input type="tel" className="input-field"
                value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
              <input type="text" className="input-field"
                value={form.address} onChange={(e) => update('address', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="input-field" required
                placeholder="Min 8 chars, upper, lower, number, special"
                value={form.password} onChange={(e) => update('password', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" className="input-field" required
                value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
