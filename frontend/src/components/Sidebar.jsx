import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icons';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, hasRole } = useAuth();

  // Navigation items defined with their permitted roles
  const navItems = [
    {
      label: 'Dashboard',
      path: '/',
      icon: 'dashboard',
      roles: ['admin', 'manager', 'cashier', 'storekeeper'],
    },
    {
      label: 'Products',
      path: '/products',
      icon: 'cpu',
      roles: ['admin', 'manager'],
    },
    {
      label: 'Categories',
      path: '/categories',
      icon: 'tag',
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      label: 'Point of Sale',
      path: '/pos',
      icon: 'cart',
      roles: ['cashier', 'admin', 'manager'],
    },
    {
      label: 'Sales History',
      path: '/sales',
      icon: 'receipt',
      roles: ['cashier', 'admin', 'manager'],
    },
    {
      label: 'Staff Users',
      path: '/users',
      icon: 'users',
      roles: ['admin'],
    },
  ];

  // Filter items based on the logged-in user's role
  const visibleItems = navItems.filter((item) => hasRole(item.roles));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
            display: 'block',
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{
          width: 260,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
          transition: 'transform var(--transition-normal)',
          flexShrink: 0,
        }}
      >
        {/* Brand / Logo Header */}
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Icon name="bolt" size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                VoltTrack
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Inventory System
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ width: 32, height: 32, display: isOpen ? 'flex' : 'none' }}
            aria-label="Close menu"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0 12px 6px',
            }}
          >
            Menu
          </p>

          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                background: isActive ? 'var(--gradient-primary)' : 'transparent',
                boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
              })}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer: User Role & API Status Indicator */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(15, 23, 42, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--success)',
                boxShadow: '0 0 8px var(--success)',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>
              API Connected • Role: <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{user?.role}</strong>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
