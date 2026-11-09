import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Icon from './Icons';

export const CustomerCartDrawer = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    tax,
    totalCount,
    isCartOpen,
    setIsCartOpen,
    checkoutStep,
    setCheckoutStep,
    lastOrder,
    setLastOrder,
  } = useCart();

  // ── Dynamic Theme Synchronization ────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('ngus_theme') || 'dark');

  useEffect(() => {
    const syncTheme = () => {
      const current = localStorage.getItem('ngus_theme') || document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(current);
    };
    syncTheme();
    window.addEventListener('storage', syncTheme);
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      window.removeEventListener('storage', syncTheme);
      observer.disconnect();
    };
  }, []);

  const isDark = theme === 'dark';

  const colors = {
    bgOverlay: 'rgba(3, 5, 10, 0.7)',
    bgDrawer: isDark ? '#0d111b' : '#FCF9F7',
    bgCard: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
    bgInput: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
    borderHover: isDark ? 'rgba(245, 158, 11, 0.5)' : '#F59E0B',
    textMain: isDark ? '#FFFFFF' : '#18181B',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    textDim: isDark ? '#64748B' : '#94A3B8',
    footerBg: isDark ? 'rgba(10, 13, 22, 0.95)' : 'rgba(252, 249, 247, 0.95)',
    cardShadow: isDark ? '0 10px 30px rgba(0,0,0,0.45)' : '0 4px 16px rgba(15, 23, 42, 0.04)',
  };

  const [lastShipment, setLastShipment] = useState(null);
  const [fulfillmentType, setFulfillmentType] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('telebirr');
  const [formData, setFormData] = useState({
    customer_name: user?.name || '',
    phone: '',
    email: user?.email || '',
    delivery_address: '',
    city: 'Addis Ababa',
    payment_reference: '',
    customer_notes: '',
  });

  // Prefill user details if available
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        customer_name: prev.customer_name || user.name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isCartOpen) return null;

  const shippingFee = fulfillmentType === 'delivery' ? 150 : 0;
  const grandTotal = subtotal + tax + shippingFee;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.phone || !formData.delivery_address) {
      setError('Please provide your full name, phone number, and delivery destination.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const payload = {
        customer_name: formData.customer_name,
        phone: formData.phone,
        email: formData.email || undefined,
        delivery_address: formData.delivery_address,
        city: formData.city,
        fulfillment_type: fulfillmentType,
        payment_method: paymentMethod === 'cash_on_delivery' ? 'cash' : paymentMethod,
        payment_reference: formData.payment_reference || undefined,
        customer_notes: formData.customer_notes || undefined,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      };

      const res = await api.checkout(payload);

      if (res && res.data) {
        const orderData = res.data.order || res.data;
        const shipmentData = res.data.shipment || null;
        setLastOrder(orderData);
        setLastShipment(shipmentData);
        setCheckoutStep('success');
        clearCart();

        // Notify other components (like CustomerDashboard) to refresh orders immediately
        window.dispatchEvent(new CustomEvent('ngus_order_placed', { detail: res.data }));
      } else {
        throw new Error(res.message || 'Checkout failed');
      }
    } catch (err) {
      setError(err.data?.message || err.message || 'Checkout failed. Please verify your entries.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: colors.bgOverlay,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => setIsCartOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 490,
          height: '100%',
          background: colors.bgDrawer,
          borderLeft: `1px solid ${colors.border}`,
          boxShadow: isDark ? '-20px 0 50px rgba(0, 0, 0, 0.8)' : '-10px 0 40px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          color: colors.textMain,
          transition: 'background-color 0.3s ease, color 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── DRAWER HEADER ────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.25rem', color: '#f59e0b' }}>👑</span>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: colors.textMain, letterSpacing: '-0.01em' }}>
                {checkoutStep === 'cart'
                  ? `Shopping Bag (${totalCount})`
                  : checkoutStep === 'checkout'
                  ? 'Secure Checkout'
                  : 'Order Confirmed'}
              </div>
              <div style={{ fontSize: '0.68rem', color: colors.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Ngus Official Hardware Reserve
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(false)}
            aria-label="Close Bag"
            style={{
              background: colors.bgCard,
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ✕
          </button>
        </div>

        {/* ── DRAWER CONTENT AREA ──────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* STEP 1: SHOPPING BAG ITEMS */}
          {checkoutStep === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: colors.textMuted }}>
                  <div style={{ fontSize: '3.2rem', marginBottom: 16 }}>🛍️</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: colors.textMain, marginBottom: 8 }}>
                    Your shopping bag is empty
                  </h3>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6, maxWidth: 320, margin: '0 auto 24px' }}>
                    Explore our collection of flagship workstations, iPhones, MacBooks, and noise-cancelling audio.
                  </p>
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      const el = document.getElementById('catalog');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#090a0f',
                      fontWeight: 800,
                      padding: '12px 28px',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
                    }}
                  >
                    Explore Hardware &rarr;
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px',
                        background: colors.bgCard,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '16px',
                        boxShadow: colors.cardShadow,
                      }}
                    >
                      <div
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: isDark ? '#090b14' : '#F1F5F9',
                          border: `1px solid ${colors.border}`,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '1.4rem' }}>📱</span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: colors.textDim, marginTop: 2 }}>
                          SKU: {item.sku}
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                          {Number(item.price).toLocaleString()} ETB
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                            color: colors.textMain,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: colors.textMain, minWidth: 18, textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                            color: colors.textMain,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '0.86rem',
                        }}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* STEP 2: CHECKOUT FORM & PAYMENT SELECTION */}
          {checkoutStep === 'checkout' && (
            <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '0.84rem',
                  }}
                >
                  {error}
                </div>
              )}

              {/* 1. Contact & Delivery Address */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  1. Contact &amp; Delivery Destination
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      placeholder="e.g. Henok Tadesse"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: colors.bgInput,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                        Direct Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+251 9XX XXX XXX"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: colors.bgInput,
                          border: `1px solid ${colors.border}`,
                          color: colors.textMain,
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Addis Ababa"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: colors.bgInput,
                          border: `1px solid ${colors.border}`,
                          color: colors.textMain,
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                      Street / Sub-City / Building Destination *
                    </label>
                    <input
                      type="text"
                      required
                      name="delivery_address"
                      value={formData.delivery_address}
                      onChange={handleInputChange}
                      placeholder="e.g. Bole Medhanialem Tower, Suite 402"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: colors.bgInput,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Fulfillment Type Toggle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                    <div
                      onClick={() => setFulfillmentType('delivery')}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: `1px solid ${fulfillmentType === 'delivery' ? '#f59e0b' : colors.border}`,
                        background: fulfillmentType === 'delivery' ? 'rgba(245, 158, 11, 0.12)' : colors.bgCard,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: colors.textMain }}>🚚 Express Courier</div>
                      <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: 2 }}>+150 ETB (Addis Same-Day)</div>
                    </div>

                    <div
                      onClick={() => setFulfillmentType('pickup')}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: `1px solid ${fulfillmentType === 'pickup' ? '#f59e0b' : colors.border}`,
                        background: fulfillmentType === 'pickup' ? 'rgba(245, 158, 11, 0.12)' : colors.bgCard,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: colors.textMain }}>🏢 Bole Showroom</div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: 2 }}>Free Store Collection</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Payment Method Selection (Strictly Telebirr, CBE Birr & Cash) */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  2. Payment Method (Telebirr, CBE Birr &amp; Cash)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  {[
                    { id: 'telebirr', name: 'Telebirr', sub: 'Ethio Telecom (Sandbox)', icon: '📱' },
                    { id: 'cbe_birr', name: 'CBE Birr', sub: 'CBE Mobile Banking (Sandbox)', icon: '🏦' },
                    { id: 'cash', name: 'Cash on Delivery', sub: 'Pay Upon Inspection / Showroom', icon: '💵' },
                  ].map((method) => {
                    const isSelected = paymentMethod === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => {
                          setPaymentMethod(method.id);
                          if (method.id === 'telebirr' && !formData.payment_reference) {
                            setFormData((prev) => ({ ...prev, payment_reference: `TLB-SBX-${Math.floor(100000 + Math.random() * 900000)}` }));
                          } else if (method.id === 'cbe_birr' && !formData.payment_reference) {
                            setFormData((prev) => ({ ...prev, payment_reference: `CBE-SBX-${Math.floor(100000 + Math.random() * 900000)}` }));
                          } else if (method.id === 'cash') {
                            setFormData((prev) => ({ ...prev, payment_reference: '' }));
                          }
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '14px',
                          border: `1px solid ${isSelected ? '#f59e0b' : colors.border}`,
                          background: isSelected ? 'rgba(245, 158, 11, 0.12)' : colors.bgCard,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '1.25rem' }}>{method.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: colors.textMain }}>{method.name}</div>
                            <div style={{ fontSize: '0.68rem', color: colors.textDim, marginTop: 2 }}>{method.sub}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Telebirr Sandbox Simulator Banner */}
                {paymentMethod === 'telebirr' && (
                  <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px dashed #3b82f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#60a5fa' }}>📱 Telebirr Sandbox Mode Active</span>
                      <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', fontWeight: 700 }}>VERIFIED SIMULATION</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: colors.textMuted, lineHeight: 1.4 }}>
                      Merchant Code: <strong>NGUS-TEL-9901</strong> | USSD Code: <strong>*127#</strong>. Instant simulated test clearance.
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, payment_reference: `TLB-SBX-${Math.floor(100000 + Math.random() * 900000)}` }))}
                      style={{ marginTop: 8, padding: '6px 12px', borderRadius: '8px', background: '#2563eb', border: 'none', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ⚡ Re-generate Telebirr Approval Code
                    </button>
                  </div>
                )}

                {/* CBE Birr Sandbox Simulator Banner */}
                {paymentMethod === 'cbe_birr' && (
                  <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px dashed #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#34d399' }}>🏦 CBE Birr Sandbox Gateway Active</span>
                      <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontWeight: 700 }}>VERIFIED SIMULATION</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: colors.textMuted, lineHeight: 1.4 }}>
                      CBE Shortcode: <strong>552211</strong> | Account: <strong>1000-4829-1029</strong>. Instant simulated clearance.
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, payment_reference: `CBE-SBX-${Math.floor(100000 + Math.random() * 900000)}` }))}
                      style={{ marginTop: 8, padding: '6px 12px', borderRadius: '8px', background: '#059669', border: 'none', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ⚡ Re-generate CBE Birr Approval Code
                    </button>
                  </div>
                )}

                {/* Optional Payment Reference */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                    {paymentMethod === 'cash' ? 'Special Instructions / Change Notes (Optional)' : 'Transaction Reference / SMS Receipt Code'}
                  </label>
                  <input
                    type="text"
                    name="payment_reference"
                    value={formData.payment_reference}
                    onChange={handleInputChange}
                    placeholder={paymentMethod === 'cash' ? 'e.g. Please bring change for 1,000 ETB note' : 'e.g. TLB-SBX-492102 or CBE-SBX-883104'}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: colors.bgInput,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                      fontSize: '0.84rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setCheckoutStep('cart')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '9999px',
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.textMain,
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  &larr; Back
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    border: 'none',
                    color: '#090a0f',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 18px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  {submitting ? 'Placing Order...' : `Authorize (${grandTotal.toLocaleString()} ETB)`}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ORDER SUCCESS & RECEIPT */}
          {checkoutStep === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>👑</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b', marginBottom: 6 }}>
                Order Confirmed!
              </h2>
              <p style={{ fontSize: '0.88rem', color: colors.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
                Your order has been officially verified and reserved in the Ngus Electronics inventory ledger.
              </p>

              {/* Order Confirmation Card */}
              <div
                style={{
                  background: colors.bgCard,
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '18px',
                  padding: '20px',
                  textAlign: 'left',
                  marginBottom: 24,
                  boxShadow: colors.cardShadow,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.74rem', color: colors.textDim }}>Order Reference</span>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '0.04em' }}>
                    {lastOrder?.order_number || 'NGS-ORD-CONFIRMED'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.82rem' }}>
                  <span style={{ color: colors.textMuted }}>Ledger Status</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Confirmed &amp; Reserved</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.82rem' }}>
                  <span style={{ color: colors.textMuted }}>Fulfillment</span>
                  <span style={{ color: colors.textMain, fontWeight: 600 }}>
                    {fulfillmentType === 'delivery' ? 'Express Courier Dispatch' : 'Showroom Pickup (Bole)'}
                  </span>
                </div>

                {(lastShipment?.tracking_number || lastOrder?.shipments?.[0]?.tracking_number) && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                      fontSize: '0.82rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                    }}
                  >
                    <span style={{ color: '#3b82f6', fontWeight: 600 }}>Tracking Code:</span>
                    <strong style={{ color: '#3b82f6', letterSpacing: '0.04em' }}>
                      {lastShipment?.tracking_number || lastOrder?.shipments?.[0]?.tracking_number}
                    </strong>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 10,
                    borderTop: `1px solid ${colors.border}`,
                    fontSize: '1rem',
                  }}
                >
                  <span style={{ fontWeight: 800, color: colors.textMain }}>Total Settled</span>
                  <span style={{ fontWeight: 900, color: '#f59e0b' }}>
                    {Number(lastOrder?.grand_total || grandTotal).toLocaleString()} ETB
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(lastShipment?.tracking_number || lastOrder?.order_number) && (
                  <button
                    onClick={() => {
                      const refCode = lastShipment?.tracking_number || lastOrder?.order_number;
                      setIsCartOpen(false);
                      setCheckoutStep('cart');
                      navigate(`/tracking?ref=${encodeURIComponent(refCode)}`);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '9999px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
                    }}
                  >
                    Track Package Progress Live &rarr;
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutStep('cart');
                    navigate('/customer/dashboard');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '9999px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#f59e0b',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  View My Order History &amp; Receipts
                </button>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutStep('cart');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '9999px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.textMuted,
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── DRAWER FOOTER (Cart Step) ────────────────────────────── */}
        {checkoutStep === 'cart' && cart.length > 0 && (
          <div
            style={{
              padding: '20px 24px',
              borderTop: `1px solid ${colors.border}`,
              background: colors.footerBg,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: colors.textMuted, marginBottom: 6 }}>
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString()} ETB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: colors.textMuted, marginBottom: 6 }}>
              <span>VAT (15% Tax Invoiced)</span>
              <span>{tax.toLocaleString()} ETB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: colors.textMuted, marginBottom: 12 }}>
              <span>Express Delivery</span>
              <span style={{ color: '#10b981' }}>+150.00 ETB</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 900, color: colors.textMain, marginBottom: 16 }}>
              <span>Total</span>
              <span style={{ color: '#f59e0b' }}>{(grandTotal).toLocaleString()} ETB</span>
            </div>

            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setIsCartOpen(false);
                  navigate('/login?redirect=/');
                  return;
                }
                setCheckoutStep('checkout');
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                border: 'none',
                color: '#090a0f',
                fontWeight: 900,
                fontSize: '0.94rem',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
                transition: 'transform 0.2s',
              }}
            >
              {isAuthenticated ? 'Proceed to Secure Checkout →' : 'Sign In to Checkout →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerCartDrawer;
