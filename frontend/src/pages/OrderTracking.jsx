import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import Icon from '../components/Icons';

export default function OrderTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [query, setQuery] = useState(initialRef);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  const fetchTracking = async (refToTrack) => {
    const clean = (refToTrack || query || '').trim();
    if (!clean) {
      setError('Please enter a tracking number, order number, or phone number.');
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
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #171d36 0%, #070810 50%, #040508 100%)',
      color: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Background ambient gold/blue light */}
      <div style={{
        position: 'absolute',
        top: -100,
        left: '25%',
        width: 700,
        height: 450,
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
        filter: 'blur(90px)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(20px)',
        background: 'rgba(7, 8, 16, 0.85)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px 24px',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                <path d="M5 19h14" />
              </svg>
            </div>
            <div>
              <div style={{
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: '0.04em',
                background: 'linear-gradient(90deg, #ffffff 0%, #fef3c7 60%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                NGUS ELECTRONICS
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Global Dispatch & Tracking
              </div>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/customer/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: '#fbbf24',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Icon name="receipt" size={15} color="#fbbf24" />
              <span>My Orders Ledger</span>
            </Link>

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
              }}
            >
              <span>Back to Boutique</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px 80px', position: 'relative', zIndex: 1 }}>
        {/* Tracking Search Hero Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(22, 27, 46, 0.9) 0%, rgba(13, 16, 28, 0.95) 100%)',
          borderRadius: 24,
          padding: '36px 36px',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45)',
          textAlign: 'center',
          marginBottom: 36,
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#60a5fa',
          }}>
            <Icon name="truck" size={26} color="#60a5fa" />
          </div>

          <h1 style={{
            fontSize: 'clamp(24px, 4vw, 34px)',
            fontWeight: 800,
            color: '#ffffff',
            margin: '0 0 10px',
            letterSpacing: '-0.02em',
          }}>
            Track Your Consignment in Real-Time
          </h1>

          <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 560, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Enter your Ngus Tracking Code (<code>NGS-TRK-...</code>), Royal Order Number (<code>NGS-ORD-...</code>), or registered phone to inspect live dispatch milestones.
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
                placeholder="Paste tracking number or order number..."
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 14,
                  background: 'rgba(7, 9, 18, 0.85)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '16px 32px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Icon name="search" size={18} color="#ffffff" />
                  <span>Locate Consignment</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div style={{
              maxWidth: 620,
              margin: '20px auto 0',
              padding: '12px 18px',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              <Icon name="alert" size={16} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Live Tracking Result View */}
        {trackingData && (
          <div style={{
            background: 'rgba(15, 18, 32, 0.85)',
            borderRadius: 24,
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '32px',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.4)',
            marginBottom: 36,
          }}>
            {/* Top Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              paddingBottom: 24,
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 28,
            }}>
              <div>
                <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Live Consignment Status
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    {trackingData.tracking_number}
                  </h2>
                  <button
                    onClick={() => handleCopy(trackingData.tracking_number)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedCode === trackingData.tracking_number ? '#34d399' : '#64748b',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                    title="Copy code"
                  >
                    {copiedCode === trackingData.tracking_number ? (
                      <Icon name="check" size={18} color="#34d399" />
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
                <span style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: trackingData.status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  border: trackingData.status === 'delivered' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(59, 130, 246, 0.35)',
                  color: trackingData.status === 'delivered' ? '#34d399' : '#60a5fa',
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: trackingData.status === 'delivered' ? '#34d399' : '#60a5fa',
                  }} />
                  {trackingData.status}
                </span>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Fleet Service</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{trackingData.shipping_provider}</div>
                </div>
              </div>
            </div>

            {/* 4-Stage Stepper Progress Tracker */}
            <div style={{
              background: 'rgba(7, 9, 18, 0.65)',
              borderRadius: 20,
              padding: '32px 24px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: 32,
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 24,
              }}>
                {trackingData.timeline?.map((step, idx) => {
                  const isCompleted = step.status === 'completed';
                  const isInTransit = step.status === 'in_transit' || step.status === 'processing';

                  return (
                    <div key={idx} style={{ display: 'flex', gap: 16 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: isCompleted ? '#10b981' : isInTransit ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        fontWeight: 800,
                        flexShrink: 0,
                        boxShadow: isInTransit ? '0 0 20px rgba(37, 99, 235, 0.6)' : 'none',
                      }}>
                        {isCompleted ? (
                          <Icon name="check" size={18} color="#ffffff" />
                        ) : (
                          <span>{step.step}</span>
                        )}
                      </div>

                      <div>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: isCompleted ? '#34d399' : isInTransit ? '#60a5fa' : '#94a3b8',
                          marginBottom: 4,
                        }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 6 }}>
                          {step.description}
                        </div>
                        <div style={{ fontSize: 11, color: isCompleted || isInTransit ? '#e2e8f0' : '#475569', fontWeight: 600 }}>
                          {step.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recipient & Location Info */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
              padding: '20px 24px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  Consignee / Recipient
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                  {trackingData.recipient_name}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  {trackingData.recipient_phone}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  Drop-Off Destination
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4 }}>
                  {trackingData.delivery_address_snapshot}
                </div>
              </div>

              {trackingData.order && (
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                    Linked Order
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>
                    {trackingData.order.order_number}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    Total: {parseFloat(trackingData.order.grand_total).toLocaleString()} ETB ({trackingData.order.items_count} items)
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Assistance Card */}
        <div style={{
          background: 'rgba(15, 18, 32, 0.6)',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>
              Require Courier Dispatch Expediting?
            </h4>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              Our Addis Ababa logistics operations team coordinates direct dispatches daily from 8:00 AM to 9:00 PM.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <a
              href="tel:+251911002233"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fbbf24',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>Call Dispatch Hub</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
