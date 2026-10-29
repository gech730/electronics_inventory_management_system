import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const GoodsReceipts = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'storekeeper';

  const [searchParams] = useSearchParams();
  const poParam = searchParams.get('po_id') || '';

  // Data states
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const [newGRN, setNewGRN] = useState({
    supplier_id: '',
    stock_location_id: '',
    purchase_order_id: '',
    supplier_delivery_note: '',
    notes: '',
    items: [
      {
        product_variant_id: '1',
        quantity_received: 10,
        unit_cost: 0,
      },
    ],
  });

  // Load GRNs and related master datasets
  const loadGRNData = async () => {
    try {
      setLoading(true);
      const [grnRes, supRes, locRes, poRes, prodRes] = await Promise.all([
        api.getGoodsReceipts({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getSuppliers({ per_page: 100, is_active: 1 }).catch(() => ({ data: [] })),
        api.getStockLocations({ per_page: 150, is_active: 1 }).catch(() => ({ data: [] })),
        api.getPurchaseOrders({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 150 }).catch(() => ({ data: [] })),
      ]);

      setReceipts(grnRes?.data || []);
      setSuppliers(supRes?.data || []);
      setLocations(locRes?.data || []);
      setPurchaseOrders(poRes?.data || []);
      setProducts(prodRes?.data || []);

      // If po_id is provided in URL, pre-fill form
      if (poParam && poRes?.data?.length) {
        const targetPO = poRes.data.find((p) => String(p.id) === String(poParam));
        if (targetPO) {
          setNewGRN((prev) => ({
            ...prev,
            purchase_order_id: String(targetPO.id),
            supplier_id: String(targetPO.supplier_id),
            stock_location_id: String(targetPO.destination_stock_location_id || locRes.data[0]?.id || ''),
          }));
          setIsCreateModalOpen(true);
        }
      } else if (supRes?.data?.length && locRes?.data?.length && !newGRN.supplier_id) {
        setNewGRN((prev) => ({
          ...prev,
          supplier_id: String(supRes.data[0].id),
          stock_location_id: String(locRes.data[0].id),
        }));
      }
    } catch (err) {
      showToast?.('Failed to load goods receipts intake log', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGRNData();
  }, []);

  // Filtered Goods Receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter((rcpt) => {
      const q = searchQuery.toLowerCase();
      const sup = rcpt.supplier;
      const loc = rcpt.stock_location;
      const po = rcpt.purchase_order;

      const matchesSearch =
        !searchQuery ||
        rcpt.receipt_number?.toLowerCase().includes(q) ||
        rcpt.supplier_delivery_note?.toLowerCase().includes(q) ||
        sup?.name?.toLowerCase().includes(q) ||
        sup?.supplier_code?.toLowerCase().includes(q) ||
        loc?.name?.toLowerCase().includes(q) ||
        po?.purchase_order_number?.toLowerCase().includes(q);

      const matchesSupplier =
        supplierFilter === 'all' || String(rcpt.supplier_id) === String(supplierFilter);
      const matchesLocation =
        locationFilter === 'all' || String(rcpt.stock_location_id) === String(locationFilter);

      return matchesSearch && matchesSupplier && matchesLocation;
    });
  }, [receipts, searchQuery, supplierFilter, locationFilter]);

  // Aggregate KPI Stats
  const stats = useMemo(() => {
    const totalCount = receipts.length;
    const uniqueSuppliers = new Set(receipts.map((r) => r.supplier_id)).size;
    const uniqueLocations = new Set(receipts.map((r) => r.stock_location_id)).size;

    return { totalCount, uniqueSuppliers, uniqueLocations };
  }, [receipts]);

  // Handle Add / Remove Items in GRN Form
  const handleAddItemRow = () => {
    setNewGRN((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_variant_id: '1',
          quantity_received: 1,
          unit_cost: 0,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (newGRN.items.length === 1) return;
    setNewGRN((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...newGRN.items];
    updated[index][field] = value;
    setNewGRN((prev) => ({ ...prev, items: updated }));
  };

  // View Details Modal
  const handleViewDetail = async (grn) => {
    try {
      const full = await api.getGoodsReceipt(grn.id);
      setSelectedReceipt(full || grn);
      setIsDetailModalOpen(true);
    } catch {
      setSelectedReceipt(grn);
      setIsDetailModalOpen(true);
    }
  };

  // Submit Goods Receipt
  const handleCreateGRN = async (e) => {
    e.preventDefault();
    if (!newGRN.supplier_id || !newGRN.stock_location_id) {
      showToast?.('Supplier and Destination Stock Bay are required', 'warning');
      return;
    }

    if (newGRN.items.length === 0) {
      showToast?.('Please specify at least one received item', 'warning');
      return;
    }

    const payload = {
      supplier_id: Number(newGRN.supplier_id),
      stock_location_id: Number(newGRN.stock_location_id),
      purchase_order_id: newGRN.purchase_order_id ? Number(newGRN.purchase_order_id) : null,
      supplier_delivery_note: newGRN.supplier_delivery_note || null,
      notes: newGRN.notes || null,
      items: newGRN.items.map((it) => ({
        product_variant_id: Number(it.product_variant_id),
        quantity_received: parseFloat(it.quantity_received) || 1,
        unit_cost: parseFloat(it.unit_cost) || 0,
      })),
    };

    try {
      setSubmitting(true);
      await api.createGoodsReceipt(payload);
      showToast?.('Goods receipt posted & inventory balance incremented!', 'success');
      setIsCreateModalOpen(false);
      loadGRNData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to post goods receipt', 'error');
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
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Icon name="package" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Goods Receipts (GRN) & Inbound Receiving
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Process inbound shipment intakes, match supplier delivery notes, and auto-increment stock location balances.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/purchase-orders"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="clipboard" size={16} />
            <span>Purchase Orders</span>
          </Link>

          <Link
            to="/balances"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="cpu" size={16} />
            <span>Stock Balances Matrix</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>Receive Goods (New GRN)</span>
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
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="package" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Receipts (GRNs)
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>100% verified intake entries</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(22, 119, 255, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="store" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Suppliers
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.uniqueSuppliers}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendors delivering hardware</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(139, 92, 246, 0.12)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="truck" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Depots & Storage Bays
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.uniqueLocations}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Warehouses actively stocked</div>
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
            <Icon name="check" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Inventory Balance Sync
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>Live</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-increments on-hand units</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
              placeholder="Search GRN #, Delivery Note, Vendor, or Bay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
            />
          </div>

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

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 180 }}
          >
            <option value="all">All Receiving Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={loadGRNData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh GRN Log"
          >
            <Icon name="refresh" size={16} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* Goods Receipts Log Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>GRN Receipt #</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Supplier / Vendor</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Destination Bay</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Waybill / Delivery Note</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>PO Link</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Received Date</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Loading goods receipt ledger...</div>
                  </td>
                </tr>
              ) : filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="package" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No goods receipt intake records found</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      Process your first inbound receipt from a vendor delivery.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((grn) => (
                  <tr
                    key={grn.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    {/* Receipt Number */}
                    <td style={{ padding: '14px 18px' }}>
                      <div
                        onClick={() => handleViewDetail(grn)}
                        style={{
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          fontSize: '0.88rem',
                          color: '#10b981',
                          cursor: 'pointer',
                        }}
                      >
                        {grn.receipt_number}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        Entry ID #{grn.id}
                      </div>
                    </td>

                    {/* Supplier */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        {grn.supplier?.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {grn.supplier?.supplier_code}
                      </div>
                    </td>

                    {/* Destination Bay */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                        {grn.stock_location?.name || 'Central Bay'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {grn.stock_location?.code}
                      </div>
                    </td>

                    {/* Delivery Note */}
                    <td style={{ padding: '14px 18px', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                      {grn.supplier_delivery_note || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>

                    {/* PO Link */}
                    <td style={{ padding: '14px 18px' }}>
                      {grn.purchase_order ? (
                        <Link
                          to={`/purchase-orders?search=${grn.purchase_order.purchase_order_number}`}
                          style={{
                            fontSize: '0.8rem',
                            fontFamily: 'monospace',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          {grn.purchase_order.purchase_order_number}
                        </Link>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Direct Intake</span>
                      )}
                    </td>

                    {/* Received Date */}
                    <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>{grn.received_at ? new Date(grn.received_at).toLocaleDateString() : '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        By {grn.received_by?.name || 'Warehouse Staff'}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}
                      >
                        ✓ Posted & Synced
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewDetail(grn)}
                        className="action-btn action-btn-primary"
                        title="View Intake Summary"
                      >
                        <Icon name="eye" size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE GOODS RECEIPT MODAL ──────────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Receive Inbound Goods (GRN)"
        maxWidth={850}
      >
        <form onSubmit={handleCreateGRN}>
          {/* Explanation Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              fontSize: '0.82rem',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="check" size={18} />
            <div>
              <strong>Inventory Auto-Increment Notice:</strong> Submitting this receipt will immediately
              increment the quantity on-hand at the selected storage location and record an immutable audit log.
            </div>
          </div>

          {/* Header Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Supplier / Vendor *
              </label>
              <select
                required
                value={newGRN.supplier_id}
                onChange={(e) => setNewGRN({ ...newGRN, supplier_id: e.target.value })}
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
                Target Stock Location *
              </label>
              <select
                required
                value={newGRN.stock_location_id}
                onChange={(e) => setNewGRN({ ...newGRN, stock_location_id: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Linked Purchase Order (Optional)
              </label>
              <select
                value={newGRN.purchase_order_id}
                onChange={(e) => setNewGRN({ ...newGRN, purchase_order_id: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="">-- Direct Intake (No PO) --</option>
                {purchaseOrders
                  .filter((p) => p.status === 'approved' || p.status === 'partially_received')
                  .map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.purchase_order_number} ({po.supplier?.name})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Supplier Delivery Note / Waybill #
              </label>
              <input
                type="text"
                value={newGRN.supplier_delivery_note}
                onChange={(e) => setNewGRN({ ...newGRN, supplier_delivery_note: e.target.value })}
                placeholder="e.g. DN-994821 or AWB-19928"
                className="input-field"
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Intake Notes / Inspection Observations
              </label>
              <input
                type="text"
                value={newGRN.notes}
                onChange={(e) => setNewGRN({ ...newGRN, notes: e.target.value })}
                placeholder="e.g. Delivered in good condition, seal verified"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Inbound Items Intake List ({newGRN.items.length})
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
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 120 }}>Qty Received</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 140 }}>Unit Cost (ETB)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 140 }}>Extended Cost</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {newGRN.items.map((item, index) => {
                    const lineVal =
                      (parseFloat(item.quantity_received) || 0) * (parseFloat(item.unit_cost) || 0);

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
                            value={item.quantity_received}
                            onChange={(e) => handleItemChange(index, 'quantity_received', e.target.value)}
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

                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>
                          ETB {lineVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          {newGRN.items.length > 1 && (
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
              {submitting ? 'Posting Inbound GRN...' : 'Post Goods Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── GOODS RECEIPT DETAIL MODAL ──────────────────────────────────── */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedReceipt ? `Goods Receipt: ${selectedReceipt.receipt_number}` : 'Receipt Details'}
        maxWidth={750}
      >
        {selectedReceipt && (
          <div>
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
                <strong>{selectedReceipt.supplier?.name}</strong> ({selectedReceipt.supplier?.supplier_code})
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Receiving Location:</span>{' '}
                <strong>{selectedReceipt.stock_location?.name}</strong> ({selectedReceipt.stock_location?.code})
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Delivery Note:</span>{' '}
                <strong>{selectedReceipt.supplier_delivery_note || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Linked PO:</span>{' '}
                <strong>{selectedReceipt.purchase_order?.purchase_order_number || 'Direct Intake'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Received At:</span>{' '}
                <strong>{selectedReceipt.received_at ? new Date(selectedReceipt.received_at).toLocaleString() : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Received By:</span>{' '}
                <strong>{selectedReceipt.received_by?.name || 'Warehouse Staff'}</strong>
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px' }}>
              Received Hardware Items ({selectedReceipt.items?.length || 0})
            </h4>

            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                marginBottom: 20,
              }}
            >
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px' }}>Product Variant</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Quantity Received</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px' }}>Extended Value</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReceipt.items?.length ? (
                    selectedReceipt.items.map((it) => {
                      const ext = (parseFloat(it.quantity_received) || 0) * (parseFloat(it.unit_cost) || 0);
                      return (
                        <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 600 }}>
                              {it.product_variant?.product?.name || it.product_variant?.variant_name || 'Electronics Item'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                              {it.product_variant?.sku}
                            </div>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#10b981' }}>
                            +{it.quantity_received}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            ETB {parseFloat(it.unit_cost || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>
                            ETB {ext.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No item records attached to this receipt.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
    </div>
  );
};

export default GoodsReceipts;
