import React from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from './Icons';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        height: 72,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Search Input Bar (matching image) */}
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
            color="#94a3b8"
            style={{ position: 'absolute', left: 14 }}
          />
          <input
            type="text"
            placeholder="Search product, category, or user..."
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '0.86rem',
              outline: 'none',
              color: '#1e293b',
              transition: 'all 150ms ease',
            }}
          />
        </div>
      </div>

      {/* Right Controls: Notification Bell + User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Notification Bell with red dot */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
            }}
          >
            {/* Simple bell SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          {/* Red unread dot */}
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              border: '2px solid #ffffff',
            }}
          />
        </div>

        {/* User Profile Pill with chevron */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '4px 6px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#e2e8f0',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.92rem',
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
              {user?.name || 'Getacher Kifilie'}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'capitalize' }}>
              {user?.role || 'Admin'}
            </span>
          </div>

          {/* Chevron down arrow */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Sign Out Shortcut */}
        <button
          onClick={logout}
          className="btn btn-secondary btn-icon"
          title="Sign Out"
          style={{ width: 36, height: 36, borderRadius: '50%' }}
        >
          <Icon name="logout" size={16} color="#64748b" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
