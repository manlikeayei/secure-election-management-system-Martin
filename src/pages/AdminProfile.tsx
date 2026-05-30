import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({
    email: user?.email || '',
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // At least one change required
    if (form.email === user?.email && !form.new_password) {
      setMessage('⚠️ No changes to save.');
      return;
    }

    if (!form.current_password) {
      setMessage('⚠️ Current password is required.');
      return;
    }

    if (form.new_password && form.new_password !== form.confirm_new_password) {
      setMessage('⚠️ New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = { current_password: form.current_password };
      if (form.email !== user?.email) payload.email = form.email;
      if (form.new_password) payload.new_password = form.new_password;

      const res = await api.put('/auth/update-profile', payload);

      // Update stored user
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setMessage('✅ ' + res.data.message);

      // Clear password fields
      setForm({ ...form, current_password: '', new_password: '', confirm_new_password: '' });

      // If email changed, re-login with new email
      if (payload.email && payload.email !== user?.email) {
        setTimeout(() => {
          logout();
          window.location.href = '/login';
        }, 2000);
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Update failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">⚙️ Admin Settings</h2>
      <p className="text-gray-600">Change your admin login email and password.</p>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          message.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
          message.startsWith('⚠️') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current email display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Email</label>
            <div className="flex items-center gap-2">
              <span className="input-field bg-gray-50 text-gray-700">{user?.email}</span>
              <span className="badge badge-purple shrink-0">Admin</span>
            </div>
          </div>

          <div className="border-t pt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">New Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="Leave blank to keep current email"
              value={form.email !== user?.email ? form.email : ''}
              onChange={(e) => update('email', e.target.value || user?.email || '')}
            />
            <p className="text-xs text-gray-400 mt-1">
              Changing your email will require you to log in again.
            </p>
          </div>

          <div className="border-t pt-5">
            <h4 className="font-medium text-gray-800 mb-3">Change Password</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password *</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter current password"
                  value={form.current_password}
                  onChange={(e) => update('current_password', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Leave blank to keep current password"
                  value={form.new_password}
                  onChange={(e) => update('new_password', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Re-enter new password"
                  value={form.confirm_new_password}
                  onChange={(e) => update('confirm_new_password', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : '💾 Save Changes'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setForm({
                email: user?.email || '',
                current_password: '',
                new_password: '',
                confirm_new_password: '',
              })}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-900 text-sm">💡 Notes</h4>
        <ul className="mt-2 text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>You can change your email and/or password independently</li>
          <li>Changing your email will log you out — sign in with the new email</li>
          <li>Leave fields blank to keep current values</li>
          <li>Current password is ALWAYS required to save any changes</li>
        </ul>
      </div>
    </div>
  );
}
