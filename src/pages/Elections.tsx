import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Participant {
  id: number;
  name: string;
  party: string;
  bio: string;
  vote_count: number;
}

interface ElectionDetail {
  id: number;
  name: string;
  election_type: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  eligible: boolean;
  has_voted: boolean;
  require_photo: boolean;
  participants: Participant[];
  total_votes: number;
  required_attributes: any[];
}

export default function Elections() {
  const [elections, setElections] = useState<ElectionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/elections')
      .then((res) => setElections(res.data.elections))
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
      <h2 className="text-2xl font-bold text-gray-900">🗳️ All Elections</h2>
      <p className="text-gray-600">Browse all elections. You can only vote in elections you're eligible for.</p>

      <div className="grid gap-6 md:grid-cols-2">
        {elections.map((election) => (
          <ElectionCard key={election.id} election={election} />
        ))}
      </div>

      {elections.length === 0 && (
        <div className="card text-center py-12 text-gray-500">
          <span className="text-5xl block mb-3">📭</span>
          No elections available at this time.
        </div>
      )}
    </div>
  );
}

function ElectionCard({ election }: { election: ElectionDetail }) {
  const navigate = useNavigate();
  const now = new Date();
  const endDate = new Date(election.end_date);
  const startDate = new Date(election.start_date);
  const isActive = election.is_active && now >= startDate && now <= endDate;
  const isEnded = now > endDate;
  const isUpcoming = now < startDate;

  let statusBadge = '';
  if (isEnded) statusBadge = 'badge badge-yellow';
  else if (isActive) statusBadge = 'badge badge-green';
  else if (isUpcoming) statusBadge = 'badge badge-blue';
  else statusBadge = 'badge badge-red';

  const statusText = isEnded ? 'Ended' : isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Inactive';

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{election.name}</h3>
          <span className="badge badge-purple text-xs mt-1">{election.election_type}</span>
        </div>
        <span className={statusBadge}>{statusText}</span>
      </div>

      {election.description && (
        <p className="text-sm text-gray-600 mb-3">{election.description}</p>
      )}

      <div className="text-sm text-gray-500 space-y-1 mb-4">
        <p>📅 Starts: {startDate.toLocaleDateString()}</p>
        <p>📅 Ends: {endDate.toLocaleDateString()}</p>
        <p>👥 {election.participants.length} candidates • {election.total_votes} votes cast</p>
        {election.required_attributes.length > 0 && (
          <p className="text-orange-600">🔒 Attribute-restricted election</p>
        )}
      </div>

      <div className="flex gap-2">
        {election.eligible && !election.has_voted && isActive && (
          <button
            className="btn-primary flex-1"
            onClick={() => navigate(`/elections/${election.id}`)}
          >
            Vote Now
          </button>
        )}
        {election.has_voted && (
          <span className="btn-secondary flex-1 text-center cursor-default">✓ Already Voted</span>
        )}
        {!election.eligible && !isEnded && (
          <span className="btn-secondary flex-1 text-center cursor-default" title="You don't have the required attributes">
            🔒 Not Eligible
          </span>
        )}
        {isEnded && (
          <button
            className="btn-secondary flex-1"
            onClick={() => navigate(`/elections/${election.id}`)}
          >
            View Results
          </button>
        )}
        {isUpcoming && (
          <span className="btn-secondary flex-1 text-center cursor-default">Starts Soon</span>
        )}
      </div>

      {election.required_attributes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Required Attributes:</p>
          <div className="flex flex-wrap gap-1">
            {election.required_attributes.map((ea: any) => (
              <span key={ea.id} className="badge badge-blue text-xs">
                {ea.attribute_name}: {ea.required_value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Election detail + voting page
export function ElectionVote() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [election, setElection] = useState<ElectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    api.get(`/elections/${id}`)
      .then((res) => {
        setElection(res.data.election);
        // Load results: always for ended elections, or if user has already voted
        const ended = new Date(res.data.election.end_date) < new Date();
        if (ended || res.data.election.has_voted) {
          loadResults();
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const loadResults = async () => {
    try {
      const res = await api.get(`/elections/${id}/results`);
      setResults(res.data);
    } catch (err: any) {
      // 403 means results not available yet — that's fine
      if (err.response?.status !== 403) {
        console.error(err);
      }
    }
  };

  const castVote = async (participantId: number) => {
    setVoting(true);
    setMessage('');
    try {
      await api.post('/votes/cast', {
        election_id: election!.id,
        participant_id: participantId,
      });
      setMessage('✅ Vote cast successfully!');
      setElection({ ...election!, has_voted: true });
      // Load results immediately after voting
      setTimeout(() => loadResults(), 500);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to cast vote';
      setMessage('❌ ' + msg);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="card text-center py-12">
        <span className="text-4xl mb-3 block">🔍</span>
        <p className="text-gray-500">Election not found.</p>
        <button className="btn-primary mt-4" onClick={() => navigate('/elections')}>Back to Elections</button>
      </div>
    );
  }

  const now = new Date();
  const isEnded = new Date(election.end_date) < now;
  const isActive = election.is_active && now >= new Date(election.start_date) && now <= new Date(election.end_date);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/elections')} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
        ← Back to Elections
      </button>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900">{election.name}</h2>
        <span className="badge badge-purple mt-2">{election.election_type}</span>
        {election.description && <p className="mt-3 text-gray-600">{election.description}</p>}
        <div className="mt-3 text-sm text-gray-500 space-y-1">
          <p>📅 {new Date(election.start_date).toLocaleDateString()} — {new Date(election.end_date).toLocaleDateString()}</p>
          <p>👥 {election.participants.length} candidates • {election.total_votes} votes cast</p>
          {election.require_photo && (
            <p className="text-amber-600 font-medium">📷 This election requests photo verification</p>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          message.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Voting Section */}
      {isActive && election.eligible && !election.has_voted && (
        <PhotoVerifiedVoting
          election={election}
          voting={voting}
          onVote={castVote}
        />
      )}

      {/* Already voted + show live results button */}
      {election.has_voted && !isEnded && !results && (
        <div className="card bg-green-50 border-green-200 text-center">
          <span className="text-3xl">✅</span>
          <p className="text-green-800 font-medium mt-2">You have cast your vote in this election!</p>
          <p className="text-green-600 text-sm mt-1">
            The election is still ongoing. Full results will be available when it ends.
          </p>
          <button className="btn-primary mt-3" onClick={loadResults}>
            🔍 View Live Tally
          </button>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="space-y-4">
          {/* Results Header Card */}
          <div className="card bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  📊 {results.election_ended ? 'Final Results' : 'Live Tally'}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">{results.election_name}</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{results.total_votes}</p>
                  <p className="text-xs text-gray-500">Total Votes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{results.total_eligible}</p>
                  <p className="text-xs text-gray-500">Eligible Voters</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{results.turnout_percentage}%</p>
                  <p className="text-xs text-gray-500">Turnout</p>
                </div>
              </div>
            </div>
            {!results.election_ended && (
              <p className="text-xs text-amber-600 mt-2">
                ⚡ Results are live and may change as more votes are cast. Refresh to update.
              </p>
            )}
          </div>

          {/* Results per candidate */}
          <div className="space-y-3">
            {results.results.length === 0 ? (
              <div className="card text-center py-8 text-gray-500">
                <span className="text-4xl block mb-2">🗳️</span>
                <p>No votes have been cast yet.</p>
              </div>
            ) : (
              results.results.map((r: any, idx: number) => {
                const isWinner = idx === 0 && results.total_votes > 0;
                const isTied = idx === 0 && results.results.length > 1 &&
                  r.vote_count === results.results[1]?.vote_count;
                return (
                  <div key={r.participant.id} className={`card ${isWinner && !isTied ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-white' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          idx === 0 && !isTied ? 'bg-amber-400 text-white' :
                          idx === 1 ? 'bg-gray-300 text-gray-700' :
                          idx === 2 ? 'bg-amber-200 text-amber-800' :
                          'bg-gray-200 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">
                            {isWinner && !isTied && '🏆 '}
                            {r.participant.name}
                          </span>
                          {r.participant.party && (
                            <span className="text-sm text-gray-500 ml-2">{r.participant.party}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-indigo-600 text-lg">{r.percentage}%</span>
                        <p className="text-xs text-gray-500">{r.vote_count} vote{r.vote_count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all duration-700 ease-out ${
                          isWinner && !isTied ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.max(r.percentage, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Refresh button for live results */}
          {!results.election_ended && (
            <div className="text-center">
              <button className="btn-secondary text-sm" onClick={loadResults}>
                🔄 Refresh Results
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Sub-component: shows user photo + vote buttons if election requires photo verification */
function PhotoVerifiedVoting({
  election,
  voting,
  onVote,
}: {
  election: ElectionDetail;
  voting: boolean;
  onVote: (pid: number) => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState<boolean | null>(null);
  const [photoChecked, setPhotoChecked] = useState(false);

  useEffect(() => {
    if (!election.require_photo) {
      setPhotoChecked(true);
      return;
    }
    api.get('/photo/me')
      .then((res) => {
        setHasPhoto(res.data.has_photo);
        setPhoto(res.data.photo || null);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setPhotoChecked(true));
  }, [election.require_photo]);

  if (!photoChecked) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      {election.require_photo && hasPhoto && photo && (
        <div className="card mb-4 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 border-amber-300 shadow">
              <img src={`data:image/jpeg;base64,${photo}`} alt="Voter" className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">📷 Photo Verification</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                An election official will visually compare this photo to confirm your identity.
              </p>
              <p className="text-xs text-amber-700 mt-1 font-medium">
                ⚡ Your photo is on file. You may proceed to vote.
              </p>
            </div>
          </div>
        </div>
      )}

      {election.require_photo && !hasPhoto && (
        <div className="card mb-4 border-slate-200 bg-slate-50 text-center">
          <span className="text-2xl">📷</span>
          <p className="text-sm text-gray-600 mt-2">
            This election requests photo verification, but you don't have a photo on file.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            You can still vote — existing users without photos are not blocked.
          </p>
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cast Your Vote</h3>
      <div className="grid gap-4">
        {election.participants.map((p) => (
          <div key={p.id} className="card flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{p.name}</h4>
              {p.party && <span className="text-sm text-indigo-600">{p.party}</span>}
              {p.bio && <p className="text-sm text-gray-500 mt-1">{p.bio}</p>}
            </div>
            <button
              className="btn-primary"
              disabled={voting}
              onClick={() => onVote(p.id)}
            >
              {voting ? 'Casting...' : 'Vote'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
