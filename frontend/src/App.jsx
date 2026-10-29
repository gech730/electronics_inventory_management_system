import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Pos from './pages/Pos';
import Shifts from './pages/Shifts';
import Orders from './pages/Orders';
import Shipments from './pages/Shipments';
import Customers from './pages/Customers';
import Stores from './pages/Stores';
import Balances from './pages/Balances';
import Units from './pages/Units';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import GoodsReceipts from './pages/GoodsReceipts';
import Transfers from './pages/Transfers';
import Adjustments from './pages/Adjustments';
import Returns from './pages/Returns';
import FinanceSettings from './pages/FinanceSettings';
import Sales from './pages/Sales';
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/pos" element={<Pos />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/balances" element={<Balances />} />
          <Route path="/units" element={<Units />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/adjustments" element={<Adjustments />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/goods-receipts" element={<GoodsReceipts />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/finance-settings" element={<FinanceSettings />} />
          <Route path="/users" element={<Users />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
