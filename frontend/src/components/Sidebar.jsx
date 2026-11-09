import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icons';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, hasRole } = useAuth();

  // Streamlined, clean, unified navigation - NO duplicated or confusing tabs!
  const navSections = [
    {
      title: 'Overview & Operations',
      items: [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: 'dashboard',
          badge: null,
          roles: ['admin', 'manager', 'cashier', 'storekeeper'],
          description: 'Overview & telemetry',
        },
        {
          label: 'POS Register',
          path: '/pos',
          icon: 'cart',
          badge: 'Cashier',
          roles: ['cashier', 'admin', 'manager'],
          description: 'Counter sales & checkout',
        },
        {
          label: 'Sales & Cashier Ledger',
          path: '/sales',
          icon: 'receipt',
          badge: null,
          roles: ['admin', 'manager', 'cashier'],
          description: 'Cashier sales & performance audit',
        },
        {
          label: 'Cashier Shifts',
          path: '/shifts',
          icon: 'clock',
          badge: null,
          roles: ['cashier', 'admin', 'manager'],
          description: 'Drawer floats & shift audits',
        },
        {
          label: 'Orders & Sales',
          path: '/orders',
          icon: 'clipboard',
          badge: null,
          roles: ['admin', 'manager', 'storekeeper'],
          description: 'Online orders & delivery',
        },
      ],
    },
    {
      title: 'Catalog & Inventory',
      items: [
        {
          label: 'Products',
          path: '/products',
          icon: 'package',
          badge: null,
          roles: ['admin', 'manager', 'storekeeper'],
          description: 'SKUs, stock & pricing',
        },
        {
          label: 'Categories & Brands',
          path: '/categories',
          icon: 'tag',
          badge: null,
          roles: ['admin', 'manager', 'storekeeper'],
          description: 'Categories & brand taxonomy',
        },
        {
          label: 'Purchasing & Vendors',
          path: '/purchase-orders',
          icon: 'truck',
          badge: null,
          roles: ['admin', 'manager'],
          description: 'Purchase orders & suppliers',
        },
      ],
    },
    {
      title: 'Settings & Administration',
      items: [
        {
          label: 'Stores & Locations',
          path: '/stores',
          icon: 'store',
          badge: null,
          roles: ['admin', 'manager'],
          description: 'Branches & warehouse locations',
        },
        {
          label: 'Customers',
          path: '/customers',
          icon: 'users',
          badge: null,
          roles: ['admin', 'manager', 'cashier'],
          description: 'Client profiles & credit',
        },
        {
          label: 'Staff & Roles',
          path: '/users',
          icon: 'settings',
          badge: 'Admin',
          roles: ['admin'],
          description: 'Staff accounts & permissions',
        },
        {
          label: 'Finance & Tax Settings',
          path: '/finance-settings',
          icon: 'dollarSign',
          badge: 'Admin',
          roles: ['admin'],
          description: 'Payment methods & VAT tax rates',
        },
        {
          label: 'Customer Support & Inquiries',
          path: '/support-inquiries',
          icon: 'mail',
          badge: null,
          roles: ['admin', 'manager'],
          description: 'Customer contact messages & feedback',
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

      {/* Modern, Clean & Friendly Sidebar */}
      <aside
        style={{
          width: 260,
          background: 'var(--bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
          flexShrink: 0,
          padding: '20px 14px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.15) transparent',
        }}
      >
        {/* Brand Header: Ngus Electronics */}
        <div style={{ padding: '0 8px 18px', borderBottom: '1px solid var(--border-sidebar)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(212,175,55,0.4)',
                background: '#090b10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/ngus-logo.png"
                alt="Ngus Electronics"
                style={{ width: '90%', height: '90%', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '👑';
                }}
              />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>
                <span className="ngus-gold-text">NGUS</span>
              </span>
              <div
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: '#d4af37',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                ELECTRONICS
              </div>
            </div>
          </div>

          {/* User Role Pill & Storefront Link */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                color: '#f5d77f',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4af37' }} />
              <span style={{ textTransform: 'capitalize' }}>{user?.role || 'Admin'}</span>
            </span>

            <NavLink
              to="/"
              style={{
                fontSize: '0.72rem',
                color: '#94a3b8',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'color 150ms ease',
              }}
              title="View Public Electronics Showroom"
            >
              <span>Storefront ↗</span>
            </NavLink>
          </div>
        </div>

        {/* Organized Navigation Sections */}
        <nav style={{ flex: 1, paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {navSections.map((section) => {
            const filteredItems = section.items.filter((item) => hasRole(item.roles));
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title}>
                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#64748b',
                    padding: '0 12px 8px',
                  }}
                >
                  {section.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all 160ms ease',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        background: isActive ? '#1677ff' : 'transparent',
                        boxShadow: isActive ? '0 4px 14px rgba(22, 119, 255, 0.4)' : 'none',
                      })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Icon name={item.icon} size={18} color="currentColor" />
                        <div>
                          <div style={{ lineHeight: 1.2 }}>{item.label}</div>
                        </div>
                      </div>

                      {item.badge && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.12)',
                            color: '#e2e8f0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Live Connectivity Status */}
        <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-sidebar)', marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#00b074',
                boxShadow: '0 0 8px rgba(0, 176, 116, 0.7)',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
              System Online & Ready
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
