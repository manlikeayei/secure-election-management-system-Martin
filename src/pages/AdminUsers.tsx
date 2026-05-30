import { useState, useEffect } from 'react';
import api from '../services/api';

interface UserRecord {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_active: boolean;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface AttributeDef {
  id: number;
  name: string;
  display_name: string;
  known_values: string[];
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [attributes, setAttributes] = useState<AttributeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState('');

  // Attribute assignment modal
  const [showAttrModal, setShowAttrModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [attrForm, setAttrForm] = useState({ attribute_id: 0, value: '' });
  const [currentValues, setCurrentValues] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
    loadAttributesWithValues();
  }, [page, search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { page, per_page: 20, search } });
      setUsers(res.data.users);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttributesWithValues = async () => {
    try {
      const res = await api.get('/attributes/values');
      setAttributes(res.data.attributes);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (user: UserRecord) => {
    try {
      await api.put(`/admin/users/${user.id}`, { is_active: !user.is_active });
      setMessage(`✅ User ${user.email} ${user.is_active ? 'deactivated' : 'activated'}`);
      loadUsers();
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed to update'));
    }
  };

  const toggleAdmin = async (user: UserRecord) => {
    if (user.email === 'admin@votingsystem.com') {
      setMessage('❌ Cannot change admin status of system administrator');
      return;
    }
    try {
      await api.put(`/admin/users/${user.id}`, { is_admin: !user.is_admin });
      setMessage(`✅ Admin status updated for ${user.email}`);
      loadUsers();
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed to update'));
    }
  };

  const resetPassword = async (user: UserRecord) => {
    if (!confirm(`Reset password for ${user.email}? New password will be 'Temp@123!'`)) return;
    try {
      const res = await api.post('/auth/reset-password', { user_id: user.id, new_password: 'Temp@123!' });
      setMessage('✅ ' + res.data.message);
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed to reset'));
    }
  };

  const openAttrModal = (user: UserRecord) => {
    setSelectedUser(user);
    const firstAttr = attributes[0];
    if (firstAttr) {
      setAttrForm({ attribute_id: firstAttr.id, value: firstAttr.known_values[0] || '' });
      setCurrentValues(firstAttr.known_values);
    } else {
      setAttrForm({ attribute_id: 0, value: '' });
      setCurrentValues([]);
    }
    setShowAttrModal(true);
  };

  const handleAttrChange = (attrId: number) => {
    const attr = attributes.find((a) => a.id === attrId);
    const values = attr?.known_values || [];
    setAttrForm({
      attribute_id: attrId,
      value: values[0] || '',
    });
    setCurrentValues(values);
  };

  const assignAttribute = async () => {
    if (!selectedUser || !attrForm.attribute_id || !attrForm.value) return;
    try {
      await api.post(`/admin/users/${selectedUser.id}/attributes`, attrForm);
      setMessage(`✅ Attribute assigned to ${selectedUser.email}`);
      setShowAttrModal(false);
      // Refresh values in case a new one was added
      loadAttributesWithValues();
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed to assign'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 Manage Users</h2>
          <p className="text-gray-600">{users.length > 0 && `Showing page ${page} of ${totalPages}`}</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          message.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text" className="input-field max-w-md" placeholder="Search by name or email..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* User Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Admin</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Active</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">#{user.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{user.first_name} {user.last_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    {user.is_admin ? <span className="badge badge-purple">Admin</span> : 
                      <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${user.is_active ? 'badge-green' : 'badge-red'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        onClick={() => openAttrModal(user)} title="Assign Attribute">🏷️</button>
                      <button className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                        onClick={() => toggleAdmin(user)} title="Toggle Admin">👑</button>
                      <button className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                        onClick={() => toggleActive(user)} title="Toggle Active">
                        {user.is_active ? '🔒' : '🔓'}
                      </button>
                      <button className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 hover:bg-orange-100"
                        onClick={() => resetPassword(user)} title="Reset Password">🔑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                p === page ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Attribute Assignment Modal */}
      {showAttrModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAttrModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Attribute to {selectedUser.first_name} {selectedUser.last_name}
            </h3>
            <div className="space-y-4">
              {/* Attribute Type Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attribute Type</label>
                <select
                  className="input-field"
                  value={attrForm.attribute_id}
                  onChange={(e) => handleAttrChange(parseInt(e.target.value))}
                >
                  {attributes.map((a) => (
                    <option key={a.id} value={a.id}>{a.display_name} ({a.name})</option>
                  ))}
                </select>
              </div>

              {/* Value — dropdown from known values + custom option */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                {currentValues.length > 0 ? (
                  <>
                    <select
                      className="input-field"
                      value={attrForm.value}
                      onChange={(e) => setAttrForm({ ...attrForm, value: e.target.value })}
                    >
                      {currentValues.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      <option value="__custom__">✏️ Custom value...</option>
                    </select>
                    {attrForm.value === '__custom__' && (
                      <input
                        type="text"
                        className="input-field mt-2"
                        placeholder="Type custom value..."
                        value=""
                        onChange={(e) => setAttrForm({ ...attrForm, value: e.target.value })}
                        autoFocus
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    className="input-field"
                    placeholder="No existing values — type one"
                    value={attrForm.value}
                    onChange={(e) => setAttrForm({ ...attrForm, value: e.target.value })}
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Pick from existing values or choose "Custom value..." to add a new one.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  className="btn-primary flex-1"
                  onClick={assignAttribute}
                  disabled={!attrForm.attribute_id || !attrForm.value || attrForm.value === '__custom__'}
                >
                  Assign
                </button>
                <button className="btn-secondary flex-1" onClick={() => setShowAttrModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
}
