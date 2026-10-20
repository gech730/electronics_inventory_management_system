import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Users from './pages/Users';
import Layout from './components/Layout';
import ToastContainer from './components/Toast';
import Icon from './components/Icons';

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

// Section Placeholder for upcoming features
const SectionPlaceholder = ({ title, description, icon }) => (
  <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 'var(--radius-md)',
        background: 'var(--primary-light)',
        color: 'var(--primary)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}
    >
      <Icon name={icon || 'bolt'} size={32} />
    </div>
    <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{title}</h2>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 460, margin: '8px auto 0' }}>
      {description}
    </p>
  </div>
);

// Dashboard Home Shell
const DashboardPreview = () => {
  const { user } = useAuth();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="glass-card" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
          Welcome back, {user?.name}! 👋
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
          VoltTrack Layout & Navigation shell (Feature 2) is active. Use the sidebar to switch views.
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Protected Application Routes wrapped in Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPreview />} />
          <Route
            path="/products"
            element={
              <SectionPlaceholder
                title="Product Catalog"
                description="Manage inventory stock, pricing margins, SKU tracking, and electronic hardware items."
                icon="cpu"
              />
            }
          />
          <Route
            path="/categories"
            element={
              <SectionPlaceholder
                title="Inventory Categories"
                description="Organize components into categories (e.g. Microcontrollers, Sensors, Displays, Power)."
                icon="tag"
              />
            }
          />
          <Route
            path="/pos"
            element={
              <SectionPlaceholder
                title="Point of Sale (Checkout)"
                description="Fast barcode/SKU checkout counter for cashiers to process customer transactions."
                icon="cart"
              />
            }
          />
          <Route
            path="/sales"
            element={
              <SectionPlaceholder
                title="Sales History"
                description="View completed transaction receipts, cashier records, and revenue breakdowns."
                icon="receipt"
              />
            }
          />
          <Route path="/users" element={<Users />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
