import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icons';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, hasRole } = useAuth();

  // Navigation items matching StockWise Admin design
  const navItems = [
    {
      label: 'Dashboard',
      path: '/',
      icon: 'dashboard',
      roles: ['admin', 'manager', 'cashier', 'storekeeper'],
    },
    {
      label: 'Users',
      path: '/users',
      icon: 'users',
      roles: ['admin'],
    },
    {
      label: 'Products',
      path: '/products',
      icon: 'package',
      roles: ['admin', 'manager'],
    },
    {
      label: 'Categories',
      path: '/categories',
      icon: 'tag',
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      label: 'Inventory',
      path: '/pos',
      icon: 'cart',
      roles: ['cashier', 'admin', 'manager'],
    },
    {
      label: 'Reports',
      path: '/sales',
      icon: 'trendingUp',
      roles: ['cashier', 'admin', 'manager'],
    },
  ];

  const visibleItems = navItems.filter((item) => hasRole(item.roles));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

      {/* StockWise Dark Navy Sidebar */}
      <aside
        style={{
          width: 250,
          background: 'var(--bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
          flexShrink: 0,
          padding: '24px 16px',
        }}
      >
        {/* Brand Header: StockWise */}
        <div style={{ padding: '0 8px 24px', borderBottom: '1px solid var(--border-sidebar)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="stockwise" size={32} />
            </div>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              StockWise
            </span>
          </div>

          {/* Role Pill under logo */}
          <div style={{ marginTop: 14 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontSize: '0.74rem',
                fontWeight: 600,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1677ff' }} />
              <span style={{ textTransform: 'capitalize' }}>{user?.role || 'Admin'}</span>
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '11px 16px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 150ms ease',
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? '#1677ff' : 'transparent',
                boxShadow: isActive ? '0 4px 14px rgba(22, 119, 255, 0.35)' : 'none',
              })}
            >
              <Icon name={item.icon} size={18} color="currentColor" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom indicator */}
        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-sidebar)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00b074' }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              System Online
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
