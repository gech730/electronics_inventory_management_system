import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Orders = () => {
  const { user, showToast } = useAuth();

  // Data states
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [stockLocations, setStockLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Order Form State
  const [newOrder, setNewOrder] = useState({
    source: 'backoffice',
    fulfillment_type: 'delivery',
    customer_id: '',
    store_id: '',
    stock_location_id: '',
    shipping_fee: '0.00',
    customer_notes: '',
    internal_notes: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0 }],
  });

  // Load orders and dependencies
  const loadOrdersData = async () => {
    try {
      setLoading(true);
      const [ordRes, custRes, prodRes, storeRes, locRes] = await Promise.all([
        api.getOrders({ per_page: 50 }).catch(() => ({ data: [] })),
        api.getCustomers({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getStores({ is_active: 1 }).catch(() => ({ data: [] })),
        api.getStockLocations({ is_active: 1 }).catch(() => ({ data: [] })),
      ]);

      setOrders(ordRes?.data || []);
      setCustomers(custRes?.data || []);
      setProducts(prodRes?.data || []);
      setStores(storeRes?.data || []);
      setStockLocations(locRes?.data || []);

      if (storeRes?.data?.length > 0 && !newOrder.store_id) {
        setNewOrder((prev) => ({ ...prev, store_id: storeRes.data[0].id }));
      }
      if (locRes?.data?.length > 0 && !newOrder.stock_location_id) {
        setNewOrder((prev) => ({ ...prev, stock_location_id: locRes.data[0].id }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdersData();
  }, []);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const matchSearch =
        searchQuery === '' ||
        ord.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customer?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customer?.phone?.includes(searchQuery);

      const matchStatus = statusFilter === 'all' || ord.status === statusFilter;
      const matchSource = sourceFilter === 'all' || ord.source === sourceFilter;

      return matchSearch && matchStatus && matchSource;
    });
  }, [orders, searchQuery, statusFilter, sourceFilter]);

  // Order summary metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const confirmed = orders.filter((o) => o.status === 'confirmed').length;
    const processing = orders.filter((o) => o.status === 'processing').length;
    const shipped = orders.filter((o) => o.status === 'shipped').length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    const totalVolume = orders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);

    return { total, confirmed, processing, shipped, completed, totalVolume };
  }, [orders]);

  // View order details
  const handleViewDetails = async (order) => {
    try {
      const res = await api.getOrder(order.id);
      setSelectedOrder(res?.data || res || order);
      setIsDetailModalOpen(true);
    } catch {
      setSelectedOrder(order);
      setIsDetailModalOpen(true);
    }
  };

  // Update order status transition
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setSubmitting(true);
      await api.updateOrder(orderId, { status: newStatus });
      showToast(`Order status updated to '${newStatus}'`, 'success');
      await loadOrdersData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to update order status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add line item to form
  const addLineItem = () => {
    setNewOrder((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1, unit_price: 0 }],
    }));
  };

  const removeLineItem = (index) => {
    if (newOrder.items.length <= 1) return;
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...newOrder.items];
    updated[index][field] = value;

    if (field === 'product_id') {
      const prod = products.find((p) => String(p.id) === String(value));
      if (prod) {
        updated[index].unit_price = Number(prod.selling_price || 0);
        // Default variant if available
        if (prod.variants?.length > 0) {
          updated[index].product_variant_id = prod.variants[0].id;
        }
      }
    }

    setNewOrder((prev) => ({ ...prev, items: updated }));
  };

  // Calculate new order estimated totals
  const formSubtotal = useMemo(() => {
    return newOrder.items.reduce(
      (sum, item) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0),
      0
    );
  }, [newOrder.items]);

  const formTax = formSubtotal * 0.15;
  const formGrandTotal = formSubtotal + formTax + (parseFloat(newOrder.shipping_fee) || 0);

  // Submit new order creation
  const handleCreateOrder = async (e) => {
    e.preventDefault();

    const validItems = newOrder.items.filter((item) => item.product_id && item.quantity > 0);
    if (validItems.length === 0) {
      showToast('Please add at least one valid product line item', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        source: newOrder.source,
        fulfillment_type: newOrder.fulfillment_type,
        customer_id: newOrder.customer_id || null,
        store_id: newOrder.store_id || null,
        stock_location_id: newOrder.stock_location_id || null,
        shipping_fee: parseFloat(newOrder.shipping_fee) || 0,
        customer_notes: newOrder.customer_notes || null,
        internal_notes: newOrder.internal_notes || null,
        items: validItems.map((item) => ({
          product_variant_id: item.product_variant_id || item.product_id,
          quantity_ordered: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
        })),
      };

      await api.createOrder(payload);
      showToast('Multi-channel order created successfully!', 'success');
      setIsCreateModalOpen(false);
      setNewOrder({
        source: 'backoffice',
        fulfillment_type: 'delivery',
        customer_id: '',
        store_id: stores[0]?.id || '',
        stock_location_id: stockLocations[0]?.id || '',
        shipping_fee: '0.00',
        customer_notes: '',
        internal_notes: '',
        items: [{ product_id: '', quantity: 1, unit_price: 0 }],
      });
      await loadOrdersData();
    } catch (err) {
      showToast(err.message || 'Failed to create order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header & New Order Button */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="clipboard" size={24} color="var(--brand-blue)" />
            Omni-Channel Customer Orders
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage POS, Web Store, and Backoffice wholesale orders with automated inventory reservations
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700 }}
        >
          <Icon name="plus" size={18} />
          Create New Order
        </button>
      </div>

      {/* KPI Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Orders</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>{metrics.total}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase' }}>Confirmed</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--info)', marginTop: 4 }}>{metrics.confirmed}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase' }}>In Processing</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)', marginTop: 4 }}>{metrics.processing}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-purple)', textTransform: 'uppercase' }}>Dispatched</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-purple)', marginTop: 4 }}>{metrics.shipped}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Completed Sales</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>{metrics.completed}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Order Volume</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--brand-blue)', marginTop: 8 }}>ETB {metrics.totalVolume.toFixed(2)}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: 16,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: 260 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', display: 'flex' }}>
            <Icon name="search" size={17} />
          </div>
          <input
            type="text"
            placeholder="Search by order #, customer display name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 38px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-app)',
              fontSize: '0.88rem',
              color: 'var(--text-main)',
            }}
          />
        </div>

        {/* Source Channel Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Channel:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-app)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <option value="all">All Channels</option>
            <option value="backoffice">Backoffice (Wholesale)</option>
            <option value="online">Online E-commerce</option>
            <option value="pos">POS Register</option>
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {['all', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: statusFilter === st ? '1px solid var(--brand-blue)' : '1px solid var(--border-subtle)',
                background: statusFilter === st ? 'var(--brand-blue)' : 'var(--bg-surface)',
                color: statusFilter === st ? '#ffffff' : 'var(--text-muted)',
                textTransform: 'capitalize',
                transition: 'all 150ms ease',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Order #</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Channel</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Customer</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Items</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Grand Total</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading orders directory...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No orders match your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const statusColors = {
                    draft: { bg: 'rgba(100, 116, 139, 0.1)', text: 'var(--text-muted)' },
                    confirmed: { bg: 'rgba(22, 119, 255, 0.1)', text: 'var(--info)' },
                    processing: { bg: 'rgba(255, 159, 67, 0.15)', text: 'var(--warning)' },
                    shipped: { bg: 'rgba(99, 102, 241, 0.12)', text: 'var(--brand-purple)' },
                    completed: { bg: 'rgba(0, 176, 116, 0.1)', text: 'var(--success)' },
                    cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)' },
                  };

                  const color = statusColors[ord.status] || statusColors.draft;

                  return (
                    <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--brand-blue)' }}>
                        {ord.order_number}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(ord.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                          }}
                        >
                          {ord.source}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600 }}>{ord.customer?.display_name || 'Walk-in Retail Customer'}</div>
                        {ord.customer?.phone && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{ord.customer.phone}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600 }}>
                        {ord.items_count ?? ord.items?.length ?? 1} lines
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 800, color: 'var(--text-main)' }}>
                        ETB {Number(ord.grand_total || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: color.bg,
                            color: color.text,
                          }}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleViewDetails(ord)}
                            className="action-btn action-btn-primary"
                          >
                            <Icon name="eye" size={13} />
                            View
                          </button>
                          {(ord.status === 'confirmed' || ord.status === 'processing') && (
                            <Link
                              to={`/shipments?order_id=${ord.id}`}
                              className="action-btn action-btn-success"
                              style={{ textDecoration: 'none' }}
                              title="Create Shipment for this Order"
                            >
                              <Icon name="truck" size={13} />
                              Dispatch
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Order Details Slide-Over / Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedOrder ? `Order Details: ${selectedOrder.order_number}` : 'Order Details'}
        maxWidth={680}
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Order Header Meta */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                background: 'var(--bg-app)',
                padding: '14px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-blue)' }}>
                  {selectedOrder.status}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>SOURCE CHANNEL</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  {selectedOrder.source}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>FULFILLMENT</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'capitalize' }}>
                  {selectedOrder.fulfillment_type || 'Delivery'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>CREATED AT</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  {new Date(selectedOrder.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Customer Details */}
            {selectedOrder.customer && (
              <div style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Customer Profile
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedOrder.customer.display_name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Phone: {selectedOrder.customer.phone || 'N/A'} | Email: {selectedOrder.customer.email || 'N/A'}
                </div>
              </div>
            )}

            {/* Line Items Table */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>Order Line Items</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 10px' }}>Item Description</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600 }}>{item.product_name_snapshot || item.product?.name || `Variant #${item.product_variant_id}`}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.sku_snapshot || item.product?.sku}</div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.quantity_ordered || item.quantity}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>ETB {Number(item.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                        ETB {Number(item.line_total || ((item.quantity_ordered || item.quantity) * item.unit_price)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Order Totals */}
            <div style={{ background: 'var(--bg-app)', padding: '12px 16px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>ETB {Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>VAT (15%):</span>
                <span>ETB {Number(selectedOrder.tax_total || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Shipping Fee:</span>
                <span>ETB {Number(selectedOrder.shipping_fee || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', borderTop: '1px solid var(--border-subtle)', paddingTop: 6, color: 'var(--brand-blue)' }}>
                <span>Grand Total:</span>
                <span>ETB {Number(selectedOrder.grand_total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Order Lifecycle Progression Actions */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                Order Lifecycle Actions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedOrder.status === 'draft' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    Confirm Order & Reserve Stock
                  </button>
                )}

                {selectedOrder.status === 'confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'processing')}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 14px', background: 'var(--warning)' }}
                  >
                    Mark Processing / Picking
                  </button>
                )}

                {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'processing') && (
                  <Link
                    to={`/shipments?order_id=${selectedOrder.id}`}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                  >
                    <Icon name="truck" size={15} />
                    Dispatch Shipment &rarr;
                  </Link>
                )}

                {['draft', 'confirmed', 'processing'].includes(selectedOrder.status) && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                    disabled={submitting}
                    className="btn btn-danger"
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    Cancel Order (Release Holds)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Create Multi-Channel Order */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Multi-Channel Order"
        maxWidth={640}
      >
        <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Order Channel & Customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Source Channel
              </label>
              <select
                value={newOrder.source}
                onChange={(e) => setNewOrder({ ...newOrder, source: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.85rem' }}
              >
                <option value="backoffice">Backoffice (Wholesale)</option>
                <option value="online">Online Web Store</option>
                <option value="pos">POS Terminal</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Customer Account
              </label>
              <select
                value={newOrder.customer_id}
                onChange={(e) => setNewOrder({ ...newOrder, customer_id: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.85rem' }}
              >
                <option value="">Walk-in Retail Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name} ({c.customer_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fulfillment & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Fulfillment Type
              </label>
              <select
                value={newOrder.fulfillment_type}
                onChange={(e) => setNewOrder({ ...newOrder, fulfillment_type: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.85rem' }}
              >
                <option value="delivery">Courier Delivery</option>
                <option value="pickup">Store Counter Pickup</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Warehouse Location
              </label>
              <select
                value={newOrder.stock_location_id}
                onChange={(e) => setNewOrder({ ...newOrder, stock_location_id: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.85rem' }}
              >
                {stockLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Order Line Items */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Order Line Items</span>
              <button
                type="button"
                onClick={addLineItem}
                style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                + Add Another Product
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newOrder.items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 90px 110px 32px',
                    gap: 8,
                    alignItems: 'center',
                    background: 'var(--bg-app)',
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <select
                    value={item.product_id}
                    onChange={(e) => updateLineItem(index, 'product_id', e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                  >
                    <option value="">Select Electronic Item...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.quantity}) - ETB {Number(p.selling_price).toFixed(2)}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                  />

                  <div style={{ fontSize: '0.82rem', fontWeight: 700, textAlign: 'right' }}>
                    ETB {((Number(item.unit_price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    disabled={newOrder.items.length <= 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Shipping Fee
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newOrder.shipping_fee}
                onChange={(e) => setNewOrder({ ...newOrder, shipping_fee: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Order Notes / Reference
              </label>
              <input
                type="text"
                value={newOrder.internal_notes}
                onChange={(e) => setNewOrder({ ...newOrder, internal_notes: e.target.value })}
                placeholder="e.g. PO reference, delivery gate instructions"
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Live Order Estimate Total */}
          <div style={{ background: 'var(--brand-blue-light)', padding: '10px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-blue)' }}>ESTIMATED TOTAL (INC. 15% VAT):</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-blue)' }}>ETB {formGrandTotal.toFixed(2)}</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontWeight: 700 }}
            >
              {submitting ? 'Placing Order...' : 'Place Order & Hold Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Orders;
