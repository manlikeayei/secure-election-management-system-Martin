import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = isAdmin
    ? [
        { path: '/admin', label: 'Dashboard', icon: '📊' },
        { path: '/admin/elections', label: 'Elections', icon: '🗳️' },
        { path: '/admin/users', label: 'Users', icon: '👥' },
        { path: '/admin/attributes', label: 'Attributes', icon: '🏷️' },
        { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
      ]
    : [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/elections', label: 'Elections', icon: '🗳️' },
        { path: '/my-votes', label: 'My Votes', icon: '✅' },
        { path: '/profile', label: 'My Profile', icon: '👤' },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-700">
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-3">
            <span className="text-2xl">🗳️</span>
            <div>
              <h1 className="font-bold text-lg">VoteSecure</h1>
              <p className="text-xs text-slate-400">{isAdmin ? 'Admin Panel' : 'Voter Portal'}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-300 
                       hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
