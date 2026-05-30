import { useState, useEffect } from 'react';
import api from '../services/api';

interface Participant {
  id: number;
  name: string;
  party: string;
  bio: string;
  vote_count: number;
}

interface ElectionAttribute {
  id: number;
  attribute_id: number;
  attribute_name: string;
  required_value: string;
}

interface Election {
  id: number;
  name: string;
  election_type: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  require_all_attributes: boolean;
  require_photo: boolean;
  total_votes: number;
  participants: Participant[];
  required_attributes: ElectionAttribute[];
}

interface AttributeDef {
  id: number;
  name: string;
  display_name: string;
}

export default function AdminElections() {
  const [elections, setElections] = useState<Election[]>([]);
  const [attributes, setAttributes] = useState<AttributeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '', election_type: 'general', description: '',
    start_date: '', end_date: '', require_all_attributes: false, require_photo: false,
  });
  const [newParticipant, setNewParticipant] = useState({ name: '', party: '', bio: '' });
  const [participants, setParticipants] = useState<{ name: string; party: string; bio: string }[]>([]);
  const [electionAttributes, setElectionAttributes] = useState<{ attribute_id: number; required_value: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eRes, aRes] = await Promise.all([
        api.get('/elections'),
        api.get('/attributes'),
      ]);
      setElections(eRes.data.elections);
      setAttributes(aRes.data.attributes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', election_type: 'general', description: '', start_date: '', end_date: '', require_all_attributes: false, require_photo: false });
    setParticipants([]);
    setElectionAttributes([]);
    setNewParticipant({ name: '', party: '', bio: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const addParticipant = () => {
    if (!newParticipant.name) return;
    setParticipants([...participants, { ...newParticipant }]);
    setNewParticipant({ name: '', party: '', bio: '' });
  };

  const removeParticipant = (idx: number) => {
    setParticipants(participants.filter((_, i) => i !== idx));
  };

  const addElectionAttribute = () => {
    setElectionAttributes([...electionAttributes, { attribute_id: attributes[0]?.id || 0, required_value: '' }]);
  };

  const updateElectionAttribute = (idx: number, field: string, value: any) => {
    const updated = [...electionAttributes];
    (updated[idx] as any)[field] = value;
    setElectionAttributes(updated);
  };

  const removeElectionAttribute = (idx: number) => {
    setElectionAttributes(electionAttributes.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setMessage('');
    if (!form.name || !form.start_date || !form.end_date) {
      setMessage('❌ Name, start date, and end date are required');
      return;
    }

    try {
      const payload = {
        ...form,
        participants,
        required_attributes: electionAttributes.filter(ea => ea.attribute_id && ea.required_value),
      };

      if (editingId) {
        await api.put(`/elections/${editingId}`, payload);
        setMessage('✅ Election updated successfully!');
      } else {
        await api.post('/elections', payload);
        setMessage('✅ Election created successfully!');
      }
      resetForm();
      loadData();
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed to save election'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this election and all its votes?')) return;
    try {
      await api.delete(`/elections/${id}`);
      setMessage('✅ Election deleted');
      loadData();
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed to delete'));
    }
  };

  const handleEdit = (election: Election) => {
    setForm({
      name: election.name,
      election_type: election.election_type,
      description: election.description || '',
      start_date: election.start_date.slice(0, 16),
      end_date: election.end_date.slice(0, 16),
      require_all_attributes: election.require_all_attributes,
      require_photo: election.require_photo,
    });
    setParticipants(election.participants.map(p => ({ name: p.name, party: p.party || '', bio: p.bio || '' })));
    setElectionAttributes(
      election.required_attributes.map(ea => ({ attribute_id: ea.attribute_id, required_value: ea.required_value }))
    );
    setEditingId(election.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <h2 className="text-2xl font-bold text-gray-900">🗳️ Manage Elections</h2>
          <p className="text-gray-600">Create, edit, and manage elections</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + New Election
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
            {editingId ? 'Edit Election' : 'Create New Election'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" className="input-field" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select className="input-field" value={form.election_type}
                onChange={(e) => setForm({ ...form, election_type: e.target.value })}>
                <option value="general">General</option>
                <option value="primary">Primary</option>
                <option value="referendum">Referendum</option>
                <option value="board">Board</option>
                <option value="committee">Committee</option>
                <option value="department">Department</option>
                <option value="regional">Regional</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="datetime-local" className="input-field" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input type="datetime-local" className="input-field" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" checked={form.require_all_attributes}
                onChange={(e) => setForm({ ...form, require_all_attributes: e.target.checked })} />
              <span className="text-sm font-medium text-gray-700">Require ALL attributes (AND mode)</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">If unchecked, matching ANY attribute grants eligibility.</p>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" checked={form.require_photo}
                onChange={(e) => setForm({ ...form, require_photo: e.target.checked })} />
              <span className="text-sm font-medium text-gray-700">📷 Require photo verification for voting</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">Voters with a photo on file will see their photo during voting. Voters without photos are not blocked.</p>
          </div>

          {/* Participants */}
          <div className="mb-4 border-t pt-4">
            <h4 className="font-medium text-gray-800 mb-2">Participants / Candidates</h4>
            <div className="flex gap-2 mb-2">
              <input type="text" className="input-field flex-1" placeholder="Name" value={newParticipant.name}
                onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })} />
              <input type="text" className="input-field w-40" placeholder="Party" value={newParticipant.party}
                onChange={(e) => setNewParticipant({ ...newParticipant, party: e.target.value })} />
              <button className="btn-secondary" onClick={addParticipant}>Add</button>
            </div>
            {participants.length > 0 && (
              <div className="space-y-1">
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm">
                    <span className="flex-1 font-medium">{p.name}</span>
                    <span className="text-gray-500">{p.party}</span>
                    <button className="text-red-500 hover:text-red-700" onClick={() => removeParticipant(i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Required Attributes */}
          <div className="mb-4 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800">Required Attributes</h4>
              <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium" onClick={addElectionAttribute}>
                + Add Attribute
              </button>
            </div>
            {electionAttributes.map((ea, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select className="input-field w-48" value={ea.attribute_id}
                  onChange={(e) => updateElectionAttribute(i, 'attribute_id', parseInt(e.target.value))}>
                  <option value={0}>Select attribute...</option>
                  {attributes.map((a) => (
                    <option key={a.id} value={a.id}>{a.display_name}</option>
                  ))}
                </select>
                <input type="text" className="input-field flex-1" placeholder="Required value"
                  value={ea.required_value}
                  onChange={(e) => updateElectionAttribute(i, 'required_value', e.target.value)} />
                <button className="text-red-500 hover:text-red-700 px-2" onClick={() => removeElectionAttribute(i)}>✕</button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button className="btn-primary" onClick={handleSubmit}>
              {editingId ? 'Update Election' : 'Create Election'}
            </button>
            <button className="btn-secondary" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Elections List */}
      <div className="space-y-4">
        {elections.map((election) => (
          <div key={election.id} className="card">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-lg">{election.name}</h4>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="badge badge-purple">{election.election_type}</span>
                  <span className={`badge ${election.is_active ? 'badge-green' : 'badge-red'}`}>
                    {election.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  📅 {new Date(election.start_date).toLocaleDateString()} — {new Date(election.end_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  👥 {election.participants.length} candidates • 📮 {election.total_votes} votes
                  {election.require_photo && <span className="ml-2 text-amber-600 font-medium">📷 Photo req.</span>}
                </p>
                {election.required_attributes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {election.required_attributes.map((ea) => (
                      <span key={ea.id} className="badge badge-blue text-xs">
                        {ea.attribute_name}: {ea.required_value}
                      </span>
                    ))}
                    <span className="text-xs text-gray-400">
                      ({election.require_all_attributes ? 'ALL must match' : 'ANY can match'})
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-sm" onClick={() => handleEdit(election)}>Edit</button>
                <button className="btn-danger text-sm" onClick={() => handleDelete(election.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}

        {elections.length === 0 && !loading && (
          <div className="card text-center py-12 text-gray-500">
            <span className="text-4xl block mb-2">📭</span>
            No elections yet. Create your first one!
          </div>
        )}
      </div>
    </div>
  );
}
