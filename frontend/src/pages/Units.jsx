import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Units = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  // Data states
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [decimalFilter, setDecimalFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    allows_decimal_quantity: false,
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load units list
  const loadUnitsData = async () => {
    try {
      setLoading(true);
      const res = await api.getUnits({ per_page: 100 });
      setUnits(res?.data || []);
    } catch (err) {
      showToast?.('Failed to load units of measurement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnitsData();
  }, []);

  // Filtered Units
  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        unit.name?.toLowerCase().includes(q) ||
        unit.abbreviation?.toLowerCase().includes(q);

      const matchesDecimal =
        decimalFilter === 'all' ||
        (decimalFilter === 'decimal' ? unit.allows_decimal_quantity : !unit.allows_decimal_quantity);

      return matchesSearch && matchesDecimal;
    });
  }, [units, searchQuery, decimalFilter]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = units.length;
    const decimalCount = units.filter((u) => u.allows_decimal_quantity).length;
    const integerCount = total - decimalCount;
    return { total, decimalCount, integerCount };
  }, [units]);

  // Open Create / Edit Modal
  const handleOpenModal = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name || '',
        abbreviation: unit.abbreviation || '',
        allows_decimal_quantity: Boolean(unit.allows_decimal_quantity),
      });
    } else {
      setEditingUnit(null);
      setFormData({
        name: '',
        abbreviation: '',
        allows_decimal_quantity: false,
      });
    }
    setIsModalOpen(true);
  };

  // Submit Create / Edit
  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.abbreviation) {
      showToast?.('Unit name and abbreviation are required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingUnit) {
        await api.updateUnit(editingUnit.id, formData);
        showToast?.('Unit of measurement updated successfully', 'success');
      } else {
        await api.createUnit(formData);
        showToast?.('Unit of measurement created successfully', 'success');
      }
      setIsModalOpen(false);
      loadUnitsData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to save unit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await api.deleteUnit(deleteTarget.id);
      showToast?.('Unit deleted successfully', 'success');
      setDeleteTarget(null);
      loadUnitsData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to delete unit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
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
                background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)',
              }}
            >
              <Icon name="tag" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Units of Measure
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Standardize product inventory packaging, counting rules, and fractional decimal quantities.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/products"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="package" size={16} />
            <span>Product Catalog</span>
          </Link>

          <Link
            to="/balances"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="cpu" size={16} />
            <span>Stock Balances</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={() => handleOpenModal()}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>New Unit of Measure</span>
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
            <Icon name="tag" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Standard Units
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered measurement standards</div>
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
              Decimal / Fractional
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{stats.decimalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Allows fractional amounts (e.g. kg, m)</div>
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
            <Icon name="package" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Discrete / Whole Units
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.integerCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Strict integer counts (e.g. pcs, box)</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: '14px 18px',
          marginBottom: 18,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1, maxWidth: 500 }}>
          <div style={{ position: 'relative', width: '100%' }}>
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
              placeholder="Search units by name or symbol (e.g. pcs, kg)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={decimalFilter}
            onChange={(e) => setDecimalFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 160 }}
          >
            <option value="all">All Calculation Modes</option>
            <option value="decimal">Fractional / Decimal</option>
            <option value="integer">Discrete Integers Only</option>
          </select>

          <button
            onClick={loadUnitsData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh Units"
          >
            <Icon name="refresh" size={16} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* Units Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Unit Name</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Symbol / Abbreviation</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Decimal Support</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Created On</th>
                {isAdminOrManager && (
                  <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Loading measurement units...</div>
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="tag" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No units of measure match criteria</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      Create standard packaging units like Pieces, Cartons, or Kilograms.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr
                    key={unit.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                        {unit.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        Unit ID #{unit.id}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          padding: '3px 10px',
                          borderRadius: 6,
                          background: 'rgba(14, 165, 233, 0.1)',
                          color: '#0ea5e9',
                          border: '1px solid rgba(14, 165, 233, 0.25)',
                        }}
                      >
                        {unit.abbreviation}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      {unit.allows_decimal_quantity ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          ✓ Fractional Allowed (1.25)
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(148, 163, 184, 0.1)',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                          }}
                        >
                          Whole Numbers Only (1, 2, 3)
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {unit.created_at ? new Date(unit.created_at).toLocaleDateString() : 'System Default'}
                    </td>

                    {isAdminOrManager && (
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleOpenModal(unit)}
                            className="action-btn action-btn-primary"
                            title="Edit Unit"
                          >
                            <Icon name="edit" size={13} />
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(unit)}
                              className="action-btn action-btn-danger"
                              title="Delete Unit"
                            >
                              <Icon name="trash" size={13} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT UNIT MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUnit ? `Edit Unit: ${editingUnit.name}` : 'New Unit of Measurement'}
      >
        <form onSubmit={handleSaveUnit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Unit Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Master Carton, Kilogram, Pieces"
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Symbol / Abbreviation *
            </label>
            <input
              type="text"
              required
              value={formData.abbreviation}
              onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
              placeholder="e.g. pcs, ctn, kg, m"
              className="input-field"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Allow Fractional / Decimal Quantities</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Enable for bulk or weighted goods (e.g. 2.50 kg). Leave unchecked for countable discrete items.
              </div>
            </div>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.allows_decimal_quantity}
                onChange={(e) => setFormData({ ...formData, allows_decimal_quantity: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingUnit ? 'Update Unit' : 'Create Unit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Unit of Measure"
      >
        <div style={{ padding: '8px 0' }}>
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Icon name="alertTriangle" size={24} />
            <div>
              <strong>Dependency Guard:</strong>
              <div style={{ fontSize: '0.78rem', marginTop: 2 }}>
                This unit cannot be deleted if any product in your inventory catalog is currently assigned to it.
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 20 }}>
            Are you sure you want to permanently delete{' '}
            <strong>"{deleteTarget?.name}"</strong> ({deleteTarget?.abbreviation})?
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

export default Units;
