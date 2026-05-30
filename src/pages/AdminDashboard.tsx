import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface DashboardStats {
  total_users: number;
  active_users: number;
  total_elections: number;
  active_elections: number;
  total_votes: number;
  total_attributes: number;
}

interface ElectionStat {
  id: number;
  name: string;
  type: string;
  total_votes: number;
  participant_count: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentElections, setRecentElections] = useState<ElectionStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((res) => {
        setStats(res.data.stats);
        setRecentElections(res.data.recent_elections);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users, icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Active Users', value: stats.active_users, icon: '✅', color: 'from-green-500 to-green-600' },
    { label: 'Total Elections', value: stats.total_elections, icon: '🗳️', color: 'from-purple-500 to-purple-600' },
    { label: 'Active Elections', value: stats.active_elections, icon: '🟢', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Total Votes Cast', value: stats.total_votes, icon: '📮', color: 'from-orange-500 to-orange-600' },
    { label: 'Attribute Types', value: stats.total_attributes, icon: '🏷️', color: 'from-pink-500 to-pink-600' },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📊 Admin Dashboard</h2>
        <p className="text-gray-600 mt-1">System overview and quick actions</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link to="/admin/elections" className="btn-primary">Manage Elections</Link>
        <Link to="/admin/users" className="btn-secondary">Manage Users</Link>
        <Link to="/admin/attributes" className="btn-secondary">Manage Attributes</Link>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className={`card bg-gradient-to-br ${card.color} text-white border-0`}>
              <span className="text-2xl">{card.icon}</span>
              <p className="text-3xl font-bold mt-2">{card.value}</p>
              <p className="text-sm text-white/80">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Elections */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Elections</h3>
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Type</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Candidates</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Votes</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentElections.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{e.name}</td>
                  <td className="px-6 py-4"><span className="badge badge-purple">{e.type}</span></td>
                  <td className="px-6 py-4 text-center text-gray-600">{e.participant_count}</td>
                  <td className="px-6 py-4 text-center font-medium text-indigo-600">{e.total_votes}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/admin/elections`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
              {recentElections.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No elections yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
