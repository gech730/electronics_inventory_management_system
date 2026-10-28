import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const PurchaseOrders = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [searchParams] = useSearchParams();
  const supplierParam = searchParams.get('supplier_id') || 'all';

  // Data states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stores, setStores] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState(supplierParam);
  const [storeFilter, setStoreFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create PO Form State
  const [newPO, setNewPO] = useState({
    supplier_id: '',
    store_id: '',
    destination_stock_location_id: '',
    currency_code: 'ETB',
    expected_at: '',
    notes: '',
    items: [
      {
        product_variant_id: '1',
        quantity_ordered: 10,
        unit_cost: 0,
        discount_amount: 0,
        tax_amount: 0,
      },
    ],
  });

  // Load POs and master datasets
  const loadPOData = async () => {
    try {
      setLoading(true);
      const [posRes, supRes, storeRes, locRes, prodRes] = await Promise.all([
        api.getPurchaseOrders({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getSuppliers({ per_page: 100, is_active: 1 }).catch(() => ({ data: [] })),
        api.getStores({ per_page: 100, is_active: 1 }).catch(() => ({ data: [] })),
        api.getStockLocations({ per_page: 150, is_active: 1 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 150 }).catch(() => ({ data: [] })),
      ]);

      setPurchaseOrders(posRes?.data || []);
      setSuppliers(supRes?.data || []);
      setStores(storeRes?.data || []);
      setLocations(locRes?.data || []);
      setProducts(prodRes?.data || []);

      // Pre-select defaults for creation form
      if (supRes?.data?.length && storeRes?.data?.length && locRes?.data?.length) {
        const defaultStore = storeRes.data[0];
        const defaultLoc = locRes.data.find((l) => l.store_id === defaultStore.id) || locRes.data[0];
        setNewPO((prev) => ({
          ...prev,
          supplier_id: String(supRes.data[0].id),
          store_id: String(defaultStore.id),
          destination_stock_location_id: String(defaultLoc?.id || ''),
        }));
      }
    } catch (err) {
      showToast?.('Failed to load purchase orders data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOData();
  }, []);

  useEffect(() => {
    if (supplierParam && supplierParam !== 'all') {
      setSupplierFilter(supplierParam);
    }
  }, [supplierParam]);

  // Status Styles Mapping
  const statusConfig = {
    draft: { label: 'Draft', color: 'var(--text-muted)', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)' },
    submitted: { label: 'Submitted', color: '#1677ff', bg: 'rgba(22, 119, 255, 0.12)', border: 'rgba(22, 119, 255, 0.3)' },
    approved: { label: 'Approved', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
    partially_received: { label: 'Partially Received', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    received: { label: 'Fully Received', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
  };

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = searchQuery.toLowerCase();
      const sup = po.supplier;
      const store = po.store;

      const matchesSearch =
        !searchQuery ||
        po.purchase_order_number?.toLowerCase().includes(q) ||
        sup?.name?.toLowerCase().includes(q) ||
        sup?.supplier_code?.toLowerCase().includes(q) ||
        store?.name?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      const matchesSupplier =
        supplierFilter === 'all' || String(po.supplier_id) === String(supplierFilter);
      const matchesStore = storeFilter === 'all' || String(po.store_id) === String(storeFilter);

      return matchesSearch && matchesStatus && matchesSupplier && matchesStore;
    });
  }, [purchaseOrders, searchQuery, statusFilter, supplierFilter, storeFilter]);

  // Aggregate KPI Stats
  const stats = useMemo(() => {
    const totalCount = purchaseOrders.length;
    let totalSpend = 0;
    let pendingApproval = 0;
    let activeReceiving = 0;

    purchaseOrders.forEach((po) => {
      totalSpend += parseFloat(po.grand_total || 0);
      if (po.status === 'submitted') pendingApproval++;
      if (po.status === 'approved' || po.status === 'partially_received') activeReceiving++;
    });

    return { totalCount, totalSpend, pendingApproval, activeReceiving };
  }, [purchaseOrders]);

  // Calculated Order Totals for creation form
  const computedNewPOTotals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    newPO.items.forEach((item) => {
      const qty = parseFloat(item.quantity_ordered) || 0;
      const cost = parseFloat(item.unit_cost) || 0;
      const disc = parseFloat(item.discount_amount) || 0;
      const tax = parseFloat(item.tax_amount) || 0;

      subtotal += qty * cost;
      discountTotal += disc;
      taxTotal += tax;
    });

    const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal);
    return { subtotal, discountTotal, taxTotal, grandTotal };
  }, [newPO.items]);

  // Add Item Line to creation form
  const handleAddItemRow = () => {
    setNewPO((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_variant_id: '1',
          quantity_ordered: 1,
          unit_cost: 0,
          discount_amount: 0,
          tax_amount: 0,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (newPO.items.length === 1) return;
    setNewPO((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...newPO.items];
    updated[index][field] = value;
    setNewPO((prev) => ({ ...prev, items: updated }));
  };

  // Open Details Modal
  const handleViewDetail = async (po) => {
    try {
      const fullPO = await api.getPurchaseOrder(po.id);
      setSelectedPO(fullPO || po);
      setIsDetailModalOpen(true);
    } catch {
      setSelectedPO(po);
      setIsDetailModalOpen(true);
    }
  };

  // Update Status action (e.g. submit, approve, cancel)
  const handleUpdateStatus = async (poId, newStatus) => {
    try {
      setSubmitting(true);
      await api.updatePurchaseOrder(poId, { status: newStatus });
      showToast?.(`Purchase order marked as ${newStatus}`, 'success');
      loadPOData();
      if (selectedPO && selectedPO.id === poId) {
        const refreshed = await api.getPurchaseOrder(poId);
        setSelectedPO(refreshed);
      }
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to update order status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit New PO
  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!newPO.supplier_id || !newPO.store_id || !newPO.destination_stock_location_id) {
      showToast?.('Supplier, Store, and Receiving Location are required', 'warning');
      return;
    }

    if (newPO.items.length === 0) {
      showToast?.('Please add at least one line item', 'warning');
      return;
    }

    const payload = {
      supplier_id: Number(newPO.supplier_id),
      store_id: Number(newPO.store_id),
      destination_stock_location_id: Number(newPO.destination_stock_location_id),
      currency_code: newPO.currency_code || 'ETB',
      expected_at: newPO.expected_at || null,
      notes: newPO.notes || null,
      items: newPO.items.map((item) => ({
        product_variant_id: Number(item.product_variant_id),
        quantity_ordered: parseFloat(item.quantity_ordered) || 1,
        unit_cost: parseFloat(item.unit_cost) || 0,
        discount_amount: parseFloat(item.discount_amount) || 0,
        tax_amount: parseFloat(item.tax_amount) || 0,
      })),
    };

    try {
      setSubmitting(true);
      await api.createPurchaseOrder(payload);
      showToast?.('Purchase order generated successfully', 'success');
      setIsCreateModalOpen(false);
      loadPOData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to create purchase order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await api.deletePurchaseOrder(deleteTarget.id);
      showToast?.('Purchase order deleted successfully', 'success');
      setDeleteTarget(null);
      loadPOData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to delete purchase order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              }}
            >
              <Icon name="clipboard" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Purchase Orders & Procurement
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Issue vendor purchase orders, track line-item costs, authorize manager approvals, and dispatch goods receipts.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/suppliers"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="store" size={16} />
            <span>Vendors Directory</span>
          </Link>

          <Link
            to="/goods-receipts"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="package" size={16} />
            <span>Goods Receipts</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>Create Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="clipboard" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total POs Issued
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lifecycle procurement ledger</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="dollarSign" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Procurement Value
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              ETB {stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aggregate committed spend</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="truck" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Receiving In-Progress
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
              {stats.activeReceiving}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved or partially received</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(22, 119, 255, 0.12)',
              color: '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="alertTriangle" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Awaiting Approval
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1677ff' }}>
              {stats.pendingApproval}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Submitted for authorization</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: 260 }}>
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            >
              <Icon name="search" size={16} />
            </div>
            <input
              type="text"
              placeholder="Search PO #, vendor, or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 160 }}
          >
            <option value="all">All Statuses</option>
            {Object.keys(statusConfig).map((k) => (
              <option key={k} value={k}>
                {statusConfig[k].label}
              </option>
            ))}
          </select>

          {/* Supplier Filter */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 170 }}
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.supplier_code})
              </option>
            ))}
          </select>

          {/* Store Filter */}
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 160 }}
          >
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={loadPOData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh POs"
          >
            <Icon name="refresh" size={16} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* POs Data Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>PO Number</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Vendor / Supplier</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Destination Bay</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Order Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Grand Total</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Dates</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Author</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Loading purchase orders...</div>
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="clipboard" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No purchase orders match your filter criteria</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      Create a new procurement purchase order or adjust filters.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const conf = statusConfig[po.status] || {
                    label: po.status,
                    color: '#64748b',
                    bg: 'rgba(100, 116, 139, 0.1)',
                    border: 'rgba(100, 116, 139, 0.2)',
                  };

                  return (
                    <tr
                      key={po.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      {/* PO Number */}
                      <td style={{ padding: '14px 18px' }}>
                        <div
                          onClick={() => handleViewDetail(po)}
                          style={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.88rem',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                          }}
                        >
                          {po.purchase_order_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          PO ID #{po.id}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          {po.supplier?.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {po.supplier?.supplier_code}
                        </div>
                      </td>

                      {/* Store & Stock Location */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                          {po.destination_stock_location?.name || 'Main Receiving Bay'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {po.store?.name} ({po.destination_stock_location?.code})
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span
                          className="badge"
                          style={{
                            background: conf.bg,
                            color: conf.color,
                            border: `1px solid ${conf.border}`,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          {conf.label}
                        </span>
                      </td>

                      {/* Grand Total */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                          {po.currency_code || 'ETB'}{' '}
                          {parseFloat(po.grand_total || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </td>

                      {/* Dates */}
                      <td style={{ padding: '14px 18px', fontSize: '0.78rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-dim)' }}>Ordered:</span>{' '}
                          {po.ordered_at ? new Date(po.ordered_at).toLocaleDateString() : '—'}
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                          <span style={{ color: 'var(--text-dim)' }}>Expected:</span>{' '}
                          {po.expected_at ? new Date(po.expected_at).toLocaleDateString() : 'Immediate'}
                        </div>
                      </td>

                      {/* Author */}
                      <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <div>{po.created_by?.name || 'Staff User'}</div>
                        {po.approved_by && (
                          <div style={{ color: '#8b5cf6', fontSize: '0.72rem', marginTop: 2 }}>
                            ✓ Authorized
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleViewDetail(po)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                            title="View Full PO Details"
                          >
                            <Icon name="clipboard" size={14} />
                          </button>

                          {/* Quick Receive shortcut for approved/partially_received */}
                          {(po.status === 'approved' || po.status === 'partially_received') && (
                            <Link
                              to={`/goods-receipts?po_id=${po.id}`}
                              className="btn btn-secondary"
                              style={{
                                padding: '6px 8px',
                                fontSize: '0.75rem',
                                color: '#10b981',
                                display: 'inline-flex',
                                alignItems: 'center',
                                textDecoration: 'none',
                              }}
                              title="Receive Goods for this PO"
                            >
                              <Icon name="package" size={14} />
                            </Link>
                          )}

                          {/* Draft Delete */}
                          {isAdmin && (po.status === 'draft' || po.status === 'cancelled') && (
                            <button
                              onClick={() => setDeleteTarget(po)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--danger)' }}
                              title="Delete PO"
                            >
                              <Icon name="trash" size={14} />
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

      {/* ── CREATE PURCHASE ORDER MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Generate New Purchase Order"
        maxWidth={850}
      >
        <form onSubmit={handleCreatePO}>
          {/* Header Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Supplier / Vendor *
              </label>
              <select
                required
                value={newPO.supplier_id}
                onChange={(e) => setNewPO({ ...newPO, supplier_id: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplier_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Receiving Store *
              </label>
              <select
                required
                value={newPO.store_id}
                onChange={(e) => {
                  const sId = e.target.value;
                  const matchingLoc = locations.find((l) => String(l.store_id) === String(sId));
                  setNewPO({
                    ...newPO,
                    store_id: sId,
                    destination_stock_location_id: matchingLoc ? String(matchingLoc.id) : newPO.destination_stock_location_id,
                  });
                }}
                className="input-field"
                style={{ width: '100%' }}
              >
                {stores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Destination Bay / Warehouse *
              </label>
              <select
                required
                value={newPO.destination_stock_location_id}
                onChange={(e) => setNewPO({ ...newPO, destination_stock_location_id: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              >
                {locations
                  .filter((l) => !newPO.store_id || String(l.store_id) === String(newPO.store_id))
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Expected Arrival Date
              </label>
              <input
                type="date"
                value={newPO.expected_at}
                onChange={(e) => setNewPO({ ...newPO, expected_at: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Currency Code
              </label>
              <input
                type="text"
                value={newPO.currency_code}
                onChange={(e) => setNewPO({ ...newPO, currency_code: e.target.value.toUpperCase() })}
                className="input-field"
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Procurement Line Items ({newPO.items.length})
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Icon name="plus" size={12} />
                <span>Add Item</span>
              </button>
            </div>

            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                maxHeight: 250,
                overflowY: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product Variant</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 90 }}>Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 110 }}>Unit Cost</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 90 }}>Disc</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 90 }}>Tax</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 110 }}>Line Total</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {newPO.items.map((item, index) => {
                    const rowTotal =
                      (parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_cost) || 0) -
                      (parseFloat(item.discount_amount) || 0) +
                      (parseFloat(item.tax_amount) || 0);

                    return (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '6px 10px' }}>
                          <select
                            required
                            value={item.product_variant_id}
                            onChange={(e) => handleItemChange(index, 'product_variant_id', e.target.value)}
                            className="input-field"
                            style={{ width: '100%', fontSize: '0.8rem', padding: '4px 8px' }}
                          >
                            <option value="1">iPhone 15 Pro Max 256GB (IPH-15PM-256)</option>
                            <option value="2">Apple MacBook Pro 16 (MBP-16-M3-MAX)</option>
                            {products.slice(2).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            required
                            value={item.quantity_ordered}
                            onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
                            className="input-field"
                            style={{ width: '100%', fontSize: '0.8rem', textAlign: 'center', padding: '4px' }}
                          />
                        </td>

                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={item.unit_cost}
                            onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                            className="input-field"
                            style={{ width: '100%', fontSize: '0.8rem', textAlign: 'right', padding: '4px' }}
                          />
                        </td>

                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.discount_amount}
                            onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)}
                            className="input-field"
                            style={{ width: '100%', fontSize: '0.8rem', textAlign: 'right', padding: '4px' }}
                          />
                        </td>

                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.tax_amount}
                            onChange={(e) => handleItemChange(index, 'tax_amount', e.target.value)}
                            className="input-field"
                            style={{ width: '100%', fontSize: '0.8rem', textAlign: 'right', padding: '4px' }}
                          />
                        </td>

                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>
                          {rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          {newPO.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(index)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand Totals Summary Box */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Subtotal: ETB {computedNewPOTotals.subtotal.toFixed(2)} | Tax: +ETB {computedNewPOTotals.taxTotal.toFixed(2)} | Disc: -ETB {computedNewPOTotals.discountTotal.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grand Total</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                {newPO.currency_code} {computedNewPOTotals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Procurement & Order Notes
            </label>
            <textarea
              rows={2}
              value={newPO.notes}
              onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })}
              placeholder="e.g. Expedited freight via Ethiopian Airlines Cargo"
              className="input-field"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Generating...' : 'Issue Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── PURCHASE ORDER DETAIL MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedPO ? `Purchase Order: ${selectedPO.purchase_order_number}` : 'Purchase Order Details'}
        maxWidth={850}
      >
        {selectedPO && (
          <div>
            {/* Header Status Strip */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: statusConfig[selectedPO.status]?.bg || 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${statusConfig[selectedPO.status]?.border || 'transparent'}`,
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Current Status:
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    color: statusConfig[selectedPO.status]?.color || 'var(--text-main)',
                  }}
                >
                  {statusConfig[selectedPO.status]?.label || selectedPO.status}
                </span>
              </div>

              {/* Status Action Buttons */}
              {isAdminOrManager && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedPO.status === 'draft' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPO.id, 'submitted')}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      disabled={submitting}
                    >
                      Submit for Approval
                    </button>
                  )}

                  {selectedPO.status === 'submitted' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPO.id, 'approved')}
                      className="btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        background: '#8b5cf6',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                      }}
                      disabled={submitting}
                    >
                      ✓ Authorize / Approve PO
                    </button>
                  )}

                  {(selectedPO.status === 'approved' || selectedPO.status === 'partially_received') && (
                    <Link
                      to={`/goods-receipts?po_id=${selectedPO.id}`}
                      className="btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        background: '#10b981',
                        color: '#fff',
                        textDecoration: 'none',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Icon name="package" size={14} color="#fff" />
                      <span>Receive Goods (GRN)</span>
                    </Link>
                  )}

                  {selectedPO.status !== 'received' && selectedPO.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPO.id, 'cancelled')}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--danger)' }}
                      disabled={submitting}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Vendor & Store Meta */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.04)',
                marginBottom: 18,
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Supplier:</span>{' '}
                <strong>{selectedPO.supplier?.name}</strong> ({selectedPO.supplier?.supplier_code})
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Destination Store:</span>{' '}
                <strong>{selectedPO.store?.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Receiving Bay:</span>{' '}
                <strong>{selectedPO.destination_stock_location?.name}</strong> ({selectedPO.destination_stock_location?.code})
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Order Date:</span>{' '}
                <strong>{selectedPO.ordered_at ? new Date(selectedPO.ordered_at).toLocaleDateString() : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Expected Date:</span>{' '}
                <strong>{selectedPO.expected_at ? new Date(selectedPO.expected_at).toLocaleDateString() : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Author / Approver:</span>{' '}
                <strong>
                  {selectedPO.created_by?.name || 'Staff User'}
                  {selectedPO.approved_by ? ` (Approved by ID #${selectedPO.approved_by})` : ''}
                </strong>
              </div>
            </div>

            {/* Line Items Table */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px' }}>
              Ordered Items & Line Allocations
            </h4>
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px' }}>Product Variant</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Ordered</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Received</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items?.length ? (
                    selectedPO.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600 }}>
                            {item.product_variant?.product?.name || item.product_variant?.variant_name || 'Electronics Item'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                            {item.product_variant?.sku}
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>
                          {item.quantity_ordered}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span
                            className="badge"
                            style={{
                              background:
                                parseFloat(item.quantity_received || 0) >= parseFloat(item.quantity_ordered)
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(245, 158, 11, 0.12)',
                              color:
                                parseFloat(item.quantity_received || 0) >= parseFloat(item.quantity_ordered)
                                  ? '#10b981'
                                  : '#f59e0b',
                              fontSize: '0.72rem',
                            }}
                          >
                            {item.quantity_received || 0}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          ETB {parseFloat(item.unit_cost || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>
                          ETB {parseFloat(item.line_total || (item.quantity_ordered * item.unit_cost) || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No items found on this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Box */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'baseline',
                gap: 12,
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Grand Total:</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
                {selectedPO.currency_code || 'ETB'} {parseFloat(selectedPO.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Purchase Order"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 20 }}>
            Are you sure you want to permanently delete purchase order{' '}
            <strong>"{deleteTarget?.purchase_order_number}"</strong>?
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="btn btn-danger"
              disabled={submitting}
              style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
            >
              {submitting ? 'Deleting...' : 'Confirm Deletion'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PurchaseOrders;
