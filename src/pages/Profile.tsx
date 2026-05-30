import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PhotoCapture } from '../components/PhotoCapture';
import api from '../services/api';

export default function Profile() {
  const { user } = useAuth();
  const [photo, setPhoto] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPhoto();
  }, []);

  const loadPhoto = async () => {
    try {
      const res = await api.get('/photo/me');
      setHasPhoto(res.data.has_photo);
      setPhoto(res.data.photo || null);
    } catch {
      setHasPhoto(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoCapture = async (base64: string) => {
    try {
      await api.post('/photo/upload', { photo: base64 });
      setMessage('✅ Photo uploaded successfully!');
      setShowCamera(false);
      loadPhoto();
    } catch (err: any) {
      setMessage('❌ ' + (err.response?.data?.error || 'Upload failed'));
    }
  };

  const handlePhotoSkip = () => {
    setShowCamera(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">👤 My Profile</h2>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          message.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* User Info Card */}
      <div className="card">
        <div className="flex items-start gap-6">
          {/* Photo section */}
          <div className="shrink-0">
            {hasPhoto && photo ? (
              <div className="relative group">
                <img
                  src={`data:image/jpeg;base64,${photo}`}
                  alt="Your photo"
                  className="w-32 h-32 rounded-xl object-cover border-2 border-gray-200 shadow"
                />
                <button
                  className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setShowCamera(true)}
                >
                  Change Photo
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                <span className="text-3xl">📷</span>
                <span className="text-xs mt-1">No photo</span>
              </div>
            )}
          </div>

          {/* User details */}
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
              <p className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <p className="text-gray-700">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Account Type</p>
              <span className={`badge ${user?.is_admin ? 'badge-purple' : 'badge-blue'}`}>
                {user?.is_admin ? 'Administrator' : 'Voter'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Photo Status</p>
              {hasPhoto ? (
                <span className="badge badge-green">✓ Photo on file</span>
              ) : (
                <span className="badge badge-yellow">No photo uploaded</span>
              )}
            </div>
          </div>
        </div>

        {/* Upload button */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          {!showCamera ? (
            <div className="space-y-3">
              {!hasPhoto && (
                <p className="text-sm text-gray-500">
                  📷 You haven't uploaded a photo yet. Adding a photo enables photo verification
                  in elections that require it, making your vote more secure.
                </p>
              )}
              <button className="btn-primary" onClick={() => setShowCamera(true)}>
                {hasPhoto ? '📸 Update Photo' : '📸 Upload Photo'}
              </button>
            </div>
          ) : (
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/50">
              <PhotoCapture
                onCapture={handlePhotoCapture}
                onSkip={handlePhotoSkip}
                title={hasPhoto ? 'Update Your Photo' : 'Take Your Photo'}
                subtitle="Position your face clearly in the circle. This photo will be used for human identity verification during voting."
              />
            </div>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="card bg-amber-50 border-amber-200">
        <h4 className="font-semibold text-amber-900 text-sm">💡 About Photo Verification</h4>
        <ul className="mt-2 text-sm text-amber-800 space-y-1 list-disc list-inside">
          <li>Your photo is encrypted with AES-256 before storage</li>
          <li>It is only shown during voting in elections that request photo verification</li>
          <li>Verification is done by a human election official — no AI is involved</li>
          <li>You can update or remove your photo at any time</li>
        </ul>
      </div>
    </div>
  );
}
