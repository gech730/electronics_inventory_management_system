import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ToastContainer from './components/Toast';
import Icon from './components/Icons';
import { RoleBadge } from './components/StockBadge';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Icon name="bolt" size={36} color="var(--primary)" />
          <p style={{ marginTop: 12, fontWeight: 500 }}>Connecting to VoltTrack...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Feature 1 Auth Verification View (Temporary dashboard until Feature 2/3)
const AuthDashboardPreview = () => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', padding: '32px' }}>
      <div className="ambient-glow ambient-glow-1" />
      <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Header bar */}
        <div
          className="glass-card"
          style={{
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Icon name="bolt" size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>VoltTrack</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Feature 1: Authentication Verified</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={toggleTheme} className="btn btn-secondary btn-icon" title="Toggle theme">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
              <Icon name="logout" size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '2px solid var(--border-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--primary)',
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{user?.name}</h3>
                <RoleBadge role={user?.role || 'staff'} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{user?.email}</p>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <Icon name="check" size={20} color="var(--success)" style={{ marginTop: 2 }} />
            <div>
              <h4 style={{ color: 'var(--success)', fontSize: '0.92rem', fontWeight: 700 }}>
                Feature 1 Authentication Active
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: 4 }}>
                You have successfully authenticated via Laravel's Sanctum bearer token system. Session, user profile, role decoding, and token persistence in localStorage are functioning properly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AuthDashboardPreview />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
