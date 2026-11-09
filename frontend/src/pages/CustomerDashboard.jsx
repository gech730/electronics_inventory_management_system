import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Icon from '../components/Icons';

export default function CustomerDashboard() {
  const { user, logout, showToast } = useAuth();
  const { cart, addToCart, setIsCartOpen, totalCount } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Theme State (Synced with Rosa Home Page) ───────────────────────
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ngus_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ngus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  // Theme-aware design tokens
  const colors = {
    bgApp: isDark ? '#070810' : '#FCF9F7',
    bgSurface: isDark ? '#0e121d' : '#FFFFFF',
    bgCardSubtle: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
    borderHover: isDark ? 'rgba(245, 158, 11, 0.45)' : '#F59E0B',
    textMain: isDark ? '#FFFFFF' : '#18181B',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    textDim: isDark ? '#64748B' : '#94A3B8',
    headerBg: isDark ? 'rgba(7, 8, 16, 0.92)' : 'rgba(252, 249, 247, 0.92)',
    cardShadow: isDark
      ? '0 10px 30px rgba(0, 0, 0, 0.45)'
      : '0 8px 24px rgba(15, 23, 42, 0.05)',
    primaryAccent: '#f59e0b',
    primaryHover: '#d97706',
  };

  // ── Navigation Tabs: 'orders' | 'boutique' | 'tracking' | 'profile' ─
  const initialTab = searchParams.get('tab') || 'orders';
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Data States ────────────────────────────────────────────────────
  const [profileData, setProfileData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Boutique state
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [boutiqueCategory, setBoutiqueCategory] = useState('all');
  const [boutiqueSearch, setBoutiqueSearch] = useState('');
  const [addedItemNotice, setAddedItemNotice] = useState(null);

  // Tracking tab search
  const [trackingSearchRef, setTrackingSearchRef] = useState(searchParams.get('track') || '');
  const [searchedTracking, setSearchedTracking] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Modals & UI helpers
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');

  // Edit Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Password Security state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['orders', 'boutique', 'tracking', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
    const trackParam = searchParams.get('track');
    if (trackParam) {
      setTrackingSearchRef(trackParam);
      handleTrackLookup(trackParam);
    }
  }, [searchParams]);

  // Load customer data & products catalog
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profRes, ordRes, shpRes, prodRes, catRes] = await Promise.all([
        api.getCustomerProfile().catch(() => null),
        api.getCustomerOrders().catch(() => ({ data: [] })),
        api.getCustomerShipments().catch(() => ({ data: [] })),
        api.getProducts({ per_page: 50 }).catch(() => ({ data: [] })),
        api.getCategories({ per_page: 20 }).catch(() => ({ data: [] })),
      ]);

      if (profRes?.data) {
        setProfileData(profRes.data);
        const cust = profRes.data.customer;
        const defaultAddr = cust?.default_address?.address_line_1 || cust?.addresses?.[0]?.address_line_1 || '';
        setProfileForm({
          name: profRes.data.user?.name || cust?.display_name || '',
          phone: cust?.phone || '',
          address: defaultAddr,
        });
      }
      if (ordRes?.data) setOrders(ordRes.data);
      if (shpRes?.data) setShipments(shpRes.data);

      const rawProds = Array.isArray(prodRes) ? prodRes : prodRes?.data || [];
      const rawCats = Array.isArray(catRes) ? catRes : catRes?.data || [];
      setProducts(rawProds);
      setCategories(rawCats);
    } catch (err) {
      console.error('Failed to load customer dashboard data:', err);
      showToast?.('Unable to load full account details. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen to order placed event from cart drawer to refresh orders automatically
  useEffect(() => {
    const handleOrderPlaced = () => {
      fetchDashboardData();
      changeTab('orders');
    };
    window.addEventListener('ngus_order_placed', handleOrderPlaced);
    return () => window.removeEventListener('ngus_order_placed', handleOrderPlaced);
  }, []);

  // Copy to clipboard helper
  const handleCopy = (text, label = 'Code') => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedCode(text);
    showToast?.(`${label} copied to clipboard`, 'success');
    setTimeout(() => setCopiedCode(''), 2500);
  };

  // Perform tracking search
  const handleTrackLookup = async (referenceToTrack) => {
    const ref = (referenceToTrack || trackingSearchRef || '').trim();
    if (!ref) {
      setTrackingError('Please enter a tracking number, order number, or phone.');
      return;
    }

    setTrackingLoading(true);
    setTrackingError('');
    try {
      const res = await api.trackShipment(ref);
      if (res?.data) {
        setSearchedTracking(res.data);
        setActiveTab('tracking');
      } else {
        setTrackingError('No shipment or order found with reference: ' + ref);
      }
    } catch (err) {
      setTrackingError(err.data?.message || err.message || 'Tracking reference not found.');
      setSearchedTracking(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Switch tab and sync query
  const changeTab = (tabName) => {
    setActiveTab(tabName);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabName);
      return next;
    });
  };

  // Switch to tracking and track specific shipment
  const trackSpecificShipment = (trackingNumber) => {
    setTrackingSearchRef(trackingNumber);
    changeTab('tracking');
    handleTrackLookup(trackingNumber);
  };

  // Add to Bag directly from dashboard
  const handleAddToCartFromDashboard = (prod) => {
    addToCart(prod);
    setAddedItemNotice(prod.id);
    showToast?.(`Added "${prod.name}" to your Bag!`, 'success');
    setTimeout(() => {
      setAddedItemNotice(null);
    }, 1800);
  };

  // Save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccessMsg('');
    try {
      const res = await api.updateCustomerProfile(profileForm);
      if (res?.data) {
        setProfileData((prev) => ({
          ...prev,
          user: res.data.user || prev.user,
          customer: res.data.customer || prev.customer,
        }));
      }
      setProfileSuccessMsg('Your profile and delivery coordinates have been updated.');
      showToast?.('Profile updated successfully!', 'success');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      showToast?.(err.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Change password for customer
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.password.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordError('Password confirmation does not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.changePassword(passwordForm);
      setPasswordSuccess('Your password has been changed securely.');
      showToast?.('Password changed successfully!', 'success');
      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
      showToast?.(err.message || 'Failed to update password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'all') return orders;
    return orders.filter((o) => {
      if (orderStatusFilter === 'confirmed') return o.status === 'confirmed';
      if (orderStatusFilter === 'shipped') return o.status === 'shipped' || (o.shipments && o.shipments.length > 0);
      if (orderStatusFilter === 'completed') return o.status === 'completed';
      return true;
    });
  }, [orders, orderStatusFilter]);

  // Filtered products for the Boutique tab
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        boutiqueCategory === 'all'
          ? true
          : String(p.category_id) === String(boutiqueCategory) ||
            (p.category?.name && p.category.name.toLowerCase() === boutiqueCategory.toLowerCase());

      const q = boutiqueSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [products, boutiqueCategory, boutiqueSearch]);

  const customerName = profileData?.user?.name || user?.name || 'Valued Client';
  const customerEmail = profileData?.user?.email || user?.email || '';
  const metrics = profileData?.metrics || {
    total_orders: orders.length,
    total_spent: orders.reduce((sum, o) => sum + parseFloat(o.grand_total || 0), 0),
    active_shipments_count: shipments.filter((s) => ['pending', 'packed', 'shipped'].includes(s.status)).length,
    membership_tier: 'Royal Gold VIP',
    tier_badge: 'Gold',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bgApp,
        color: colors.textMain,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {/* 🧭 FIXED / STICKY HEADER (Rosa Minimalist Style) */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: colors.headerBg,
          borderBottom: `1px solid ${colors.border}`,
          transition: 'all 0.3s ease',
          padding: '14px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Brand Logo & Portal Subtitle */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>👑</span>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  letterSpacing: '-0.02em',
                  color: colors.textMain,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                NGUS <span style={{ color: '#f59e0b', fontWeight: 800 }}>ELECTRONICS</span>
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: colors.textDim,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Royal Customer Sanctuary
              </div>
            </div>
          </Link>

          {/* Quick Header Navigation Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Storefront Link */}
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: '9999px',
                background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                border: `1px solid ${colors.border}`,
                color: colors.textMain,
                fontSize: '0.84rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.2s',
              }}
            >
              <span>Explore Home</span>
              <span style={{ color: '#f59e0b' }}>&rarr;</span>
            </Link>

            {/* Bag Button with Item Counter Badge */}
            <button
              onClick={() => setIsCartOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: '9999px',
                background: totalCount > 0 ? 'rgba(245, 158, 11, 0.15)' : isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                border: `1px solid ${totalCount > 0 ? '#f59e0b' : colors.border}`,
                color: colors.textMain,
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
              }}
              title="Open Shopping Bag & Checkout"
            >
              <Icon name="cart" size={16} color="#f59e0b" />
              <span>Bag</span>
              <span
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  color: '#090a0f',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  minWidth: 20,
                  textAlign: 'center',
                }}
              >
                {totalCount}
              </span>
            </button>

            {/* ☀️ / 🌙 Light & Dark Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                border: `1px solid ${colors.border}`,
                color: isDark ? '#fbbf24' : '#d97706',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: '9999px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Icon name="logout" size={14} color="#ef4444" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN DASHBOARD CONTAINER ─────────────────────────────────── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 24px 80px' }}>
        {/* 🌟 LUXURIOUS WELCOME HERO CARD */}
        <div
          style={{
            background: colors.bgSurface,
            borderRadius: '24px',
            padding: '36px',
            border: `1px solid ${colors.border}`,
            boxShadow: colors.cardShadow,
            marginBottom: 32,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 24,
            transition: 'all 0.3s ease',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#f59e0b',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  textTransform: 'uppercase',
                }}
              >
                <span>👑</span> {metrics.membership_tier}
              </span>
              <span style={{ fontSize: '0.84rem', color: colors.textMuted }}>
                Addis Ababa Verified Client
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
                fontWeight: 700,
                color: colors.textMain,
                margin: '0 0 10px',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              Welcome back,{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  fontWeight: 300,
                  color: '#f59e0b',
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
              >
                {customerName}
              </span>
            </h1>

            <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.94rem', maxWidth: 620, lineHeight: 1.6 }}>
              Review your high-performance hardware orders, view official digital tax receipts, and trace real-time express courier dispatches across Ethiopia.
            </p>

            {/* Direct Quick Action: Add Hardware to Bag */}
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => changeTab('boutique')}
                style={{
                  padding: '10px 24px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  border: 'none',
                  color: '#090a0f',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
                }}
              >
                <span>🛍️ Order Hardware to Bag</span>
                <span>&rarr;</span>
              </button>

              {totalCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '9999px',
                    background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF',
                    border: `1px solid ${colors.border}`,
                    color: colors.textMain,
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon name="cart" size={15} color="#f59e0b" />
                  <span>View Bag ({totalCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Account Tag Card */}
          <div
            style={{
              background: colors.bgCardSubtle,
              border: `1px solid ${colors.border}`,
              borderRadius: '18px',
              padding: '18px 22px',
              minWidth: 220,
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: colors.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Active Client ID
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: colors.textMain, marginBottom: 4 }}>
              {customerEmail}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Telebirr &amp; CBE Birr Enabled
            </div>
          </div>
        </div>

        {/* 📊 4 CORE STATISTIC HIGHLIGHT CARDS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
            marginBottom: 36,
          }}
        >
          {/* Metric 1: Total Orders */}
          <div
            style={{
              background: colors.bgSurface,
              borderRadius: '20px',
              padding: '24px',
              border: `1px solid ${colors.border}`,
              boxShadow: colors.cardShadow,
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: colors.textMuted }}>Total Acquisitions</span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <Icon name="receipt" size={18} color="#f59e0b" />
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: colors.textMain, letterSpacing: '-0.02em', marginBottom: 4 }}>
              {metrics.total_orders}
            </div>
            <div style={{ fontSize: '0.78rem', color: colors.textDim }}>
              Orders verified in inventory ledger
            </div>
          </div>

          {/* Metric 2: Active Shipments */}
          <div
            style={{
              background: colors.bgSurface,
              borderRadius: '20px',
              padding: '24px',
              border: `1px solid ${colors.border}`,
              boxShadow: colors.cardShadow,
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: colors.textMuted }}>Active In-Transit</span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6',
                }}
              >
                <Icon name="truck" size={18} color="#3b82f6" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.02em' }}>
                {metrics.active_shipments_count}
              </div>
              {metrics.active_shipments_count > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  Moving
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: colors.textDim }}>
              Couriers currently en route
            </div>
          </div>

          {/* Metric 3: Total Spent */}
          <div
            style={{
              background: colors.bgSurface,
              borderRadius: '20px',
              padding: '24px',
              border: `1px solid ${colors.border}`,
              boxShadow: colors.cardShadow,
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: colors.textMuted }}>Total Investment</span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <Icon name="creditCard" size={18} color="#f59e0b" />
              </div>
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {parseFloat(metrics.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.textDim }}>ETB</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: colors.textDim }}>
              Lifetime procurement balance
            </div>
          </div>

          {/* Metric 4: Courier Priority */}
          <div
            style={{
              background: colors.bgSurface,
              borderRadius: '20px',
              padding: '24px',
              border: `1px solid ${colors.border}`,
              boxShadow: colors.cardShadow,
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: colors.textMuted }}>Delivery Service</span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                }}
              >
                <Icon name="shield" size={18} color="#10b981" />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: colors.textMain, letterSpacing: '-0.01em', marginBottom: 4 }}>
              Priority Express
            </div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
              Addis Ababa 24h Guaranteed Transit
            </div>
          </div>
        </div>

        {/* 📑 TAB NAVIGATION CONTROLS */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: 16,
            marginBottom: 32,
            flexWrap: 'wrap',
          }}
        >
          {/* Tab 1: Orders */}
          <button
            onClick={() => changeTab('orders')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: '9999px',
              border: `1px solid ${activeTab === 'orders' ? '#f59e0b' : colors.border}`,
              background: activeTab === 'orders' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : colors.bgSurface,
              color: activeTab === 'orders' ? '#090a0f' : colors.textMuted,
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <Icon name="receipt" size={16} color={activeTab === 'orders' ? '#090a0f' : colors.textMuted} />
            <span>My Orders</span>
            <span
              style={{
                background: activeTab === 'orders' ? '#090a0f' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                color: activeTab === 'orders' ? '#fbbf24' : colors.textMain,
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {orders.length}
            </span>
          </button>

          {/* Tab 2: Boutique (Add Products to Bag directly from dashboard) */}
          <button
            onClick={() => changeTab('boutique')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: '9999px',
              border: `1px solid ${activeTab === 'boutique' ? '#f59e0b' : colors.border}`,
              background: activeTab === 'boutique' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : colors.bgSurface,
              color: activeTab === 'boutique' ? '#090a0f' : colors.textMuted,
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <span>🛍️</span>
            <span>Hardware Boutique</span>
            <span
              style={{
                background: activeTab === 'boutique' ? '#090a0f' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                color: activeTab === 'boutique' ? '#fbbf24' : colors.textMain,
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {products.length}
            </span>
          </button>

          {/* Tab 3: Tracking */}
          <button
            onClick={() => changeTab('tracking')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: '9999px',
              border: `1px solid ${activeTab === 'tracking' ? '#3b82f6' : colors.border}`,
              background: activeTab === 'tracking' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : colors.bgSurface,
              color: activeTab === 'tracking' ? '#FFFFFF' : colors.textMuted,
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <Icon name="truck" size={16} color={activeTab === 'tracking' ? '#FFFFFF' : colors.textMuted} />
            <span>Live Shipping &amp; Tracking</span>
            {metrics.active_shipments_count > 0 && (
              <span
                style={{
                  background: activeTab === 'tracking' ? '#FFFFFF' : '#3b82f6',
                  color: activeTab === 'tracking' ? '#1d4ed8' : '#FFFFFF',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                }}
              >
                {metrics.active_shipments_count} active
              </span>
            )}
          </button>

          {/* Tab 4: Profile */}
          <button
            onClick={() => changeTab('profile')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: '9999px',
              border: `1px solid ${activeTab === 'profile' ? '#10b981' : colors.border}`,
              background: activeTab === 'profile' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : colors.bgSurface,
              color: activeTab === 'profile' ? '#FFFFFF' : colors.textMuted,
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <Icon name="users" size={16} color={activeTab === 'profile' ? '#FFFFFF' : colors.textMuted} />
            <span>Profile &amp; Coordinates</span>
          </button>
        </div>

        {/* ── TAB 1: ORDER HISTORY ────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div>
            {/* Filter Pills */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Orders' },
                  { id: 'confirmed', label: 'Confirmed' },
                  { id: 'shipped', label: 'Shipped & In Transit' },
                  { id: 'completed', label: 'Delivered & Complete' },
                ].map((f) => {
                  const isSelected = orderStatusFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setOrderStatusFilter(f.id)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '9999px',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        border: `1px solid ${isSelected ? '#f59e0b' : colors.border}`,
                        background: isSelected
                          ? 'rgba(245, 158, 11, 0.15)'
                          : colors.bgSurface,
                        color: isSelected ? '#f59e0b' : colors.textMuted,
                        transition: 'all 0.15s',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: '0.84rem', color: colors.textDim }}>
                Showing <strong style={{ color: colors.textMain }}>{filteredOrders.length}</strong> of {orders.length} orders
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: colors.textMuted }}>
                <div style={{ fontSize: '2.4rem', marginBottom: 12 }}>⚡</div>
                <p style={{ fontSize: '1.05rem', fontWeight: 600 }}>Loading official order records...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              /* Clean Empty State */
              <div
                style={{
                  background: colors.bgSurface,
                  borderRadius: '24px',
                  border: `1px dashed ${colors.border}`,
                  padding: '64px 24px',
                  textAlign: 'center',
                  boxShadow: colors.cardShadow,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    color: '#f59e0b',
                    fontSize: '1.8rem',
                  }}
                >
                  📦
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: colors.textMain, margin: '0 0 8px' }}>
                  No Orders Found
                </h3>
                <p style={{ color: colors.textMuted, fontSize: '0.92rem', maxWidth: 440, margin: '0 auto 24px' }}>
                  {orderStatusFilter === 'all'
                    ? "You haven't placed any orders yet. Discover our latest flagship smartphones, workstations, and noise-cancelling audio."
                    : `No orders found matching filter "${orderStatusFilter}". Try selecting "All Orders".`}
                </p>
                <button
                  type="button"
                  onClick={() => changeTab('boutique')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 28px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#090a0f',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)',
                  }}
                >
                  <span>Explore Hardware Boutique</span>
                  <span>&rarr;</span>
                </button>
              </div>
            ) : (
              /* Live Orders List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {filteredOrders.map((order) => {
                  const hasShipment = order.shipments && order.shipments.length > 0;
                  const firstShipment = hasShipment ? order.shipments[0] : null;
                  const formattedDate = new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  // Status badge styling
                  let statusBg = 'rgba(245, 158, 11, 0.15)';
                  let statusBorder = 'rgba(245, 158, 11, 0.35)';
                  let statusColor = '#f59e0b';
                  let statusLabel = 'Confirmed';

                  if (order.status === 'completed' || firstShipment?.status === 'delivered') {
                    statusBg = 'rgba(16, 185, 129, 0.15)';
                    statusBorder = 'rgba(16, 185, 129, 0.35)';
                    statusColor = '#10b981';
                    statusLabel = 'Delivered & Complete';
                  } else if (order.status === 'shipped' || firstShipment?.status === 'shipped') {
                    statusBg = 'rgba(59, 130, 246, 0.15)';
                    statusBorder = 'rgba(59, 130, 246, 0.35)';
                    statusColor = '#3b82f6';
                    statusLabel = 'In Transit';
                  } else if (firstShipment?.status === 'packed') {
                    statusBg = 'rgba(245, 158, 11, 0.15)';
                    statusBorder = 'rgba(245, 158, 11, 0.35)';
                    statusColor = '#f59e0b';
                    statusLabel = 'Packed & Quality Verified';
                  }

                  return (
                    <div
                      key={order.id}
                      style={{
                        background: colors.bgSurface,
                        borderRadius: '20px',
                        border: `1px solid ${colors.border}`,
                        boxShadow: colors.cardShadow,
                        overflow: 'hidden',
                        transition: 'border-color 0.2s ease',
                      }}
                    >
                      {/* Order Card Header */}
                      <div
                        style={{
                          padding: '18px 24px',
                          borderBottom: `1px solid ${colors.border}`,
                          background: colors.bgCardSubtle,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 16,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: '1.02rem', fontWeight: 800, color: colors.textMain, letterSpacing: '0.01em' }}>
                              {order.order_number}
                            </span>
                            <button
                              onClick={() => handleCopy(order.order_number, 'Order number')}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: copiedCode === order.order_number ? '#10b981' : colors.textDim,
                                cursor: 'pointer',
                                padding: 2,
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title="Copy Order Reference"
                            >
                              {copiedCode === order.order_number ? (
                                <Icon name="check" size={14} color="#10b981" />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: colors.textDim }}>
                            Placed on {formattedDate}
                          </div>
                        </div>

                        {/* Status Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '5px 14px',
                              borderRadius: '9999px',
                              background: statusBg,
                              border: `1px solid ${statusBorder}`,
                              color: statusColor,
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                            {statusLabel}
                          </span>

                          <span
                            style={{
                              padding: '5px 12px',
                              borderRadius: '9999px',
                              background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                              border: `1px solid ${colors.border}`,
                              color: colors.textMuted,
                              fontSize: '0.76rem',
                              fontWeight: 600,
                            }}
                          >
                            {order.fulfillment_type === 'delivery' ? 'Express Courier' : 'Showroom Pickup'}
                          </span>
                        </div>
                      </div>

                      {/* Items Preview List */}
                      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {order.items?.map((item) => {
                          const product = item.product || item.product_variant?.product;
                          const image = product?.images?.[0]?.image_path || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80';

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                                paddingBottom: 14,
                                borderBottom: `1px solid ${colors.border}`,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div
                                  style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '12px',
                                    background: colors.bgCardSubtle,
                                    border: `1px solid ${colors.border}`,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <img
                                    src={image}
                                    alt={item.product_name_snapshot}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: colors.textMain }}>
                                    {item.product_name_snapshot}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginTop: 2 }}>
                                    Qty: <strong style={{ color: colors.textMain }}>{Math.round(item.quantity_ordered)}</strong> × {parseFloat(item.unit_price).toLocaleString()} ETB
                                    {item.sku_snapshot && <span style={{ marginLeft: 8, color: colors.textDim }}>• SKU: {item.sku_snapshot}</span>}
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f59e0b' }}>
                                  {parseFloat(item.line_total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Order Footer & Actions */}
                      <div
                        style={{
                          padding: '16px 24px',
                          background: colors.bgCardSubtle,
                          borderTop: `1px solid ${colors.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 16,
                        }}
                      >
                        {/* Destination */}
                        <div style={{ fontSize: '0.84rem', color: colors.textMuted, maxWidth: 440 }}>
                          <span style={{ color: colors.textDim }}>Destination: </span>
                          <strong style={{ color: colors.textMain }}>
                            {order.shipping_address?.address_line_1 || order.customer?.display_name || 'Addis Ababa'}
                          </strong>
                          {firstShipment?.tracking_number && (
                            <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Icon name="truck" size={13} color="#3b82f6" />
                              <span>Tracking: <strong>{firstShipment.tracking_number}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Grand Total & Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'right', marginRight: 8 }}>
                            <div style={{ fontSize: '0.72rem', color: colors.textDim, textTransform: 'uppercase' }}>
                              Grand Total
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
                              {parseFloat(order.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.76rem' }}>ETB</span>
                            </div>
                          </div>

                          {/* Track button if shipment exists */}
                          {firstShipment && (
                            <button
                              onClick={() => trackSpecificShipment(firstShipment.tracking_number)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '9px 18px',
                                borderRadius: '9999px',
                                background: 'rgba(59, 130, 246, 0.12)',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                color: '#3b82f6',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              <Icon name="truck" size={14} color="#3b82f6" />
                              <span>Track Package</span>
                            </button>
                          )}

                          {/* Digital Invoice Modal Button */}
                          <button
                            onClick={() => setReceiptOrder(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '9px 18px',
                              borderRadius: '9999px',
                              background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                              border: `1px solid ${colors.border}`,
                              color: colors.textMain,
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Icon name="receipt" size={14} color="currentColor" />
                            <span>Digital Invoice</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: HARDWARE BOUTIQUE (Direct Add to Bag & Live Inventory) ── */}
        {activeTab === 'boutique' && (
          <div>
            {/* Boutique Header Bar */}
            <div
              style={{
                background: colors.bgSurface,
                borderRadius: '24px',
                padding: '28px 32px',
                border: `1px solid ${colors.border}`,
                boxShadow: colors.cardShadow,
                marginBottom: 32,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '1.2rem', color: '#f59e0b' }}>👑</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Certified Hardware Catalog ({products.length} Products Available)
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: colors.textMain, margin: '0 0 6px' }}>
                    Order Flagship Hardware Directly to Your Bag
                  </h2>
                  <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.88rem', maxWidth: 640 }}>
                    Select your equipment and click <strong>Add to Bag</strong>. Authorized orders feature real-time inventory ledger reservation and priority Addis Ababa courier delivery.
                  </p>
                </div>

                {/* Instant Search input */}
                <div style={{ position: 'relative', minWidth: 260 }}>
                  <input
                    type="text"
                    value={boutiqueSearch}
                    onChange={(e) => setBoutiqueSearch(e.target.value)}
                    placeholder="Search MacBook, iPhone, Galaxy..."
                    style={{
                      width: '100%',
                      padding: '11px 18px 11px 40px',
                      borderRadius: '9999px',
                      background: colors.bgCardSubtle,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                      fontSize: '0.86rem',
                      outline: 'none',
                    }}
                  />
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textDim }}>
                    <Icon name="search" size={15} />
                  </div>
                </div>
              </div>

              {/* Category Pills Filter */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setBoutiqueCategory('all')}
                  style={{
                    padding: '6px 18px',
                    borderRadius: '9999px',
                    fontSize: '0.82rem',
                    fontWeight: boutiqueCategory === 'all' ? 800 : 600,
                    border: `1px solid ${boutiqueCategory === 'all' ? '#f59e0b' : colors.border}`,
                    background: boutiqueCategory === 'all' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : colors.bgCardSubtle,
                    color: boutiqueCategory === 'all' ? '#090a0f' : colors.textMuted,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  All Categories ({products.length})
                </button>

                {categories.map((c) => {
                  const isSelected = String(boutiqueCategory) === String(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setBoutiqueCategory(String(c.id))}
                      style={{
                        padding: '6px 18px',
                        borderRadius: '9999px',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 800 : 600,
                        border: `1px solid ${isSelected ? '#f59e0b' : colors.border}`,
                        background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : colors.bgCardSubtle,
                        color: isSelected ? '#090a0f' : colors.textMuted,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div
                style={{
                  background: colors.bgSurface,
                  borderRadius: '24px',
                  border: `1px dashed ${colors.border}`,
                  padding: '60px 24px',
                  textAlign: 'center',
                  boxShadow: colors.cardShadow,
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: colors.textMain, margin: '0 0 6px' }}>
                  No hardware matching "{boutiqueSearch}"
                </h3>
                <p style={{ color: colors.textMuted, fontSize: '0.88rem', margin: '0 0 16px' }}>
                  Try resetting your category or search filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setBoutiqueSearch('');
                    setBoutiqueCategory('all');
                  }}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '9999px',
                    background: 'transparent',
                    border: '1px solid #f59e0b',
                    color: '#f59e0b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 22,
                }}
              >
                {filteredProducts.map((p) => {
                  const inBag = addedItemNotice === p.id || cart.some((c) => String(c.id) === String(p.id));
                  const isStockAvailable = (p.quantity || 0) > 0;
                  const priceVal = Number(p.selling_price || 0);
                  const img = p.images?.[0]?.image_path || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80';

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: colors.bgSurface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '20px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: colors.cardShadow,
                        transition: 'all 0.25s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors.borderHover;
                        e.currentTarget.style.transform = 'translateY(-3px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Product Image */}
                      <div
                        style={{
                          height: 200,
                          width: '100%',
                          position: 'relative',
                          background: isDark ? '#090b14' : '#F1F5F9',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={img}
                          alt={p.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease',
                          }}
                        />

                        {/* Category Badge */}
                        <span
                          style={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(8px)',
                            color: '#FFFFFF',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {p.category?.name || 'Hardware'}
                        </span>

                        {/* Stock Tag */}
                        <span
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            background: isStockAvailable ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                            color: '#FFFFFF',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                          }}
                        >
                          {isStockAvailable ? `${p.quantity} In Stock` : 'Sold Out'}
                        </span>
                      </div>

                      {/* Product Info */}
                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: colors.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                            {p.brand || 'Ngus Certified Flagship'}
                          </div>
                          <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: colors.textMain, margin: '0 0 6px', lineHeight: 1.3 }}>
                            {p.name}
                          </h4>
                          <p style={{ color: colors.textMuted, fontSize: '0.8rem', lineHeight: 1.4, margin: '0 0 14px' }}>
                            {p.description ? p.description.slice(0, 85) + '...' : 'Official factory sealed with manufacturer warranty and VAT receipt.'}
                          </p>
                        </div>

                        <div>
                          {/* Price */}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                            <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f59e0b' }}>
                              {priceVal.toLocaleString()}
                            </span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: colors.textDim }}>ETB</span>
                          </div>

                          {/* Add to Bag Button */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleAddToCartFromDashboard(p)}
                              disabled={!isStockAvailable}
                              style={{
                                flex: 1,
                                padding: '11px',
                                borderRadius: '9999px',
                                background: inBag
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : !isStockAvailable
                                  ? colors.bgCardSubtle
                                  : 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                                border: inBag ? '1px solid #10b981' : 'none',
                                color: inBag ? '#10b981' : !isStockAvailable ? colors.textDim : '#090a0f',
                                fontWeight: 900,
                                fontSize: '0.84rem',
                                cursor: !isStockAvailable ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              {inBag ? '✓ In Bag' : !isStockAvailable ? 'Out of Stock' : 'Add to Bag'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleAddToCartFromDashboard(p);
                                setIsCartOpen(true);
                              }}
                              disabled={!isStockAvailable}
                              title="Instant Checkout"
                              style={{
                                padding: '11px 16px',
                                borderRadius: '9999px',
                                background: colors.bgCardSubtle,
                                border: `1px solid ${colors.border}`,
                                color: colors.textMain,
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: !isStockAvailable ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Checkout
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: LIVE SHIPPING & PARCEL TRACKING ─────────────────────── */}
        {activeTab === 'tracking' && (
          <div>
            {/* Tracking Search Card */}
            <div
              style={{
                background: colors.bgSurface,
                borderRadius: '24px',
                padding: '28px 32px',
                border: `1px solid ${colors.border}`,
                boxShadow: colors.cardShadow,
                marginBottom: 32,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6',
                  }}
                >
                  <Icon name="truck" size={18} color="#3b82f6" />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: colors.textMain, margin: 0 }}>
                  Real-Time Consignment &amp; Dispatch Tracking
                </h2>
              </div>

              <p style={{ margin: '0 0 20px', color: colors.textMuted, fontSize: '0.88rem' }}>
                Enter your <strong>Tracking Code</strong> (e.g. <code>NGS-TRK-...</code>), <strong>Order Number</strong> (<code>NGS-ORD-...</code>), or customer phone to trace your courier.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTrackLookup();
                }}
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 320px', position: 'relative' }}>
                  <input
                    type="text"
                    value={trackingSearchRef}
                    onChange={(e) => setTrackingSearchRef(e.target.value)}
                    placeholder="e.g. NGS-TRK-20261029-PXMMU or NGS-ORD-..."
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: '9999px',
                      background: colors.bgCardSubtle,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={trackingLoading}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: trackingLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  {trackingLoading ? (
                    <span>Locating...</span>
                  ) : (
                    <>
                      <Icon name="search" size={16} color="#FFFFFF" />
                      <span>Track Consignment</span>
                    </>
                  )}
                </button>
              </form>

              {trackingError && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 18px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Icon name="alert" size={16} color="#ef4444" />
                  <span>{trackingError}</span>
                </div>
              )}
            </div>

            {/* If a consignment is found from search */}
            {searchedTracking && (
              <div
                style={{
                  background: colors.bgSurface,
                  borderRadius: '24px',
                  border: `1px solid ${colors.border}`,
                  padding: '28px',
                  marginBottom: 32,
                  boxShadow: colors.cardShadow,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Verified Consignment Record
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.textMain, margin: 0 }}>
                        {searchedTracking.tracking_number}
                      </h3>
                      <button
                        onClick={() => handleCopy(searchedTracking.tracking_number, 'Tracking code')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: copiedCode === searchedTracking.tracking_number ? '#10b981' : colors.textDim,
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        {copiedCode === searchedTracking.tracking_number ? (
                          <Icon name="check" size={16} color="#10b981" />
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: colors.textDim }}>
                      Logistics Carrier
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: colors.textMain }}>
                      {searchedTracking.shipping_provider}
                    </div>
                  </div>
                </div>

                {/* 4-Stage Stepper Progress Tracker */}
                <div
                  style={{
                    padding: '24px 20px',
                    background: colors.bgCardSubtle,
                    borderRadius: '18px',
                    border: `1px solid ${colors.border}`,
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 20,
                    }}
                  >
                    {searchedTracking.timeline?.map((step, idx) => {
                      const isCompleted = step.status === 'completed';
                      const isInTransit = step.status === 'in_transit' || step.status === 'processing';

                      return (
                        <div key={idx} style={{ display: 'flex', gap: 14 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: isCompleted ? '#10b981' : isInTransit ? '#3b82f6' : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {isCompleted ? <Icon name="check" size={16} color="#FFFFFF" /> : <span>{step.step}</span>}
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: isCompleted ? '#10b981' : isInTransit ? '#3b82f6' : colors.textMuted,
                                marginBottom: 2,
                              }}
                            >
                              {step.title}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: colors.textMuted, lineHeight: 1.4, marginBottom: 4 }}>
                              {step.description}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: colors.textDim, fontWeight: 600 }}>
                              {step.timestamp}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recipient Details */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                    padding: '16px 20px',
                    background: colors.bgCardSubtle,
                    borderRadius: '14px',
                    fontSize: '0.84rem',
                  }}
                >
                  <div>
                    <span style={{ color: colors.textDim }}>Recipient: </span>
                    <strong style={{ color: colors.textMain }}>{searchedTracking.recipient_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: colors.textDim }}>Phone: </span>
                    <strong style={{ color: colors.textMain }}>{searchedTracking.recipient_phone}</strong>
                  </div>
                  <div>
                    <span style={{ color: colors.textDim }}>Address: </span>
                    <strong style={{ color: colors.textMain }}>{searchedTracking.delivery_address_snapshot}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Active User Shipments List */}
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: colors.textMain, margin: '0 0 16px' }}>
              Your Registered Consignments ({shipments.length})
            </h3>

            {shipments.length === 0 ? (
              <div
                style={{
                  background: colors.bgSurface,
                  borderRadius: '20px',
                  border: `1px dashed ${colors.border}`,
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: colors.textMuted,
                  boxShadow: colors.cardShadow,
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🚚</div>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  No active courier dispatches at this moment. Placed delivery orders automatically generate real-time tracking numbers here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {shipments.map((shp) => (
                  <div
                    key={shp.id}
                    style={{
                      background: colors.bgSurface,
                      borderRadius: '18px',
                      border: `1px solid ${colors.border}`,
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 16,
                      boxShadow: colors.cardShadow,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#3b82f6' }}>
                          {shp.tracking_number}
                        </span>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: shp.status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            border: `1px solid ${shp.status === 'delivered' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                            color: shp.status === 'delivered' ? '#10b981' : '#3b82f6',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                          }}
                        >
                          {shp.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: colors.textMuted }}>
                        Carrier: <strong style={{ color: colors.textMain }}>{shp.shipping_provider}</strong> • Destination: {shp.delivery_address_snapshot}
                      </div>
                    </div>

                    <button
                      onClick={() => handleTrackLookup(shp.tracking_number)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '9999px',
                        background: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        color: '#3b82f6',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icon name="truck" size={14} color="#3b82f6" />
                      <span>Inspect Progress</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: PROFILE & ADDRESS SETTINGS ───────────────────────────── */}
        {activeTab === 'profile' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 24,
            }}
          >
            {/* Patron Profile Edit Form */}
            <div
              style={{
                background: colors.bgSurface,
                borderRadius: '24px',
                padding: '30px',
                border: `1px solid ${colors.border}`,
                boxShadow: colors.cardShadow,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: '#090a0f',
                  }}
                >
                  {customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: colors.textMain, margin: '0 0 4px' }}>
                    {customerName}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 800 }}>
                    {metrics.membership_tier}
                  </div>
                </div>
              </div>

              {profileSuccessMsg && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Icon name="check" size={16} color="#10b981" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: colors.bgCardSubtle,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                    Direct Contact Phone
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+251 9XX XXX XXX"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: colors.bgCardSubtle,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                    Registered Email (Read-Only)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textDim,
                      fontSize: '0.88rem',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                    Default Express Delivery Address
                  </label>
                  <textarea
                    rows={3}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    placeholder="e.g. Bole Sub-City, Woreda 03, House #144, Addis Ababa"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: colors.bgCardSubtle,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                      fontSize: '0.88rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    border: 'none',
                    color: '#090a0f',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: profileSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                    marginTop: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  {profileSaving ? 'Saving Updates...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>

            {/* Account Security & Password Card */}
            <div
              style={{
                background: colors.bgSurface,
                borderRadius: '24px',
                padding: '30px',
                border: `1px solid ${colors.border}`,
                boxShadow: colors.cardShadow,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6',
                  }}
                >
                  <Icon name="shield" size={18} color="#3b82f6" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: colors.textMain, margin: 0 }}>
                  Account Security &amp; Password
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: colors.textMuted, lineHeight: 1.6, margin: '0 0 20px' }}>
                Ensure your account credentials remain secure. Enter your current password followed by your new password.
              </p>

              {passwordError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '0.82rem',
                    marginBottom: 16,
                  }}
                >
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    fontSize: '0.82rem',
                    marginBottom: 16,
                  }}
                >
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    placeholder="Enter current password"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: colors.bgCardSubtle,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                      placeholder="Min 6 characters"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: colors.bgCardSubtle,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.password_confirmation}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                      placeholder="Repeat new password"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: colors.bgCardSubtle,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordSaving}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '9999px',
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: passwordSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
                    marginTop: 4,
                    alignSelf: 'flex-start',
                  }}
                >
                  {passwordSaving ? 'Updating Password...' : 'Update Account Password'}
                </button>
              </form>
            </div>

            {/* VIP Concierge & Support Card */}
            <div
              style={{
                background: colors.bgSurface,
                borderRadius: '24px',
                padding: '30px',
                border: `1px solid ${colors.border}`,
                boxShadow: colors.cardShadow,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                  }}
                >
                  <Icon name="shield" size={18} color="#f59e0b" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: colors.textMain, margin: 0 }}>
                  Imperial Concierge &amp; Direct Support
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: colors.textMuted, lineHeight: 1.6, margin: '0 0 24px' }}>
                Require bespoke workstation configurations, commercial invoice seals with official Ethiopian TIN receipts, or warranty assistance? Our Addis Ababa technical team is available 24/7.
              </p>

              <div
                style={{
                  background: colors.bgCardSubtle,
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  fontSize: '0.86rem',
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: colors.textMain }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>VIP Hotline: <strong>+251 911 00 22 33</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: colors.textMain }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>Concierge Email: <strong>vip@ngus-electronics.et</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: colors.textMain }}>
                  <Icon name="store" size={18} color="#10b981" />
                  <span>Flagship Showroom: <strong>Bole Medhanialem Tower, Suite 400</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── DIGITAL INVOICE / OFFICIAL COMMERCIAL RECEIPT MODAL ─────────── */}
      {receiptOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: colors.bgSurface,
              border: `1px solid ${colors.border}`,
              borderRadius: '24px',
              maxWidth: 640,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 32,
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              color: colors.textMain,
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setReceiptOrder(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: colors.bgCardSubtle,
                border: `1px solid ${colors.border}`,
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textMain,
                cursor: 'pointer',
              }}
            >
              <Icon name="x" size={16} color="currentColor" />
            </button>

            {/* Receipt Header */}
            <div style={{ textAlign: 'center', borderBottom: `1px solid ${colors.border}`, paddingBottom: 24, marginBottom: 24 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: '1.3rem',
                }}
              >
                👑
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: colors.textMain, margin: '0 0 4px', letterSpacing: '0.04em' }}>
                NGUS ELECTRONICS
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Official Commercial Invoice
              </div>
              <div style={{ fontSize: '0.78rem', color: colors.textMuted, marginTop: 4 }}>
                Bole Sub-City, Addis Ababa, Ethiopia • TIN: 0098451239
              </div>
            </div>

            {/* Order & Customer Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.84rem', marginBottom: 24 }}>
              <div>
                <div style={{ color: colors.textDim }}>Order Reference:</div>
                <div style={{ fontWeight: 800, color: colors.textMain }}>{receiptOrder.order_number}</div>
              </div>
              <div>
                <div style={{ color: colors.textDim }}>Date Authorized:</div>
                <div style={{ fontWeight: 700, color: colors.textMain }}>
                  {new Date(receiptOrder.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ color: colors.textDim }}>Billed Client:</div>
                <div style={{ fontWeight: 700, color: colors.textMain }}>{customerName}</div>
              </div>
              <div>
                <div style={{ color: colors.textDim }}>Payment Mode:</div>
                <div style={{ fontWeight: 700, color: '#f59e0b' }}>
                  {receiptOrder.direct_payment?.payment_method?.name || 'Mobile Banking Verified'}
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div style={{ borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, padding: '16px 0', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ color: colors.textDim, textAlign: 'left', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ paddingBottom: 8 }}>Item Description</th>
                    <th style={{ paddingBottom: 8, textAlign: 'center' }}>Qty</th>
                    <th style={{ paddingBottom: 8, textAlign: 'right' }}>Unit Price</th>
                    <th style={{ paddingBottom: 8, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptOrder.items?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '10px 0', color: colors.textMain, fontWeight: 600 }}>
                        {item.product_name_snapshot}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'center', color: colors.textMuted }}>
                        {Math.round(item.quantity_ordered)}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', color: colors.textMuted }}>
                        {parseFloat(item.unit_price).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', color: '#f59e0b', fontWeight: 800 }}>
                        {parseFloat(item.line_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted }}>
                <span>Subtotal</span>
                <span>{parseFloat(receiptOrder.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted }}>
                <span>Shipping &amp; Fragile Handling</span>
                <span>{parseFloat(receiptOrder.shipping_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted }}>
                <span>VAT (Included)</span>
                <span>{parseFloat(receiptOrder.tax_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTop: `1px solid ${colors.border}`,
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: '#f59e0b',
                }}
              >
                <span>Total Settled</span>
                <span>{parseFloat(receiptOrder.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</span>
              </div>
            </div>

            {/* Receipt Modal Footer Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  border: 'none',
                  color: '#090a0f',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                <span>Print Document</span>
              </button>

              <button
                onClick={() => setReceiptOrder(null)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  background: colors.bgCardSubtle,
                  border: `1px solid ${colors.border}`,
                  color: colors.textMain,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
