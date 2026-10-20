import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icons';
import { RoleBadge } from './StockBadge';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const location = useLocation();

  // Map route paths to friendly page titles
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return 'Dashboard Overview';
      case '/products':
        return 'Product Catalog';
      case '/categories':
        return 'Inventory Categories';
      case '/pos':
        return 'Point of Sale (Checkout)';
      case '/sales':
        return 'Sales & Transactions';
      case '/users':
        return 'Staff User Management';
      default:
        return 'VoltTrack';
    }
  };

  return (
    <header
      style={{
        height: 70,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'var(--glass-blur)',
      }}
    >
      {/* Left: Hamburger menu (mobile) + Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-secondary btn-icon"
          style={{ width: 36, height: 36 }}
          aria-label="Toggle navigation"
        >
          <Icon name="dashboard" size={18} />
        </button>

        <div>
          <h1 style={{ fontSize: '1.18rem', fontWeight: 700, margin: 0 }}>
            {getPageTitle(location.pathname)}
          </h1>
        </div>
      </div>

      {/* Right: Theme Toggle + User Info + Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-icon"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>

        {/* User Profile Pill */}
        <div
          className="glass-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px 6px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.86rem',
              border: '1px solid var(--border-hover)',
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>
              {user?.name || 'User'}
            </span>
            <div style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
              <RoleBadge role={user?.role || 'staff'} />
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="btn btn-danger"
          style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          title="Sign out of your account"
        >
          <Icon name="logout" size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
