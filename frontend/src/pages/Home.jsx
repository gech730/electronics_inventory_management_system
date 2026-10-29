import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../api/client';
import Modal from '../components/Modal';

export const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, login, register, logout } = useAuth();
  const { addToCart, setIsCartOpen, totalCount } = useCart();

  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [addedItemNotice, setAddedItemNotice] = useState(null);

  // Auth Enforcement Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalPendingItem, setAuthModalPendingItem] = useState(null);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Inquiry Modal State
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [selectedProductForInquiry, setSelectedProductForInquiry] = useState(null);
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    inquiry_type: 'retail',
    notes: '',
  });
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  // Order Tracking Modal State
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackingError, setTrackingError] = useState('');

  // Load real catalog data from backend API
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setLoading(true);
        const prodRes = await api.getProducts({ per_page: 50 }).catch(() => ({ data: [] }));
        const rawProds = Array.isArray(prodRes) ? prodRes : prodRes?.data || [];
        setProducts(rawProds);
      } catch (err) {
        console.error('Failed to load public showcase data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, []);

  const handleOpenInquiry = (product = null) => {
    setSelectedProductForInquiry(product);
    setInquirySubmitted(false);
    setIsInquiryModalOpen(true);
  };

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    setInquirySubmitted(true);
    setTimeout(() => {
      setIsInquiryModalOpen(false);
      setInquirySubmitted(false);
      setInquiryForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        inquiry_type: 'retail',
        notes: '',
      });
    }, 2000);
  };

  const handleAddToCartWithFeedback = (item) => {
    if (!isAuthenticated) {
      setAuthModalPendingItem(item);
      setAuthError('');
      setIsAuthModalOpen(true);
      return;
    }

    addToCart(item);
    setAddedItemNotice(item.id);
    setTimeout(() => {
      setAddedItemNotice(null);
    }, 1800);
  };

  const handleAuthModalLogin = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      await login(authEmail, authPassword);
      setIsAuthModalOpen(false);
      if (authModalPendingItem) {
        addToCart(authModalPendingItem);
        setAddedItemNotice(authModalPendingItem.id);
        setTimeout(() => setAddedItemNotice(null), 1800);
        setAuthModalPendingItem(null);
      }
    } catch (err) {
      setAuthError(err.data?.message || err.message || 'Login failed. Please check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthModalRegister = async (e) => {
    e.preventDefault();
    if (!authName || !authEmail || !authPassword) {
      setAuthError('Please fill in all required fields.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (authPassword !== authPasswordConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      await register({
        name: authName,
        email: authEmail,
        phone: authPhone || undefined,
        password: authPassword,
        password_confirmation: authPasswordConfirm,
      });
      setIsAuthModalOpen(false);
      if (authModalPendingItem) {
        addToCart(authModalPendingItem);
        setAddedItemNotice(authModalPendingItem.id);
        setTimeout(() => setAddedItemNotice(null), 1800);
        setAuthModalPendingItem(null);
      }
    } catch (err) {
      const vErrors = err.data?.errors;
      if (vErrors) {
        const first = Object.values(vErrors)[0];
        setAuthError(Array.isArray(first) ? first[0] : first);
      } else {
        setAuthError(err.data?.message || err.message || 'Registration failed.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTrackOrderSubmit = async (e) => {
    e.preventDefault();
    if (!trackingQuery.trim()) return;

    setTrackingLoading(true);
    setTrackingError('');
    setTrackedOrder(null);

    try {
      const res = await api.getOrders({ search: trackingQuery.trim() });
      const orders = Array.isArray(res) ? res : res?.data || [];
      if (orders.length > 0) {
        setTrackedOrder(orders[0]);
      } else {
        setTrackingError('No matching order found for this reference or phone. Please verify your order number.');
      }
    } catch (err) {
      setTrackingError('Could not locate order details. Please verify your input.');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Find dynamic matching products from DB or fallback to reference defaults
  const dbLaptop = products.find((p) => {
    const n = (p.name || '').toLowerCase();
    return n.includes('macbook') || n.includes('laptop') || p.category_id === 2;
  });

  const dbPhone = products.find((p) => {
    const n = (p.name || '').toLowerCase();
    return n.includes('iphone') || n.includes('galaxy') || n.includes('phone') || p.category_id === 1;
  });

  const dbAccessory = products.find((p) => {
    const n = (p.name || '').toLowerCase();
    return n.includes('watch') || n.includes('headphone') || n.includes('buds') || p.category_id === 3;
  });

  // Featured 3 main showcase cards (100% matched to reference image)
  const featuredCards = [
    {
      id: dbLaptop?.id || 1,
      category: 'LAPTOP',
      categoryColor: '#c084fc',
      name: dbLaptop?.name || 'Aurora 16 Pro',
      specs: ['Core Ultra 9', '32GB RAM', '1TB SSD', '16" OLED'],
      price: dbLaptop?.selling_price ? `ETB ${Number(dbLaptop.selling_price).toLocaleString()}` : 'ETB 219,900',
      raw_price: dbLaptop?.selling_price || 219900,
      image_url: dbLaptop?.image_url || null,
      type: 'laptop',
      sku: dbLaptop?.sku || 'NGS-LAPTOP-PRO',
    },
    {
      id: dbPhone?.id || 2,
      category: 'SMARTPHONE',
      categoryColor: '#fb923c',
      name: dbPhone?.name || 'Nova X Ultra',
      specs: ['6.8" AMOLED', '256GB', '200MP camera', '5G'],
      price: dbPhone?.selling_price ? `ETB ${Number(dbPhone.selling_price).toLocaleString()}` : 'ETB 149,900',
      raw_price: dbPhone?.selling_price || 149900,
      image_url: dbPhone?.image_url || null,
      type: 'phone',
      sku: dbPhone?.sku || 'NGS-PHONE-ULTRA',
    },
    {
      id: dbAccessory?.id || 3,
      category: 'ACCESSORY',
      categoryColor: '#c084fc',
      name: dbAccessory?.name || 'Echo Max Headphones',
      specs: ['Active noise cancelling', '40h battery', 'Bluetooth 5.3'],
      price: dbAccessory?.selling_price ? `ETB ${Number(dbAccessory.selling_price).toLocaleString()}` : 'ETB 24,900',
      raw_price: dbAccessory?.selling_price || 24900,
      image_url: dbAccessory?.image_url || null,
      type: 'headphones',
      sku: dbAccessory?.sku || 'NGS-ACC-ECHO',
    },
  ];

  // 3 "Trending now" items (100% matched to reference image)
  const trendingItems = [
    {
      id: 'trend-watch',
      name: 'Pulse Watch S2',
      specs: 'AMOLED • GPS • 7-day battery',
      price: 'ETB 18,500',
      raw_price: 18500,
      gradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
      shape: 'rounded-square',
    },
    {
      id: 'trend-tablet',
      name: 'Slate 12 Pro Tablet',
      specs: '12.4" OLED • 256GB • Stylus',
      price: 'ETB 64,900',
      raw_price: 64900,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
      shape: 'rect',
    },
    {
      id: 'trend-buds',
      name: 'Echo Buds Pro',
      specs: 'ANC • 30h case • IPX5',
      price: 'ETB 12,900',
      raw_price: 12900,
      gradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
      shape: 'buds',
    },
  ];

  // Filtered public products
  const filteredProducts = products.filter((p) => {
    const matchCat =
      catalogCategory === 'all'
        ? true
        : catalogCategory === 'laptops'
        ? (p.name || '').toLowerCase().includes('macbook') || (p.name || '').toLowerCase().includes('laptop') || p.category_id === 2
        : catalogCategory === 'phones'
        ? (p.name || '').toLowerCase().includes('iphone') || (p.name || '').toLowerCase().includes('galaxy') || (p.name || '').toLowerCase().includes('phone') || p.category_id === 1
        : catalogCategory === 'accessories'
        ? (p.name || '').toLowerCase().includes('watch') || (p.name || '').toLowerCase().includes('headphone') || (p.name || '').toLowerCase().includes('buds') || p.category_id === 3
        : true;

    const matchSearch =
      !catalogSearch ||
      (p.name || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(catalogSearch.toLowerCase());

    return matchCat && matchSearch;
  });

  return (
    <div
      style={{
        background: '#070810',
        color: '#f8fafc',
        minHeight: '100vh',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* 🌌 Atmospheric Nebulas & Ambient Light Orbs (100% matching Homepage@1x.png) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '5%',
          width: '650px',
          height: '650px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(59, 7, 100, 0.16) 45%, transparent 75%)',
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(80px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '5%',
          right: '5%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(90px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          right: '25%',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#818cf8',
          boxShadow: '0 0 16px 4px rgba(129, 140, 248, 0.8)',
          pointerEvents: 'none',
        }}
      />

      {/* 🚀 FLOATING PILL NAVBAR (100% Match to Homepage@1x.png with Functional Bag & Tracking) */}
      <header style={{ padding: '22px 24px 0', position: 'relative', zIndex: 50 }}>
        <nav
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            borderRadius: '9999px',
            background: 'rgba(17, 21, 33, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Brand Emblem: Golden Crown + NGUS ELECTRONICS */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span style={{ fontSize: '1.25rem', color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
              👑
            </span>
            <span
              style={{
                fontSize: '1.05rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: '#ffffff',
                marginLeft: 10,
              }}
            >
              NGUS
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                letterSpacing: '0.16em',
                color: '#64748b',
                fontWeight: 600,
                marginLeft: 8,
                textTransform: 'uppercase',
              }}
            >
              ELECTRONICS
            </span>
          </Link>

          {/* Center Navigation Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              fontSize: '0.86rem',
              fontWeight: 500,
            }}
          >
            <a href="#featured" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.target.style.color = '#ffffff')} onMouseLeave={(e) => (e.target.style.color = '#cbd5e1')}>
              Laptops
            </a>
            <a href="#featured" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.target.style.color = '#ffffff')} onMouseLeave={(e) => (e.target.style.color = '#cbd5e1')}>
              Smartphones
            </a>
            <a href="#collection" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.target.style.color = '#ffffff')} onMouseLeave={(e) => (e.target.style.color = '#cbd5e1')}>
              Catalog
            </a>
            <a href="#trending" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.target.style.color = '#ffffff')} onMouseLeave={(e) => (e.target.style.color = '#cbd5e1')}>
              Deals
            </a>
            <Link
              to="/tracking"
              style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                fontSize: '0.86rem',
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#60a5fa')}
              onMouseLeave={(e) => (e.target.style.color = '#cbd5e1')}
            >
              Track Order
            </Link>
            {isAuthenticated && user?.role === 'customer' && (
              <Link
                to="/customer/dashboard"
                style={{
                  color: '#fbbf24',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.target.style.opacity = '1')}
              >
                <span>👑</span>
                <span>My Orders</span>
              </Link>
            )}
            <button
              onClick={() => handleOpenInquiry()}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontSize: '0.86rem',
                fontWeight: 500,
                padding: 0,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.target.style.color = '#cbd5e1')}
            >
              Support
            </button>
          </div>

          {/* Right Controls: Bag + Login / User Console Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Customer Shopping Bag Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              style={{
                background: totalCount > 0 ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${totalCount > 0 ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)'}`,
                borderRadius: '9999px',
                padding: '7px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: totalCount > 0 ? '#f59e0b' : '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = totalCount > 0 ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)')}
            >
              <span>🛍️</span>
              <span>Bag</span>
              {totalCount > 0 && (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#090a0f',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    borderRadius: '9999px',
                    padding: '1px 7px',
                    minWidth: 18,
                    textAlign: 'center',
                  }}
                >
                  {totalCount}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {user?.role === 'customer' ? (
                  <Link
                    to="/customer/dashboard"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(180, 83, 9, 0.15) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      boxShadow: '0 0 16px rgba(245, 158, 11, 0.25)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#fbbf24';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                    }}
                    title="Open Customer Dashboard"
                  >
                    <span>👑</span>
                    <span style={{ maxWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.name?.split(' ')[0] || 'Client'}
                    </span>
                    <span style={{ fontSize: '0.70rem', color: '#fef08a' }}>• Portal</span>
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#090a0f',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      padding: '7px 18px',
                      borderRadius: '9999px',
                      textDecoration: 'none',
                      boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    <span>Console</span>
                  </Link>
                )}

                <button
                  onClick={() => logout()}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link
                  to="/login"
                  style={{
                    color: '#cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    padding: '6px 10px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.target.style.color = '#cbd5e1')}
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#090a0f',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    padding: '7px 20px',
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)',
                    transition: 'transform 0.2s, filter 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* ⚡ CENTERED HERO SECTION (100% Match to Homepage@1x.png) */}
      <section
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 920,
          margin: '64px auto 56px',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        {/* Top Flagship Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#e2e8f0',
            fontSize: '0.8rem',
            fontWeight: 500,
            marginBottom: 24,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
          <span>Flagship collection 2026</span>
        </div>

        {/* Hero Headline (Exact two-tone color from image) */}
        <h1
          style={{
            fontSize: '3.8rem',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.035em',
            margin: '0 auto 20px',
          }}
        >
          <span style={{ color: '#f59e0b' }}>Premium tech,</span> <br />
          <span style={{ color: '#818cf8' }}>engineered to inspire.</span>
        </h1>

        {/* Hero Subtitle */}
        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.6,
            color: '#94a3b8',
            maxWidth: 580,
            margin: '0 auto 34px',
          }}
        >
          Laptops, smartphones and accessories from the world's best brands, curated for people who expect more.
        </p>

        {/* Two Centered Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <a
            href="#collection"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
              color: '#090a0f',
              fontWeight: 800,
              fontSize: '0.92rem',
              padding: '13px 30px',
              borderRadius: '9999px',
              textDecoration: 'none',
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.35)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Shop the collection
          </a>

          <a
            href="#trending"
            style={{
              background: 'rgba(16, 20, 32, 0.85)',
              border: '1px solid rgba(167, 139, 250, 0.35)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.92rem',
              padding: '13px 30px',
              borderRadius: '9999px',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.8)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            View deals
          </a>
        </div>
      </section>

      {/* 🛍️ FEATURED 3-COLUMN SHOWCASE (100% Match to Homepage@1x.png) */}
      <section id="featured" style={{ maxWidth: 1180, margin: '0 auto 72px', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {featuredCards.map((card) => (
            <div
              key={card.id}
              style={{
                background: 'rgba(14, 18, 28, 0.82)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 25px rgba(99, 102, 241, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                {/* Device Screen / Showcase Frame */}
                <div
                  style={{
                    height: 200,
                    background: '#090b14',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 22,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* If product has Cloudinary image, display it with sleek presentation; else render exact neon hardware wallpaper from image */}
                  {card.image_url ? (
                    <img
                      src={card.image_url}
                      alt={card.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : card.type === 'laptop' ? (
                    // 100% Laptop graphic from Homepage@1x.png
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          width: 170,
                          height: 104,
                          borderRadius: '8px 8px 3px 3px',
                          border: '2px solid rgba(255, 255, 255, 0.25)',
                          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 35%, #ec4899 70%, #f97316 100%)',
                          boxShadow: '0 0 35px rgba(168, 85, 247, 0.45)',
                        }}
                      />
                      <div
                        style={{
                          width: 200,
                          height: 6,
                          borderRadius: '2px 2px 4px 4px',
                          background: '#1e293b',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          marginTop: 2,
                        }}
                      />
                    </div>
                  ) : card.type === 'phone' ? (
                    // 100% Smartphone graphic from Homepage@1x.png
                    <div
                      style={{
                        width: 76,
                        height: 142,
                        borderRadius: '20px',
                        border: '3px solid rgba(255, 255, 255, 0.3)',
                        background: 'linear-gradient(180deg, #f97316 0%, #fb923c 30%, #ec4899 70%, #8b5cf6 100%)',
                        boxShadow: '0 0 35px rgba(249, 115, 22, 0.45)',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 4,
                          borderRadius: '4px',
                          background: '#090b14',
                          position: 'absolute',
                          top: 4,
                          left: 'calc(50% - 12px)',
                        }}
                      />
                    </div>
                  ) : (
                    // 100% Headphones graphic from Homepage@1x.png
                    <div style={{ position: 'relative', width: 140, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* Headband arch */}
                      <div
                        style={{
                          width: 110,
                          height: 80,
                          borderRadius: '60px 60px 0 0',
                          border: '5px solid #4338ca',
                          borderBottom: 'none',
                          position: 'absolute',
                          top: 15,
                        }}
                      />
                      {/* Left earcup */}
                      <div
                        style={{
                          width: 32,
                          height: 52,
                          borderRadius: '16px',
                          background: 'linear-gradient(180deg, #c084fc 0%, #818cf8 100%)',
                          boxShadow: '0 0 25px rgba(192, 132, 252, 0.5)',
                          position: 'absolute',
                          bottom: 15,
                          left: 14,
                        }}
                      />
                      {/* Right earcup */}
                      <div
                        style={{
                          width: 32,
                          height: 52,
                          borderRadius: '16px',
                          background: 'linear-gradient(180deg, #c084fc 0%, #818cf8 100%)',
                          boxShadow: '0 0 25px rgba(192, 132, 252, 0.5)',
                          position: 'absolute',
                          bottom: 15,
                          right: 14,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Category Pill Tag */}
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: card.categoryColor,
                    marginBottom: 6,
                  }}
                >
                  {card.category}
                </div>

                {/* Product Title */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: 14 }}>
                  {card.name}
                </h3>

                {/* Hardware Specs Pills (100% matching image) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
                  {card.specs.map((spec, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        padding: '4px 9px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#cbd5e1',
                      }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom: Price in bold gold & Functional Add to Cart button */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b' }}>
                  {card.price}
                </div>

                <button
                  onClick={() =>
                    handleAddToCartWithFeedback({
                      id: card.id,
                      name: card.name,
                      selling_price: card.raw_price,
                      image_url: card.image_url,
                      sku: card.sku,
                      category: card.category,
                    })
                  }
                  style={{
                    background:
                      addedItemNotice === card.id
                        ? 'rgba(16, 185, 129, 0.25)'
                        : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${
                      addedItemNotice === card.id ? '#10b981' : 'rgba(255, 255, 255, 0.16)'
                    }`,
                    color: addedItemNotice === card.id ? '#10b981' : '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (addedItemNotice !== card.id) {
                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)';
                      e.currentTarget.style.borderColor = '#f59e0b';
                      e.currentTarget.style.color = '#f59e0b';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (addedItemNotice !== card.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                >
                  {addedItemNotice === card.id ? '✓ In Bag' : 'Add to cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🚀 "Trending now" SECTION (100% Match to Homepage@1x.png) */}
      <section id="trending" style={{ maxWidth: 1180, margin: '0 auto 80px', padding: '0 24px' }}>
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
            Trending now
          </h2>
          <a
            href="#collection"
            style={{
              color: '#f59e0b',
              fontSize: '0.86rem',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.target.style.opacity = '1')}
          >
            See all products &rarr;
          </a>
        </div>

        {/* 3 Horizontal Mini Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {trendingItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'rgba(14, 18, 28, 0.82)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '18px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                {/* Graphic Icon Thumbnail */}
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '12px',
                    background: '#090b14',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.shape === 'rounded-square' ? (
                    <div
                      style={{
                        width: 28,
                        height: 32,
                        borderRadius: '8px',
                        background: item.gradient,
                        boxShadow: '0 0 12px rgba(249, 115, 22, 0.5)',
                      }}
                    />
                  ) : item.shape === 'rect' ? (
                    <div
                      style={{
                        width: 34,
                        height: 24,
                        borderRadius: '4px',
                        background: item.gradient,
                        boxShadow: '0 0 12px rgba(168, 85, 247, 0.5)',
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ width: 10, height: 20, borderRadius: '6px', background: item.gradient }} />
                      <div style={{ width: 10, height: 20, borderRadius: '6px', background: item.gradient }} />
                    </div>
                  )}
                </div>

                {/* Title, Specs & Price */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', marginBottom: 2 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.specs}
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#f59e0b' }}>
                    {item.price}
                  </div>
                </div>
              </div>

              {/* Add to Bag Action */}
              <button
                onClick={() =>
                  handleAddToCartWithFeedback({
                    id: item.id,
                    name: item.name,
                    selling_price: item.raw_price,
                    image_url: null,
                    sku: `NGS-${item.id.toUpperCase()}`,
                    category: 'Trending',
                  })
                }
                style={{
                  background: addedItemNotice === item.id ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.12)',
                  border: `1px solid ${addedItemNotice === item.id ? '#10b981' : 'rgba(245, 158, 11, 0.3)'}`,
                  color: addedItemNotice === item.id ? '#10b981' : '#f59e0b',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {addedItemNotice === item.id ? '✓ In Bag' : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 👑 FULL HARDWARE COLLECTION & LIVE CATALOG SECTION (Functional & Shoppable) */}
      <section id="collection" style={{ maxWidth: 1180, margin: '0 auto 100px', padding: '0 24px' }}>
        {/* Section Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem', color: '#f59e0b' }}>👑</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b' }}>
              Genuine Royal Inventory
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                Imperial Hardware Collection
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: 4 }}>
                Instant live reservation with Telebirr, CBE Birr, Card, or Cash on Delivery.
              </p>
            </div>

            {/* Filter Pills & Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search MacBook, iPhone, SKU..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  padding: '8px 18px',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  outline: 'none',
                  minWidth: 220,
                }}
              />

              <div style={{ display: 'flex', gap: 6, background: 'rgba(255, 255, 255, 0.03)', padding: '4px', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'laptops', label: 'Laptops' },
                  { id: 'phones', label: 'Phones' },
                  { id: 'accessories', label: 'Accessories' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCatalogCategory(tab.id)}
                    style={{
                      background: catalogCategory === tab.id ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'transparent',
                      color: catalogCategory === tab.id ? '#090a0f' : '#94a3b8',
                      fontWeight: catalogCategory === tab.id ? 800 : 500,
                      fontSize: '0.78rem',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '5px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚡</div>
            <p>Loading Ngus flagship inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(14, 18, 28, 0.6)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.94rem' }}>No products matching "{catalogSearch}".</p>
            <button
              onClick={() => { setCatalogSearch(''); setCatalogCategory('all'); }}
              style={{ marginTop: 12, background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: '9999px', padding: '6px 16px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {filteredProducts.map((p) => {
              const inBag = addedItemNotice === p.id;
              const priceVal = Number(p.selling_price || 0);

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'rgba(14, 18, 28, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                    e.currentTarget.style.boxShadow = '0 16px 36px -10px rgba(0, 0, 0, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    {/* Image / Graphic Display */}
                    <div
                      style={{
                        height: 160,
                        borderRadius: '14px',
                        background: '#090b14',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                        position: 'relative',
                      }}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '2.5rem' }}>⚡</span>
                        </div>
                      )}

                      {/* Stock Pill Badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: 'rgba(9, 12, 20, 0.85)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#10b981',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        ✓ In Stock ({p.quantity ?? 10})
                      </span>
                    </div>

                    {/* Category & SKU */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.68rem', color: '#a855f7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {typeof p.category === 'object' ? p.category?.name : (p.category || 'Hardware')}
                      </span>
                      <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                        {p.sku || 'NGS-HW'}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: 10, lineHeight: 1.3 }}>
                      {p.name}
                    </h4>
                  </div>

                  {/* Price & Actions */}
                  <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.07)' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f59e0b', marginBottom: 12 }}>
                      ETB {priceVal.toLocaleString()}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleAddToCartWithFeedback({
                          id: p.id,
                          name: p.name,
                          selling_price: priceVal,
                          image_url: p.image_url,
                          sku: p.sku,
                          category: p.category,
                        })}
                        style={{
                          flex: 1,
                          background: inBag ? 'rgba(16, 185, 129, 0.25)' : 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                          border: inBag ? '1px solid #10b981' : 'none',
                          color: inBag ? '#10b981' : '#090a0f',
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          padding: '9px 14px',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {inBag ? '✓ In Bag' : 'Add to Bag'}
                      </button>

                      <button
                        onClick={() => handleOpenInquiry({ name: p.name, price: `ETB ${priceVal.toLocaleString()}` })}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1',
                          padding: '9px 12px',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                        title="Corporate quote"
                      >
                        Quote
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 👑 MINIMALIST CLEAN FOOTER (100% Match to Homepage@1x.png) */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '34px 24px 44px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          {/* Left: Crown Icon + NGUS */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', color: '#f59e0b' }}>👑</span>
            <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '0.08em', color: '#ffffff', marginLeft: 8 }}>
              NGUS
            </span>
          </div>

          {/* Center Links: Shop, Support, About, Track, Contact */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: '0.86rem', color: '#94a3b8' }}>
            <a href="#featured" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.target.style.color = '#ffffff')} onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}>
              Shop
            </a>
            <button
              onClick={() => setIsTrackingModalOpen(true)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.86rem', padding: 0 }}
              onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
            >
              Track Order
            </button>
            <button
              onClick={() => handleOpenInquiry()}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.86rem', padding: 0 }}
              onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
            >
              Support
            </button>
            <a href="#trending" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.target.style.color = '#ffffff')} onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}>
              About
            </a>
            <button
              onClick={() => handleOpenInquiry()}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.86rem', padding: 0 }}
              onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
            >
              Contact
            </button>
          </div>

          {/* Right: Copyright */}
          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
            © 2026 Ngus Electronics • Royal Technology Standards
          </div>
        </div>
      </footer>

      {/* 📦 Live Customer Order Tracking Modal */}
      <Modal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        title="Track Your Order | Ngus Electronics"
        size="md"
      >
        <div style={{ padding: '4px 0' }}>
          <form onSubmit={handleTrackOrderSubmit} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Enter Order # (e.g. ORD-...) or Phone"
              value={trackingQuery}
              onChange={(e) => setTrackingQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={trackingLoading}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                color: '#090a0f',
                fontWeight: 800,
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: trackingLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {trackingLoading ? 'Searching...' : 'Track'}
            </button>
          </form>

          {trackingError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                fontSize: '0.84rem',
                marginBottom: 16,
              }}
            >
              {trackingError}
            </div>
          )}

          {trackedOrder && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Order Reference</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b' }}>
                    {trackedOrder.order_number}
                  </div>
                </div>

                <div
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background:
                      trackedOrder.status === 'completed'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color: trackedOrder.status === 'completed' ? '#10b981' : '#f59e0b',
                    border: `1px solid ${
                      trackedOrder.status === 'completed' ? '#10b981' : '#f59e0b'
                    }`,
                  }}
                >
                  {trackedOrder.status}
                </div>
              </div>

              {/* Step indicator */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '20px 0', textAlign: 'center' }}>
                {[
                  { step: '1', title: 'Placed', active: true },
                  { step: '2', title: 'Confirmed', active: ['confirmed', 'processing', 'shipped', 'completed'].includes(trackedOrder.status) },
                  { step: '3', title: 'Dispatch', active: ['shipped', 'completed'].includes(trackedOrder.status) },
                  { step: '4', title: 'Delivered', active: trackedOrder.status === 'completed' },
                ].map((s, idx) => (
                  <div key={idx}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: s.active ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
                        color: s.active ? '#090a0f' : '#94a3b8',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 6px',
                      }}
                    >
                      {s.step}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: s.active ? '#ffffff' : '#64748b', fontWeight: 600 }}>
                      {s.title}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6, marginTop: 14 }}>
                <div><strong>Customer:</strong> {trackedOrder.customer?.display_name || 'Retail Client'}</div>
                <div><strong>Fulfillment:</strong> {trackedOrder.fulfillment_type || 'Delivery'}</div>
                <div><strong>Total Amount:</strong> ETB {Number(trackedOrder.grand_total || 0).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 👑 Interactive Inquiry / Quote Request Modal */}
      <Modal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        title={selectedProductForInquiry ? `Inquire: ${selectedProductForInquiry.name}` : 'Ngus Electronics Enterprise RFQ & Quote'}
        size="md"
      >
        {inquirySubmitted ? (
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>👑</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginBottom: 8 }}>
              Inquiry Received
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Thank you for choosing Ngus Electronics. Our product specialist will contact your phone/email shortly with verified pricing and availability.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInquirySubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Dawit Kebede"
                  value={inquiryForm.name}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  placeholder="+251 912 345678"
                  value={inquiryForm.phone}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="dawit@company.com"
                  value={inquiryForm.email}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Company / Organization</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Optional corporate name"
                  value={inquiryForm.company}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, company: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Inquiry Type</label>
              <select
                className="form-select"
                value={inquiryForm.inquiry_type}
                onChange={(e) => setInquiryForm({ ...inquiryForm, inquiry_type: e.target.value })}
              >
                <option value="retail">Single Retail Device Purchase</option>
                <option value="corporate">Corporate Bulk Hardware Procurement</option>
                <option value="showroom">Private Showroom Demo Booking</option>
                <option value="warranty">Warranty & Royal RMA Service</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Hardware Notes & Details</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={selectedProductForInquiry ? `Interested in ${selectedProductForInquiry.name} (${selectedProductForInquiry.price || ''})...` : 'Describe the hardware, quantity or specifications needed...'}
                value={inquiryForm.notes}
                onChange={(e) => setInquiryForm({ ...inquiryForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setIsInquiryModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  color: '#090a0f',
                  fontWeight: 800,
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                }}
              >
                <span>Submit Inquiry &rarr;</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 👑 Imperial Auth Enforce Modal (Enforce Login before adding to cart) */}
      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthModalPendingItem(null);
        }}
        title="Sign In Required | Ngus Electronics"
        size="md"
      >
        <div style={{ padding: '4px 0' }}>
          {/* Pending Product Summary Card */}
          {authModalPendingItem && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 16px',
                borderRadius: '14px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '10px',
                  background: '#090b14',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {authModalPendingItem.image_url ? (
                  <img src={authModalPendingItem.image_url} alt={authModalPendingItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.4rem' }}>💻</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Reserving Hardware:
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {authModalPendingItem.name}
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#f59e0b', marginTop: 2 }}>
                  ETB {Number(authModalPendingItem.selling_price || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Modal Tab Switcher */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              padding: '4px',
              marginBottom: 18,
            }}
          >
            <button
              type="button"
              onClick={() => { setAuthModalTab('login'); setAuthError(''); }}
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                border: 'none',
                background: authModalTab === 'login' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'transparent',
                color: authModalTab === 'login' ? '#090a0f' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthModalTab('register'); setAuthError(''); }}
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                border: 'none',
                background: authModalTab === 'register' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'transparent',
                color: authModalTab === 'register' ? '#090a0f' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.82rem',
                marginBottom: 16,
              }}
            >
              {authError}
            </div>
          )}

          {authModalTab === 'login' ? (
            <form onSubmit={handleAuthModalLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  disabled={authLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  disabled={authLoading}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={authLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#090a0f',
                    fontWeight: 800,
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '9999px',
                    cursor: authLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {authLoading ? 'Signing In...' : 'Sign In & Add to Bag'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuthModalRegister}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Dawit Kebede"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  disabled={authLoading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="dawit@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    disabled={authLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+251 911 234567"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    disabled={authLoading}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="Min 6 chars"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    disabled={authLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="Repeat password"
                    value={authPasswordConfirm}
                    onChange={(e) => setAuthPasswordConfirm(e.target.value)}
                    disabled={authLoading}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={authLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#090a0f',
                    fontWeight: 800,
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '9999px',
                    cursor: authLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {authLoading ? 'Registering...' : 'Register & Add to Bag'}
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: 16, textAlign: 'center', paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Link
              to="/login"
              style={{ color: '#f59e0b', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}
            >
              Or open dedicated account portal &rarr;
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Home;
