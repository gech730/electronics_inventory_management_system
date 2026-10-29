import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Adjustments = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'storekeeper';
  const isAdmin = user?.role === 'admin';

  // Data states
  const [adjustments, setAdjustments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const [newAdjustment, setNewAdjustment] = useState({
    stock_location_id: '',
    reason: 'Cycle Count Audit & Reconciliation',
    notes: '',
    items: [
      {
        product_variant_id: '1',
        counted_quantity: 10,
        unit_cost: 0,
        notes: '',
      },
    ],
  });

  // Load adjustments and master datasets
  const loadAdjustmentsData = async () => {
    try {
      setLoading(true);
      const [adjRes, locRes, prodRes] = await Promise.all([
        api.getStockAdjustments({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getStockLocations({ per_page: 150, is_active: 1 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 150 }).catch(() => ({ data: [] })),
      ]);

      setAdjustments(adjRes?.data || []);
      setLocations(locRes?.data || []);
      setProducts(prodRes?.data || []);

      if (locRes?.data?.length && !newAdjustment.stock_location_id) {
        setNewAdjustment((prev) => ({
          ...prev,
          stock_location_id: String(locRes.data[0].id),
        }));
      }
    } catch (err) {
      showToast?.('Failed to load stock adjustments data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdjustmentsData();
  }, []);

  // Status configuration
  const statusConfig = {
    draft: { label: 'Draft Audit', color: 'var(--text-muted)', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)' },
    submitted: { label: 'Under Review', color: '#1677ff', bg: 'rgba(22, 119, 255, 0.12)', border: 'rgba(22, 119, 255, 0.3)' },
    approved: { label: 'Authorized', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
    posted: { label: 'Reconciled & Posted', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
  };

  // Filtered adjustments
  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((adj) => {
      const q = searchQuery.toLowerCase();
      const loc = adj.stock_location;

      const matchesSearch =
        !searchQuery ||
        adj.adjustment_number?.toLowerCase().includes(q) ||
        adj.reason?.toLowerCase().includes(q) ||
        loc?.name?.toLowerCase().includes(q) ||
        loc?.code?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || adj.status === statusFilter;
      const matchesLocation =
        locationFilter === 'all' || String(adj.stock_location_id) === String(locationFilter);

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [adjustments, searchQuery, statusFilter, locationFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCount = adjustments.length;
    let postedCount = 0;
    let pendingCount = 0;

    adjustments.forEach((adj) => {
      if (adj.status === 'posted') postedCount++;
      if (adj.status === 'draft' || adj.status === 'submitted') pendingCount++;
    });

    return { totalCount, postedCount, pendingCount };
  }, [adjustments]);

  // Form row handlers
  const handleAddItemRow = () => {
    setNewAdjustment((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_variant_id: '1',
          counted_quantity: 0,
          unit_cost: 0,
          notes: '',
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (newAdjustment.items.length === 1) return;
    setNewAdjustment((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...newAdjustment.items];
    updated[index][field] = value;
    setNewAdjustment((prev) => ({ ...prev, items: updated }));
  };

  // View Details
  const handleViewDetail = async (adjustment) => {
    try {
      const full = await api.getStockAdjustment(adjustment.id);
      setSelectedAdjustment(full || adjustment);
      setIsDetailModalOpen(true);
    } catch {
      setSelectedAdjustment(adjustment);
      setIsDetailModalOpen(true);
    }
  };

  // Status transitions
  const handleUpdateStatus = async (adjustmentId, newStatus) => {
    try {
      setSubmitting(true);
      await api.updateStockAdjustment(adjustmentId, { status: newStatus });
      showToast?.(`Adjustment status updated to ${newStatus}`, 'success');
      loadAdjustmentsData();
      if (selectedAdjustment && selectedAdjustment.id === adjustmentId) {
        const refreshed = await api.getStockAdjustment(adjustmentId);
        setSelectedAdjustment(refreshed);
      }
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to update adjustment status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Adjustment
  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    if (!newAdjustment.stock_location_id || !newAdjustment.reason) {
      showToast?.('Storage location and adjustment reason are required', 'warning');
      return;
    }

    const payload = {
      stock_location_id: Number(newAdjustment.stock_location_id),
      reason: newAdjustment.reason,
      notes: newAdjustment.notes || null,
      items: newAdjustment.items.map((it) => ({
        product_variant_id: Number(it.product_variant_id),
        counted_quantity: parseFloat(it.counted_quantity) || 0,
        unit_cost: parseFloat(it.unit_cost) || 0,
        notes: it.notes || null,
      })),
    };

    try {
      setSubmitting(true);
      await api.createStockAdjustment(payload);
      showToast?.('Cycle count adjustment logged in draft status', 'success');
      setIsCreateModalOpen(false);
      loadAdjustmentsData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to create adjustment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Adjustment
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await api.deleteStockAdjustment(deleteTarget.id);
      showToast?.('Adjustment audit deleted successfully', 'success');
      setDeleteTarget(null);
      loadAdjustmentsData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to delete adjustment', 'error');
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
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)',
              }}
            >
              <Icon name="filter" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Stock Adjustments & Cycle Count Audits
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Record physical shelf counts, identify surplus/deficit variances, and reconcile live on-hand quantities.
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
            to="/transfers"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="arrowLeftRight" size={16} />
            <span>Stock Transfers</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>Record Cycle Count</span>
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
              background: 'rgba(14, 165, 233, 0.12)',
              color: '#0ea5e9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="filter" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Cycle Audits
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Variance inspection log</div>
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
              Posted & Reconciled
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              {stats.postedCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Balances adjusted & settled</div>
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
            <Icon name="alertTriangle" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Drafts / Pending Review
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
              {stats.pendingCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting managerial approval</div>
          </div>
        </div>

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
            <Icon name="cpu" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Audited Storage Locations
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{locations.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available bay targets</div>
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
              placeholder="Search by Adjustment # or reason..."
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
            style={{ fontSize: '0.85rem', minWidth: 160 }}
          >
            <option value="all">All Audit Statuses</option>
            {Object.keys(statusConfig).map((k) => (
              <option key={k} value={k}>
                {statusConfig[k].label}
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 180 }}
          >
            <option value="all">All Storage Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={loadAdjustmentsData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh Audits"
          >
            <Icon name="refresh" size={16} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Adjustment #</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Storage Location</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Audit Reason</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Count Date</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Auditor</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Loading cycle count audits...</div>
                  </td>
                </tr>
              ) : filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="filter" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No stock adjustments found matching criteria</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      Record a cycle count or physical stock audit.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((adj) => {
                  const conf = statusConfig[adj.status] || {
                    label: adj.status,
                    color: '#64748b',
                    bg: 'rgba(100, 116, 139, 0.1)',
                    border: 'rgba(100, 116, 139, 0.2)',
                  };

                  return (
                    <tr
                      key={adj.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      {/* Adjustment # */}
                      <td style={{ padding: '14px 18px' }}>
                        <div
                          onClick={() => handleViewDetail(adj)}
                          style={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.88rem',
                            color: '#0ea5e9',
                            cursor: 'pointer',
                          }}
                        >
                          {adj.adjustment_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          Audit ID #{adj.id}
                        </div>
                      </td>

                      {/* Location */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                          {adj.stock_location?.name || 'Central Bay'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {adj.stock_location?.code}
                        </div>
                      </td>

                      {/* Reason */}
                      <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600 }}>{adj.reason}</div>
                        {adj.notes && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: 2 }}>
                            {adj.notes}
                          </div>
                        )}
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

                      {/* Count Date */}
                      <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {adj.counted_at ? new Date(adj.counted_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Auditor */}
                      <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <div>{adj.created_by?.name || 'Auditor'}</div>
                        {adj.posted_by && (
                          <div style={{ color: '#10b981', fontSize: '0.72rem', marginTop: 2 }}>
                            Reconciled by ID #{adj.posted_by}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleViewDetail(adj)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                            title="View Variances & Post"
                          >
                            <Icon name="clipboard" size={14} />
                          </button>

                          {isAdmin && (adj.status === 'draft' || adj.status === 'cancelled') && (
                            <button
                              onClick={() => setDeleteTarget(adj)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--danger)' }}
                              title="Delete Adjustment"
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

      {/* ── CREATE STOCK ADJUSTMENT MODAL ───────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Record Cycle Count & Discrepancy Audit"
        maxWidth={750}
      >
        <form onSubmit={handleCreateAdjustment}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Target Stock Location *
              </label>
              <select
                required
                value={newAdjustment.stock_location_id}
                onChange={(e) => setNewAdjustment({ ...newAdjustment, stock_location_id: e.target.value })}
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
                Audit Reason / Justification *
              </label>
              <input
                type="text"
                required
                value={newAdjustment.reason}
                onChange={(e) => setNewAdjustment({ ...newAdjustment, reason: e.target.value })}
                placeholder="e.g. Annual Cycle Count Discrepancy"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Audited Shelf Items ({newAdjustment.items.length})
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
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 140 }}>Physical Count</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 120 }}>Unit Cost</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {newAdjustment.items.map((it, index) => (
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
                          min="0"
                          step="any"
                          required
                          value={it.counted_quantity}
                          onChange={(e) => handleItemChange(index, 'counted_quantity', e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.8rem', textAlign: 'center', padding: '4px' }}
                        />
                      </td>

                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.unit_cost}
                          onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.8rem', textAlign: 'right', padding: '4px' }}
                        />
                      </td>

                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {newAdjustment.items.length > 1 && (
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
              Observations & Discrepancy Notes
            </label>
            <textarea
              rows={2}
              value={newAdjustment.notes}
              onChange={(e) => setNewAdjustment({ ...newAdjustment, notes: e.target.value })}
              placeholder="e.g. 2 damaged cartons discovered during weekly floor audit"
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
              {submitting ? 'Saving...' : 'Save Draft Audit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── ADJUSTMENT DETAIL & POST MODAL ──────────────────────────────── */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedAdjustment ? `Discrepancy Audit: ${selectedAdjustment.adjustment_number}` : 'Audit Details'}
        maxWidth={750}
      >
        {selectedAdjustment && (
          <div>
            {/* Status Strip & Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: statusConfig[selectedAdjustment.status]?.bg || 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${statusConfig[selectedAdjustment.status]?.border || 'transparent'}`,
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Audit Status:
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    color: statusConfig[selectedAdjustment.status]?.color || 'var(--text-main)',
                  }}
                >
                  {statusConfig[selectedAdjustment.status]?.label || selectedAdjustment.status}
                </span>
              </div>

              {/* Status Action Buttons */}
              {isAdminOrManager && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedAdjustment.status === 'draft' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedAdjustment.id, 'submitted')}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      disabled={submitting}
                    >
                      Submit for Approval
                    </button>
                  )}

                  {selectedAdjustment.status === 'submitted' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedAdjustment.id, 'approved')}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 700 }}
                      disabled={submitting}
                    >
                      Authorize Adjustment
                    </button>
                  )}

                  {selectedAdjustment.status !== 'posted' && selectedAdjustment.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedAdjustment.id, 'posted')}
                      className="btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      disabled={submitting}
                    >
                      <Icon name="check" size={14} color="#fff" />
                      <span>Post Reconciliation</span>
                    </button>
                  )}

                  {selectedAdjustment.status !== 'posted' && selectedAdjustment.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedAdjustment.id, 'cancelled')}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--danger)' }}
                      disabled={submitting}
                    >
                      Cancel Audit
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Audit Meta */}
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
                <span style={{ color: 'var(--text-muted)' }}>Storage Location:</span>{' '}
                <strong>{selectedAdjustment.stock_location?.name}</strong> ({selectedAdjustment.stock_location?.code})
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Audit Reason:</span>{' '}
                <strong>{selectedAdjustment.reason}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Audited By:</span>{' '}
                <strong>{selectedAdjustment.created_by?.name || 'Staff User'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Count Date:</span>{' '}
                <strong>{selectedAdjustment.counted_at ? new Date(selectedAdjustment.counted_at).toLocaleDateString() : '—'}</strong>
              </div>
            </div>

            {/* Variance Items Table */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px' }}>
              Physical Count vs System Variance
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
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Expected System Qty</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Physical Count</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Variance Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAdjustment.items?.length ? (
                    selectedAdjustment.items.map((it) => {
                      const diff = parseFloat(it.difference_quantity || (it.counted_quantity - it.system_quantity) || 0);
                      const isSurplus = diff > 0;
                      const isDeficit = diff < 0;

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
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            {it.system_quantity ?? 0}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>
                            {it.counted_quantity}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <span
                              className="badge"
                              style={{
                                background: isSurplus
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : isDeficit
                                  ? 'rgba(239, 68, 68, 0.12)'
                                  : 'rgba(148, 163, 184, 0.12)',
                                color: isSurplus ? '#10b981' : isDeficit ? '#ef4444' : 'var(--text-muted)',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                              }}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No items recorded on this adjustment.
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
        title="Delete Stock Adjustment"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 20 }}>
            Are you sure you want to permanently delete adjustment audit{' '}
            <strong>"{deleteTarget?.adjustment_number}"</strong>?
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

export default Adjustments;
