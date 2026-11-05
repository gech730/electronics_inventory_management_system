import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import Icon from '../components/Icons';

export default function OrderTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  // ── Theme State (Synced with Rosa Home & Dashboard) ───────────────
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

  const colors = {
    bgApp: isDark ? '#070810' : '#FCF9F7',
    bgSurface: isDark ? '#0e121d' : '#FFFFFF',
    bgCardSubtle: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
    textMain: isDark ? '#FFFFFF' : '#18181B',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    textDim: isDark ? '#64748B' : '#94A3B8',
    headerBg: isDark ? 'rgba(7, 8, 16, 0.92)' : 'rgba(252, 249, 247, 0.92)',
    cardShadow: isDark
      ? '0 10px 30px rgba(0, 0, 0, 0.45)'
      : '0 8px 24px rgba(15, 23, 42, 0.05)',
  };

  const [query, setQuery] = useState(initialRef);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  const fetchTracking = async (refToTrack) => {
    const clean = (refToTrack || query || '').trim();
    if (!clean) {
      setError('Please enter a tracking code, order number, or customer phone.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.trackShipment(clean);
      if (res?.data) {
        setTrackingData(res.data);
      } else {
        setError('No active shipment found matching reference: ' + clean);
        setTrackingData(null);
      }
    } catch (err) {
      setError(err.data?.message || err.message || 'Tracking reference not found. Please verify the code.');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      fetchTracking(initialRef);
    }
  }, [initialRef]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ ref: query });
    fetchTracking(query);
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(''), 2500);
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
      {/* 🧭 HEADER */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: colors.headerBg,
          borderBottom: `1px solid ${colors.border}`,
          padding: '14px 24px',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
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
                Live Consignment Tracking
              </div>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/customer/dashboard"
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
              <Icon name="receipt" size={15} color="#f59e0b" />
              <span>Client Portal</span>
            </Link>

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
              <span>Storefront</span>
              <span style={{ color: '#f59e0b' }}>&rarr;</span>
            </Link>

            {/* ☀️ / 🌙 Theme Toggle */}
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
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Tracking Search Hero Card */}
        <div
          style={{
            background: colors.bgSurface,
            borderRadius: '24px',
            padding: '36px 36px',
            border: `1px solid ${colors.border}`,
            boxShadow: colors.cardShadow,
            textAlign: 'center',
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#3b82f6',
            }}
          >
            <Icon name="truck" size={26} color="#3b82f6" />
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
              fontWeight: 800,
              color: colors.textMain,
              margin: '0 0 10px',
              letterSpacing: '-0.025em',
            }}
          >
            Track Your Consignment in Real-Time
          </h1>

          <p
            style={{
              color: colors.textMuted,
              fontSize: '0.94rem',
              maxWidth: 560,
              margin: '0 auto 28px',
              lineHeight: 1.6,
            }}
          >
            Enter your Ngus Tracking Code (<code>NGS-TRK-...</code>), Royal Order Number (<code>NGS-ORD-...</code>), or customer phone to trace your courier dispatch.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            style={{
              maxWidth: 620,
              margin: '0 auto',
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 300px' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Paste tracking number (e.g. NGS-TRK-...) or order number..."
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
              disabled={loading}
              style={{
                padding: '14px 30px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 6px 20px rgba(59, 130, 246, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <span>Locating...</span>
              ) : (
                <>
                  <Icon name="search" size={17} color="#FFFFFF" />
                  <span>Locate Consignment</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div
              style={{
                maxWidth: 620,
                margin: '20px auto 0',
                padding: '12px 18px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Icon name="alert" size={16} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Live Tracking Result View */}
        {trackingData && (
          <div
            style={{
              background: colors.bgSurface,
              borderRadius: '24px',
              border: `1px solid ${colors.border}`,
              padding: '32px',
              boxShadow: colors.cardShadow,
              marginBottom: 36,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                paddingBottom: 24,
                borderBottom: `1px solid ${colors.border}`,
                marginBottom: 28,
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Live Consignment Status
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.textMain, margin: 0 }}>
                    {trackingData.tracking_number}
                  </h2>
                  <button
                    onClick={() => handleCopy(trackingData.tracking_number)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedCode === trackingData.tracking_number ? '#10b981' : colors.textDim,
                      cursor: 'pointer',
                      padding: 2,
                    }}
                    title="Copy Code"
                  >
                    {copiedCode === trackingData.tracking_number ? (
                      <Icon name="check" size={18} color="#10b981" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    padding: '5px 14px',
                    borderRadius: '9999px',
                    background: trackingData.status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    border: `1px solid ${trackingData.status === 'delivered' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
                    color: trackingData.status === 'delivered' ? '#10b981' : '#3b82f6',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: trackingData.status === 'delivered' ? '#10b981' : '#3b82f6',
                    }}
                  />
                  {trackingData.status}
                </span>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: colors.textDim, textTransform: 'uppercase' }}>Fleet Service</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: colors.textMain }}>{trackingData.shipping_provider}</div>
                </div>
              </div>
            </div>

            {/* 4-Stage Stepper Progress Tracker */}
            <div
              style={{
                background: colors.bgCardSubtle,
                borderRadius: '18px',
                padding: '24px 20px',
                border: `1px solid ${colors.border}`,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 20,
                }}
              >
                {trackingData.timeline?.map((step, idx) => {
                  const isCompleted = step.status === 'completed';
                  const isInTransit = step.status === 'in_transit' || step.status === 'processing';

                  return (
                    <div key={idx} style={{ display: 'flex', gap: 14 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: isCompleted ? '#10b981' : isInTransit ? '#2563eb' : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
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

            {/* Recipient & Location Info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16,
                padding: '18px 20px',
                background: colors.bgCardSubtle,
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: colors.textDim, textTransform: 'uppercase', marginBottom: 2 }}>
                  Consignee / Recipient
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: colors.textMain }}>
                  {trackingData.recipient_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                  {trackingData.recipient_phone}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: colors.textDim, textTransform: 'uppercase', marginBottom: 2 }}>
                  Drop-Off Destination
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: colors.textMain, lineHeight: 1.4 }}>
                  {trackingData.delivery_address_snapshot}
                </div>
              </div>

              {trackingData.order && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: colors.textDim, textTransform: 'uppercase', marginBottom: 2 }}>
                    Linked Order
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f59e0b' }}>
                    {trackingData.order.order_number}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                    Total: {parseFloat(trackingData.order.grand_total).toLocaleString()} ETB ({trackingData.order.items_count} items)
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Assistance Card */}
        <div
          style={{
            background: colors.bgSurface,
            borderRadius: '20px',
            border: `1px solid ${colors.border}`,
            padding: '24px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
            boxShadow: colors.cardShadow,
          }}
        >
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: colors.textMain, margin: '0 0 4px' }}>
              Require Courier Dispatch Expediting?
            </h4>
            <p style={{ fontSize: '0.84rem', color: colors.textMuted, margin: 0 }}>
              Our Addis Ababa logistics operations team coordinates direct dispatches daily from 8:00 AM to 9:00 PM.
            </p>
          </div>

          <a
            href="tel:+251911002233"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
              color: '#090a0f',
              fontSize: '0.84rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
            }}
          >
            <span>Call Dispatch Hub (+251 911 00 22 33)</span>
          </a>
        </div>
      </main>
    </div>
  );
}
