import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, user, theme, toggleTheme } = useAuth();

  // Parse query params for default tab or redirect url
  const queryParams = new URLSearchParams(location.search);
  const initialMode = queryParams.get('mode') === 'register' ? 'register' : 'login';
  const redirectPath = queryParams.get('redirect') || null;

  const [activeTab, setActiveTab] = useState(initialMode); // 'login' | 'register'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else if (user?.role === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, redirectPath, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please provide both email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await login(loginEmail, loginPassword);
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else if (res.user?.role === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setError('Password confirmation does not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await register({
        name: regName,
        email: regEmail,
        phone: regPhone || undefined,
        password: regPassword,
        password_confirmation: regPasswordConfirm,
      });

      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else if (res.user?.role === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const validationErrs = err.data?.errors;
      if (validationErrs) {
        const firstErr = Object.values(validationErrs)[0];
        setError(Array.isArray(firstErr) ? firstErr[0] : firstErr);
      } else {
        setError(err.data?.message || err.message || 'Registration failed. Please check your inputs.');
      }
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
        padding: '32px 20px',
        position: 'relative',
        background: '#07080b',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Ambient background glows */}
      <div className="ambient-glow ambient-glow-1" style={{ opacity: 0.35 }} />
      <div className="ambient-glow ambient-glow-2" style={{ opacity: 0.35 }} />

      {/* Top action bar: Back to store & Theme toggle */}
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
          maxWidth: 480,
          padding: '36px 32px',
          position: 'relative',
          zIndex: 2,
          background: 'rgba(16, 20, 29, 0.94)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -10px rgba(0,0,0,0.8), 0 0 35px rgba(212, 175, 55, 0.22)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              margin: '0 auto 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '20px',
              background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(9,11,17,0.9) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              boxShadow: '0 0 25px rgba(212, 175, 55, 0.35)',
            }}
          >
            <span style={{ fontSize: '2rem' }}>👑</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>
            <span className="ngus-gold-text">NGUS</span> ELECTRONICS
          </h1>
          <p style={{ color: '#d4af37', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>
            {activeTab === 'login' ? 'Account Authentication & Console Access' : 'Create Your Customer Account'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '9999px',
            padding: '4px',
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); }}
            style={{
              padding: '9px 16px',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'login' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'transparent',
              color: activeTab === 'login' ? '#090a0f' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); }}
            style={{
              padding: '9px 16px',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'register' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'transparent',
              color: activeTab === 'register' ? '#090a0f' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.84rem',
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

        {/* ── TAB 1: SIGN IN FORM ── */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="loginEmail" style={{ color: '#cbd5e1' }}>
                Email Address
              </label>
              <input
                id="loginEmail"
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="loginPassword" style={{ color: '#cbd5e1' }}>
                Password
              </label>
              <input
                id="loginPassword"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="ngus-btn-gold"
              style={{ width: '100%', marginTop: 10, padding: '13px 18px', justifyContent: 'center', fontSize: '0.92rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Icon name="refresh" size={18} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Icon name="lock" size={18} />
                  <span>Sign In & Continue</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ── TAB 2: REGISTER FORM ── */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="regName" style={{ color: '#cbd5e1' }}>
                Full Name *
              </label>
              <input
                id="regName"
                type="text"
                className="form-input"
                placeholder="e.g. Dawit Kebede"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="regEmail" style={{ color: '#cbd5e1' }}>
                  Email Address *
                </label>
                <input
                  id="regEmail"
                  type="email"
                  className="form-input"
                  placeholder="dawit@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regPhone" style={{ color: '#cbd5e1' }}>
                  Phone Number
                </label>
                <input
                  id="regPhone"
                  type="tel"
                  className="form-input"
                  placeholder="+251 911 234567"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="regPassword" style={{ color: '#cbd5e1' }}>
                  Password *
                </label>
                <input
                  id="regPassword"
                  type="password"
                  className="form-input"
                  placeholder="Min 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regPasswordConfirm" style={{ color: '#cbd5e1' }}>
                  Confirm Password *
                </label>
                <input
                  id="regPasswordConfirm"
                  type="password"
                  className="form-input"
                  placeholder="Repeat password"
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="ngus-btn-gold"
              style={{ width: '100%', marginTop: 10, padding: '13px 18px', justifyContent: 'center', fontSize: '0.92rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Icon name="refresh" size={18} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>👑 Register & Start Shopping</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Toggle */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
          {activeTab === 'login' ? (
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0 }}>
              New customer?{' '}
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(''); }}
                style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontWeight: 800, cursor: 'pointer', padding: 0 }}
              >
                Create an account
              </button>
            </p>
          ) : (
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0 }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(''); }}
                style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontWeight: 800, cursor: 'pointer', padding: 0 }}
              >
                Sign in here
              </button>
            </p>
          )}

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              ← Return to Ngus Electronics Showroom
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
