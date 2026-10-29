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
      setError('Please provide your full name, phone number, and delivery address.');
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
        payment_method: paymentMethod,
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
        setLastOrder(res.data.order || res.data);
        setLastShipment(res.data.shipment || null);
        setCheckoutStep('success');
        clearCart();
      } else {
        throw new Error(res.message || 'Checkout failed');
      }
    } catch (err) {
      setError(err.data?.message || err.message || 'Checkout failed. Please try again.');
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
        background: 'rgba(3, 5, 10, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => setIsCartOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          height: '100%',
          background: 'rgba(13, 17, 27, 0.98)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '-20px 0 50px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem', color: '#f59e0b' }}>👑</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
              {checkoutStep === 'cart'
                ? `Shopping Bag (${totalCount})`
                : checkoutStep === 'checkout'
                ? 'Secure Checkout'
                : 'Order Confirmed'}
            </span>
          </div>

          <button
            onClick={() => setIsCartOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* STEP 1: SHOPPING BAG ITEMS */}
          {checkoutStep === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛍️</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
                    Your bag is empty
                  </h3>
                  <p style={{ fontSize: '0.86rem', lineHeight: 1.5, marginBottom: 24 }}>
                    Explore our collection of laptops, smartphones and flagship electronics.
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#090a0f',
                      fontWeight: 800,
                      padding: '10px 24px',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Start Shopping &rarr;
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '16px',
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#090b14',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
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
                          />
                        ) : (
                          <span style={{ fontSize: '1.5rem' }}>💻</span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                          SKU: {item.sku}
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                          ETB {Number(item.price).toLocaleString()}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff', minWidth: 16, textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
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
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.84rem',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Delivery Details */}
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  1. Contact & Delivery Address
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#cbd5e1', marginBottom: 4 }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      placeholder="e.g. Dawit Kebede"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#cbd5e1', marginBottom: 4 }}>Phone (Telebirr/Calls) *</label>
                      <input
                        type="tel"
                        required
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+251 912 345678"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#cbd5e1', marginBottom: 4 }}>City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Addis Ababa"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#cbd5e1', marginBottom: 4 }}>Delivery Street / Sub-City / House No. *</label>
                    <input
                      type="text"
                      required
                      name="delivery_address"
                      value={formData.delivery_address}
                      onChange={handleInputChange}
                      placeholder="e.g. Bole Medhanialem, House 402"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
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
                        padding: '10px',
                        borderRadius: '10px',
                        border: `1px solid ${fulfillmentType === 'delivery' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                        background: fulfillmentType === 'delivery' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>🚚 Express Courier</div>
                      <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: 2 }}>+ETB 150 (Same-Day)</div>
                    </div>

                    <div
                      onClick={() => setFulfillmentType('pickup')}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: `1px solid ${fulfillmentType === 'pickup' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                        background: fulfillmentType === 'pickup' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>🏢 Bole Showroom</div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: 2 }}>Free Pickup</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  2. Choose Payment Method
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { id: 'telebirr', name: 'Telebirr', sub: 'Ethio Telecom Mobile', icon: '📱' },
                    { id: 'cbe_birr', name: 'CBE Birr', sub: 'Commercial Bank of Ethiopia', icon: '🏦' },
                    { id: 'card', name: 'Card / Bank', sub: 'Visa, Master, Awash, Dashen', icon: '💳' },
                    { id: 'cash_on_delivery', name: 'Cash on Delivery', sub: 'Pay on Verified Receipt', icon: '💵' },
                  ].map((method) => (
                    <div
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: `1px solid ${paymentMethod === method.id ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                        background: paymentMethod === method.id ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.2rem' }}>{method.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>{method.name}</div>
                          <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 2 }}>{method.sub}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional Payment Reference */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#cbd5e1', marginBottom: 4 }}>
                    Transaction Reference / SMS Code (Optional)
                  </label>
                  <input
                    type="text"
                    name="payment_reference"
                    value={formData.payment_reference}
                    onChange={handleInputChange}
                    placeholder="e.g. TLB8934721"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.82rem',
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
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
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
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  {submitting ? 'Placing Order...' : `Place Order (ETB ${grandTotal.toLocaleString()})`}
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
              <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: 20 }}>
                Thank you, your official order has been placed and registered in the Ngus Electronics inventory system.
              </p>

              {/* Order Details Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'left',
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Order Number</span>
                  <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '0.04em' }}>
                    {lastOrder?.order_number || 'NGS-ORD-CONFIRMED'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.82rem' }}>
                  <span style={{ color: '#94a3b8' }}>Status</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Confirmed & Reserved</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.82rem' }}>
                  <span style={{ color: '#94a3b8' }}>Fulfillment</span>
                  <span style={{ color: '#ffffff' }}>
                    {fulfillmentType === 'delivery' ? 'Express Courier Dispatch' : 'Vault Pickup (Bole)'}
                  </span>
                </div>

                {(lastShipment?.tracking_number || lastOrder?.shipments?.[0]?.tracking_number) && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                    fontSize: '0.82rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}>
                    <span style={{ color: '#93c5fd', fontWeight: 600 }}>Tracking Code:</span>
                    <strong style={{ color: '#60a5fa', letterSpacing: '0.04em' }}>
                      {lastShipment?.tracking_number || lastOrder?.shipments?.[0]?.tracking_number}
                    </strong>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.94rem' }}>
                  <span style={{ fontWeight: 800, color: '#ffffff' }}>Total Paid</span>
                  <span style={{ fontWeight: 900, color: '#f59e0b' }}>
                    ETB {Number(lastOrder?.grand_total || grandTotal).toLocaleString()}
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
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
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
                    color: '#fbbf24',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  View My Order History & Receipts
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
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
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

        {/* Drawer Footer (Only on Cart Step) */}
        {checkoutStep === 'cart' && cart.length > 0 && (
          <div
            style={{
              padding: '20px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(9, 12, 19, 0.95)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
              <span>Subtotal</span>
              <span>ETB {subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
              <span>VAT (15% Tax Invoiced)</span>
              <span>ETB {tax.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 12 }}>
              <span>Express Delivery</span>
              <span style={{ color: '#10b981' }}>+ETB 150.00</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', marginBottom: 16 }}>
              <span>Grand Total</span>
              <span style={{ color: '#f59e0b' }}>ETB {(grandTotal).toLocaleString()}</span>
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
                padding: '13px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                border: 'none',
                color: '#090a0f',
                fontWeight: 900,
                fontSize: '0.94rem',
                cursor: 'pointer',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.45)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {isAuthenticated ? 'Proceed to Checkout →' : 'Sign In to Checkout →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerCartDrawer;
