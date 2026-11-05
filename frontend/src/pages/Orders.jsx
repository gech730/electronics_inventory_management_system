import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Orders = () => {
  const { user, showToast } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'shipments'
    ? 'shipments'
    : searchParams.get('tab') === 'sales'
    ? 'sales'
    : 'orders';
  const [activeTab, setActiveTab] = useState(initialTab); // 'orders' | 'sales' | 'shipments'

  // Data states (Real local database)
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [stockLocations, setStockLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

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
    items: [{ product_id: '', product_variant_id: '', quantity: 1, unit_price: 0 }],
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

  // Order status edit state in modal
  const [modalStatus, setModalStatus] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  // Status configuration with distinct badge styling
  const statusConfig = {
    draft: { label: 'Draft', bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '#475569' },
    pending_payment: { label: 'Payment Pending', bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '#ca8a04' },
    placed: { label: 'Placed', bg: 'rgba(234, 179, 8, 0.15)', color: '#f59e0b', border: '#d97706' },
    pending: { label: 'Pending Approval', bg: 'rgba(234, 179, 8, 0.15)', color: '#f59e0b', border: '#d97706' },
    confirmed: { label: 'Confirmed', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '#0284c7' },
    processing: { label: 'Processing', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '#9333ea' },
    ready_for_pickup: { label: 'Ready for Pickup', bg: 'rgba(45, 212, 191, 0.15)', color: '#2dd4bf', border: '#0d9488' },
    shipped: { label: 'Dispatched / Shipped', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '#2563eb' },
    completed: { label: 'Completed', bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '#16a34a' },
    delivered: { label: 'Delivered', bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '#16a34a' },
    cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '#dc2626' },
    rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '#dc2626' },
  };

  // Load orders, sales, shipments and master dependencies from local DB
  const loadData = async () => {
    try {
      setLoading(true);
      const [ordRes, saleRes, shipRes, custRes, prodRes, storeRes, locRes] = await Promise.all([
        api.getOrders({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getSales({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getShipments({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getCustomers({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getStores({ is_active: 1 }).catch(() => ({ data: [] })),
        api.getStockLocations({ is_active: 1 }).catch(() => ({ data: [] })),
      ]);

      const ordList = ordRes?.data || [];
      const saleList = saleRes?.data || [];
      const shipList = shipRes?.data || [];
      const custList = custRes?.data || [];
      const prodList = prodRes?.data || [];
      const storeList = storeRes?.data || [];
      const locList = locRes?.data || [];

      setOrders(ordList);
      setSales(saleList);
      setShipments(shipList);
      setCustomers(custList);
      setProducts(prodList);
      setStores(storeList);
      setStockLocations(locList);

      if (storeList.length > 0 && !newOrder.store_id) {
        setNewOrder((prev) => ({ ...prev, store_id: storeList[0].id }));
      }
      if (locList.length > 0 && !newOrder.stock_location_id) {
        setNewOrder((prev) => ({ ...prev, stock_location_id: locList[0].id }));
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to load order & sales records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'orders' ? {} : { tab });
  };

  // Metrics for Order Dashboard
  const orderMetrics = useMemo(() => {
    const total = orders.length;
    const actionNeeded = orders.filter((o) => ['pending', 'placed', 'draft', 'pending_payment'].includes(o.status)).length;
    const inFulfillment = orders.filter((o) => ['confirmed', 'processing', 'ready_for_pickup'].includes(o.status)).length;
    const outForDelivery = orders.filter((o) => o.status === 'shipped').length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    const totalVolume = orders.reduce((sum, o) => sum + Number(o.grand_total || o.total_amount || 0), 0);
    return { total, actionNeeded, inFulfillment, outForDelivery, completed, totalVolume };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (ord.order_number && ord.order_number.toLowerCase().includes(q)) ||
        (ord.customer?.display_name && ord.customer.display_name.toLowerCase().includes(q)) ||
        (ord.customer?.phone && ord.customer.phone.includes(q)) ||
        (ord.internal_notes && ord.internal_notes.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || ord.status === statusFilter;
      const matchFulfillment = fulfillmentFilter === 'all' || ord.fulfillment_type === fulfillmentFilter;

      return matchSearch && matchStatus && matchFulfillment;
    });
  }, [orders, searchQuery, statusFilter, fulfillmentFilter]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        String(s.id).includes(q) ||
        (s.sale_number && s.sale_number.toLowerCase().includes(q)) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q))
      );
    });
  }, [sales, searchQuery]);

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((shp) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (shp.shipment_number && shp.shipment_number.toLowerCase().includes(q)) ||
        (shp.tracking_number && shp.tracking_number.toLowerCase().includes(q)) ||
        (shp.recipient_name && shp.recipient_name.toLowerCase().includes(q)) ||
        (shp.recipient_phone && shp.recipient_phone.includes(q))
      );
    });
  }, [shipments, searchQuery]);

  // View order detail modal
  const handleViewDetails = async (order) => {
    try {
      const res = await api.getOrder(order.id);
      const fullOrder = res?.data || res || order;
      setSelectedOrder(fullOrder);
      setModalStatus(fullOrder.status || 'placed');
      setModalNotes(fullOrder.internal_notes || '');
      setIsDetailModalOpen(true);
    } catch {
      setSelectedOrder(order);
      setModalStatus(order.status || 'placed');
      setModalNotes(order.internal_notes || '');
      setIsDetailModalOpen(true);
    }
  };

  // Update order status (Admin & Manager)
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setSubmitting(true);
      await api.updateOrder(orderId, { status: newStatus });
      showToast?.(`Order status updated to '${newStatus}'`, 'success');
      await loadData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
        setModalStatus(newStatus);
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to update order status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Save Modal Status & Notes
  const handleSaveModalUpdates = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setSubmitting(true);
      await api.updateOrder(selectedOrder.id, {
        status: modalStatus,
        internal_notes: modalNotes,
      });
      showToast?.(`Order updated successfully!`, 'success');
      await loadData();
      setSelectedOrder((prev) => ({ ...prev, status: modalStatus, internal_notes: modalNotes }));
    } catch (err) {
      showToast?.(err.message || 'Failed to save order updates', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel order (Releases reserved stock)
  const handleCancelOrder = async (order) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel Order #${order.order_number || order.id}? Active reserved stock will be automatically released back to inventory.`
    );
    if (!confirmCancel) return;

    try {
      setSubmitting(true);
      await api.updateOrder(order.id, { status: 'cancelled' });
      showToast?.(`Order #${order.order_number || order.id} has been cancelled`, 'warning');
      await loadData();
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev) => ({ ...prev, status: 'cancelled' }));
        setModalStatus('cancelled');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to cancel order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Order (Admin only, only draft or cancelled)
  const handleDeleteOrder = async (order) => {
    if (!['draft', 'cancelled', 'rejected'].includes(order.status)) {
      const askToCancel = window.confirm(
        `Order #${order.order_number || order.id} is currently active ('${order.status}'). The database requires cancelling the order first before permanently deleting it.\n\nWould you like to cancel it now?`
      );
      if (askToCancel) {
        await handleCancelOrder(order);
      }
      return;
    }

    const confirmDelete = window.confirm(
      `Permanently purge Order #${order.order_number || order.id} from database? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      setSubmitting(true);
      await api.deleteOrder(order.id);
      showToast?.(`Order #${order.order_number || order.id} deleted successfully`, 'success');
      setIsDetailModalOpen(false);
      await loadData();
    } catch (err) {
      showToast?.(err.message || 'Failed to delete order', 'error');
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
      showToast?.('Please select an order to dispatch', 'warning');
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

      showToast?.(`Package dispatched! Waybill/Tracking: ${dispatchForm.tracking_number}`, 'success');
      setIsDispatchModalOpen(false);
      await loadData();
      setActiveTab('shipments');
    } catch (err) {
      showToast?.(err.message || 'Failed to dispatch shipment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark Shipment as Delivered
  const handleMarkDelivered = async (shipment) => {
    try {
      setSubmitting(true);
      await api.updateShipment(shipment.id, { status: 'delivered' });
      showToast?.(`Shipment #${shipment.shipment_number || shipment.id} marked as DELIVERED!`, 'success');
      await loadData();
    } catch (err) {
      showToast?.(err.message || 'Failed to update shipment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add line item to order creation form
  const addLineItem = () => {
    setNewOrder((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: '', product_variant_id: '', quantity: 1, unit_price: 0 }],
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
        if (prod.variants && prod.variants.length > 0) {
          updated[index].product_variant_id = prod.variants[0].id;
        } else {
          updated[index].product_variant_id = '';
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

  const hasOverstockItems = useMemo(() => {
    return newOrder.items.some((item) => {
      if (!item.product_id) return false;
      const prod = products.find((p) => String(p.id) === String(item.product_id));
      return prod && Number(item.quantity) > (Number(prod.quantity) || 0);
    });
  }, [newOrder.items, products]);

  // Submit new order creation
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const validItems = newOrder.items.filter((item) => item.product_id && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      showToast?.('Please select at least one product line item', 'warning');
      return;
    }

    // Client-side inventory availability check
    for (const item of validItems) {
      const prod = products.find((p) => String(p.id) === String(item.product_id));
      if (prod && Number(item.quantity) > (Number(prod.quantity) || 0)) {
        showToast?.(
          `Cannot create order: requested quantity for '${prod.name}' (${item.quantity}) exceeds available stock (${prod.quantity || 0}).`,
          'error'
        );
        return;
      }
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
          product_id: item.product_id,
          product_variant_id: item.product_variant_id || null,
          quantity_ordered: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
        })),
      };

      await api.createOrder(payload);
      showToast?.('Customer order created successfully!', 'success');
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
        items: [{ product_id: '', product_variant_id: '', quantity: 1, unit_price: 0 }],
      });
      await loadData();
    } catch (err) {
      showToast?.(err.message || 'Failed to create order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // View Receipt Modal for completed sale
  const handleOpenReceipt = async (sale) => {
    try {
      const res = await api.getSale(sale.id);
      setSelectedSale(res?.data || res || sale);
    } catch {
      setSelectedSale(sale);
    }
    setIsReceiptModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header & Tab Switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'var(--bg-surface)',
          padding: '16px 22px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="clipboard" size={24} color="#38bdf8" />
              Orders & Sales Management
            </h1>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              Admin Controller
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Real-time multi-channel orders, POS sales receipts, courier waybills, and order status lifecycle
          </p>
        </div>

        {/* Action Controls & Navigation Pills */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
              Customer Orders ({orders.length})
            </button>
            <button
              onClick={() => switchTab('sales')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'sales' ? 'var(--brand-blue)' : 'transparent',
                color: activeTab === 'sales' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="tag" size={15} />
              Completed Sales ({sales.length})
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
              Shipments & Waybills ({shipments.length})
            </button>
          </div>

          {activeTab === 'orders' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', fontWeight: 700 }}
            >
              <Icon name="plus" size={16} />
              + New Order
            </button>
          )}

          {activeTab === 'shipments' && (
            <button
              onClick={() => {
                const readyOrd = orders.find((o) => ['confirmed', 'processing'].includes(o.status)) || orders[0];
                if (readyOrd) handleOpenDispatch(readyOrd);
                else setIsDispatchModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', fontWeight: 700 }}
            >
              <Icon name="truck" size={16} />
              + Dispatch Package
            </button>
          )}

          <button
            onClick={loadData}
            className="btn btn-secondary btn-icon"
            title="Refresh database records"
            style={{ width: 36, height: 36 }}
          >
            <Icon name="refresh" size={16} />
          </button>
        </div>
      </div>

      {/* TAB 1: Customer Orders */}
      {activeTab === 'orders' && (
        <>
          {/* Order Metrics KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL ORDERS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4 }}>{orderMetrics.total}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: '#f59e0b', fontWeight: 700 }}>PENDING / PLACED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#f59e0b' }}>{orderMetrics.actionNeeded}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 700 }}>CONFIRMED / PACKING</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#38bdf8' }}>{orderMetrics.inFulfillment}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: '#60a5fa', fontWeight: 700 }}>DISPATCHED / SHIPPED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#60a5fa' }}>{orderMetrics.outForDelivery}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: '#4ade80', fontWeight: 700 }}>COMPLETED SALES</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#4ade80' }}>{orderMetrics.completed}</div>
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
              placeholder="Search by Order #, Customer name, Phone, or Notes..."
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
              <option value="all">All Statuses</option>
              <option value="placed">Placed / New</option>
              <option value="pending">Pending Approval</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing / Packing</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="shipped">Dispatched / Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              <option value="all">All Fulfillment Types</option>
              <option value="delivery">Courier Delivery</option>
              <option value="pickup">Store Counter Pickup</option>
              <option value="counter">Counter Sale</option>
            </select>
            {(searchQuery || statusFilter !== 'all' || fulfillmentFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setFulfillmentFilter('all');
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.84rem' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Orders Table */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Order #</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Customer</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date & Channel</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Fulfillment</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Total (ETB)</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Admin Management Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        {loading ? 'Loading orders from database...' : 'No orders found matching the filter. Click "+ New Order" to create one.'}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const st = statusConfig[ord.status] || {
                        label: ord.status,
                        bg: 'rgba(148, 163, 184, 0.15)',
                        color: 'var(--text-muted)',
                        border: 'var(--border-subtle)',
                      };
                      const canConfirm = ['placed', 'pending', 'draft', 'pending_payment'].includes(ord.status);
                      const canProcess = ord.status === 'confirmed';
                      const canDispatch = ['confirmed', 'processing'].includes(ord.status);
                      const canComplete = ord.status === 'shipped';
                      const canCancel = !['completed', 'cancelled', 'rejected'].includes(ord.status);
                      const canDelete = ['draft', 'cancelled', 'rejected'].includes(ord.status);

                      return (
                        <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 18px', fontWeight: 700 }}>
                            <button
                              onClick={() => handleViewDetails(ord)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#38bdf8',
                                fontWeight: 800,
                                cursor: 'pointer',
                                padding: 0,
                                textAlign: 'left',
                              }}
                              title="Click to view full order details & admin controls"
                            >
                              {ord.order_number || `ORD-${ord.id}`}
                            </button>
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ fontWeight: 600 }}>{ord.customer?.display_name || 'Walk-in Retail Client'}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {ord.customer?.phone || ord.customer?.email || 'No contact'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 18px', fontSize: '0.78rem' }}>
                            <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                              {new Date(ord.created_at).toLocaleDateString()}
                            </div>
                            <div style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                              {ord.source || 'Backoffice'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span
                              style={{
                                textTransform: 'capitalize',
                                fontWeight: 600,
                                background: ord.fulfillment_type === 'delivery' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                                color: ord.fulfillment_type === 'delivery' ? '#38bdf8' : '#d4af37',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.76rem',
                              }}
                            >
                              {ord.fulfillment_type || 'Delivery'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', fontWeight: 800, color: 'var(--text-main)' }}>
                            ETB {Number(ord.grand_total || ord.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: st.bg,
                                color: st.color,
                                border: `1px solid ${st.border}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color }} />
                              {st.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {/* 1-Click Status Progression */}
                              {canConfirm && (
                                <button
                                  onClick={() => handleUpdateStatus(ord.id, 'confirmed')}
                                  disabled={submitting}
                                  className="action-btn"
                                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                                  title="Confirm and reserve stock"
                                >
                                  Confirm
                                </button>
                              )}

                              {canProcess && (
                                <button
                                  onClick={() => handleUpdateStatus(ord.id, 'processing')}
                                  disabled={submitting}
                                  className="action-btn"
                                  style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                                  title="Mark as being packed in warehouse"
                                >
                                  Pack
                                </button>
                              )}

                              {canDispatch && (
                                <button
                                  onClick={() => handleOpenDispatch(ord)}
                                  disabled={submitting}
                                  className="action-btn"
                                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                                  title="Dispatch courier package with tracking"
                                >
                                  <Icon name="truck" size={12} />
                                  Dispatch
                                </button>
                              )}

                              {canComplete && (
                                <button
                                  onClick={() => handleUpdateStatus(ord.id, 'completed')}
                                  disabled={submitting}
                                  className="action-btn"
                                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                                  title="Customer received package; finalize sale"
                                >
                                  Delivered
                                </button>
                              )}

                              {/* Direct Status Selector */}
                              <select
                                value={ord.status}
                                onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                                disabled={submitting}
                                style={{
                                  padding: '3px 6px',
                                  fontSize: '0.74rem',
                                  borderRadius: 4,
                                  background: 'var(--bg-app)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--text-main)',
                                  fontWeight: 600,
                                }}
                                title="Admin: Jump order directly to any status"
                              >
                                <option value="placed">Placed</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="processing">Processing</option>
                                <option value="ready_for_pickup">Ready</option>
                                <option value="shipped">Shipped</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>

                              {/* View Details */}
                              <button
                                onClick={() => handleViewDetails(ord)}
                                className="action-btn action-btn-view"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                title="Open full order details and admin modal"
                              >
                                Manage
                              </button>

                              {/* Cancel action */}
                              {canCancel && (
                                <button
                                  onClick={() => handleCancelOrder(ord)}
                                  disabled={submitting}
                                  style={{
                                    background: 'none',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    color: '#f87171',
                                    padding: '3px 6px',
                                    borderRadius: 4,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                  title="Cancel order and free reserved inventory"
                                >
                                  Cancel
                                </button>
                              )}

                              {/* Delete action */}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteOrder(ord)}
                                  disabled={submitting}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: 'none',
                                    color: '#ef4444',
                                    padding: '4px 6px',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                  }}
                                  title="Purge cancelled/draft order from database"
                                >
                                  <Icon name="trash" size={13} />
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

      {/* TAB 2: Completed Sales & Receipts */}
      {activeTab === 'sales' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL COMPLETED SALES</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4 }}>{sales.length}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 700 }}>TOTAL REALIZED REVENUE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#10b981' }}>
                ETB {sales.reduce((sum, s) => sum + Number(s.total_amount || s.grand_total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              background: 'var(--bg-surface)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <input
              type="text"
              placeholder="Search by Sale #, Receipt #, or Customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Receipt / Sale #</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Customer</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Total Amount</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        {loading ? 'Loading sales...' : 'No sales receipts found. Complete sales in the POS Register to see them here.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 700 }}>
                          <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                            {sale.sale_number || `SALE-${sale.id}`}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontWeight: 600 }}>{sale.customer_name || 'Walk-in Retail Client'}</div>
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {new Date(sale.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: 'rgba(34, 197, 94, 0.12)',
                              color: '#16a34a',
                            }}
                          >
                            {sale.status || 'Posted'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 800 }}>
                          ETB {Number(sale.total_amount || sale.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenReceipt(sale)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Icon name="file" size={13} />
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 3: Shipments & Logistics */}
      {activeTab === 'shipments' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL PACKAGES</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4 }}>{shipments.length}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 700 }}>OUT FOR DELIVERY</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#38bdf8' }}>
                {shipments.filter((s) => ['shipped', 'pending', 'packed'].includes(s.status)).length}
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: '#4ade80', fontWeight: 700 }}>SUCCESSFULLY DELIVERED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#4ade80' }}>
                {shipments.filter((s) => s.status === 'delivered').length}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              background: 'var(--bg-surface)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <input
              type="text"
              placeholder="Search by Waybill #, Tracking Code, Recipient Name or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Shipment #</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Tracking Code</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Carrier</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Recipient</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No dispatched packages found. In the Customer Orders tab, click "Dispatch" on any confirmed order to generate a tracking code.
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
                            {shp.shipping_provider || 'Local Addis Courier'}
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
                                background: isDelivered ? 'rgba(34, 197, 94, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                                color: isDelivered ? '#16a34a' : '#0284c7',
                              }}
                            >
                              {shp.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                            {!isDelivered ? (
                              <button
                                onClick={() => handleMarkDelivered(shp)}
                                disabled={submitting}
                                className="action-btn"
                                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}
                                title="Mark package as successfully delivered"
                              >
                                Mark Delivered
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                                ✓ Delivered
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
        maxWidth={750}
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
              {customers.length === 0 && (
                <div style={{ fontSize: '0.74rem', color: '#f59e0b', marginTop: 4 }}>
                  No customers found. You can add one in the <strong>Customers</strong> section first!
                </div>
              )}
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
                <option value="counter">Counter Sale</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                Fulfillment Store
              </label>
              <select
                value={newOrder.store_id}
                onChange={(e) => setNewOrder({ ...newOrder, store_id: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
              >
                <option value="">Default Store</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                Stock Hub / Location
              </label>
              <select
                value={newOrder.stock_location_id}
                onChange={(e) => setNewOrder({ ...newOrder, stock_location_id: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
              >
                {stockLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                Shipping Fee (ETB)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newOrder.shipping_fee}
                onChange={(e) => setNewOrder({ ...newOrder, shipping_fee: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}
              />
            </div>
          </div>

          {/* Line items repeater */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 700 }}>Order Line Items</label>
              <button
                type="button"
                onClick={addLineItem}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
              >
                + Add Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {newOrder.items.map((item, idx) => {
                const prod = products.find((p) => String(p.id) === String(item.product_id));
                const stockQty = prod ? (Number(prod.quantity) || 0) : null;
                const isOverStock = prod && Number(item.quantity) > stockQty;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: isOverStock ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateLineItem(idx, 'product_id', e.target.value)}
                        required
                        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.85rem' }}
                      >
                        <option value="">Select Electronics Product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - ETB {Number(p.selling_price || 0).toFixed(2)} (Stock: {p.quantity || 0})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max={stockQty !== null ? stockQty : undefined}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        style={{ padding: '8px', borderRadius: 6, border: isOverStock ? '1px solid #ef4444' : '1px solid var(--border-subtle)', fontSize: '0.85rem' }}
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

                    {/* Live stock availability indicator */}
                    {prod && (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 600,
                              background: stockQty <= 0 ? 'rgba(239, 68, 68, 0.15)' : stockQty < 5 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: stockQty <= 0 ? '#ef4444' : stockQty < 5 ? '#f59e0b' : '#10b981',
                            }}
                          >
                            {stockQty <= 0 ? '⚠ Out of Stock (0 units)' : stockQty < 5 ? `⚡ Low Stock: Only ${stockQty} available` : `✓ In Stock: ${stockQty} units available`}
                          </span>
                          {isOverStock && (
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>
                              Requested ({item.quantity}) exceeds available stock ({stockQty})!
                            </span>
                          )}
                        </div>
                        <span style={{ color: '#94a3b8' }}>
                          SKU: {prod.sku || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                Customer Delivery Notes
              </label>
              <textarea
                rows={2}
                value={newOrder.customer_notes}
                onChange={(e) => setNewOrder({ ...newOrder, customer_notes: e.target.value })}
                placeholder="E.g. Call before delivery at Bole Medhanialem..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                Internal Admin Notes
              </label>
              <textarea
                rows={2}
                value={newOrder.internal_notes}
                onChange={(e) => setNewOrder({ ...newOrder, internal_notes: e.target.value })}
                placeholder="E.g. Verified payment proof, ship with priority..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          <div style={{ background: 'var(--bg-app)', padding: '14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Subtotal: ETB {formSubtotal.toFixed(2)} | Estimated VAT (15%): ETB {formTax.toFixed(2)}
            </div>
            <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.15rem', color: '#38bdf8' }}>
              Grand Total: ETB {formGrandTotal.toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || hasOverstockItems}
              style={{
                opacity: hasOverstockItems ? 0.6 : 1,
                cursor: hasOverstockItems ? 'not-allowed' : 'pointer',
              }}
            >
              {hasOverstockItems ? 'Insufficient Stock' : submitting ? 'Creating Order...' : 'Submit Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Order Detail & Admin Control */}
      {selectedOrder && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Order Management: #${selectedOrder.order_number || selectedOrder.id}`}
          maxWidth={750}
        >
          {/* SCREEN ONLY: Interactive Admin Management Controls */}
          <div className="screen-only" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Admin Status & Lifecycle Control Bar */}
            <form
              onSubmit={handleSaveModalUpdates}
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                padding: '14px 18px',
                borderRadius: 8,
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'gap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8' }}>
                    ADMIN STATUS CONTROLLER:
                  </span>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'var(--bg-app)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-subtle)',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                    }}
                  >
                    <option value="draft">Draft</option>
                    <option value="pending_payment">Pending Payment</option>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed (Reserve Stock)</option>
                    <option value="processing">Processing / Packing</option>
                    <option value="ready_for_pickup">Ready for Pickup</option>
                    <option value="shipped">Shipped / Dispatched</option>
                    <option value="completed">Completed (Deduct Inventory)</option>
                    <option value="cancelled">Cancelled (Release Stock)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>

                  {['confirmed', 'processing'].includes(selectedOrder.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenDispatch(selectedOrder);
                      }}
                      className="btn btn-primary"
                      style={{ background: '#2563eb', padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Icon name="truck" size={13} />
                      Dispatch
                    </button>
                  )}

                  {!['completed', 'cancelled', 'rejected'].includes(selectedOrder.status) && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(selectedOrder)}
                      disabled={submitting}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Internal Admin Notes (e.g. Paid via Telebirr reference #...)"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-app)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>
            </form>

            {/* Customer & Financial Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--bg-app)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>CUSTOMER DETAILS</div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', marginTop: 2 }}>
                  {selectedOrder.customer?.display_name || 'Retail Client'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Phone: {selectedOrder.customer?.phone || 'N/A'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Email: {selectedOrder.customer?.email || 'N/A'}
                </div>
                {selectedOrder.customer_notes && (
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#cbd5e1' }}>
                    <strong>Note:</strong> {selectedOrder.customer_notes}
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg-app)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>ORDER FINANCIALS</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: 4 }}>
                  <span>Subtotal:</span>
                  <span>ETB {Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span>Tax (VAT):</span>
                  <span>ETB {Number(selectedOrder.tax_total || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span>Shipping Fee:</span>
                  <span>ETB {Number(selectedOrder.shipping_fee || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#38bdf8', marginTop: 4, borderTop: '1px solid var(--border-subtle)', paddingTop: 4 }}>
                  <span>Grand Total:</span>
                  <span>ETB {Number(selectedOrder.grand_total || selectedOrder.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem' }}>Ordered Items</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px' }}>Product SKU / Name</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Ordered</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Fulfilled</th>
                    <th style={{ padding: '8px' }}>Unit Price</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontWeight: 700 }}>
                          {it.product_name_snapshot || it.product_variant?.product?.name || `Product #${it.product_variant_id || it.id}`}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          SKU: {it.sku_snapshot || it.product_variant?.sku || 'SKU-STD'}
                        </div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{it.quantity_ordered}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: it.quantity_fulfilled > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                        {it.quantity_fulfilled || 0}
                      </td>
                      <td style={{ padding: '8px' }}>ETB {Number(it.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                        ETB {Number(it.line_total || it.quantity_ordered * it.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Shipments info if any */}
            {selectedOrder.shipments && selectedOrder.shipments.length > 0 && (
              <div style={{ background: 'var(--bg-app)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
                  LINKED SHIPMENTS / WAYBILLS
                </div>
                {selectedOrder.shipments.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span>Waybill: <strong>{s.shipment_number}</strong> ({s.shipping_provider})</span>
                    <span>Tracking: <code>{s.tracking_number}</code> | Status: <strong>{s.status}</strong></span>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div>
                {['draft', 'cancelled', 'rejected'].includes(selectedOrder.status) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(selectedOrder)}
                    disabled={submitting}
                    className="btn btn-secondary"
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  >
                    <Icon name="trash" size={14} /> Delete Order
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="printer" size={14} /> Print Order Slip
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* PRINT ONLY: Clean Professional Order Slip */}
          <div id="printable-order-slip" className="print-only">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a' }}>
                  NGUS ELECTRONICS
                </h1>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: 4 }}>
                  Official Order Slip & Fulfillment Dispatch Voucher
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
                  Bole Medhanialem Mall, Addis Ababa, Ethiopia | Tel: +251 911 223344 | TIN: 0092184910
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedOrder.order_number || `ORD-${selectedOrder.id}`}
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: 4 }}>
                  Date: {new Date(selectedOrder.created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Status: {selectedOrder.status} | {selectedOrder.fulfillment_type || 'Delivery'}
                </div>
              </div>
            </div>

            {/* Customer & Dispatch Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 14 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  Customer / Delivery To
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedOrder.customer?.display_name || 'Retail Client'}
                </div>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: 2 }}>
                  Phone: {selectedOrder.customer?.phone || 'N/A'}
                </div>
                <div style={{ fontSize: '12px', color: '#334155' }}>
                  Email: {selectedOrder.customer?.email || 'N/A'}
                </div>
                {selectedOrder.customer?.company_name && (
                  <div style={{ fontSize: '12px', color: '#334155' }}>
                    Company: {selectedOrder.customer.company_name}
                  </div>
                )}
                {selectedOrder.customer_notes && (
                  <div style={{ fontSize: '12px', color: '#0f172a', marginTop: 6, padding: '6px 8px', background: '#f8fafc', borderRadius: 4, borderLeft: '3px solid #0284c7' }}>
                    <strong>Special Instructions:</strong> {selectedOrder.customer_notes}
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 14 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  Order & Dispatch Details
                </div>
                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Order Source / Channel:</span>
                  <strong style={{ textTransform: 'capitalize' }}>{selectedOrder.source || 'Backoffice Store'}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Fulfillment Method:</span>
                  <strong style={{ textTransform: 'capitalize' }}>{selectedOrder.fulfillment_type === 'pickup' ? 'Store Counter Pickup' : 'Courier Delivery'}</strong>
                </div>
                {selectedOrder.shipments && selectedOrder.shipments.length > 0 && (
                  <>
                    <div style={{ fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>Courier Provider:</span>
                      <strong>{selectedOrder.shipments[0].shipping_provider}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Tracking # / Waybill:</span>
                      <strong>{selectedOrder.shipments[0].tracking_number || selectedOrder.shipments[0].shipment_number}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>#</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Item Description & SKU</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>Qty Ordered</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>Qty Fulfilled</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>Unit Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>Total (ETB)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((it, idx) => (
                    <tr key={it.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {it.product_name_snapshot || it.product_variant?.product?.name || `Item #${it.id}`}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          SKU: {it.sku_snapshot || it.product_variant?.sku || 'STD'}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>
                        {it.quantity_ordered}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>
                        {it.quantity_fulfilled || it.quantity_ordered || 0}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        {Number(it.unit_price).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                        {Number(it.line_total || it.quantity_ordered * it.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 30 }}>
              <div style={{ width: '280px', border: '1px solid #cbd5e1', borderRadius: 6, padding: 12, background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4, color: '#475569' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 600 }}>ETB {Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4, color: '#475569' }}>
                  <span>VAT (15%):</span>
                  <span style={{ fontWeight: 600 }}>ETB {Number(selectedOrder.tax_total || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 6, color: '#475569' }}>
                  <span>Shipping / Delivery:</span>
                  <span style={{ fontWeight: 600 }}>ETB {Number(selectedOrder.shipping_fee || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#0f172a', borderTop: '2px solid #cbd5e1', paddingTop: 6 }}>
                  <span>GRAND TOTAL:</span>
                  <span>ETB {Number(selectedOrder.grand_total || selectedOrder.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Sign-off & Verification Footer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, paddingTop: 20, borderTop: '1px dashed #cbd5e1', fontSize: '11px', color: '#475569' }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 30 }}>Warehouse Pack & Check:</div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4 }}>Signature / Stamp</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 30 }}>Courier / Dispatcher:</div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4 }}>Signature & Date</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 30 }}>Customer Acceptance:</div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4 }}>Received in Good Condition</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 30, fontSize: '10px', color: '#94a3b8' }}>
              Generated from Ngus Electronics System on {new Date().toLocaleString()} | Computer generated order slip.
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Dispatch Package */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Delivery Package"
        maxWidth={580}
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
                Tracking Code / Waybill
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

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Carrier Waybill Notes
            </label>
            <input
              type="text"
              value={dispatchForm.notes}
              onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
              placeholder="E.g. Handle with care, fragile electronics..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}
            />
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

      {/* MODAL 4: Completed POS Sales Receipt */}
      {selectedSale && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title={`Receipt #${selectedSale.sale_number || selectedSale.id}`}
          maxWidth={460}
        >
          <div
            id="printable-pos-receipt"
            style={{
              fontFamily: 'monospace',
              background: '#ffffff',
              color: '#0f172a',
              padding: '24px 20px',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {/* Thermal Receipt Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: 1 }}>NGUS ELECTRONICS</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Authorized Electronics & POS Depot</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Bole Subcity, Addis Ababa, Ethiopia</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Tel: +251 900 123456 | TIN: 0098765432</div>
            </div>

            {/* Receipt Info */}
            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Receipt #:</span>
                <strong>{selectedSale.sale_number || `SALE-${selectedSale.id}`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Date:</span>
                <span>{new Date(selectedSale.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Customer:</span>
                <span>{selectedSale.customer_name || 'Walk-in Client'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Status:</span>
                <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{selectedSale.payment_status || 'PAID'}</span>
              </div>
            </div>

            {/* Totals */}
            <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: 12, marginTop: 12, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900, marginTop: 4 }}>
                <span>TOTAL:</span>
                <span>ETB {Number(selectedSale.total_amount || selectedSale.grand_total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Barcode & Footer */}
            <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 14, borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '1.4rem', letterSpacing: 4, fontFamily: 'monospace' }}>
                ||| | |||| || ||| || |||
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                Thank you for shopping at NGUS Electronics!
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Goods once sold cannot be returned without receipt.</div>
            </div>

            <div className="screen-only" style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Icon name="printer" size={14} /> Print Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Orders;
