import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Suppliers = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  // Data states
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    supplier_code: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    tax_number: '',
    address: '',
    payment_terms_days: 30,
    is_active: true,
    notes: '',
  });

  // Load suppliers
  const loadSuppliersData = async () => {
    try {
      setLoading(true);
      const res = await api.getSuppliers({ per_page: 150 });
      setSuppliers(res?.data || []);
    } catch (err) {
      showToast?.('Failed to load suppliers directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliersData();
  }, []);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        sup.name?.toLowerCase().includes(q) ||
        sup.supplier_code?.toLowerCase().includes(q) ||
        sup.contact_person?.toLowerCase().includes(q) ||
        sup.phone?.toLowerCase().includes(q) ||
        sup.email?.toLowerCase().includes(q) ||
        sup.tax_number?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? sup.is_active : !sup.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  // Aggregate KPI Stats
  const stats = useMemo(() => {
    const total = suppliers.length;
    const activeCount = suppliers.filter((s) => s.is_active).length;
    let totalOrders = 0;
    suppliers.forEach((s) => {
      totalOrders += s.purchase_orders_count || 0;
    });
    const creditVendors = suppliers.filter((s) => (s.payment_terms_days || 0) > 0).length;

    return { total, activeCount, totalOrders, creditVendors };
  }, [suppliers]);

  // Open Create / Edit Modal
  const handleOpenModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        supplier_code: supplier.supplier_code || '',
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        tax_number: supplier.tax_number || '',
        address: supplier.address || '',
        payment_terms_days: supplier.payment_terms_days ?? 30,
        is_active: supplier.is_active ?? true,
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        supplier_code: `SUP-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        tax_number: '',
        address: '',
        payment_terms_days: 30,
        is_active: true,
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  // View Details Modal with single supplier API call
  const handleViewDetail = async (supplier) => {
    try {
      const res = await api.getSupplier(supplier.id);
      setSelectedSupplierDetail(res || supplier);
      setIsDetailModalOpen(true);
    } catch {
      setSelectedSupplierDetail(supplier);
      setIsDetailModalOpen(true);
    }
  };

  // Save Supplier
  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!formData.supplier_code || !formData.name) {
      showToast?.('Supplier code and company name are required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, formData);
        showToast?.('Supplier updated successfully', 'success');
      } else {
        await api.createSupplier(formData);
        showToast?.('Supplier registered successfully', 'success');
      }
      setIsModalOpen(false);
      loadSuppliersData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to save supplier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await api.deleteSupplier(deleteTarget.id);
      showToast?.('Supplier deleted successfully', 'success');
      setDeleteTarget(null);
      loadSuppliersData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to delete supplier', 'error');
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
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Icon name="store" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Suppliers & Hardware Vendors Directory
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Manage electronics distributors, component manufacturers, payment terms, and procurement PO history.
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
            to="/goods-receipts"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="package" size={16} />
            <span>Goods Receipts</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={() => handleOpenModal()}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>Register Supplier</span>
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
            <Icon name="store" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Vendors Enrolled
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
              {stats.activeCount} active suppliers
            </div>
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
            <Icon name="clipboard" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Procurement Orders
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
              {stats.totalOrders}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>POs issued across catalog</div>
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
            <Icon name="tag" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Credit Terms Vendors
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.creditVendors}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net 15 / 30 / 60 day payables</div>
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
              Supply Reliability
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>100%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Compliance & verified TIN</div>
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1, maxWidth: 540 }}>
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
              placeholder="Search by vendor name, code, contact person, TIN, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 140 }}
          >
            <option value="all">All Vendors</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            onClick={loadSuppliersData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh Directory"
          >
            <Icon name="refresh" size={16} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Vendor Details</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Code</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contact Person</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Phone & Email</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tax Number (TIN)</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Payment Terms</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>POs</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Loading supplier directory...</div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="store" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No suppliers match your search criteria</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      Register a new component vendor or adjust search filters.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup) => (
                  <tr
                    key={sup.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    {/* Name & ID */}
                    <td style={{ padding: '14px 18px' }}>
                      <div
                        onClick={() => handleViewDetail(sup)}
                        style={{
                          fontWeight: 700,
                          fontSize: '0.94rem',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                        }}
                      >
                        {sup.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        Vendor ID #{sup.id}
                      </div>
                    </td>

                    {/* Code */}
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'rgba(16, 185, 129, 0.08)',
                          color: '#10b981',
                        }}
                      >
                        {sup.supplier_code}
                      </span>
                    </td>

                    {/* Contact Person */}
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {sup.contact_person || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>

                    {/* Contact Channels */}
                    <td style={{ padding: '14px 18px', fontSize: '0.82rem' }}>
                      {sup.phone ? (
                        <div style={{ color: 'var(--text-main)' }}>📞 {sup.phone}</div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                      {sup.email && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                          ✉️ {sup.email}
                        </div>
                      )}
                    </td>

                    {/* TIN */}
                    <td style={{ padding: '14px 18px', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                      {sup.tax_number ? (
                        <span style={{ color: 'var(--text-main)' }}>{sup.tax_number}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>

                    {/* Payment Terms */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {sup.payment_terms_days > 0 ? `Net ${sup.payment_terms_days} Days` : 'Due on Receipt'}
                      </span>
                    </td>

                    {/* Orders count */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <Link
                        to={`/purchase-orders?supplier_id=${sup.id}`}
                        className="badge"
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--text-main)',
                          textDecoration: 'none',
                          fontWeight: 700,
                        }}
                        title="Click to view purchase orders from this vendor"
                      >
                        {sup.purchase_orders_count ?? 0} POs →
                      </Link>
                    </td>

                    {/* Active */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      {sup.is_active ? (
                        <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Active</span>
                      ) : (
                        <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>Inactive</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewDetail(sup)}
                          className="action-btn action-btn-primary"
                          title="View Profile & Orders"
                        >
                          <Icon name="eye" size={13} />
                          View
                        </button>
                        {isAdminOrManager && (
                          <button
                            onClick={() => handleOpenModal(sup)}
                            className="action-btn action-btn-primary"
                            title="Edit Supplier"
                          >
                            <Icon name="edit" size={13} />
                            Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteTarget(sup)}
                            className="action-btn action-btn-danger"
                            title="Delete Supplier"
                          >
                            <Icon name="trash" size={13} />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT SUPPLIER MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Register New Vendor / Supplier'}
      >
        <form onSubmit={handleSaveSupplier}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Supplier Code *
              </label>
              <input
                type="text"
                required
                value={formData.supplier_code}
                onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUP-TECH-01"
                className="input-field"
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Company / Vendor Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Global Electronics Ltd"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="e.g. David Miller"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Tax Identification Number (TIN)
              </label>
              <input
                type="text"
                value={formData.tax_number}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                placeholder="e.g. TAX-US-992817"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1-800-555-0199"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="sales@vendor.com"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Payment Credit Terms (Days)
            </label>
            <input
              type="number"
              min="0"
              value={formData.payment_terms_days}
              onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value, 10) || 0 })}
              className="input-field"
              style={{ width: '100%' }}
              placeholder="e.g. 30 (for Net 30 days)"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Physical Address & Headquarters
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 452 Tech Way, Silicon Valley, CA"
              className="input-field"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Active Vendor</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Active vendors can be selected for new purchase orders and goods receipts
              </div>
            </div>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
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
              {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── SUPPLIER DETAIL & ORDERS MODAL ──────────────────────────────── */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedSupplierDetail ? `${selectedSupplierDetail.name} (${selectedSupplierDetail.supplier_code})` : 'Supplier Details'}
      >
        {selectedSupplierDetail && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.04)',
                marginBottom: 20,
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Contact Person:</span>{' '}
                <strong>{selectedSupplierDetail.contact_person || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>TIN Number:</span>{' '}
                <strong>{selectedSupplierDetail.tax_number || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>{' '}
                <strong>{selectedSupplierDetail.phone || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>{' '}
                <strong>{selectedSupplierDetail.email || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Payment Terms:</span>{' '}
                <strong>
                  {selectedSupplierDetail.payment_terms_days > 0
                    ? `Net ${selectedSupplierDetail.payment_terms_days} Days`
                    : 'Due on Receipt'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Address:</span>{' '}
                <strong>{selectedSupplierDetail.address || 'N/A'}</strong>
              </div>
            </div>

            {/* Recent Purchase Orders from this supplier */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Recent Purchase Orders ({selectedSupplierDetail.purchase_orders?.length || 0})
              </h3>
              <Link
                to={`/purchase-orders?supplier_id=${selectedSupplierDetail.id}`}
                style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
              >
                View in PO Manager →
              </Link>
            </div>

            {selectedSupplierDetail.purchase_orders?.length ? (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px' }}>PO Number</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px' }}>Total Amount</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px' }}>Order Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSupplierDetail.purchase_orders.map((po) => (
                      <tr key={po.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700 }}>
                          {po.purchase_order_number}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span className="badge" style={{ fontSize: '0.7rem' }}>
                            {po.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                          ETB {parseFloat(po.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {po.ordered_at ? new Date(po.ordered_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No purchase orders recorded yet for this supplier.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
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
        title="Delete Supplier Record"
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
              <strong>Procurement Audit Guard:</strong>
              <div style={{ fontSize: '0.78rem', marginTop: 2 }}>
                This vendor cannot be deleted if any historical purchase orders, goods receipts, or settlement payables are tied to it.
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 20 }}>
            Are you sure you want to permanently remove vendor{' '}
            <strong>"{deleteTarget?.name}"</strong> ({deleteTarget?.supplier_code})?
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

export default Suppliers;
