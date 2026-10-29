import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // State
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

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

  // Load real catalog & store data from backend API
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setLoading(true);
        const [prodRes, storeRes] = await Promise.all([
          api.getProducts({ per_page: 24 }).catch(() => ({ data: [] })),
          api.getStores({ is_active: 1 }).catch(() => ({ data: [] })),
        ]);

        const rawProds = Array.isArray(prodRes) ? prodRes : prodRes?.data || [];
        setProducts(rawProds);

        const rawStores = Array.isArray(storeRes) ? storeRes : storeRes?.data || [];
        setStores(rawStores);
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

  // Filter products by category
  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    const prodName = (p.name || '').toLowerCase();
    const catName = (typeof p.category === 'object' && p.category?.name ? p.category.name : '').toLowerCase();
    if (selectedCategory === 'smartphones') {
      return prodName.includes('iphone') || prodName.includes('phone') || p.category_id === 1 || catName.includes('phone') || catName.includes('mobile');
    }
    if (selectedCategory === 'laptops') {
      return prodName.includes('macbook') || prodName.includes('laptop') || p.category_id === 2 || catName.includes('laptop') || catName.includes('computer');
    }
    if (selectedCategory === 'wearables') {
      return prodName.includes('watch') || prodName.includes('airpods') || prodName.includes('headphone') || p.category_id === 3 || catName.includes('wearable') || catName.includes('audio');
    }
    return true;
  });

  return (
    <div
      style={{
        background: '#07090e',
        color: '#f1f5f9',
        minHeight: '100vh',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* 🌌 Dynamic Ambient Background Meshes (Clean modern subtle lighting) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '15%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(80px)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '25%',
          right: '5%',
          width: '650px',
          height: '650px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(90px)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '10%',
          left: '25%',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(100px)',
        }}
      />

      {/* 🚀 MODERN FLOATING GLASS NAVIGATION BAR (No clutter, clean header) */}
      <div style={{ padding: '16px 24px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <nav
          className="ngus-glass-nav"
          style={{
            maxWidth: 1320,
            margin: '0 auto',
            borderRadius: '20px',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo & Name */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(9, 11, 17, 0.95) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(245, 158, 11, 0.3)',
              }}
            >
              <img
                src="/ngus-logo.png"
                alt="Ngus"
                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '0.04em', color: '#ffffff' }}>
                Ngus
              </span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
            </div>
          </Link>

          {/* Clean Navigation Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: '0.88rem', fontWeight: 600 }}>
            <a href="#showcase" className="ngus-footer-link">Hardware</a>
            <a href="#showcase" onClick={() => setSelectedCategory('laptops')} className="ngus-footer-link">Laptops</a>
            <a href="#showcase" onClick={() => setSelectedCategory('smartphones')} className="ngus-footer-link">Mobile</a>
            <a href="#showcase" onClick={() => setSelectedCategory('wearables')} className="ngus-footer-link">Audio</a>
            <a href="#stores" className="ngus-footer-link">Showrooms</a>
            <a href="#enterprise" className="ngus-footer-link">Corporate</a>
          </div>

          {/* Top-Right Login / User Portal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
                  {user?.name}
                </span>
                <Link
                  to="/dashboard"
                  className="ngus-btn-gold"
                  style={{ fontSize: '0.82rem', padding: '8px 18px' }}
                >
                  <Icon name="dashboard" size={15} />
                  <span>Console</span>
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => handleOpenInquiry()}
                  className="ngus-btn-outline-gold"
                  style={{ fontSize: '0.82rem', padding: '8px 18px' }}
                >
                  <span>RFQ</span>
                </button>
                <Link
                  to="/login"
                  className="ngus-btn-gold"
                  style={{
                    fontSize: '0.84rem',
                    padding: '8px 22px',
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.45)',
                  }}
                >
                  <Icon name="lock" size={14} />
                  <span>Log In</span>
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* ⚡ HERO SECTION (Vibrant, Modern, High-Impact) */}
      <section
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1320,
          margin: '0 auto',
          padding: '70px 24px 80px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: 50,
          alignItems: 'center',
        }}
      >
        {/* Left Copy */}
        <div>
          {/* Subtle Modern Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            <span>👑</span>
            <span>Next-Gen Electronics & Official Depot</span>
          </div>

          {/* Vibrant Colorful Headline */}
          <h1
            style={{
              fontSize: '3.8rem',
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: 22,
            }}
          >
            EXPERIENCE <br />
            THE <span className="ngus-hero-gradient">FUTURE OF</span> <br />
            <span className="ngus-hero-gradient">INNOVATION.</span>
          </h1>

          <p
            style={{
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: '#94a3b8',
              maxWidth: 540,
              marginBottom: 36,
            }}
          >
            Discover next-generation electronics designed for performance and style. Direct factory sealed computing, flagship smartphones, and professional accessories with verified serial registries and full warranty.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <a
              href="#showcase"
              className="ngus-btn-gold"
              style={{
                fontSize: '0.96rem',
                padding: '13px 30px',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.45)',
              }}
            >
              <span>Shop Catalog</span>
              <span>↓</span>
            </a>

            <button
              onClick={() => handleOpenInquiry()}
              className="ngus-btn-outline-gold"
              style={{ fontSize: '0.96rem', padding: '13px 26px' }}
            >
              <span>Enterprise RFQ</span>
            </button>

            <Link
              to="/login"
              style={{
                color: '#94a3b8',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                padding: '10px 14px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#f59e0b')}
              onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
            >
              Staff Portal &rarr;
            </Link>
          </div>

          {/* Quick Metrics */}
          <div
            style={{
              marginTop: 44,
              paddingTop: 28,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              gap: 40,
            }}
          >
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>100%</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>OEM Factory Sealed</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#60a5fa' }}>2-Year</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>Warranty Support</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>Same-Day</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>Addis Courier Dispatch</div>
            </div>
          </div>
        </div>

        {/* Hero Right: Modern Glowing 3D Glass Showcase Card */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            className="ngus-card-modern animate-ngus-float"
            style={{
              width: '100%',
              maxWidth: 440,
              padding: '36px 30px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              boxShadow: '0 25px 60px -10px rgba(0,0,0,0.8), 0 0 35px rgba(245, 158, 11, 0.2)',
              textAlign: 'center',
            }}
          >
            <div
              className="animate-ngus-glow"
              style={{
                width: 170,
                height: 170,
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/ngus-logo.png"
                alt="Ngus Crest"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>
              NGUS ELECTRONICS
            </h2>
            <p style={{ color: '#f59e0b', fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
              The Royal Crown of Technology
            </p>

            <div
              style={{
                marginTop: 24,
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Flagship Status</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  Showrooms Active
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Logistics Core</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f59e0b' }}>
                  Live API Synced
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🛍️ PRODUCT SHOWCASE (Modern Cards, Colorful Badges, Real Database Data) */}
      <section id="showcase" style={{ maxWidth: 1320, margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Section Header & Category Pills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Flagship Hardware Catalog
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', marginTop: 6 }}>
              Certified Inventory & Devices
            </h2>
          </div>

          {/* Clean Category Pills */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '6px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {[
              { id: 'all', label: 'All Products' },
              { id: 'laptops', label: 'Laptops' },
              { id: 'smartphones', label: 'Mobile' },
              { id: 'wearables', label: 'Audio & Gear' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={selectedCategory === tab.id ? 'ngus-pill-active' : ''}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: selectedCategory === tab.id ? undefined : 'transparent',
                  color: selectedCategory === tab.id ? undefined : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <Icon name="refresh" size={32} className="animate-spin" color="#f59e0b" />
            <p style={{ marginTop: 16 }}>Loading certified hardware inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <p>No products matching this category currently in inventory.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 26 }}>
            {filteredProducts.map((product) => {
              const inStock = (product.quantity || 0) > 0;
              const formattedPrice = Number(product.selling_price || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const brandDisplay = typeof product.brand === 'object' && product.brand !== null
                ? (product.brand.name || 'NGUS CERTIFIED')
                : (typeof product.brand === 'string' && product.brand.trim() ? product.brand : (product.sku?.split('-')[0] || 'NGUS CERTIFIED'));

              return (
                <div
                  key={product.id}
                  className="ngus-card-modern"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Header: Brand Tag & Stock Pill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#f59e0b',
                        }}
                      >
                        {brandDisplay}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: inStock ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: inStock ? '#10b981' : '#f87171',
                          border: inStock ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        {inStock ? `In Stock (${product.quantity})` : 'Backorder'}
                      </span>
                    </div>

                    {/* Device Thumbnail with Image or Ambient Glow */}
                    <div
                      style={{
                        height: 180,
                        background: 'radial-gradient(circle, rgba(96, 165, 250, 0.08) 0%, rgba(10, 14, 23, 0.8) 100%)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 20,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        />
                      ) : (
                        <Icon
                          name={(product.name || '').toLowerCase().includes('book') || (product.name || '').toLowerCase().includes('laptop') ? 'desktop' : 'mobile'}
                          size={60}
                          color="#f59e0b"
                        />
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 10,
                          right: 12,
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(8px)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          zIndex: 2,
                        }}
                      >
                        SKU: {product.sku || 'NGS-HW'}
                      </div>
                    </div>

                    {/* Title & Model */}
                    <h3 style={{ fontSize: '1.22rem', fontWeight: 800, color: '#ffffff', marginBottom: 6 }}>
                      {product.name}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
                      {product.model_number ? `Model: ${product.model_number} • ` : ''}
                      Official manufacturer sealed distribution with verified serial registry.
                    </p>
                  </div>

                  {/* Price & Action Button */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16, marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Certified Retail Price</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f59e0b' }}>
                          ETB {formattedPrice}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                        ✓ VAT Invoiced
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        onClick={() => handleOpenInquiry(product)}
                        className="ngus-btn-gold"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '10px 12px' }}
                      >
                        <span>Inquire / Buy</span>
                      </button>
                      <button
                        onClick={() => handleOpenInquiry(product)}
                        className="ngus-btn-outline-gold"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '10px 12px' }}
                      >
                        <span>Specs</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 🏢 PHYSICAL SHOWROOMS & DEPOTS (Real Database Stores) */}
      <section id="stores" style={{ maxWidth: 1320, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 40px' }}>
          <div style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Showrooms & Regional Hubs
          </div>
          <h2 style={{ fontSize: '2.3rem', fontWeight: 900, color: '#ffffff', marginTop: 6 }}>
            Visit Our Flagship Stores
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.94rem', marginTop: 10 }}>
            Experience verified hardware, live demonstrations, and immediate pickup at our central hubs.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
          {stores.map((store) => (
            <div
              key={store.id}
              className="ngus-card-modern"
              style={{
                padding: '30px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: '1.6rem' }}>🏢</span>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                    {store.name}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
                    STORE CODE: {store.code}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#f59e0b' }}>📍</span>
                  <span>{store.address || 'Bole, Addis Ababa, Ethiopia'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#f59e0b' }}>📞</span>
                  <a href={`tel:${store.phone}`} style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}>
                    {store.phone || '+251 911 000 000'}
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#10b981' }}>🕒</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Open Mon - Sat: 8:30 AM - 8:00 PM</span>
                </div>
              </div>

              <button
                onClick={() => handleOpenInquiry()}
                className="ngus-btn-outline-gold"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.84rem' }}
              >
                <span>Book Store Demo / Visit</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 💼 CORPORATE B2B PROCUREMENT BANNER */}
      <section id="enterprise" style={{ maxWidth: 1320, margin: '0 auto 80px', padding: '0 24px' }}>
        <div
          className="ngus-card-modern"
          style={{
            padding: '48px 44px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 24,
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ maxWidth: 620 }}>
            <div style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Enterprise & Institution Supply
            </div>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', marginTop: 8 }}>
              Equip Your Organization with the Imperial Standard
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.94rem', lineHeight: 1.6, marginTop: 10 }}>
              Volume procurement discounts, official VAT tax invoices, and warranty guarantees for corporations, government agencies, and tech institutions.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => handleOpenInquiry()}
              className="ngus-btn-gold"
              style={{ padding: '13px 30px', fontSize: '0.94rem' }}
            >
              <span>Submit Corporate RFQ</span>
            </button>
            <Link
              to="/login"
              style={{
                color: '#94a3b8',
                fontSize: '0.82rem',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Staff & Partner Sign In &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 👑 CLEAN MODERN MINIMALIST FOOTER */}
      <footer
        style={{
          background: '#04060a',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '60px 24px 30px',
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
            gap: 40,
            marginBottom: 44,
          }}
        >
          {/* Col 1: Brand & Bio */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img src="/ngus-logo.png" alt="Ngus" style={{ width: 34, height: 34, objectFit: 'contain' }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                <span style={{ color: '#f59e0b' }}>NGUS</span> ELECTRONICS
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.6, maxWidth: 320, marginBottom: 16 }}>
              The imperial standard of verified consumer and enterprise electronics in Ethiopia. Factory sealed OEM hardware and multi-store logistics.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>𝕏</span>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>in</span>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>tg</span>
            </div>
          </div>

          {/* Col 2: Shop */}
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', marginBottom: 14 }}>
              Hardware Shop
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="#showcase" onClick={() => setSelectedCategory('laptops')} className="ngus-footer-link">MacBook & Laptops</a>
              <a href="#showcase" onClick={() => setSelectedCategory('smartphones')} className="ngus-footer-link">Smartphones</a>
              <a href="#showcase" onClick={() => setSelectedCategory('wearables')} className="ngus-footer-link">Audio & Gear</a>
              <a href="#showcase" onClick={() => setSelectedCategory('all')} className="ngus-footer-link">Full Catalog</a>
            </div>
          </div>

          {/* Col 3: Company */}
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', marginBottom: 14 }}>
              Company & Hubs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="#stores" className="ngus-footer-link">Bole Showroom</a>
              <a href="#stores" className="ngus-footer-link">Central Depot</a>
              <a href="#enterprise" className="ngus-footer-link">Corporate Accounts</a>
              <a href="#enterprise" className="ngus-footer-link">RMA & Warranty</a>
            </div>
          </div>

          {/* Col 4: Portal */}
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', marginBottom: 14 }}>
              Authorized Staff
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link
                to="/login"
                className="ngus-btn-outline-gold"
                style={{ fontSize: '0.8rem', padding: '8px 16px', justifyContent: 'center' }}
              >
                <Icon name="lock" size={13} />
                <span>Console Log In</span>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', color: '#10b981' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span>Inventory Core v2.4 Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div
          style={{
            maxWidth: 1320,
            margin: '0 auto',
            paddingTop: 22,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
            color: '#64748b',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div>
            © 2026 Ngus Electronics PLC. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ cursor: 'pointer' }}>Terms of Warranty</span>
            <span style={{ cursor: 'pointer' }}>VAT Compliance (TIN / Invoiced)</span>
          </div>
        </div>
      </footer>

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
              Imperial Inquiry Received
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Thank you for contacting Ngus Electronics. Our certified product specialist will reach out to your phone/email shortly with verified pricing and availability.
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
              <label className="form-label">Specific Hardware Details & Quantity</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={selectedProductForInquiry ? `Interested in ${selectedProductForInquiry.name}...` : 'Describe the hardware, models, or volume required...'}
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
              <button type="submit" className="ngus-btn-gold">
                <span>Submit Imperial Inquiry</span>
                <span>&rarr;</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Home;
