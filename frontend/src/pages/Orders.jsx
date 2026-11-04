import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Orders = () => {
  const { user, showToast } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'shipments' ? 'shipments' : 'orders';
  const [activeTab, setActiveTab] = useState(initialTab); // 'orders' | 'shipments'

  // Data states
  const [orders, setOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
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
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isShipmentDetailOpen, setIsShipmentDetailOpen] = useState(false);
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

  // Dispatch Package Form State
  const [dispatchForm, setDispatchForm] = useState({
    order_id: '',
    shipping_provider: 'DHL Express Ethiopia',
    tracking_number: '',
    recipient_name: '',
    recipient_phone: '',
    notes: '',
  });

  // Load orders, shipments, and dependencies
  const loadData = async () => {
    try {
      setLoading(true);
      const [ordRes, shipRes, custRes, prodRes, storeRes, locRes] = await Promise.all([
        api.getOrders({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getShipments({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getCustomers({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getStores({ is_active: 1 }).catch(() => ({ data: [] })),
        api.getStockLocations({ is_active: 1 }).catch(() => ({ data: [] })),
      ]);

      setOrders(ordRes?.data || []);
      setShipments(shipRes?.data || []);
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
      showToast(err.message || 'Failed to load order & shipment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'shipments' ? { tab: 'shipments' } : {});
  };

  // Filtered orders
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

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((shp) => {
      const matchSearch =
        searchQuery === '' ||
        shp.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shp.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shp.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shp.order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'all' || shp.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [shipments, searchQuery, statusFilter]);

  // Metrics
  const orderMetrics = useMemo(() => {
    const total = orders.length;
    const confirmed = orders.filter((o) => o.status === 'confirmed').length;
    const processing = orders.filter((o) => o.status === 'processing').length;
    const shipped = orders.filter((o) => o.status === 'shipped').length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    const totalVolume = orders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
    return { total, confirmed, processing, shipped, completed, totalVolume };
  }, [orders]);

  const shipmentMetrics = useMemo(() => {
    const total = shipments.length;
    const inTransit = shipments.filter((s) => s.status === 'shipped' || s.status === 'in_transit').length;
    const delivered = shipments.filter((s) => s.status === 'delivered').length;
    return { total, inTransit, delivered };
  }, [shipments]);

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

  // Update order status
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setSubmitting(true);
      await api.updateOrder(orderId, { status: newStatus });
      showToast(`Order status updated to '${newStatus}'`, 'success');
      await loadData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to update order status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Dispatch Modal for an Order
  const handleOpenDispatch = (order) => {
    const defaultTracking = `TRK-${Date.now().toString().slice(-6)}`;
    setDispatchForm({
      order_id: String(order.id),
      shipping_provider: 'DHL Express Ethiopia',
      tracking_number: defaultTracking,
      recipient_name: order.customer?.display_name || 'Retail Client',
      recipient_phone: order.customer?.phone || '',
      notes: `Courier package dispatch for Order #${order.order_number || order.id}`,
    });
    setIsDispatchModalOpen(true);
  };

  // Submit Package Dispatch
  const handleCreateShipment = async (e) => {
    e.preventDefault();
    if (!dispatchForm.order_id) {
      showToast('Please select a valid order to dispatch', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const targetOrd = orders.find((o) => String(o.id) === String(dispatchForm.order_id));
      const itemsPayload = (targetOrd?.items || [{ id: 1, quantity_ordered: 1 }]).map((it) => ({
        order_item_id: it.id,
        quantity_shipped: it.quantity_ordered || 1,
      }));

      await api.createShipment({
        order_id: dispatchForm.order_id,
        shipping_provider: dispatchForm.shipping_provider,
        tracking_number: dispatchForm.tracking_number,
        recipient_name: dispatchForm.recipient_name,
        recipient_phone: dispatchForm.recipient_phone,
        notes: dispatchForm.notes || null,
        items: itemsPayload,
      });

      // Advance order status to 'shipped'
      await api.updateOrder(dispatchForm.order_id, { status: 'shipped' }).catch(() => {});

      showToast(`Package successfully dispatched! Tracking: ${dispatchForm.tracking_number}`, 'success');
      setIsDispatchModalOpen(false);
      await loadData();
      setActiveTab('shipments');
    } catch (err) {
      showToast(err.message || 'Failed to dispatch shipment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark Shipment as Delivered
  const handleMarkDelivered = async (shipment) => {
    try {
      setSubmitting(true);
      await api.updateShipment(shipment.id, { status: 'delivered' });
      if (shipment.order_id) {
        await api.updateOrder(shipment.order_id, { status: 'completed' }).catch(() => {});
      }
      showToast(`Shipment #${shipment.shipment_number || shipment.id} marked as DELIVERED!`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update shipment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add line item to order form
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
        if (prod.variants?.length > 0) {
          updated[index].product_variant_id = prod.variants[0].id;
        }
      }
    }

    setNewOrder((prev) => ({ ...prev, items: updated }));
  };

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
      showToast('Customer order created successfully!', 'success');
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
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to create order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = {
    pending: { label: 'Pending', bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' },
    confirmed: { label: 'Confirmed', bg: 'rgba(56, 189, 248, 0.12)', color: '#0284c7' },
    processing: { label: 'Processing', bg: 'rgba(168, 85, 247, 0.12)', color: '#9333ea' },
    shipped: { label: 'Shipped', bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
    completed: { label: 'Completed', bg: 'rgba(34, 197, 94, 0.12)', color: '#16a34a' },
    delivered: { label: 'Delivered', bg: 'rgba(34, 197, 94, 0.12)', color: '#16a34a' },
    cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header with Unified Tab Switcher */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="clipboard" size={24} color="var(--brand-blue)" />
              Orders & Delivery Logistics
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Customer orders, package dispatches, courier tracking, and fulfillment in one unified tab
          </p>
        </div>

        {/* View Switcher Pills */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-app)',
              padding: 4,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => switchTab('orders')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'orders' ? 'var(--brand-blue)' : 'transparent',
                color: activeTab === 'orders' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="clipboard" size={15} />
              Customer Orders ({orderMetrics.total})
            </button>
            <button
              onClick={() => switchTab('shipments')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'shipments' ? 'var(--brand-blue)' : 'transparent',
                color: activeTab === 'shipments' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="truck" size={15} />
              Shipments & Deliveries ({shipmentMetrics.total})
            </button>
          </div>

          {activeTab === 'orders' ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', fontWeight: 700 }}
            >
              <Icon name="plus" size={16} />
              + New Order
            </button>
          ) : (
            <button
              onClick={() => {
                const pendingOrd = orders.find((o) => ['confirmed', 'processing'].includes(o.status)) || orders[0];
                if (pendingOrd) handleOpenDispatch(pendingOrd);
                else setIsDispatchModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', fontWeight: 700 }}
            >
              <Icon name="truck" size={16} />
              + Dispatch Package
            </button>
          )}
        </div>
      </div>

      {/* Guide Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.2rem' }}>🚚</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8' }}>
              Unified Order-to-Delivery Process
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>
              <strong>1. Receive Order</strong> ➔ <strong>2. Confirm & Pack</strong> ➔ <strong>3. Click "Dispatch Package"</strong> to generate tracking code ➔ <strong>4. Mark Delivered</strong> when customer signs.
            </p>
          </div>
        </div>
      </div>

      {/* TAB 1: Customer Orders */}
      {activeTab === 'orders' && (
        <>
          {/* Order Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL ORDERS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4 }}>{orderMetrics.total}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: '#ca8a04', fontWeight: 600 }}>CONFIRMED & READY</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#ca8a04' }}>{orderMetrics.confirmed + orderMetrics.processing}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>OUT FOR DELIVERY</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#2563eb' }}>{orderMetrics.shipped}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>COMPLETED SALES</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#16a34a' }}>{orderMetrics.completed}</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              background: 'var(--bg-surface)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <input
              type="text"
              placeholder="Search by Order #, Customer name, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: 260,
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                fontSize: '0.88rem',
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing / Packing</option>
              <option value="shipped">Shipped / Dispatched</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Orders Table */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Order #</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Customer</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Fulfillment</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Total Amount</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No orders found matching the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const st = statusConfig[ord.status] || { label: ord.status, bg: 'rgba(100, 116, 139, 0.12)', color: 'var(--text-muted)' };
                      const canDispatch = ['confirmed', 'processing', 'pending'].includes(ord.status);

                      return (
                        <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 18px', fontWeight: 700 }}>
                            <button
                              onClick={() => handleViewDetails(ord)}
                              style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                            >
                              {ord.order_number || `ORD-${ord.id}`}
                            </button>
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ fontWeight: 600 }}>{ord.customer?.display_name || 'Walk-in Retail Client'}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{ord.customer?.phone || 'No phone'}</div>
                          </td>
                          <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {new Date(ord.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                              {ord.fulfillment_type || 'Delivery'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', fontWeight: 800, color: 'var(--text-main)' }}>
                            ETB {Number(ord.grand_total || ord.total_amount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: st.bg,
                                color: st.color,
                              }}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => handleViewDetails(ord)}
                                className="action-btn action-btn-view"
                                title="View Order Line Items"
                              >
                                View
                              </button>

                              {canDispatch && (
                                <button
                                  onClick={() => handleOpenDispatch(ord)}
                                  className="action-btn action-btn-primary"
                                  style={{ background: '#2563eb', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                                  title="Dispatch Package & Generate Tracking"
                                >
                                  <Icon name="truck" size={12} />
                                  Dispatch
                                </button>
                              )}

                              {ord.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateStatus(ord.id, 'confirmed')}
                                  className="action-btn action-btn-primary"
                                  style={{ background: '#16a34a', color: '#fff', border: 'none' }}
                                >
                                  Approve
                                </button>
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
        </>
      )}

      {/* TAB 2: Shipments & Deliveries */}
      {activeTab === 'shipments' && (
        <>
          {/* Shipment Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL DISPATCHED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4 }}>{shipmentMetrics.total}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>IN TRANSIT / ON THE ROAD</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#2563eb' }}>{shipmentMetrics.inTransit}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>SUCCESSFULLY DELIVERED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#16a34a' }}>{shipmentMetrics.delivered}</div>
            </div>
          </div>

          {/* Shipments Table */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Dispatched Delivery Packages</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Courier waybills, tracking codes, and customer package deliveries
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Shipment #</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Tracking Code</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Carrier</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Recipient</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date Dispatched</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No dispatched packages recorded yet. Click "+ Dispatch Package" to ship confirmed orders.
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map((shp) => {
                      const isDelivered = shp.status === 'delivered';

                      return (
                        <tr key={shp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 18px', fontWeight: 700 }}>
                            {shp.shipment_number || `SHP-${shp.id}`}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                background: 'rgba(56, 189, 248, 0.1)',
                                color: '#0284c7',
                                padding: '3px 8px',
                                borderRadius: 6,
                              }}
                            >
                              {shp.tracking_number || 'TRK-PENDING'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', fontWeight: 600 }}>
                            {shp.shipping_provider || 'Local Delivery'}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ fontWeight: 600 }}>{shp.recipient_name}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{shp.recipient_phone}</div>
                          </td>
                          <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {new Date(shp.shipped_at || shp.created_at).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: isDelivered ? 'rgba(34, 197, 94, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                color: isDelivered ? '#16a34a' : '#2563eb',
                              }}
                            >
                              {shp.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                            {!isDelivered ? (
                              <button
                                onClick={() => handleMarkDelivered(shp)}
                                className="action-btn action-btn-primary"
                                style={{ background: '#16a34a', color: '#fff', border: 'none' }}
                                title="Confirm Customer Received Package"
                              >
                                Mark Delivered
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Create Order */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Customer Order"
        maxWidth={700}
      >
        <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                Customer Account
              </label>
              <select
                value={newOrder.customer_id}
                onChange={(e) => setNewOrder({ ...newOrder, customer_id: e.target.value })}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
              >
                <option value="">Select Customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name} ({c.phone || c.customer_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                Fulfillment Type
              </label>
              <select
                value={newOrder.fulfillment_type}
                onChange={(e) => setNewOrder({ ...newOrder, fulfillment_type: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
              >
                <option value="delivery">Courier Delivery</option>
                <option value="pickup">Store Counter Pickup</option>
              </select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 700 }}>Order Items</label>
              <button
                type="button"
                onClick={addLineItem}
                style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
              >
                + Add Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newOrder.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                  <select
                    value={item.product_id}
                    onChange={(e) => updateLineItem(idx, 'product_id', e.target.value)}
                    required
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.85rem' }}
                  >
                    <option value="">Select Electronics Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ETB {Number(p.selling_price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)}
                    placeholder="Price"
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}
                  />
                  {newOrder.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: 8, textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: 'var(--brand-blue)' }}>
            Estimated Grand Total: ETB {formGrandTotal.toFixed(2)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Dispatch Shipment */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Delivery Package"
        maxWidth={550}
      >
        <form onSubmit={handleCreateShipment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Select Order to Ship
            </label>
            <select
              value={dispatchForm.order_id}
              onChange={(e) => {
                const targetOrd = orders.find((o) => String(o.id) === String(e.target.value));
                if (targetOrd) handleOpenDispatch(targetOrd);
                else setDispatchForm({ ...dispatchForm, order_id: e.target.value });
              }}
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
            >
              <option value="">Select Order...</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number || `ORD-${o.id}`} - {o.customer?.display_name || 'Retail Client'} (ETB {Number(o.grand_total || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                Courier / Carrier
              </label>
              <select
                value={dispatchForm.shipping_provider}
                onChange={(e) => setDispatchForm({ ...dispatchForm, shipping_provider: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
              >
                <option value="DHL Express Ethiopia">DHL Express Ethiopia</option>
                <option value="Local Addis Dispatch Courier">Local Addis Dispatch Courier</option>
                <option value="EMS Post Ethiopia">EMS Post Ethiopia</option>
                <option value="Customer In-Store Pickup">Customer In-Store Pickup</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                Tracking Code
              </label>
              <input
                type="text"
                required
                value={dispatchForm.tracking_number}
                onChange={(e) => setDispatchForm({ ...dispatchForm, tracking_number: e.target.value })}
                placeholder="TRK-XXXX"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                Recipient Name
              </label>
              <input
                type="text"
                required
                value={dispatchForm.recipient_name}
                onChange={(e) => setDispatchForm({ ...dispatchForm, recipient_name: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                Recipient Phone
              </label>
              <input
                type="text"
                required
                value={dispatchForm.recipient_phone}
                onChange={(e) => setDispatchForm({ ...dispatchForm, recipient_phone: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={() => setIsDispatchModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Dispatching...' : 'Dispatch & Ship Package'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Order Details */}
      {selectedOrder && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Order #${selectedOrder.order_number || selectedOrder.id}`}
          maxWidth={650}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-app)', padding: 14, borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>CUSTOMER</div>
                <div style={{ fontWeight: 800 }}>{selectedOrder.customer?.display_name || 'Retail Client'}</div>
                <div style={{ fontSize: '0.8rem' }}>{selectedOrder.customer?.phone || 'No phone'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>GRAND TOTAL</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-blue)' }}>
                  ETB {Number(selectedOrder.grand_total || selectedOrder.total_amount || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem' }}>Ordered Items</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Item</th>
                    <th style={{ padding: '8px' }}>Qty</th>
                    <th style={{ padding: '8px' }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px' }}>{it.product_variant?.name || it.product?.name || `Product #${it.product_id}`}</td>
                      <td style={{ padding: '8px' }}>{it.quantity_ordered}</td>
                      <td style={{ padding: '8px' }}>ETB {Number(it.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                        ETB {Number(it.subtotal || it.quantity_ordered * it.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              {['confirmed', 'processing', 'pending'].includes(selectedOrder.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenDispatch(selectedOrder);
                  }}
                  className="btn btn-primary"
                  style={{ background: '#2563eb' }}
                >
                  <Icon name="truck" size={14} /> Dispatch Package
                </button>
              )}
              <button type="button" onClick={() => setIsDetailModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Orders;
