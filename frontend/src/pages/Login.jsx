import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';

export const Login = () => {
  const navigate = useNavigate();
  const { login, theme, toggleTheme } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        background: '#07080b',
      }}
    >
      {/* Ambient background glows */}
      <div className="ambient-glow ambient-glow-1" style={{ opacity: 0.35 }} />
      <div className="ambient-glow ambient-glow-2" style={{ opacity: 0.35 }} />

      {/* Theme toggle & Back to store in top right */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/')}
          className="ngus-btn-outline-gold"
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          <span>← Back to Store</span>
        </button>
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-icon"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
      </div>

      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 460,
          padding: '38px 34px',
          position: 'relative',
          zIndex: 2,
          background: 'rgba(16, 20, 29, 0.92)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -10px rgba(0,0,0,0.8), 0 0 30px rgba(212, 175, 55, 0.2)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 76,
              height: 76,
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '20px',
              background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(9,11,17,0.9) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              boxShadow: '0 0 25px rgba(212, 175, 55, 0.35)',
            }}
          >
            <img
              src="/ngus-logo.png"
              alt="Ngus Electronics"
              style={{ width: '85%', height: '85%', objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>
            <span className="ngus-gold-text">NGUS</span> ELECTRONICS
          </h1>
          <p style={{ color: '#d4af37', fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
            Enterprise & Staff Authentication
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <Icon name="alert" size={18} color="#f87171" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email" style={{ color: '#cbd5e1' }}>
              Staff Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@ngus-electronics.et"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password" style={{ color: '#cbd5e1' }}>
              Security Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="ngus-btn-gold"
            style={{ width: '100%', marginTop: 14, padding: '13px 18px', justifyContent: 'center', fontSize: '0.92rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Icon name="refresh" size={18} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Icon name="lock" size={18} />
                <span>Sign In to Console</span>
              </>
            )}
          </button>
        </form>

        {/* Professional Enterprise Security Notice & Back to Showroom */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
            Restricted Enterprise System • Authorized Personnel Only
            <br />
            Protected by End-to-End Sanctum RBAC Token Encryption
          </p>
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#d4af37',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>← Return to Ngus Electronics Showroom</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
