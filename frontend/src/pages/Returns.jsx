import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Returns = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'cashier';
  const isAdmin = user?.role === 'admin';

  // Data states
  const [returns, setReturns] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Return Form State
  const [newReturn, setNewReturn] = useState({
    sale_id: '',
    customer_id: '',
    restock_to_location_id: '',
    reason: 'Customer Satisfaction / Hardware Return',
    items: [
      {
        sale_item_id: '1',
        product_variant_id: '1',
        quantity: 1,
        condition: 'sellable',
        restock: true,
        refund_amount: 0,
      },
    ],
  });

  // Refund Form State
  const [refundForm, setRefundForm] = useState({
    sale_return_id: '',
    payment_method_id: '',
    amount: 0,
    transaction_reference: '',
    notes: '',
  });

  // Load returns and related master datasets
  const loadReturnsData = async () => {
    try {
      setLoading(true);
      const [retRes, custRes, locRes, pmRes] = await Promise.all([
        api.getSaleReturns({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getCustomers({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getStockLocations({ per_page: 150, is_active: 1 }).catch(() => ({ data: [] })),
        api.getPaymentMethods({ is_active: 1 }).catch(() => []),
      ]);

      setReturns(retRes?.data || []);
      setCustomers(custRes?.data || []);
      setLocations(locRes?.data || []);
      setPaymentMethods(Array.isArray(pmRes) ? pmRes : pmRes?.data || []);

      if (locRes?.data?.length && !newReturn.restock_to_location_id) {
        setNewReturn((prev) => ({
          ...prev,
          restock_to_location_id: String(locRes.data[0].id),
        }));
      }

      if (pmRes?.length && !refundForm.payment_method_id) {
        setRefundForm((prev) => ({
          ...prev,
          payment_method_id: String(pmRes[0].id),
        }));
      }
    } catch (err) {
      showToast?.('Failed to load sales returns list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturnsData();
  }, []);

  // Status Styles
  const statusConfig = {
    requested: { label: 'Requested', color: '#1677ff', bg: 'rgba(22, 119, 255, 0.12)', border: 'rgba(22, 119, 255, 0.3)' },
    approved: { label: 'Approved', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
    received: { label: 'Item Received', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)', border: 'rgba(14, 165, 233, 0.3)' },
    refunded: { label: 'Refund Issued', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
    cancelled: { label: 'Cancelled', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)' },
  };

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter((ret) => {
      const q = searchQuery.toLowerCase();
      const cust = ret.customer;
      const sale = ret.sale;

      const matchesSearch =
        !searchQuery ||
        ret.return_number?.toLowerCase().includes(q) ||
        ret.reason?.toLowerCase().includes(q) ||
        sale?.sale_number?.toLowerCase().includes(q) ||
        cust?.display_name?.toLowerCase().includes(q) ||
        cust?.phone?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || ret.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [returns, searchQuery, statusFilter]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalCount = returns.length;
    let totalRefundValue = 0;
    let pendingCount = 0;
    let restockedCount = 0;

    returns.forEach((r) => {
      if (r.refunds?.length) {
        r.refunds.forEach((ref) => {
          totalRefundValue += parseFloat(ref.amount || 0);
        });
      }
      if (r.status === 'requested' || r.status === 'approved') pendingCount++;
      if (r.status === 'received' || r.status === 'completed' || r.status === 'refunded') restockedCount++;
    });

    return { totalCount, totalRefundValue, pendingCount, restockedCount };
  }, [returns]);

  // Form row handlers
  const handleAddItemRow = () => {
    setNewReturn((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sale_item_id: String(prev.items.length + 1),
          product_variant_id: '1',
          quantity: 1,
          condition: 'sellable',
          restock: true,
          refund_amount: 0,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (newReturn.items.length === 1) return;
    setNewReturn((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...newReturn.items];
    updated[index][field] = value;
    setNewReturn((prev) => ({ ...prev, items: updated }));
  };

  // View Details
  const handleViewDetail = async (ret) => {
    try {
      const full = await api.getSaleReturn(ret.id);
      setSelectedReturn(full || ret);
      setIsDetailModalOpen(true);
    } catch {
      setSelectedReturn(ret);
      setIsDetailModalOpen(true);
    }
  };

  // Status transitions
  const handleUpdateStatus = async (returnId, newStatus) => {
    try {
      setSubmitting(true);
      await api.updateSaleReturn(returnId, { status: newStatus });
      showToast?.(`Return status updated to ${newStatus}`, 'success');
      loadReturnsData();
      if (selectedReturn && selectedReturn.id === returnId) {
        const refreshed = await api.getSaleReturn(returnId);
        setSelectedReturn(refreshed);
      }
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to update return status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Refund Modal
  const handleOpenRefundModal = (ret) => {
    setSelectedReturn(ret);
    setRefundForm({
      sale_return_id: String(ret.id),
      payment_method_id: paymentMethods[0]?.id ? String(paymentMethods[0].id) : '1',
      amount: parseFloat(ret.sale?.grand_total || 500),
      transaction_reference: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: 'Customer refund payout for authorized return',
    });
    setIsRefundModalOpen(true);
  };

  // Submit Refund Payout
  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!refundForm.payment_method_id || !refundForm.amount) {
      showToast?.('Payment method and refund amount are required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.createSaleRefund({
        sale_return_id: Number(refundForm.sale_return_id),
        payment_method_id: Number(refundForm.payment_method_id),
        amount: parseFloat(refundForm.amount),
        transaction_reference: refundForm.transaction_reference || null,
        notes: refundForm.notes || null,
      });

      showToast?.('Customer refund payout processed successfully!', 'success');
      setIsRefundModalOpen(false);
      loadReturnsData();
      if (selectedReturn) {
        const refreshed = await api.getSaleReturn(selectedReturn.id);
        setSelectedReturn(refreshed);
      }
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to process refund', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Return Request
  const handleCreateReturn = async (e) => {
    e.preventDefault();
    if (!newReturn.sale_id) {
      showToast?.('Sale ID is required to link return items', 'warning');
      return;
    }

    const payload = {
      sale_id: Number(newReturn.sale_id),
      customer_id: newReturn.customer_id ? Number(newReturn.customer_id) : null,
      restock_to_location_id: newReturn.restock_to_location_id ? Number(newReturn.restock_to_location_id) : null,
      reason: newReturn.reason || null,
      items: newReturn.items.map((it) => ({
        sale_item_id: Number(it.sale_item_id),
        product_variant_id: it.product_variant_id ? Number(it.product_variant_id) : null,
        quantity: parseFloat(it.quantity) || 1,
        condition: it.condition || 'sellable',
        restock: Boolean(it.restock),
        refund_amount: parseFloat(it.refund_amount) || 0,
      })),
    };

    try {
      setSubmitting(true);
      await api.createSaleReturn(payload);
      showToast?.('Customer sales return filed successfully', 'success');
      setIsCreateModalOpen(false);
      loadReturnsData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to file return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Return
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await api.deleteSaleReturn(deleteTarget.id);
      showToast?.('Sales return deleted successfully', 'success');
      setDeleteTarget(null);
      loadReturnsData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to delete return', 'error');
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
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
              }}
            >
              <Icon name="rotateCcw" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Sales Returns & Customer Refunds
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Process RMA returns against past sales, evaluate condition (sellable/damaged), restock inventory & issue tender refunds.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/orders"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="clipboard" size={16} />
            <span>Orders Directory</span>
          </Link>

          <Link
            to="/finance-settings"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="creditCard" size={16} />
            <span>Tender Methods</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>File Sales Return</span>
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
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="rotateCcw" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Returns Logged
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer return cases</div>
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
              Restocked to Bins
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              {stats.restockedCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resellable units returned</div>
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
            <Icon name="dollarSign" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Refunds Disbursed
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
              ETB {stats.totalRefundValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid back to customers</div>
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
            <Icon name="alertTriangle" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Review
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
              {stats.pendingCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting inspection check</div>
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
              placeholder="Search Return #, customer, reason, or invoice..."
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
            <option value="all">All Return Statuses</option>
            {Object.keys(statusConfig).map((k) => (
              <option key={k} value={k}>
                {statusConfig[k].label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={loadReturnsData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh Returns"
          >
            <Icon name="refresh" size={16} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* Returns Data Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Return #</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Sale Reference</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Customer</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Restock Bay</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Return Reason</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Loading sales returns...</div>
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="rotateCcw" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No sales returns match your criteria</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      File a return request against an existing completed sale.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => {
                  const conf = statusConfig[ret.status] || {
                    label: ret.status,
                    color: '#64748b',
                    bg: 'rgba(100, 116, 139, 0.1)',
                    border: 'rgba(100, 116, 139, 0.2)',
                  };

                  return (
                    <tr
                      key={ret.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      {/* Return # */}
                      <td style={{ padding: '14px 18px' }}>
                        <div
                          onClick={() => handleViewDetail(ret)}
                          style={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.88rem',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          {ret.return_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          Return ID #{ret.id}
                        </div>
                      </td>

                      {/* Sale Reference */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.84rem' }}>
                          {ret.sale?.sale_number || `Sale #${ret.sale_id}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Total: ETB {parseFloat(ret.sale?.grand_total || 0).toFixed(2)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                          {ret.customer?.display_name || 'Walk-in Retail Customer'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {ret.customer?.phone || 'No phone'}
                        </div>
                      </td>

                      {/* Restock Bay */}
                      <td style={{ padding: '14px 18px', fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 600 }}>{ret.restock_location?.name || 'RMA Returns Bay'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {ret.restock_location?.code}
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

                      {/* Reason */}
                      <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: 'var(--text-main)', maxWidth: 220 }}>
                        {ret.reason || 'General Customer Return'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'nowrap' }}>
                          <button
                            onClick={() => handleViewDetail(ret)}
                            className="action-btn action-btn-view"
                            title="View Return Details"
                          >
                            <Icon name="clipboard" size={13} />
                            <span>Details</span>
                          </button>

                          {/* Quick refund shortcut */}
                          {ret.status !== 'refunded' && ret.status !== 'cancelled' && (
                            <button
                              onClick={() => handleOpenRefundModal(ret)}
                              className="action-btn action-btn-success"
                              title="Disburse Customer Refund"
                            >
                              <Icon name="dollarSign" size={13} color="#00b074" />
                              <span>Refund</span>
                            </button>
                          )}

                          {isAdmin && (ret.status === 'requested' || ret.status === 'cancelled') && (
                            <button
                              onClick={() => setDeleteTarget(ret)}
                              className="action-btn action-btn-danger"
                              title="Delete Return"
                            >
                              <Icon name="trash" size={13} color="#ef4444" />
                              <span>Delete</span>
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

      {/* ── CREATE SALES RETURN MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="File Customer Sales Return"
        maxWidth={750}
      >
        <form onSubmit={handleCreateReturn}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Original Sale Transaction ID *
              </label>
              <input
                type="number"
                min="1"
                required
                value={newReturn.sale_id}
                onChange={(e) => setNewReturn({ ...newReturn, sale_id: e.target.value })}
                placeholder="e.g. 1 (Sale Invoice #)"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Customer (Optional)
              </label>
              <select
                value={newReturn.customer_id}
                onChange={(e) => setNewReturn({ ...newReturn, customer_id: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="">-- Original Sale Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name} ({c.phone || c.customer_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Restock Receiving Location
              </label>
              <select
                value={newReturn.restock_to_location_id}
                onChange={(e) => setNewReturn({ ...newReturn, restock_to_location_id: e.target.value })}
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
                Return Justification / Fault
              </label>
              <input
                type="text"
                value={newReturn.reason}
                onChange={(e) => setNewReturn({ ...newReturn, reason: e.target.value })}
                placeholder="e.g. Defective screen or Wrong model"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Items Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Returned Items & Condition Assessment ({newReturn.items.length})
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
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: 90 }}>Sale Item ID</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 80 }}>Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: 120 }}>Condition</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 90 }}>Restock?</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 110 }}>Refund Amount</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {newReturn.items.map((it, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.sale_item_id}
                          onChange={(e) => handleItemChange(index, 'sale_item_id', e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.8rem', padding: '4px' }}
                        />
                      </td>

                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          required
                          value={it.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.8rem', textAlign: 'center', padding: '4px' }}
                        />
                      </td>

                      <td style={{ padding: '6px 10px' }}>
                        <select
                          value={it.condition}
                          onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.8rem', padding: '4px' }}
                        >
                          <option value="sellable">Sellable (Mint)</option>
                          <option value="opened">Opened Box</option>
                          <option value="defective">Defective</option>
                          <option value="damaged">Physically Damaged</option>
                        </select>
                      </td>

                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={it.restock}
                          onChange={(e) => handleItemChange(index, 'restock', e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                        />
                      </td>

                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.refund_amount}
                          onChange={(e) => handleItemChange(index, 'refund_amount', e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.8rem', textAlign: 'right', padding: '4px' }}
                        />
                      </td>

                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {newReturn.items.length > 1 && (
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
              {submitting ? 'Submitting...' : 'File Return Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── PROCESS REFUND MODAL ────────────────────────────────────────── */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Disburse Customer Refund"
      >
        <form onSubmit={handleProcessRefund}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Payment Payout Tender *
            </label>
            <select
              required
              value={refundForm.payment_method_id}
              onChange={(e) => setRefundForm({ ...refundForm, payment_method_id: e.target.value })}
              className="input-field"
              style={{ width: '100%' }}
            >
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name} ({pm.code})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Refund Amount (ETB) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={refundForm.amount}
              onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
              className="input-field"
              style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Transaction Reference / Receipt #
            </label>
            <input
              type="text"
              value={refundForm.transaction_reference}
              onChange={(e) => setRefundForm({ ...refundForm, transaction_reference: e.target.value })}
              className="input-field"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Refund Settlement Notes
            </label>
            <textarea
              rows={2}
              value={refundForm.notes}
              onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
              className="input-field"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsRefundModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{ background: '#10b981', color: '#fff', border: 'none', fontWeight: 700 }}
              disabled={submitting}
            >
              {submitting ? 'Disbursing...' : 'Confirm Refund Disbursal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── RETURN DETAIL MODAL ─────────────────────────────────────────── */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedReturn ? `Sales Return: ${selectedReturn.return_number}` : 'Return Details'}
        maxWidth={750}
      >
        {selectedReturn && (
          <div>
            {/* Status Strip & Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: statusConfig[selectedReturn.status]?.bg || 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${statusConfig[selectedReturn.status]?.border || 'transparent'}`,
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
                    color: statusConfig[selectedReturn.status]?.color || 'var(--text-main)',
                  }}
                >
                  {statusConfig[selectedReturn.status]?.label || selectedReturn.status}
                </span>
              </div>

              {/* Status Action Buttons */}
              {isAdminOrManager && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedReturn.status === 'requested' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReturn.id, 'approved')}
                      className="btn"
                      style={{ padding: '7px 14px', fontSize: '0.82rem', background: '#6366f1', color: '#ffffff', border: '1px solid #4f46e5', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                      disabled={submitting}
                    >
                      Approve Return
                    </button>
                  )}

                  {selectedReturn.status === 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReturn.id, 'received')}
                      className="btn"
                      style={{ padding: '7px 14px', fontSize: '0.82rem', background: '#0284c7', color: '#ffffff', border: '1px solid #0369a1', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                      disabled={submitting}
                    >
                      Confirm Items Received
                    </button>
                  )}

                  {selectedReturn.status !== 'refunded' && selectedReturn.status !== 'cancelled' && (
                    <button
                      onClick={() => handleOpenRefundModal(selectedReturn)}
                      className="btn"
                      style={{ padding: '7px 14px', fontSize: '0.82rem', background: '#00b074', color: '#ffffff', border: '1px solid #059669', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Issue Refund Payout
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Return Meta */}
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
                <span style={{ color: 'var(--text-muted)' }}>Customer:</span>{' '}
                <strong>{selectedReturn.customer?.display_name || 'Walk-in Customer'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Sale Ref:</span>{' '}
                <strong>{selectedReturn.sale?.sale_number || `Sale #${selectedReturn.sale_id}`}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Restock Bay:</span>{' '}
                <strong>{selectedReturn.restock_location?.name || 'RMA Hub'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Reason:</span>{' '}
                <strong>{selectedReturn.reason || 'General Return'}</strong>
              </div>
            </div>

            {/* Refund History if any */}
            {selectedReturn.refunds?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 8px', color: '#10b981' }}>
                  Disbursed Refunds ({selectedReturn.refunds.length})
                </h4>
                <div style={{ background: 'rgba(16, 185, 129, 0.06)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  {selectedReturn.refunds.map((ref) => (
                    <div key={ref.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 0' }}>
                      <span>
                        Tender: <strong>{ref.payment_method?.name || 'Cash'}</strong> (Ref: {ref.transaction_reference || 'N/A'})
                      </span>
                      <strong style={{ color: '#10b981' }}>ETB {parseFloat(ref.amount || 0).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items Table */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px' }}>
              Inspected Return Line Items
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
                    <th style={{ textAlign: 'left', padding: '8px 10px' }}>Product</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Qty</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Condition</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px' }}>Restocked</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px' }}>Refund Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReturn.items?.length ? (
                    selectedReturn.items.map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600 }}>
                            {it.product_variant?.product?.name || it.product_variant?.variant_name || 'Hardware Component'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                            {it.product_variant?.sku}
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>
                          {it.quantity}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span className="badge" style={{ fontSize: '0.7rem' }}>
                            {it.condition}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {it.restock ? (
                            <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Yes</span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>No</span>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>
                          ETB {parseFloat(it.refund_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No items found on this return record.
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
        title="Delete Sales Return"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 20 }}>
            Are you sure you want to permanently delete sales return{' '}
            <strong>"{deleteTarget?.return_number}"</strong>?
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

export default Returns;
