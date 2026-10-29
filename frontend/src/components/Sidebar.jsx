import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icons';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, hasRole } = useAuth();

  // Categorized Navigation Sections - Clean, understandable, and role-tailored
  const navSections = [
    {
      title: 'Main',
      items: [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: 'dashboard',
          roles: ['admin', 'manager', 'cashier', 'storekeeper'],
        },
        {
          label: 'Staff & Roles',
          path: '/users',
          icon: 'users',
          roles: ['admin'],
        },
      ],
    },
    {
      title: 'Cash Register & POS',
      items: [
        {
          label: 'POS Checkout',
          path: '/pos',
          icon: 'cart',
          roles: ['cashier', 'admin', 'manager'],
        },
        {
          label: 'Shift Drawers',
          path: '/shifts',
          icon: 'dollarSign',
          roles: ['cashier', 'admin', 'manager'],
        },
        {
          label: 'Sales Receipts',
          path: '/sales',
          icon: 'receipt',
          roles: ['cashier', 'admin', 'manager'],
        },
      ],
    },
    {
      title: 'Orders & Customers',
      items: [
        {
          label: 'Orders',
          path: '/orders',
          icon: 'clipboard',
          roles: ['admin', 'manager'],
        },
        {
          label: 'Shipments & Deliveries',
          path: '/shipments',
          icon: 'truck',
          roles: ['admin', 'manager', 'storekeeper'],
        },
        {
          label: 'Customers',
          path: '/customers',
          icon: 'users',
          roles: ['admin', 'manager', 'cashier'],
        },
      ],
    },
    {
      title: 'Inventory & Stock',
      items: [
        {
          label: 'Products',
          path: '/products',
          icon: 'package',
          roles: ['admin', 'manager'],
        },
        {
          label: 'Categories & Brands',
          path: '/categories',
          icon: 'tag',
          roles: ['admin', 'manager'],
        },
        {
          label: 'Stock Levels',
          path: '/balances',
          icon: 'cpu',
          roles: ['admin', 'manager', 'storekeeper'],
        },
        {
          label: 'Stores & Locations',
          path: '/stores',
          icon: 'store',
          roles: ['admin', 'manager'],
        },
        {
          label: 'Stock Transfers',
          path: '/transfers',
          icon: 'arrowLeftRight',
          roles: ['admin', 'manager', 'storekeeper'],
        },
        {
          label: 'Stock Adjustments',
          path: '/adjustments',
          icon: 'filter',
          roles: ['admin', 'manager', 'storekeeper'],
        },
        {
          label: 'Units of Measure',
          path: '/units',
          icon: 'tag',
          roles: ['admin', 'manager'],
        },
      ],
    },
    {
      title: 'Purchasing & Suppliers',
      items: [
        {
          label: 'Suppliers',
          path: '/suppliers',
          icon: 'store',
          roles: ['admin', 'manager'],
        },
        {
          label: 'Purchase Orders',
          path: '/purchase-orders',
          icon: 'clipboard',
          roles: ['admin', 'manager'],
        },
        {
          label: 'Goods Receiving (GRN)',
          path: '/goods-receipts',
          icon: 'package',
          roles: ['admin', 'manager', 'storekeeper'],
        },
      ],
    },
    {
      title: 'Customer Service & Finance',
      items: [
        {
          label: 'Returns & Refunds',
          path: '/returns',
          icon: 'rotateCcw',
          roles: ['admin', 'manager', 'cashier'],
        },
        {
          label: 'Taxes & Payment Methods',
          path: '/finance-settings',
          icon: 'creditCard',
          roles: ['admin', 'manager'],
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
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

      {/* StockWise Dark Navy Sidebar */}
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
            <div style={{ width: 38, height: 38, borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(212,175,55,0.4)', background: '#090b10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/ngus-logo.png" alt="Ngus Electronics" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>
                <span className="ngus-gold-text">NGUS</span>
              </span>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#d4af37', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                ELECTRONICS
              </div>
            </div>
          </div>

          {/* Role Pill under logo & Quick link to store */}
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
              }}
              title="View Public Store"
            >
              <span>Store ↗</span>
            </NavLink>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav style={{ flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {navSections.map((section) => {
            const filteredItems = section.items.filter((item) => hasRole(item.roles));
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title}>
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#64748b',
                    padding: '0 12px 6px',
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
                        gap: 12,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all 150ms ease',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        background: isActive ? '#1677ff' : 'transparent',
                        boxShadow: isActive ? '0 4px 12px rgba(22, 119, 255, 0.35)' : 'none',
                      })}
                    >
                      <Icon name={item.icon} size={17} color="currentColor" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom indicator */}
        <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-sidebar)', marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00b074' }} />
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
              Backend API Connected
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
