import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../api/client';
import Modal from '../components/Modal';
import Icon from '../components/Icons';

// ── Cinematic Full-Screen Advertising Slides (Rosa-Style) ────────────
const HERO_SLIDES = [
  {
    id: 'slide-flagships',
    tag: 'Flagship Collection 2026',
    title: 'Aerospace Titanium.',
    highlight: 'Pure Bionic Power.',
    subtitle: 'The new iPhone 15 Pro Max and Galaxy S24 Ultra — cinematic periscope optics, aerospace titanium, and official warranty.',
    categoryTarget: 'Smartphones & Tablets',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=2000&q=85',
  },
  {
    id: 'slide-workstations',
    tag: 'Pro Creator Workstations',
    title: 'Extreme Computing.',
    highlight: 'Built for Visionaries.',
    subtitle: 'Apple MacBook Pro 16" M3 Max and Dell XPS 15 OLED — Liquid Retina XDR displays and 36GB unified memory for architecture and 8K workflows.',
    categoryTarget: 'Laptops & Computers',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=2000&q=85',
  },
  {
    id: 'slide-audio',
    tag: 'Studio Acoustics & Wearables',
    title: 'Pure Silence.',
    highlight: 'Acoustic Precision.',
    subtitle: 'Sony WH-1000XM5 wireless noise cancellation and Apple Watch Ultra 2 with sapphire crystal and multi-day battery.',
    categoryTarget: 'Audio & Wearables',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=2000&q=85',
  },
  {
    id: 'slide-displays',
    tag: 'Modern Workspaces',
    title: 'Visual Perfection.',
    highlight: 'Seamless Power.',
    subtitle: 'LG UltraFine 4K UHD displays and Anker GaN 140W fast chargers for high-velocity teams across Addis Ababa.',
    categoryTarget: 'Monitors & Accessories',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=2000&q=85',
  },
];

// ── Value proposition ribbon ─────────────────────────────────────────
const VALUE_HIGHLIGHTS = [
  {
    icon: '🛡️',
    title: '100% Genuine Certified',
    description: 'Factory sealed direct imports with official manufacturer serial verification.',
  },
  {
    icon: '🚀',
    title: 'Addis Express Dispatch',
    description: 'Same-day courier delivery across Addis Ababa; insured regional transit.',
  },
  {
    icon: '💳',
    title: 'Multi-Tender Payments',
    description: 'Support for Telebirr, CBE Birr, Visa/Mastercard, and Cash on Delivery.',
  },
  {
    icon: '🔄',
    title: '7-Day Return & Support',
    description: 'Hassle-free replacement policy and certified local technical assistance.',
  },
];

// ── Customer testimonials ────────────────────────────────────────────
const CUSTOMER_REVIEWS = [
  {
    name: 'Henok Tadesse',
    role: 'Lead Architect, Urban Design Studio',
    location: 'Bole, Addis Ababa',
    rating: 5,
    comment:
      'Purchased 3 MacBook Pro M3 workstations for our design office. Delivery was completed within 3 hours with official Ethiopian VAT receipts. Absolutely genuine products.',
  },
  {
    name: 'Dr. Selamawit Bekele',
    role: 'Medical Director',
    location: 'Kazanchis, Addis Ababa',
    rating: 5,
    comment:
      'Upgraded to the iPhone 15 Pro Max Natural Titanium. The Telebirr checkout was instant and seamless. Highly recommend Ngus Electronics for genuine tech.',
  },
  {
    name: 'Kidus Yohannes',
    role: 'Software Engineer',
    location: 'Sarbet, Addis Ababa',
    rating: 5,
    comment:
      'The Sony XM5 headphones are phenomenal for deep focus. Best pricing in Addis Ababa with full manufacturer warranty and serial verification.',
  },
];

