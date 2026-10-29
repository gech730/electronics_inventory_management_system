import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';

import Home from './pages/Home';

// Route to title map
const routeTitles = {
  '/': 'The Royal Standard of Technology',
  '/dashboard': 'Executive Command Dashboard',
  '/products': 'Electronics Product Catalog & SKUs',
  '/categories': 'Category Taxonomy Master',
  '/pos': 'Point of Sale Terminal & Cash Register',
  '/shifts': 'Cashier Register Shifts & Drawer Audits',
  '/sales': 'Sales Ledger & Cashier Receipts',
  '/orders': 'Omni-Channel Customer Orders',
  '/shipments': 'Logistics & Package Shipments',
  '/customers': 'Customer Accounts & Credit Profiles',
  '/stores': 'Stores & Physical Warehouse Locations',
  '/balances': 'Stock Balances & Audit Movements Ledger',
  '/units': 'Units of Measure & Packaging Standards',
  '/transfers': 'Inter-Store Inventory Transfers',
  '/adjustments': 'Inventory Variance Stock Adjustments',
  '/suppliers': 'Vendors & Supplier Directory',
  '/purchase-orders': 'Procurement & Purchase Orders',
  '/goods-receipts': 'Inbound Goods Receiving (GRN)',
  '/returns': 'Customer Returns & RMA Replacements',
  '/finance-settings': 'Financial Ledger, Accounts & Currencies',
  '/users': 'Staff Access & RBAC Identity Management',
  '/login': 'Staff & Client Authentication Portal',
  '/register': 'Customer Registration & Account Portal',
};

// Synchronize document.title with route changes
function PageTitleManager() {
  const location = useLocation();
  useEffect(() => {
    const title = routeTitles[location.pathname] || 'Imperial Enterprise';
    document.title = `Ngus Electronics | ${title}`;
  }, [location.pathname]);
  return null;
}
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
import { CartProvider } from './context/CartContext';
import CustomerCartDrawer from './components/CustomerCartDrawer';

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
  const { isAuthenticated, showToast } = useAuth();

  // Network offline / online recovery toast listener
  useEffect(() => {
    const handleOnline = () => showToast?.('Network connection restored. Syncing with backend.', 'success');
    const handleOffline = () => showToast?.('Internet connection offline. Some actions may fail.', 'error');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  return (
    <CartProvider>
      <PageTitleManager />
      <Routes>
        {/* Public Impressive Home Route */}
        <Route path="/" element={<Home />} />

        {/* Public Login & Register Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
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
          <Route path="/dashboard" element={<Dashboard />} />
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
      <CustomerCartDrawer />
      <ToastContainer />
    </CartProvider>
  );
}
