import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from './Icons';
import ProfileModal from './ProfileModal';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header
      style={{
        height: 72,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
    >
      {/* Search Input Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, maxWidth: 440 }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-secondary btn-icon"
          style={{ width: 36, height: 36, display: 'none' }}
          aria-label="Toggle navigation"
        >
          <Icon name="dashboard" size={18} />
        </button>

        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Icon
            name="search"
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 14 }}
          />
          <input
            type="text"
            placeholder="Search product, category, or order..."
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              borderRadius: '24px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              fontSize: '0.86rem',
              outline: 'none',
              color: 'var(--text-main)',
              transition: 'all 150ms ease',
            }}
          />
        </div>
      </div>

      {/* Right Controls: Theme Switcher + Notifications + User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* ☀️ / 🌙 Light & Dark Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: theme === 'dark' ? '#fbbf24' : '#d97706',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              border: '2px solid var(--bg-surface)',
            }}
          />
        </div>

        {/* User Profile Pill with chevron */}
        <div
          onClick={() => setIsProfileOpen(true)}
          title="Account Profile & Password Security"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '4px 8px',
            cursor: 'pointer',
            borderRadius: 10,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            transition: 'background 0.2s',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1677ff 0%, #6366f1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.86rem',
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {user?.name || 'Authorized Staff'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user?.role || 'Staff'}
            </span>
          </div>

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Sign Out Shortcut */}
        <button
          onClick={logout}
          className="btn btn-secondary btn-icon"
          title="Sign Out"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <Icon name="logout" size={16} />
        </button>
      </div>

      {/* Staff Account & Password Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
};

export default Navbar;