export const Home = () => {
  const { isAuthenticated, user, login, register, logout } = useAuth();
  const { addToCart, setIsCartOpen, totalCount } = useCart();

  // Light / Dark mode state (Inspired by Rosa)
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

  // Scroll detection for navbar
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Theme-aware design tokens (Rosa Minimalist Palette)
  const colors = {
    bgApp: isDark ? '#070810' : '#FCF9F7',
    bgSurface: isDark ? '#0e121d' : '#FFFFFF',
    bgCardSubtle: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
    borderHover: isDark ? 'rgba(245, 158, 11, 0.5)' : '#F59E0B',
    textMain: isDark ? '#FFFFFF' : '#18181B',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    textDim: isDark ? '#64748B' : '#94A3B8',
    navBg: scrolled
      ? isDark ? 'rgba(7, 8, 16, 0.92)' : 'rgba(252, 249, 247, 0.92)'
      : isDark ? 'rgba(7, 8, 16, 0.45)' : 'rgba(252, 249, 247, 0.65)',
    primaryAccent: '#f59e0b',
    primaryHover: '#d97706',
    cardShadow: isDark
      ? '0 10px 30px rgba(0, 0, 0, 0.45)'
      : '0 8px 24px rgba(15, 23, 42, 0.05)',
  };

  // Live Database States (Real DB Only - NO MOCK DATA)
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [addedItemNotice, setAddedItemNotice] = useState(null);

  // Rotating Full-Screen Hero Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const heroTimerRef = useRef(null);

  // Modals state
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalPendingItem, setAuthModalPendingItem] = useState(null);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Inquiry modal state
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

  // Tracking modal state
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackingError, setTrackingError] = useState('');

  // Fetch 100% Real Database Products and Categories
  useEffect(() => {
    const fetchCatalogFromDB = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          api.getProducts({ per_page: 60 }).catch(() => ({ data: [] })),
          api.getCategories({ per_page: 30 }).catch(() => ({ data: [] })),
        ]);

        const rawProds = Array.isArray(prodRes) ? prodRes : prodRes?.data || [];
        const rawCats = Array.isArray(catRes) ? catRes : catRes?.data || [];

        setProducts(rawProds);
        setCategories(rawCats);
      } catch (err) {
        console.error('Failed to load real catalog data from DB', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogFromDB();
  }, []);

  // Hero Carousel Auto-Rotate (every 5.5s, pause on hover)
  useEffect(() => {
    if (isHeroPaused) return;

    heroTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);

    return () => {
      if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    };
  }, [isHeroPaused]);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleSlideJumpToCategory = (catTarget) => {
    const match = categories.find((c) =>
      c.name.toLowerCase().includes(catTarget.toLowerCase()) ||
      catTarget.toLowerCase().includes(c.name.toLowerCase())
    );
    if (match) {
      setCatalogCategory(String(match.id));
    } else {
      setCatalogCategory('all');
    }
    const targetEl = document.getElementById('catalog');
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Add to cart with auth protection
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

  // Filtered public products purely from Database
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        catalogCategory === 'all'
          ? true
          : String(p.category_id) === String(catalogCategory) ||
            (p.category?.name && p.category.name.toLowerCase() === catalogCategory.toLowerCase());

      const q = catalogSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.model_number || '').toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [products, catalogCategory, catalogSearch]);

  const activeSlide = HERO_SLIDES[currentSlide];

  return (
    <div
      style={{
        background: colors.bgApp,
        color: colors.textMain,
        minHeight: '100vh',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {/* 🧭 FIXED GLASSMORPHISM NAVBAR (Floats seamlessly over full-screen hero) */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: colors.navBg,
          borderBottom: scrolled ? `1px solid ${colors.border}` : '1px solid rgba(255, 255, 255, 0.08)',
          transition: 'all 0.3s ease',
        }}
      >
        <nav
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '16px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          {/* Brand Logo & Tag */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>👑</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: scrolled ? colors.textMain : '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                NGUS <span style={{ color: '#f59e0b', fontWeight: 800 }}>ELECTRONICS</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: scrolled ? colors.textDim : 'rgba(255, 255, 255, 0.75)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                The Royal Standard of Tech
              </div>
            </div>
          </Link>

          {/* Clean Navigation Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
            className="hidden md:flex"
          >
            <a href="#hero" style={{ color: scrolled ? colors.textMain : '#FFFFFF', textDecoration: 'none', transition: 'color 0.2s' }}>
              Home
            </a>
            <a href="#catalog" style={{ color: scrolled ? colors.textMuted : 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Catalog
            </a>
            <a href="#categories" style={{ color: scrolled ? colors.textMuted : 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Categories
            </a>
            <a href="#about" style={{ color: scrolled ? colors.textMuted : 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'color 0.2s' }}>
              About
            </a>
            <a href="#reviews" style={{ color: scrolled ? colors.textMuted : 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Reviews
            </a>
            {isAuthenticated && (
              <button
                onClick={() => setIsTrackingModalOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: scrolled ? colors.textMuted : 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>🚚</span> Track Order
              </button>
            )}
            <a href="#contact" style={{ color: scrolled ? colors.textMuted : 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Contact
            </a>
          </div>

          {/* Right Header Actions: Theme Toggle, Cart Drawer & Portal/Sign In */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* ☀️ / 🌙 LIGHT & DARK THEME TOGGLE (Requested by user like Rosa) */}
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
                background: scrolled
                  ? isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(0, 0, 0, 0.3)',
                border: scrolled ? `1px solid ${colors.border}` : '1px solid rgba(255, 255, 255, 0.2)',
                color: isDark ? '#fbbf24' : '#d97706',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
              }}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? (
                // Sun Icon
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
                // Moon Icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Cart Trigger Button - Only displayed when user is logged in */}
            {isAuthenticated && (
              <button
                onClick={() => setIsCartOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  background: scrolled
                    ? isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF'
                    : 'rgba(0, 0, 0, 0.3)',
                  border: scrolled ? `1px solid ${colors.border}` : '1px solid rgba(255, 255, 255, 0.25)',
                  color: scrolled ? colors.textMain : '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s',
                }}
              >
                <Icon name="cart" size={17} color="#f59e0b" />
                <span>Bag</span>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#090a0f',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                  }}
                >
                  {totalCount}
                </span>
              </button>
            )}

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user?.role === 'customer' ? (
                  <Link
                    to="/customer/dashboard"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 16px',
                      borderRadius: '9999px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      color: '#fbbf24',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                    }}
                  >
                    <span>👑 {user?.name?.split(' ')[0] || 'Client'}</span>
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#090a0f',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      padding: '7px 16px',
                      borderRadius: '9999px',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Console</span>
                  </Link>
                )}

                <button
                  onClick={() => logout()}
                  style={{
                    background: 'transparent',
                    border: scrolled ? `1px solid ${colors.border}` : '1px solid rgba(255, 255, 255, 0.2)',
                    color: scrolled ? colors.textMuted : 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link
                  to="/login"
                  style={{
                    color: scrolled ? colors.textMuted : '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    padding: '6px 10px',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#090a0f',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    padding: '7px 18px',
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    boxShadow: '0 0 18px rgba(245, 158, 11, 0.35)',
                  }}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* 🚀 FULL-SCREEN CINEMATIC ROTATING HERO (100vh Full Viewport Rosa-style) */}
      <section
        id="hero"
        style={{
          position: 'relative',
          height: '100vh',
          minHeight: '680px',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
      >
        {/* Full-bleed background image with smooth fade */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <img
            src={activeSlide.image}
            alt={activeSlide.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.52) contrast(1.12)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          />
          {/* Rosa-style dark cinematic vignette gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.8) 100%)',
            }}
          />
        </div>

        {/* Minimalist Left Arrow Button */}
        <button
          type="button"
          onClick={handlePrevSlide}
          aria-label="Previous slide"
          style={{
            position: 'absolute',
            left: '28px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            fontSize: '1.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.6)';
            e.currentTarget.style.borderColor = '#f59e0b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          &#8249;
        </button>

        {/* Minimalist Right Arrow Button */}
        <button
          type="button"
          onClick={handleNextSlide}
          aria-label="Next slide"
          style={{
            position: 'absolute',
            right: '28px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            fontSize: '1.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.6)';
            e.currentTarget.style.borderColor = '#f59e0b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          &#8250;
        </button>

        {/* Center Hero Content (Pure Rosa Elegance - No Messy Text) */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '920px',
            margin: '0 auto',
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          {/* Subtle Tagline */}
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#fbbf24',
              marginBottom: 16,
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}
          >
            {activeSlide.tag}
          </span>

          {/* Majestic Hero Headline with Italic Font Contrast */}
          <h1
            style={{
              fontSize: 'clamp(2.8rem, 6vw, 5.2rem)',
              fontWeight: 700,
              lineHeight: 1.1,
              color: '#FFFFFF',
              margin: '0 auto 20px',
              letterSpacing: '-0.025em',
              textShadow: '0 4px 24px rgba(0,0,0,0.7)',
            }}
          >
            <span style={{ display: 'block' }}>{activeSlide.title}</span>
            <span
              style={{
                display: 'block',
                marginTop: '8px',
                fontStyle: 'italic',
                fontWeight: 300,
                color: '#f59e0b',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(2.4rem, 5.2vw, 4.8rem)',
              }}
            >
              {activeSlide.highlight}
            </span>
          </h1>

          {/* Refined Subtitle */}
          <p
            style={{
              fontSize: 'clamp(1.05rem, 1.8vw, 1.3rem)',
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.88)',
              maxWidth: '640px',
              margin: '0 auto 38px',
              fontWeight: 400,
              textShadow: '0 2px 10px rgba(0,0,0,0.6)',
            }}
          >
            {activeSlide.subtitle}
          </p>

          {/* Dual Elegant Pill Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSlideJumpToCategory(activeSlide.categoryTarget)}
              style={{
                padding: '16px 38px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                color: '#090a0f',
                fontWeight: 800,
                fontSize: '1rem',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(245, 158, 11, 0.45)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 14px 40px rgba(245, 158, 11, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(245, 158, 11, 0.45)';
              }}
            >
              Explore Collection &rarr;
            </button>

            <button
              type="button"
              onClick={() => handleOpenInquiry({ name: activeSlide.title, price: '' })}
              style={{
                padding: '16px 34px',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '1rem',
                borderRadius: '9999px',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Book Showroom Demo
            </button>
          </div>
        </div>

        {/* Minimalist Bottom Slide Indicator Dots */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            zIndex: 20,
          }}
        >
          {HERO_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              style={{
                height: 8,
                width: idx === currentSlide ? 34 : 10,
                borderRadius: '9999px',
                background: idx === currentSlide ? '#FFFFFF' : 'rgba(255, 255, 255, 0.35)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      </section>

      {/* 🛡️ VALUE PROPOSITION RIBBON (4 Clean Minimalist Highlight Cards) */}
      <section style={{ maxWidth: 1240, margin: '60px auto 70px', padding: '0 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 20,
          }}
        >
          {VALUE_HIGHLIGHTS.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: colors.bgSurface,
                border: `1px solid ${colors.border}`,
                borderRadius: '20px',
                padding: '24px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
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
              <div
                style={{
                  fontSize: '1.8rem',
                  lineHeight: 1,
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                  padding: '10px',
                  borderRadius: '14px',
                  border: `1px solid ${colors.border}`,
                }}
              >
                {item.icon}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: colors.textMain }}>
                  {item.title}
                </h4>
                <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: colors.textMuted, lineHeight: 1.5 }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🏷️ CURATED CATEGORY TAXONOMY (Sourced Live from Database) */}
      <section id="categories" style={{ maxWidth: 1240, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Taxonomy Master
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: colors.textMain, margin: '6px 0 0' }}>
            Browse Hardware by Category
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {categories.map((cat) => {
            const catCount = products.filter((p) => String(p.category_id) === String(cat.id)).length;
            return (
              <div
                key={cat.id}
                onClick={() => {
                  setCatalogCategory(String(cat.id));
                  const el = document.getElementById('catalog');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  background: colors.bgSurface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '20px',
                  padding: '24px',
                  cursor: 'pointer',
                  boxShadow: colors.cardShadow,
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.borderHover;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>
                  {cat.name.includes('Smartphones') ? '📱' : cat.name.includes('Laptops') ? '💻' : cat.name.includes('Audio') ? '🎧' : '🖥️'}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: colors.textMain, margin: '0 0 6px' }}>
                  {cat.name}
                </h3>
                <p style={{ fontSize: '0.82rem', color: colors.textMuted, margin: '0 0 14px', lineHeight: 1.5 }}>
                  {cat.description || 'Explore authentic models and accessories.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b' }}>
                    {catCount} {catCount === 1 ? 'Product' : 'Products'} Live
                  </span>
                  <span style={{ fontSize: '0.84rem', color: colors.textDim }}>&rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 🛍️ REAL DATABASE PRODUCTS CATALOG (100% SOURCED FROM DB - NO MOCK DATA) */}
      <section id="catalog" style={{ maxWidth: 1240, margin: '0 auto 100px', padding: '0 24px' }}>
        {/* Section Header with Live DB Categories and Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem', color: '#f59e0b' }}>👑</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b' }}>
              Database Live Inventory ({products.length} Items Sourced)
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: colors.textMain, margin: 0, letterSpacing: '-0.02em' }}>
                Electronic Product Catalog
              </h2>
              <p style={{ color: colors.textMuted, fontSize: '0.94rem', marginTop: 4 }}>
                Directly connected to inventory ledger. Real-time stock reservation with Telebirr, CBE Birr, or Cash on Delivery.
              </p>
            </div>

            {/* Search Input Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search MacBook, iPhone, SKU..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '9999px',
                    padding: '10px 20px 10px 42px',
                    color: colors.textMain,
                    fontSize: '0.88rem',
                    outline: 'none',
                    minWidth: 260,
                    boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                />
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textDim }}>
                  <Icon name="search" size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Real Category Filter Pills (Loaded from DB) */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setCatalogCategory('all')}
              style={{
                background: catalogCategory === 'all' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                color: catalogCategory === 'all' ? '#090a0f' : colors.textMuted,
                fontWeight: catalogCategory === 'all' ? 800 : 600,
                fontSize: '0.82rem',
                border: `1px solid ${catalogCategory === 'all' ? '#f59e0b' : colors.border}`,
                borderRadius: '9999px',
                padding: '7px 18px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isDark ? 'none' : '0 2px 5px rgba(0,0,0,0.03)',
              }}
            >
              All Hardware ({products.length})
            </button>

            {categories.map((cat) => {
              const isSelected = String(catalogCategory) === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatalogCategory(String(cat.id))}
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                    color: isSelected ? '#090a0f' : colors.textMuted,
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '0.82rem',
                    border: `1px solid ${isSelected ? '#f59e0b' : colors.border}`,
                    borderRadius: '9999px',
                    padding: '7px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isDark ? 'none' : '0 2px 5px rgba(0,0,0,0.03)',
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Products Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: colors.textMuted }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 12 }}>⚡</div>
            <p style={{ fontSize: '1.05rem', fontWeight: 600 }}>Loading authentic electronic products from database...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: colors.bgSurface,
              borderRadius: '24px',
              border: `1px solid ${colors.border}`,
              boxShadow: colors.cardShadow,
            }}
          >
            <p style={{ color: colors.textMuted, fontSize: '1rem' }}>No products found matching your current filter criteria.</p>
            <button
              type="button"
              onClick={() => { setCatalogSearch(''); setCatalogCategory('all'); }}
              style={{
                marginTop: 14,
                background: 'transparent',
                border: '1px solid #f59e0b',
                color: '#f59e0b',
                borderRadius: '9999px',
                padding: '7px 20px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
              gap: 24,
            }}
          >
            {filteredProducts.map((p) => {
              const inBag = addedItemNotice === p.id;
              const priceVal = Number(p.selling_price || 0);
              const isStockAvailable = (p.quantity || 0) > 0;

              return (
                <div
                  key={p.id}
                  style={{
                    background: colors.bgSurface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '24px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: colors.cardShadow,
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.borderColor = colors.borderHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <div>
                    {/* Device Picture Container */}
                    <div
                      style={{
                        height: 210,
                        borderRadius: '16px',
                        background: isDark ? '#04060a' : '#F1F5F9',
                        border: `1px solid ${colors.border}`,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 18,
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      onClick={() => setQuickViewProduct(p)}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease',
                          }}
                          onMouseEnter={(e) => (e.target.style.transform = 'scale(1.06)')}
                          onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                          <span style={{ fontSize: '3rem' }}>⚡</span>
                          <div style={{ fontSize: '0.72rem', color: colors.textDim, marginTop: 4 }}>Authentic Hardware</div>
                        </div>
                      )}

                      {/* Stock Pill Badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: isDark ? 'rgba(9, 12, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(8px)',
                          border: `1px solid ${isStockAvailable ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          color: isStockAvailable ? '#10b981' : '#f87171',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '9999px',
                        }}
                      >
                        {isStockAvailable ? `✓ In Stock (${p.quantity})` : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Category & SKU */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {typeof p.category === 'object' ? p.category?.name : (p.category || 'Electronics')}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: colors.textDim }}>
                        {p.sku}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3
                      onClick={() => setQuickViewProduct(p)}
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: colors.textMain,
                        marginBottom: 8,
                        lineHeight: 1.35,
                        cursor: 'pointer',
                      }}
                    >
                      {p.name}
                    </h3>

                    {/* Brand & Model */}
                    <div style={{ fontSize: '0.76rem', color: colors.textMuted, marginBottom: 18 }}>
                      {p.brand ? `${p.brand} • ` : ''}{p.model_number || 'Official Release'}
                    </div>
                  </div>

                  {/* Price & Actions */}
                  <div style={{ paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b', marginBottom: 14 }}>
                      ETB {priceVal.toLocaleString()}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddToCartWithFeedback({
                            id: p.id,
                            name: p.name,
                            selling_price: priceVal,
                            image_url: p.image_url,
                            sku: p.sku,
                            category: p.category?.name || 'Electronics',
                          })
                        }
                        disabled={!isStockAvailable}
                        style={{
                          flex: 1,
                          background: inBag
                            ? 'rgba(16, 185, 129, 0.25)'
                            : !isStockAvailable
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                          border: inBag ? '1px solid #10b981' : 'none',
                          color: inBag ? '#10b981' : !isStockAvailable ? colors.textDim : '#090a0f',
                          fontWeight: 900,
                          fontSize: '0.84rem',
                          padding: '10px 14px',
                          borderRadius: '9999px',
                          cursor: !isStockAvailable ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {inBag ? '✓ In Bag' : !isStockAvailable ? 'Sold Out' : 'Add to Bag'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuickViewProduct(p)}
                        style={{
                          background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                          border: `1px solid ${colors.border}`,
                          color: colors.textMain,
                          padding: '10px 14px',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}
                        title="View Full Specifications"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 📖 ABOUT & BRAND PHILOSOPHY (The Royal Standard of Tech) */}
      <section id="about" style={{ maxWidth: 1240, margin: '0 auto 100px', padding: '0 24px' }}>
        <div
          style={{
            background: colors.bgSurface,
            border: `1px solid ${colors.border}`,
            borderRadius: '32px',
            padding: '48px 50px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 1fr)',
            gap: 40,
            alignItems: 'center',
            boxShadow: colors.cardShadow,
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              Our Commitment
            </span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: colors.textMain, margin: '6px 0 16px', lineHeight: 1.2 }}>
              The Royal Standard of Electronics in Ethiopia
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '0.96rem', lineHeight: 1.6, marginBottom: 20 }}>
              At Ngus Electronics, we believe cutting-edge technology should be accessible with absolute trust. We partner directly with authorized international supply channels to bring genuine laptops, flagship smartphones, studio acoustics, and workplace displays to professionals and organizations across Ethiopia.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: colors.textMain }}>
                <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                <span>Direct factory sealed packaging with manufacturer serial warranty</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: colors.textMain }}>
                <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                <span>Formal Ethiopian VAT sales receipts and commercial corporate invoices</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: colors.textMain }}>
                <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                <span>Immediate digital checkout with Telebirr, CBE Birr, and Visa</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenInquiry()}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                color: '#090a0f',
                fontWeight: 800,
                fontSize: '0.92rem',
                padding: '12px 28px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Book Showroom Consultation &rarr;
            </button>
          </div>

          <div
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              height: 340,
              boxShadow: colors.cardShadow,
              border: `1px solid ${colors.border}`,
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80"
              alt="Ngus Electronics Hardware Laboratory"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* 🌟 VERIFIED CUSTOMER REVIEWS (Like Rosa's Testimonials) */}
      <section id="reviews" style={{ maxWidth: 1240, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Verified Client Feedback
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: colors.textMain, margin: '6px 0 0' }}>
            What Our Customers Say
          </h2>
          <p style={{ color: colors.textMuted, fontSize: '0.94rem', marginTop: 6 }}>
            Real reviews from tech professionals and enterprise buyers across Addis Ababa.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {CUSTOMER_REVIEWS.map((rev, idx) => (
            <div
              key={idx}
              style={{
                background: colors.bgSurface,
                border: `1px solid ${colors.border}`,
                borderRadius: '24px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: colors.cardShadow,
              }}
            >
              <div>
                <div style={{ color: '#f59e0b', fontSize: '1rem', marginBottom: 14 }}>
                  {'★'.repeat(rev.rating)}
                </div>
                <p style={{ color: colors.textMain, fontSize: '0.92rem', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
                  "{rev.comment}"
                </p>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ fontWeight: 800, color: colors.textMain, fontSize: '0.95rem' }}>{rev.name}</div>
                <div style={{ fontSize: '0.76rem', color: colors.textMuted }}>
                  {rev.role} • <span style={{ color: '#f59e0b' }}>{rev.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📬 CONSULTATION & CONTACT FORM (Like Rosa's Modern Contact Area) */}
      <section id="contact" style={{ maxWidth: 1240, margin: '0 auto 100px', padding: '0 24px' }}>
        <div
          style={{
            background: colors.bgSurface,
            border: `1px solid ${colors.border}`,
            borderRadius: '32px',
            padding: '48px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
            gap: 48,
            boxShadow: colors.cardShadow,
          }}
        >
          {/* Contact Details */}
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              Get in Touch
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: colors.textMain, margin: '6px 0 16px' }}>
              Showroom Consultation & Enterprise Procurement
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 32 }}>
              Looking for bulk business pricing, custom computer specs, or private showroom demo bookings? Our dedicated team responds within 2 hours.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: '0.88rem', color: colors.textMain }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.2rem' }}>📍</span>
                <span>Bole Medhanialem Mall, 2nd Floor, Addis Ababa, Ethiopia</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.2rem' }}>📞</span>
                <span>+251 911 223344 / +251 922 887766</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.2rem' }}>✉️</span>
                <span>support@nguselectronics.com / sales@ngus.et</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.2rem' }}>⏰</span>
                <span>Monday – Saturday: 8:30 AM – 7:30 PM (East Africa Time)</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            {inquirySubmitted ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: colors.bgCardSubtle, borderRadius: '20px', border: '1px solid #10b981' }}>
                <span style={{ fontSize: '3rem' }}>✓</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', margin: '12px 0 6px' }}>
                  Message Sent Successfully!
                </h3>
                <p style={{ color: colors.textMuted, fontSize: '0.9rem' }}>
                  Thank you. Our electronics specialist will reach out to your phone or email promptly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: colors.textMain }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abebe Kebede"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: colors.bgCardSubtle,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: colors.textMain }}>Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+251 912 345678"
                      value={inquiryForm.phone}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: colors.bgCardSubtle,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: colors.textMain }}>Email Address</label>
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: colors.bgCardSubtle,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: colors.textMain }}>Inquiry Type</label>
                    <select
                      value={inquiryForm.inquiry_type}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, inquiry_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: colors.bgSurface,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                        fontSize: '0.88rem',
                      }}
                    >
                      <option value="retail">Retail Device Purchase</option>
                      <option value="corporate">Corporate / Bulk Hardware Order</option>
                      <option value="showroom">Private Showroom Demo Booking</option>
                      <option value="warranty">Warranty & Tech Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: colors.textMain }}>Message / Requirement</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about the electronic models, specs or quantities you need..."
                    value={inquiryForm.notes}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: colors.bgCardSubtle,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#090a0f',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    padding: '12px 24px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: 6,
                  }}
                >
                  Send Message &rarr;
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 👑 MODERN MINIMALIST FOOTER */}
      <footer
        style={{
          borderTop: `1px solid ${colors.border}`,
          background: isDark ? 'rgba(4, 5, 10, 0.98)' : '#1E293B',
          color: '#FFFFFF',
          padding: '60px 24px 40px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 40,
            marginBottom: 40,
          }}
        >
          {/* Col 1: Brand story */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: '1.4rem' }}>👑</span>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#FFFFFF' }}>
                NGUS <span style={{ color: '#f59e0b' }}>ELECTRONICS</span>
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
              The royal benchmark of consumer and enterprise electronics in Ethiopia. Authentic products, direct imports, official warranties, and instant Telebirr checkout.
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem', marginBottom: 16 }}>
              Quick Navigation
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
              <li><a href="#hero" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home Showcase</a></li>
              <li><a href="#catalog" style={{ color: '#94a3b8', textDecoration: 'none' }}>Hardware Catalog</a></li>
              <li><a href="#categories" style={{ color: '#94a3b8', textDecoration: 'none' }}>Categories</a></li>
              <li><a href="#about" style={{ color: '#94a3b8', textDecoration: 'none' }}>About Ngus</a></li>
              <li><a href="#reviews" style={{ color: '#94a3b8', textDecoration: 'none' }}>Customer Feedback</a></li>
              {isAuthenticated && (
                <li>
                  <button
                    type="button"
                    onClick={() => setIsTrackingModalOpen(true)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: 0, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Live Order Tracking
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Categories */}
          <div>
            <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem', marginBottom: 16 }}>
              Product Categories
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogCategory(String(c.id));
                      const el = document.getElementById('catalog');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: 0, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Store & Payments */}
          <div>
            <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem', marginBottom: 16 }}>
              Store & Payments
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
              <div>Bole Medhanialem Mall, 2nd Floor, Addis Ababa</div>
              <div style={{ marginTop: 8 }}>Accepted Payment Methods:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', fontSize: '0.72rem', color: '#f59e0b', fontWeight: 800 }}>Telebirr</span>
                <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', fontSize: '0.72rem', color: '#60a5fa', fontWeight: 800 }}>CBE Birr</span>
                <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', fontSize: '0.72rem', color: '#34d399', fontWeight: 800 }}>Visa / Card</span>
                <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', fontSize: '0.72rem', color: '#FFFFFF', fontWeight: 800 }}>COD</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            paddingTop: 24,
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: '0.82rem',
            color: '#94a3b8',
          }}
        >
          <div>© {new Date().getFullYear()} Ngus Electronics. All rights reserved. Imperial standard technology.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Authenticity Guarantee</span>
          </div>
        </div>
      </footer>

      {/* 🔍 QUICK VIEW PRODUCT MODAL */}
      <Modal
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        title={quickViewProduct?.name || 'Product Specifications'}
        size="md"
      >
        {quickViewProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                height: 240,
                borderRadius: '16px',
                background: isDark ? '#04060a' : '#F1F5F9',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${colors.border}`,
              }}
            >
              {quickViewProduct.image_url ? (
                <img
                  src={quickViewProduct.image_url}
                  alt={quickViewProduct.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '3.5rem' }}>⚡</span>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                  {typeof quickViewProduct.category === 'object' ? quickViewProduct.category?.name : (quickViewProduct.category || 'Hardware')}
                </span>
                <span style={{ fontSize: '0.75rem', color: colors.textDim }}>
                  SKU: {quickViewProduct.sku}
                </span>
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: colors.textMain, margin: '0 0 10px' }}>
                {quickViewProduct.name}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '14px 0' }}>
                <div style={{ background: colors.bgCardSubtle, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: colors.textDim }}>Brand</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: colors.textMain }}>{quickViewProduct.brand || 'Verified Import'}</div>
                </div>
                <div style={{ background: colors.bgCardSubtle, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: colors.textDim }}>Model Number</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: colors.textMain }}>{quickViewProduct.model_number || 'Standard Edition'}</div>
                </div>
                <div style={{ background: colors.bgCardSubtle, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: colors.textDim }}>Units in Warehouse</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#10b981' }}>{quickViewProduct.quantity} units available</div>
                </div>
                <div style={{ background: colors.bgCardSubtle, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: colors.textDim }}>Warranty</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f59e0b' }}>Official 1-Year Local</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>
                  ETB {Number(quickViewProduct.selling_price || 0).toLocaleString()}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCartWithFeedback({
                        id: quickViewProduct.id,
                        name: quickViewProduct.name,
                        selling_price: quickViewProduct.selling_price,
                        image_url: quickViewProduct.image_url,
                        sku: quickViewProduct.sku,
                        category: quickViewProduct.category?.name || 'Electronics',
                      });
                      setQuickViewProduct(null);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#090a0f',
                      fontWeight: 900,
                      fontSize: '0.86rem',
                      padding: '10px 20px',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Add to Bag
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenInquiry(quickViewProduct);
                      setQuickViewProduct(null);
                    }}
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                      color: colors.textMain,
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      padding: '10px 16px',
                      borderRadius: '9999px',
                      border: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    Inquire
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 📦 Live Customer Order Tracking Modal */}
      <Modal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        title="Live Consignment Tracking | Ngus Electronics"
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
                background: colors.bgCardSubtle,
                border: `1px solid ${colors.border}`,
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: colors.textDim }}>Order Reference</div>
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
                        background: s.active ? '#f59e0b' : isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                        color: s.active ? '#090a0f' : colors.textDim,
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
                    <div style={{ fontSize: '0.7rem', color: s.active ? colors.textMain : colors.textDim, fontWeight: 600 }}>
                      {s.title}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.82rem', color: colors.textMuted, lineHeight: 1.6, marginTop: 14 }}>
                <div><strong>Customer:</strong> {trackedOrder.customer?.display_name || 'Retail Client'}</div>
                <div><strong>Fulfillment:</strong> {trackedOrder.fulfillment_type || 'Delivery'}</div>
                <div><strong>Total Amount:</strong> ETB {Number(trackedOrder.grand_total || 0).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 👑 Inquiry / RFQ Modal */}
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
            <p style={{ color: colors.textMuted, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Thank you for contacting Ngus Electronics. Our product specialist will reach out to your phone/email shortly with verified pricing and availability.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInquirySubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ color: colors.textMain }}>Full Name *</label>
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
                <label className="form-label" style={{ color: colors.textMain }}>Phone Number *</label>
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
                <label className="form-label" style={{ color: colors.textMain }}>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="dawit@company.com"
                  value={inquiryForm.email}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: colors.textMain }}>Company / Organization</label>
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
              <label className="form-label" style={{ color: colors.textMain }}>Inquiry Type</label>
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
              <label className="form-label" style={{ color: colors.textMain }}>Hardware Notes & Details</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={selectedProductForInquiry ? `Interested in ${selectedProductForInquiry.name}...` : 'Describe the hardware, quantity or specifications needed...'}
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

      {/* 👑 Auth Enforce Modal (Enforce Login before adding to cart) */}
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
                  background: isDark ? '#090b14' : '#F1F5F9',
                  border: `1px solid ${colors.border}`,
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
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
              background: colors.bgCardSubtle,
              border: `1px solid ${colors.border}`,
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
                color: authModalTab === 'login' ? '#090a0f' : colors.textMuted,
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
                color: authModalTab === 'register' ? '#090a0f' : colors.textMuted,
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
                <label className="form-label" style={{ color: colors.textMain }}>Email Address</label>
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
                <label className="form-label" style={{ color: colors.textMain }}>Password</label>
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
                    padding: '9px 20px',
                    borderRadius: '8px',
                    cursor: authLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {authLoading ? 'Signing in...' : 'Sign In & Reserve'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuthModalRegister}>
              <div className="form-group">
                <label className="form-label" style={{ color: colors.textMain }}>Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Alazar Tadesse"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  disabled={authLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: colors.textMain }}>Email Address *</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="alazar@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  disabled={authLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: colors.textMain }}>Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+251 912 345678"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  disabled={authLoading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: colors.textMain }}>Password *</label>
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
                  <label className="form-label" style={{ color: colors.textMain }}>Confirm Password *</label>
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
                    padding: '9px 20px',
                    borderRadius: '8px',
                    cursor: authLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {authLoading ? 'Registering...' : 'Register & Reserve'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Home;
