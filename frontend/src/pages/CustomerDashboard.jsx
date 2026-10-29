import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';

export default function CustomerDashboard() {
  const { user, logout, showToast } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active view tab: 'orders' | 'tracking' | 'profile'
  const initialTab = searchParams.get('tab') || 'orders';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Data states
  const [profileData, setProfileData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Tracking tab search
  const [trackingSearchRef, setTrackingSearchRef] = useState(searchParams.get('track') || '');
  const [searchedTracking, setSearchedTracking] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Modals & UI helpers
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['orders', 'tracking', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
    const trackParam = searchParams.get('track');
    if (trackParam) {
      setTrackingSearchRef(trackParam);
      handleTrackLookup(trackParam);
    }
  }, [searchParams]);

  // Load customer data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profRes, ordRes, shpRes] = await Promise.all([
        api.getCustomerProfile().catch(() => null),
        api.getCustomerOrders().catch(() => ({ data: [] })),
        api.getCustomerShipments().catch(() => ({ data: [] })),
      ]);

      if (profRes?.data) setProfileData(profRes.data);
      if (ordRes?.data) setOrders(ordRes.data);
      if (shpRes?.data) setShipments(shpRes.data);
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
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #161a30 0%, #070810 50%, #040508 100%)',
      color: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Background ambient gold & sapphire glow orbs */}
      <div style={{
        position: 'absolute',
        top: -150,
        left: '20%',
        width: 600,
        height: 400,
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        top: 250,
        right: '10%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Top Royal Header Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(20px)',
        background: 'rgba(7, 8, 16, 0.82)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.18)',
        padding: '16px 24px',
      }}>
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          {/* Brand Logo & Portal Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  <path d="M5 19h14" />
                </svg>
              </div>
              <div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  background: 'linear-gradient(90deg, #ffffff 0%, #fef3c7 60%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  NGUS ELECTRONICS
                </div>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'rgba(245, 158, 11, 0.9)',
                  textTransform: 'uppercase',
                }}>
                  Royal Customer Portal
                </div>
              </div>
            </Link>
          </div>

          {/* Quick Navigation Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                e.currentTarget.style.color = '#fbbf24';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span>Explore Boutique</span>
            </Link>

            <Link
              to="/tracking"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 10,
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: '#93c5fd',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
              }}
            >
              <Icon name="truck" size={15} color="#60a5fa" />
              <span>Global Dispatch Tracking</span>
            </Link>

            {/* Logout Button */}
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              }}
            >
              <Icon name="logout" size={15} color="#f87171" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px', position: 'relative', zIndex: 1 }}>
        {/* Welcome Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(22, 27, 46, 0.85) 0%, rgba(13, 16, 28, 0.95) 100%)',
          borderRadius: 24,
          padding: '32px 36px',
          border: '1px solid rgba(245, 158, 11, 0.22)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          marginBottom: 32,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 24,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                padding: '4px 12px',
                borderRadius: 999,
                background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fbbf24',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                </svg>
                {metrics.membership_tier}
              </div>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                Accredited Ngus Patron
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}>
              Welcome to Your Sanctuary, <span style={{
                background: 'linear-gradient(90deg, #fef08a 0%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>{customerName}</span>
            </h1>

            <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, maxWidth: 640, lineHeight: 1.6 }}>
              Review your high-fidelity hardware acquisitions, audit digital transaction ledgers, and track express courier dispatches across Ethiopia in real-time.
            </p>
          </div>

          {/* Quick Account Tag */}
          <div style={{
            background: 'rgba(10, 12, 22, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '16px 20px',
            textAlign: 'right',
            minWidth: 200,
          }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Active Client Credential
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
              {customerEmail}
            </div>
            <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>
              Direct Telebirr / CBE Linked
            </div>
          </div>
        </div>

        {/* 4 Core Royal Metrics Highlights */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginBottom: 36,
        }}>
          {/* Metric 1: Total Orders */}
          <div style={{
            background: 'rgba(15, 18, 32, 0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: 18,
            padding: '22px 24px',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Total Acquisitions</span>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {metrics.total_orders}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Orders verified in inventory ledger
            </div>
          </div>

          {/* Metric 2: Active Shipments */}
          <div style={{
            background: 'rgba(15, 18, 32, 0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: 18,
            padding: '22px 24px',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd' }}>Active In-Transit</span>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}>
                <Icon name="truck" size={20} color="#60a5fa" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#60a5fa', letterSpacing: '-0.02em' }}>
                {metrics.active_shipments_count}
              </div>
              {metrics.active_shipments_count > 0 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite' }} />
                  Live Fleet Moving
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Consignments currently en route
            </div>
          </div>

          {/* Metric 3: Total Investment */}
          <div style={{
            background: 'rgba(15, 18, 32, 0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: 18,
            padding: '22px 24px',
            border: '1px solid rgba(245, 158, 11, 0.22)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>Total Value Invested</span>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}>
                <Icon name="creditCard" size={20} color="#fbbf24" />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {parseFloat(metrics.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 14, fontWeight: 600, color: '#d97706' }}>ETB</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Lifetime procurement volume
            </div>
          </div>

          {/* Metric 4: VIP Privilege */}
          <div style={{
            background: 'rgba(15, 18, 32, 0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: 18,
            padding: '22px 24px',
            border: '1px solid rgba(16, 185, 129, 0.22)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>Courier Service Tier</span>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}>
                <Icon name="shield" size={20} color="#34d399" />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', marginBottom: 4 }}>
              Priority Express
            </div>
            <div style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>
              Addis Ababa 24h Guaranteed Transit
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div style={{
          display: 'flex',
          gap: 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: 16,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => changeTab('orders')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 24px',
              borderRadius: 14,
              border: activeTab === 'orders' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'orders' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(180, 83, 9, 0.15) 100%)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'orders' ? '#fbbf24' : '#94a3b8',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Icon name="receipt" size={18} color={activeTab === 'orders' ? '#fbbf24' : '#94a3b8'} />
            <span>My Order History</span>
            <span style={{
              background: activeTab === 'orders' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
              color: activeTab === 'orders' ? '#000000' : '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 999,
            }}>
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => changeTab('tracking')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 24px',
              borderRadius: 14,
              border: activeTab === 'tracking' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'tracking' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(29, 78, 216, 0.15) 100%)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'tracking' ? '#93c5fd' : '#94a3b8',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Icon name="truck" size={18} color={activeTab === 'tracking' ? '#93c5fd' : '#94a3b8'} />
            <span>Live Shipping & Tracking</span>
            {metrics.active_shipments_count > 0 && (
              <span style={{
                background: '#3b82f6',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 999,
              }}>
                {metrics.active_shipments_count} active
              </span>
            )}
          </button>

          <button
            onClick={() => changeTab('profile')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 24px',
              borderRadius: 14,
              border: activeTab === 'profile' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'profile' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(4, 120, 87, 0.15) 100%)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'profile' ? '#6ee7b7' : '#94a3b8',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Icon name="users" size={18} color={activeTab === 'profile' ? '#6ee7b7' : '#94a3b8'} />
            <span>Profile & Addresses</span>
          </button>
        </div>

        {/* ── TAB 1: ORDER HISTORY ────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div>
            {/* Filter Pills */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
              flexWrap: 'wrap',
              gap: 16,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Orders' },
                  { id: 'confirmed', label: 'Confirmed' },
                  { id: 'shipped', label: 'Shipped & In Transit' },
                  { id: 'completed', label: 'Completed' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOrderStatusFilter(f.id)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: orderStatusFilter === f.id ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: orderStatusFilter === f.id ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: orderStatusFilter === f.id ? '#fbbf24' : '#94a3b8',
                      transition: 'all 0.15s',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 13, color: '#64748b' }}>
                Showing <strong style={{ color: '#e2e8f0' }}>{filteredOrders.length}</strong> of {orders.length} total orders
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
                <div style={{
                  width: 48,
                  height: 48,
                  border: '3px solid rgba(245, 158, 11, 0.2)',
                  borderTopColor: '#f59e0b',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite',
                }} />
                <p style={{ fontSize: 15, fontWeight: 600 }}>Loading royal order records...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              /* Empty State */
              <div style={{
                background: 'rgba(15, 18, 32, 0.6)',
                borderRadius: 24,
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                padding: '64px 24px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  color: '#fbbf24',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', margin: '0 0 8px' }}>
                  No Orders Found
                </h3>
                <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 420, margin: '0 auto 24px' }}>
                  {orderStatusFilter === 'all'
                    ? "You haven't placed any orders yet. Discover our flagship workstations, ultra-wide monitors, and accessories."
                    : `No orders matching filter "${orderStatusFilter}". Try viewing all orders.`}
                </p>
                <Link
                  to="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 28px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 8px 24px rgba(217, 119, 6, 0.3)',
                  }}
                >
                  <span>Explore Ngus Catalog</span>
                  <Icon name="chevronRight" size={16} color="#ffffff" />
                </Link>
              </div>
            ) : (
              /* Order List */
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
                  let statusColor = '#fbbf24';
                  let statusLabel = 'Confirmed';

                  if (order.status === 'completed' || firstShipment?.status === 'delivered') {
                    statusBg = 'rgba(16, 185, 129, 0.15)';
                    statusBorder = 'rgba(16, 185, 129, 0.35)';
                    statusColor = '#34d399';
                    statusLabel = 'Delivered & Complete';
                  } else if (order.status === 'shipped' || firstShipment?.status === 'shipped') {
                    statusBg = 'rgba(59, 130, 246, 0.15)';
                    statusBorder = 'rgba(59, 130, 246, 0.35)';
                    statusColor = '#60a5fa';
                    statusLabel = 'In Transit';
                  } else if (firstShipment?.status === 'packed') {
                    statusBg = 'rgba(245, 158, 11, 0.15)';
                    statusBorder = 'rgba(245, 158, 11, 0.35)';
                    statusColor = '#fbbf24';
                    statusLabel = 'Packed & Quality Verified';
                  }

                  return (
                    <div
                      key={order.id}
                      style={{
                        background: 'rgba(15, 18, 32, 0.8)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: 20,
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
                        overflow: 'hidden',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      {/* Order Card Header */}
                      <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>
                              {order.order_number}
                            </span>
                            <button
                              onClick={() => handleCopy(order.order_number, 'Order reference')}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: copiedCode === order.order_number ? '#34d399' : '#64748b',
                                cursor: 'pointer',
                                padding: 2,
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title="Copy Order Number"
                            >
                              {copiedCode === order.order_number ? (
                                <Icon name="check" size={14} color="#34d399" />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            Placed on {formattedDate}
                          </div>
                        </div>

                        {/* Status Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: 999,
                            background: statusBg,
                            border: `1px solid ${statusBorder}`,
                            color: statusColor,
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                            {statusLabel}
                          </span>

                          <span style={{
                            padding: '4px 12px',
                            borderRadius: 999,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#cbd5e1',
                            fontSize: 12,
                            fontWeight: 600,
                          }}>
                            {order.fulfillment_type === 'delivery' ? 'Express Courier' : 'Store Collection'}
                          </span>
                        </div>
                      </div>

                      {/* Items Preview List */}
                      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {order.items?.map((item) => {
                          const product = item.product || item.product_variant?.product;
                          const image = product?.images?.[0]?.image_path || '/images/products/sample.png';

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                                paddingBottom: 14,
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: 12,
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
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
                                  <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                                    {item.product_name_snapshot}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                    Qty: <strong style={{ color: '#e2e8f0' }}>{Math.round(item.quantity_ordered)}</strong> × {parseFloat(item.unit_price).toLocaleString()} ETB
                                    {item.sku_snapshot && <span style={{ marginLeft: 8, color: '#64748b' }}>• SKU: {item.sku_snapshot}</span>}
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>
                                  {parseFloat(item.line_total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Order Footer & Actions */}
                      <div style={{
                        padding: '16px 24px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}>
                        {/* Delivery address snapshot preview */}
                        <div style={{ fontSize: 13, color: '#94a3b8', maxWidth: 420 }}>
                          <span style={{ color: '#64748b' }}>Destination: </span>
                          <strong style={{ color: '#cbd5e1' }}>
                            {order.shipping_address?.address_line_1 || order.customer?.display_name || 'Addis Ababa'}
                          </strong>
                          {firstShipment?.tracking_number && (
                            <div style={{ marginTop: 4, fontSize: 12, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Icon name="truck" size={13} color="#60a5fa" />
                              <span>Tracking: <strong>{firstShipment.tracking_number}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Grand Total & Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'right', marginRight: 8 }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>
                              Grand Total
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>
                              {parseFloat(order.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: 12 }}>ETB</span>
                            </div>
                          </div>

                          {/* Track button if shipment exists */}
                          {firstShipment && (
                            <button
                              onClick={() => trackSpecificShipment(firstShipment.tracking_number)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '9px 18px',
                                borderRadius: 10,
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                color: '#93c5fd',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                              }}
                            >
                              <Icon name="truck" size={15} color="#93c5fd" />
                              <span>Track Package</span>
                            </button>
                          )}

                          {/* Digital Receipt Modal Button */}
                          <button
                            onClick={() => setReceiptOrder(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '9px 18px',
                              borderRadius: 10,
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#ffffff',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)';
                              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                              e.currentTarget.style.color = '#fbbf24';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                          >
                            <Icon name="receipt" size={15} color="currentColor" />
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

        {/* ── TAB 2: LIVE SHIPPING & PACKAGE TRACKING ─────────────────────── */}
        {activeTab === 'tracking' && (
          <div>
            {/* Tracking Search Form */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(20, 25, 42, 0.8) 0%, rgba(12, 15, 26, 0.9) 100%)',
              borderRadius: 22,
              padding: '28px 32px',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35)',
              marginBottom: 36,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                }}>
                  <Icon name="truck" size={18} color="#60a5fa" />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Real-Time Consignment & Parcel Tracking
                </h2>
              </div>
              <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: 13 }}>
                Locate any consignment by entering its <strong>Tracking Number</strong> (e.g. <code>NGS-TRK-...</code>), <strong>Order Number</strong> (<code>NGS-ORD-...</code>), or registered phone number.
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
                      padding: '14px 18px',
                      borderRadius: 12,
                      background: 'rgba(7, 9, 18, 0.85)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      color: '#ffffff',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#60a5fa';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.35)';
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={trackingLoading}
                  style={{
                    padding: '14px 28px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: trackingLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  {trackingLoading ? (
                    <>
                      <div style={{
                        width: 16,
                        height: 16,
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      <span>Tracking...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="search" size={16} color="#ffffff" />
                      <span>Track Consignment</span>
                    </>
                  )}
                </button>
              </form>

              {trackingError && (
                <div style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Icon name="alert" size={16} color="#ef4444" />
                  <span>{trackingError}</span>
                </div>
              )}
            </div>

            {/* If a specific shipment is found from search */}
            {searchedTracking && (
              <div style={{
                background: 'rgba(15, 18, 32, 0.85)',
                borderRadius: 22,
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '28px',
                marginBottom: 36,
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Verified Consignment Detail
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <h3 style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', margin: 0 }}>
                        {searchedTracking.tracking_number}
                      </h3>
                      <button
                        onClick={() => handleCopy(searchedTracking.tracking_number, 'Tracking number')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: copiedCode === searchedTracking.tracking_number ? '#34d399' : '#64748b',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        {copiedCode === searchedTracking.tracking_number ? (
                          <Icon name="check" size={16} color="#34d399" />
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
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      Carrier Provider
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                      {searchedTracking.shipping_provider}
                    </div>
                  </div>
                </div>

                {/* 4-Stage Stepper Progress Tracker */}
                <div style={{
                  padding: '24px 16px',
                  background: 'rgba(7, 9, 18, 0.6)',
                  borderRadius: 16,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  marginBottom: 28,
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 20,
                    position: 'relative',
                  }}>
                    {searchedTracking.timeline?.map((step, idx) => {
                      const isCompleted = step.status === 'completed';
                      const isInTransit = step.status === 'in_transit' || step.status === 'processing';

                      return (
                        <div key={idx} style={{ position: 'relative', display: 'flex', gap: 14 }}>
                          {/* Circle indicator */}
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: isCompleted ? '#10b981' : isInTransit ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: isInTransit ? '0 0 16px rgba(59, 130, 246, 0.5)' : 'none',
                          }}>
                            {isCompleted ? (
                              <Icon name="check" size={16} color="#ffffff" />
                            ) : (
                              <span>{step.step}</span>
                            )}
                          </div>

                          <div>
                            <div style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: isCompleted ? '#34d399' : isInTransit ? '#60a5fa' : '#94a3b8',
                              marginBottom: 3,
                            }}>
                              {step.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginBottom: 4 }}>
                              {step.description}
                            </div>
                            <div style={{ fontSize: 11, color: isCompleted || isInTransit ? '#cbd5e1' : '#475569', fontWeight: 600 }}>
                              {step.timestamp}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recipient & Address Detail */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 14,
                  fontSize: 13,
                }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Recipient: </span>
                    <strong style={{ color: '#ffffff' }}>{searchedTracking.recipient_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Contact Phone: </span>
                    <strong style={{ color: '#ffffff' }}>{searchedTracking.recipient_phone}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Delivery Snapshot: </span>
                    <strong style={{ color: '#ffffff' }}>{searchedTracking.delivery_address_snapshot}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Active User Shipments List */}
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', margin: '0 0 16px' }}>
              Your Registered Consignments ({shipments.length})
            </h3>

            {shipments.length === 0 ? (
              <div style={{
                background: 'rgba(15, 18, 32, 0.5)',
                borderRadius: 20,
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                padding: '48px 24px',
                textAlign: 'center',
                color: '#94a3b8',
              }}>
                <Icon name="truck" size={36} color="#64748b" />
                <p style={{ margin: '16px 0 0', fontSize: 14 }}>
                  No active courier shipments on file. Delivery orders automatically generate tracking numbers here upon confirmation.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {shipments.map((shp) => (
                  <div
                    key={shp.id}
                    style={{
                      background: 'rgba(15, 18, 32, 0.7)',
                      borderRadius: 18,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa' }}>
                          {shp.tracking_number}
                        </span>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: shp.status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          border: shp.status === 'delivered' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                          color: shp.status === 'delivered' ? '#34d399' : '#93c5fd',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}>
                          {shp.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>
                        Carrier: <strong style={{ color: '#e2e8f0' }}>{shp.shipping_provider}</strong> • Destination: {shp.delivery_address_snapshot}
                      </div>
                    </div>

                    <button
                      onClick={() => handleTrackLookup(shp.tracking_number)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 10,
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        color: '#93c5fd',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Icon name="truck" size={14} color="#93c5fd" />
                      <span>Inspect Progress</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: PROFILE & ADDRESSES ──────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}>
            {/* Patron Profile Card */}
            <div style={{
              background: 'rgba(15, 18, 32, 0.8)',
              borderRadius: 22,
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 900,
                  color: '#ffffff',
                }}>
                  {customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>
                    {customerName}
                  </h3>
                  <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700 }}>
                    {metrics.membership_tier}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ color: '#64748b' }}>Account Email</span>
                  <strong style={{ color: '#e2e8f0' }}>{customerEmail}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ color: '#64748b' }}>Customer Code</span>
                  <strong style={{ color: '#fbbf24' }}>{profileData?.customer?.customer_code || 'NGS-VIP-CUST'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ color: '#64748b' }}>Verified Phone</span>
                  <strong style={{ color: '#e2e8f0' }}>{profileData?.customer?.phone || '+251 (Direct linked)'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>System Privileges</span>
                  <strong style={{ color: '#34d399' }}>Self-Checkout & Express Delivery</strong>
                </div>
              </div>
            </div>

            {/* VIP Concierge Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(22, 27, 46, 0.8) 0%, rgba(13, 16, 28, 0.9) 100%)',
              borderRadius: 22,
              padding: '28px',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                }}>
                  <Icon name="shield" size={18} color="#fbbf24" />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Imperial Concierge & Support
                </h3>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>
                Require bespoke workstation configurations, commercial invoice seals, or warranty assistance? Our Addis Ababa technical direct line is available 24/7.
              </p>

              <div style={{
                background: 'rgba(7, 9, 18, 0.6)',
                borderRadius: 14,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                fontSize: 13,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>VIP Hotline: <strong>+251 911 00 22 33</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>Concierge Email: <strong>vip@ngus-electronics.et</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0' }}>
                  <Icon name="store" size={16} color="#34d399" />
                  <span>Flagship Vault: <strong>Bole Medhanialem Tower, Suite 400</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── DIGITAL INVOICE / RECEIPT MODAL ──────────────────────────────── */}
      {receiptOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: '#0d101d',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 24,
            maxWidth: 640,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 32,
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            position: 'relative',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setReceiptOrder(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <Icon name="x" size={16} color="#ffffff" />
            </button>

            {/* Receipt Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 24, marginBottom: 24 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  <path d="M5 19h14" />
                </svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', margin: '0 0 4px', letterSpacing: '0.04em' }}>
                NGUS ELECTRONICS
              </h2>
              <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Official Commercial Receipt
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Bole Sub-City, Addis Ababa, Ethiopia • TIN: 0098451239
              </div>
            </div>

            {/* Order & Customer Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13, marginBottom: 24 }}>
              <div>
                <div style={{ color: '#64748b' }}>Order Reference:</div>
                <div style={{ fontWeight: 800, color: '#ffffff' }}>{receiptOrder.order_number}</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Date Authorized:</div>
                <div style={{ fontWeight: 700, color: '#ffffff' }}>
                  {new Date(receiptOrder.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Billed Client:</div>
                <div style={{ fontWeight: 700, color: '#ffffff' }}>{customerName}</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Payment Mode:</div>
                <div style={{ fontWeight: 700, color: '#fbbf24' }}>
                  {receiptOrder.direct_payment?.payment_method?.name || 'Mobile Banking Verified'}
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px 0', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <th style={{ paddingBottom: 8 }}>Item Description</th>
                    <th style={{ paddingBottom: 8, textAlign: 'center' }}>Qty</th>
                    <th style={{ paddingBottom: 8, textAlign: 'right' }}>Unit Price</th>
                    <th style={{ paddingBottom: 8, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptOrder.items?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '10px 0', color: '#ffffff', fontWeight: 600 }}>
                        {item.product_name_snapshot}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'center', color: '#cbd5e1' }}>
                        {Math.round(item.quantity_ordered)}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', color: '#cbd5e1' }}>
                        {parseFloat(item.unit_price).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', color: '#fbbf24', fontWeight: 700 }}>
                        {parseFloat(item.line_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Subtotal</span>
                <span>{parseFloat(receiptOrder.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Shipping & Fragile Handling</span>
                <span>{parseFloat(receiptOrder.shipping_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>VAT (Included)</span>
                <span>{parseFloat(receiptOrder.tax_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 10,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: 17,
                fontWeight: 900,
                color: '#fbbf24',
              }}>
                <span>Total Settled</span>
                <span>{parseFloat(receiptOrder.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</span>
              </div>
            </div>

            {/* Receipt Modal Footer Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
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
                  padding: '10px 20px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: 13,
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
