import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Transfers = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'storekeeper';
  const isAdmin = user?.role === 'admin';

  // Data states
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceLocFilter, setSourceLocFilter] = useState('all');
  const [destLocFilter, setDestLocFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const [newTransfer, setNewTransfer] = useState({
    from_stock_location_id: '',
    to_stock_location_id: '',
    notes: '',
    items: [
      {
        product_variant_id: '1',
        quantity_requested: 5,
      },
    ],
  });

  // Load transfers and master locations
  const loadTransfersData = async () => {
    try {
      setLoading(true);
      const [trfRes, locRes, prodRes] = await Promise.all([
        api.getStockTransfers({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getStockLocations({ per_page: 150, is_active: 1 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 150 }).catch(() => ({ data: [] })),
      ]);

      setTransfers(trfRes?.data || []);
      setLocations(locRes?.data || []);
      setProducts(prodRes?.data || []);

      if (locRes?.data?.length >= 2 && !newTransfer.from_stock_location_id) {
        setNewTransfer((prev) => ({
          ...prev,
          from_stock_location_id: String(locRes.data[0].id),
          to_stock_location_id: String(locRes.data[1].id),
        }));
      }
    } catch (err) {
      showToast?.('Failed to load stock transfers list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfersData();
  }, []);

  // Status Styles
  const statusConfig = {
    draft: { label: 'Draft', color: 'var(--text-muted)', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)' },
    requested: { label: 'Requested', color: '#1677ff', bg: 'rgba(22, 119, 255, 0.12)', border: 'rgba(22, 119, 255, 0.3)' },
    approved: { label: 'Approved', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
    in_transit: { label: 'In Transit', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    partially_received: { label: 'Partially Received', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)', border: 'rgba(14, 165, 233, 0.3)' },
    received: { label: 'Completed / Received', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
  };

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const q = searchQuery.toLowerCase();
      const from = t.from_location;
      const to = t.to_location;

      const matchesSearch =
        !searchQuery ||
        t.transfer_number?.toLowerCase().includes(q) ||
        from?.name?.toLowerCase().includes(q) ||
        to?.name?.toLowerCase().includes(q) ||
        from?.code?.toLowerCase().includes(q) ||
        to?.code?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesSource =
        sourceLocFilter === 'all' || String(t.from_stock_location_id) === String(sourceLocFilter);
      const matchesDest =
        destLocFilter === 'all' || String(t.to_stock_location_id) === String(destLocFilter);

      return matchesSearch && matchesStatus && matchesSource && matchesDest;
    });
  }, [transfers, searchQuery, statusFilter, sourceLocFilter, destLocFilter]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalCount = transfers.length;
    let inTransit = 0;
    let requested = 0;
    let completed = 0;

    transfers.forEach((t) => {
      if (t.status === 'in_transit') inTransit++;
      if (t.status === 'requested') requested++;
      if (t.status === 'received') completed++;
    });

    return { totalCount, inTransit, requested, completed };
  }, [transfers]);

  // Items manipulation
  const handleAddItemRow = () => {
    setNewTransfer((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_variant_id: '1',
          quantity_requested: 1,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (newTransfer.items.length === 1) return;
    setNewTransfer((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...newTransfer.items];
    updated[index][field] = value;
    setNewTransfer((prev) => ({ ...prev, items: updated }));
  };

  // View Details
  const handleViewDetail = async (transfer) => {
    try {
      const full = await api.getStockTransfer(transfer.id);
      setSelectedTransfer(full || transfer);
      setIsDetailModalOpen(true);
    } catch {
      setSelectedTransfer(transfer);
      setIsDetailModalOpen(true);
    }
  };

  // Status Progression
  const handleUpdateStatus = async (transferId, newStatus) => {
    try {
      setSubmitting(true);
      await api.updateStockTransfer(transferId, { status: newStatus });
      showToast?.(`Transfer status updated to ${newStatus}`, 'success');
      loadTransfersData();
      if (selectedTransfer && selectedTransfer.id === transferId) {
        const refreshed = await api.getStockTransfer(transferId);
        setSelectedTransfer(refreshed);
      }
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to update transfer status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Transfer
  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!newTransfer.from_stock_location_id || !newTransfer.to_stock_location_id) {
      showToast?.('Source and destination locations are required', 'warning');
      return;
    }

    if (newTransfer.from_stock_location_id === newTransfer.to_stock_location_id) {
      showToast?.('Source and destination locations must be different', 'warning');
      return;
    }

    const payload = {
      from_stock_location_id: Number(newTransfer.from_stock_location_id),
      to_stock_location_id: Number(newTransfer.to_stock_location_id),
      notes: newTransfer.notes || null,
      items: newTransfer.items.map((it) => ({
        product_variant_id: Number(it.product_variant_id),
        quantity_requested: parseFloat(it.quantity_requested) || 1,
      })),
    };

    try {
      setSubmitting(true);
      await api.createStockTransfer(payload);
      showToast?.('Inter-warehouse stock transfer requested successfully', 'success');
      setIsCreateModalOpen(false);
      loadTransfersData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to create transfer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Transfer
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await api.deleteStockTransfer(deleteTarget.id);
      showToast?.('Stock transfer deleted successfully', 'success');
      setDeleteTarget(null);
      loadTransfersData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to delete transfer', 'error');
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
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              }}
            >
              <Icon name="arrowLeftRight" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Inter-Warehouse Stock Transfers
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Transfer inventory between central depots, regional transit hubs, and retail branch shop floors.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/balances"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="cpu" size={16} />
            <span>Stock Balances</span>
          </Link>

          <Link
            to="/adjustments"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="filter" size={16} />
            <span>Cycle Adjustments</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>New Stock Transfer</span>
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
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="arrowLeftRight" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Transfers
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Historical movement records</div>
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
            <Icon name="truck" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active In-Transit
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
              {stats.inTransit}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatched & on the road</div>
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
            <Icon name="clipboard" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Requests
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1677ff' }}>
              {stats.requested}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting origin release</div>
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
            <Icon name="check" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Fully Received
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              {stats.completed}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock settled at destination</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
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
          <div style={{ position: 'relative', minWidth: 240 }}>
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
              placeholder="Search Transfer # or bay code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 150 }}
          >
            <option value="all">All Transfer Statuses</option>
            {Object.keys(statusConfig).map((k) => (
              <option key={k} value={k}>
                {statusConfig[k].label}
              </option>
            ))}
          </select>

          <select
            value={sourceLocFilter}
            onChange={(e) => setSourceLocFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 160 }}
          >
            <option value="all">From: All Origins</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>

          <select
            value={destLocFilter}
            onChange={(e) => setDestLocFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 160 }}
          >
            <option value="all">To: All Destinations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={loadTransfersData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh Transfers"
          >
            <Icon name="refresh" size={16} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* Transfers Data Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Transfer #</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Origin Location</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Destination Bay</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Requested Date</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Staff Log</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Loading inter-warehouse transfers...</div>
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="arrowLeftRight" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No stock transfers found matching criteria</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      Create a transfer to dispatch inventory to another branch or floor.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((trf) => {
                  const conf = statusConfig[trf.status] || {
                    label: trf.status,
                    color: '#64748b',
                    bg: 'rgba(100, 116, 139, 0.1)',
                    border: 'rgba(100, 116, 139, 0.2)',
                  };

                  return (
                    <tr
                      key={trf.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      {/* Transfer # */}
                      <td style={{ padding: '14px 18px' }}>
                        <div
                          onClick={() => handleViewDetail(trf)}
                          style={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.88rem',
                            color: '#f59e0b',
                            cursor: 'pointer',
                          }}
                        >
                          {trf.transfer_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          Transfer ID #{trf.id}
                        </div>
                      </td>

                      {/* Origin */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                          {trf.from_location?.name || 'Warehouse A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {trf.from_location?.code}
                        </div>
                      </td>

                      {/* Destination */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                          {trf.to_location?.name || 'Shop Floor'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {trf.to_location?.code}
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

                      {/* Date */}
                      <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {trf.requested_at ? new Date(trf.requested_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Staff */}
                      <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <div>By: {trf.requested_by?.name || 'Inventory Staff'}</div>
                        {trf.approved_by && (
                          <div style={{ color: '#8b5cf6', fontSize: '0.72rem', marginTop: 2 }}>
                            Approved
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleViewDetail(trf)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                            title="View Transfer Details"
                          >
                            <Icon name="clipboard" size={14} />
                          </button>

                          {isAdmin && (trf.status === 'draft' || trf.status === 'requested' || trf.status === 'cancelled') && (
                            <button
                              onClick={() => setDeleteTarget(trf)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--danger)' }}
                              title="Delete Transfer"
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

      {/* ── CREATE STOCK TRANSFER MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Request Inter-Warehouse Stock Transfer"
        maxWidth={750}
      >
        <form onSubmit={handleCreateTransfer}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Source Origin Location *
              </label>
              <select
                required
                value={newTransfer.from_stock_location_id}
                onChange={(e) => setNewTransfer({ ...newTransfer, from_stock_location_id: e.target.value })}
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
                Target Destination Location *
              </label>
              <select
                required
                value={newTransfer.to_stock_location_id}
                onChange={(e) => setNewTransfer({ ...newTransfer, to_stock_location_id: e.target.value })}
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
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Transfer Items ({newTransfer.items.length})
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
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product Variant</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 140 }}>Qty Requested</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {newTransfer.items.map((it, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px 10px' }}>
                        <select
                          required
                          value={it.product_variant_id}
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
                          value={it.quantity_requested}
                          onChange={(e) => handleItemChange(index, 'quantity_requested', e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.8rem', textAlign: 'center', padding: '4px' }}
                        />
                      </td>

                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {newTransfer.items.length > 1 && (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Transfer Justification / Notes
            </label>
            <textarea
              rows={2}
              value={newTransfer.notes}
              onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
              placeholder="e.g. Replenishment for high-demand weekend retail promotion"
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
              {submitting ? 'Submitting...' : 'Submit Transfer Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── TRANSFER DETAIL MODAL ───────────────────────────────────────── */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedTransfer ? `Stock Transfer: ${selectedTransfer.transfer_number}` : 'Transfer Details'}
        maxWidth={750}
      >
        {selectedTransfer && (
          <div>
            {/* Status Strip & Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: statusConfig[selectedTransfer.status]?.bg || 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${statusConfig[selectedTransfer.status]?.border || 'transparent'}`,
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
                    color: statusConfig[selectedTransfer.status]?.color || 'var(--text-main)',
                  }}
                >
                  {statusConfig[selectedTransfer.status]?.label || selectedTransfer.status}
                </span>
              </div>

              {/* Status transition controls */}
              {isAdminOrManager && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedTransfer.status === 'requested' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedTransfer.id, 'approved')}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 700 }}
                      disabled={submitting}
                    >
                      Authorize Transfer
                    </button>
                  )}

                  {selectedTransfer.status === 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedTransfer.id, 'in_transit')}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700 }}
                      disabled={submitting}
                    >
                      Dispatch / Mark In-Transit
                    </button>
                  )}

                  {selectedTransfer.status === 'in_transit' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedTransfer.id, 'received')}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#10b981', color: '#fff', border: 'none', fontWeight: 700 }}
                      disabled={submitting}
                    >
                      Confirm Inbound Delivery
                    </button>
                  )}

                  {selectedTransfer.status !== 'received' && selectedTransfer.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedTransfer.id, 'cancelled')}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--danger)' }}
                      disabled={submitting}
                    >
                      Cancel Transfer
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Locations breakdown */}
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
                <span style={{ color: 'var(--text-muted)' }}>Origin Location:</span>{' '}
                <strong>{selectedTransfer.from_location?.name}</strong> ({selectedTransfer.from_location?.code})
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Destination Bay:</span>{' '}
                <strong>{selectedTransfer.to_location?.name}</strong> ({selectedTransfer.to_location?.code})
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Requested By:</span>{' '}
                <strong>{selectedTransfer.requested_by?.name || 'Staff User'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>{' '}
                <strong>{selectedTransfer.requested_at ? new Date(selectedTransfer.requested_at).toLocaleDateString() : '—'}</strong>
              </div>
            </div>

            {/* Items Table */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px' }}>
              Transferred Inventory Items
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
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Requested</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Shipped</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransfer.items?.length ? (
                    selectedTransfer.items.map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600 }}>
                            {it.product_variant?.product?.name || it.product_variant?.variant_name || 'Electronics Item'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                            {it.product_variant?.sku}
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>
                          {it.quantity_requested}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>
                          {it.quantity_shipped}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                          {it.quantity_received}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No items attached to this transfer.
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

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Stock Transfer"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 20 }}>
            Are you sure you want to permanently delete transfer{' '}
            <strong>"{deleteTarget?.transfer_number}"</strong>?
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

export default Transfers;
