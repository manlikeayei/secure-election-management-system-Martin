import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface ElectionSummary {
  id: number;
  name: string;
  election_type: string;
  start_date: string;
  end_date: string;
  eligible: boolean;
  has_voted?: boolean;
  total_votes: number;
  participants: any[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [elections, setElections] = useState<ElectionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/elections')
      .then((res) => setElections(res.data.elections))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeElections = elections.filter(
    (e) => e.eligible && new Date(e.end_date) > new Date()
  );
  const pastElections = elections.filter(
    (e) => new Date(e.end_date) <= new Date()
  );

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="card bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
        <h2 className="text-2xl font-bold">Welcome, {user?.first_name}! 👋</h2>
        <p className="text-indigo-100 mt-1">Ready to make your voice heard?</p>
        <div className="mt-4 flex gap-4">
          <Link to="/elections" className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
            View Elections
          </Link>
          <Link to="/my-votes" className="bg-white/20 text-white px-6 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors">
            My Votes
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Active Elections */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🟢 Active Elections You Can Vote In</h3>
            {activeElections.length === 0 ? (
              <div className="card text-center text-gray-500 py-8">
                <span className="text-4xl block mb-2">📭</span>
                No active elections available for you right now.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeElections.map((election) => (
                  <Link key={election.id} to={`/elections/${election.id}`} className="card hover:border-indigo-300 block">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{election.name}</h4>
                        <span className="badge badge-blue mt-1">{election.election_type}</span>
                      </div>
                      {election.has_voted && <span className="badge badge-green">✓ Voted</span>}
                    </div>
                    <div className="mt-3 text-sm text-gray-500">
                      <p>Ends: {new Date(election.end_date).toLocaleDateString()}</p>
                      <p>{election.participants.length} candidates</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Past Elections */}
          {pastElections.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Past Elections</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {pastElections.map((election) => (
                  <Link key={election.id} to={`/elections/${election.id}`} className="card opacity-75 hover:opacity-100 block">
                    <h4 className="font-semibold text-gray-900">{election.name}</h4>
                    <span className="badge badge-yellow mt-1">{election.election_type}</span>
                    <p className="mt-2 text-sm text-gray-500">
                      Ended: {new Date(election.end_date).toLocaleDateString()} • {election.total_votes} votes
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
