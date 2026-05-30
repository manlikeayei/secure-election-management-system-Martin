import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface VoteRecord {
  vote_id: number;
  election: {
    id: number;
    name: string;
    election_type: string;
    end_date: string;
  } | null;
  participant: {
    id: number;
    name: string;
    party: string;
  } | null;
  cast_at: string;
}

export default function MyVotes() {
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/votes/my-votes')
      .then((res) => setVotes(res.data.votes))
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">✅ My Voting History</h2>
      <p className="text-gray-600">Review all votes you have cast.</p>

      {votes.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <span className="text-5xl block mb-3">🗳️</span>
          <p>You haven't voted in any elections yet.</p>
          <Link to="/elections" className="btn-primary mt-4 inline-block">Browse Elections</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {votes.map((v) => (
            <div key={v.vote_id} className="card flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {v.election?.name || 'Unknown Election'}
                </h4>
                {v.election && (
                  <span className="badge badge-purple text-xs">{v.election.election_type}</span>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Voted for: <span className="font-medium text-indigo-600">{v.participant?.name || 'Unknown'}</span>
                  {v.participant?.party && <span className="text-gray-400"> ({v.participant.party})</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{new Date(v.cast_at).toLocaleString()}</p>
                {v.election && (
                  <Link
                    to={`/elections/${v.election.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    View Election →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
