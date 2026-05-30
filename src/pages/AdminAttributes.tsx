import { useState, useEffect } from 'react';
import api from '../services/api';

interface Attribute {
  id: number;
  name: string;
  display_name: string;
  description: string;
  created_by: number;
  created_at: string;
}

export default function AdminAttributes() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', display_name: '', description: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadAttributes();
  }, []);

  const loadAttributes = async () => {
    try {
      const res = await api.get('/attributes');
      setAttributes(res.data.attributes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', display_name: '', description: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    setMessage('');
    if (!form.name || !form.display_name) {
      setMessage('❌ Name and display name are required');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/attributes/${editingId}`, form);
        setMessage('✅ Attribute updated!');
      } else {
        await api.post('/attributes', form);
        setMessage('✅ Attribute created!');
      }
      resetForm();
      loadAttributes();
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed to save'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this attribute? This will remove it from all users and elections.')) return;
    try {
      await api.delete(`/attributes/${id}`);
      setMessage('✅ Attribute deleted');
      loadAttributes();
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed to delete'));
    }
  };

  const handleEdit = (attr: Attribute) => {
    setForm({ name: attr.name, display_name: attr.display_name, description: attr.description || '' });
    setEditingId(attr.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🏷️ Manage Attributes</h2>
          <p className="text-gray-600">Define custom attributes for voter classification</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + New Attribute
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          message.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card border-indigo-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Attribute' : 'Create New Attribute'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Name <span className="text-gray-400">(lowercase, underscores)</span>
              </label>
              <input type="text" className="input-field" placeholder="e.g. department"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input type="text" className="input-field" placeholder="e.g. Department"
                value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input-field" rows={2} placeholder="What is this attribute used for?"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={handleSubmit}>
                {editingId ? 'Update' : 'Create'}
              </button>
              <button className="btn-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Attributes List */}
      <div className="grid gap-4 md:grid-cols-2">
        {attributes.map((attr) => (
          <div key={attr.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{attr.display_name}</h4>
                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">{attr.name}</code>
                {attr.description && (
                  <p className="text-sm text-gray-500 mt-2">{attr.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">Created: {new Date(attr.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs px-3 py-1" onClick={() => handleEdit(attr)}>Edit</button>
                <button className="btn-danger text-xs px-3 py-1" onClick={() => handleDelete(attr.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}

        {attributes.length === 0 && (
          <div className="card text-center py-12 text-gray-500 col-span-full">
            <span className="text-4xl block mb-2">🏷️</span>
            No attributes defined yet. Create one to start categorizing voters.
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="card bg-indigo-50 border-indigo-200">
        <h4 className="font-semibold text-indigo-900 mb-2">💡 How Attributes Work</h4>
        <ol className="text-sm text-indigo-800 space-y-1 list-decimal list-inside">
          <li>Create attribute definitions here (e.g., "department")</li>
          <li>Assign attribute values to users from the Users page</li>
          <li>When creating an election, specify required attribute values</li>
          <li>Voters who have matching attributes can vote in restricted elections</li>
        </ol>
      </div>
    </div>
  );
}
