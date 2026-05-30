import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Elections, { ElectionVote } from './pages/Elections';
import MyVotes from './pages/MyVotes';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminElections from './pages/AdminElections';
import AdminUsers from './pages/AdminUsers';
import AdminAttributes from './pages/AdminAttributes';
import AdminProfile from './pages/AdminProfile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Voter routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/elections" element={
            <ProtectedRoute>
              <Layout><Elections /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/elections/:id" element={
            <ProtectedRoute>
              <Layout><ElectionVote /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/my-votes" element={
            <ProtectedRoute>
              <Layout><MyVotes /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout><Profile /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <Layout><AdminDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/elections" element={
            <ProtectedRoute adminOnly>
              <Layout><AdminElections /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute adminOnly>
              <Layout><AdminUsers /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/attributes" element={
            <ProtectedRoute adminOnly>
              <Layout><AdminAttributes /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute adminOnly>
              <Layout><AdminProfile /></Layout>
            </ProtectedRoute>
          } />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
