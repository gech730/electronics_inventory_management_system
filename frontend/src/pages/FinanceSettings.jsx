import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const FinanceSettings = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  // Active Tab: 'payment_methods' | 'tax_rates'
  const [activeTab, setActiveTab] = useState('payment_methods');

  // Data states
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals - Payment Method
  const [isPMModalOpen, setIsPMModalOpen] = useState(false);
  const [editingPM, setEditingPM] = useState(null);
  const [pmFormData, setPmFormData] = useState({
    code: '',
    name: '',
    method_type: 'mobile_money',
    provider_name: '',
    requires_reference: false,
    sort_order: 1,
    is_active: true,
  });

  // Modals - Tax Rate
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [taxFormData, setTaxFormData] = useState({
    code: '',
    name: '',
    rate_percent: 15.0,
    is_inclusive: false,
    is_active: true,
  });

  // Delete target modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'pm'|'tax', item }
  const [submitting, setSubmitting] = useState(false);

  // Load finance settings
  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const [pmRes, taxRes] = await Promise.all([
        api.getPaymentMethods().catch(() => []),
        api.getTaxRates().catch(() => []),
      ]);

      setPaymentMethods(Array.isArray(pmRes) ? pmRes : pmRes?.data || []);
      setTaxRates(Array.isArray(taxRes) ? taxRes : taxRes?.data || []);
    } catch (err) {
      showToast?.('Failed to load financial settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  // Method Type metadata
  const pmTypeConfig = {
    cash: { label: 'Cash Tender', icon: 'dollarSign', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    mobile_money: { label: 'Mobile Money (Telebirr/CBE)', icon: 'bolt', color: '#1677ff', bg: 'rgba(22, 119, 255, 0.12)' },
    card: { label: 'Debit/Credit Card', icon: 'creditCard', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
    bank_transfer: { label: 'Direct Bank Wire', icon: 'store', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    cheque: { label: 'Bank Cheque', icon: 'clipboard', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
    other: { label: 'Other Settlement', icon: 'tag', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
  };

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalPM = paymentMethods.length;
    const activePM = paymentMethods.filter((p) => p.is_active).length;
    const totalTax = taxRates.length;
    const activeTax = taxRates.filter((t) => t.is_active).length;

    return { totalPM, activePM, totalTax, activeTax };
  }, [paymentMethods, taxRates]);

  // Payment Method Form Handlers
  const handleOpenPMModal = (pm = null) => {
    if (pm) {
      setEditingPM(pm);
      setPmFormData({
        code: pm.code || '',
        name: pm.name || '',
        method_type: pm.method_type || 'mobile_money',
        provider_name: pm.provider_name || '',
        requires_reference: Boolean(pm.requires_reference),
        sort_order: pm.sort_order ?? 1,
        is_active: pm.is_active ?? true,
      });
    } else {
      setEditingPM(null);
      setPmFormData({
        code: '',
        name: '',
        method_type: 'mobile_money',
        provider_name: '',
        requires_reference: false,
        sort_order: (paymentMethods.length || 0) + 1,
        is_active: true,
      });
    }
    setIsPMModalOpen(true);
  };

  const handleSavePM = async (e) => {
    e.preventDefault();
    if (!pmFormData.code || !pmFormData.name) {
      showToast?.('Payment method code and name are required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingPM) {
        await api.updatePaymentMethod(editingPM.id, pmFormData);
        showToast?.('Payment method updated successfully', 'success');
      } else {
        await api.createPaymentMethod(pmFormData);
        showToast?.('Payment method registered successfully', 'success');
      }
      setIsPMModalOpen(false);
      loadFinanceData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to save payment method', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Tax Rate Form Handlers
  const handleOpenTaxModal = (tax = null) => {
    if (tax) {
      setEditingTax(tax);
      setTaxFormData({
        code: tax.code || '',
        name: tax.name || '',
        rate_percent: parseFloat(tax.rate_percent) || 15.0,
        is_inclusive: Boolean(tax.is_inclusive),
        is_active: tax.is_active ?? true,
      });
    } else {
      setEditingTax(null);
      setTaxFormData({
        code: 'VAT15',
        name: 'Standard National VAT (15%)',
        rate_percent: 15.0,
        is_inclusive: false,
        is_active: true,
      });
    }
    setIsTaxModalOpen(true);
  };

  const handleSaveTax = async (e) => {
    e.preventDefault();
    if (!taxFormData.code || !taxFormData.name) {
      showToast?.('Tax code and name are required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingTax) {
        await api.updateTaxRate(editingTax.id, taxFormData);
        showToast?.('Tax rate schedule updated successfully', 'success');
      } else {
        await api.createTaxRate(taxFormData);
        showToast?.('Tax rate schedule created successfully', 'success');
      }
      setIsTaxModalOpen(false);
      loadFinanceData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to save tax rate', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      if (deleteTarget.type === 'pm') {
        await api.deletePaymentMethod(deleteTarget.item.id);
        showToast?.('Payment tender deleted successfully', 'success');
      } else {
        await api.deleteTaxRate(deleteTarget.item.id);
        showToast?.('Tax rate schedule deleted successfully', 'success');
      }
      setDeleteTarget(null);
      loadFinanceData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to delete configuration', 'error');
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
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
              }}
            >
              <Icon name="creditCard" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Payment Tender Methods & Tax Rate Schedules
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Configure POS registers, checkout payment gateways (Telebirr, CBE Birr, Cash), and national VAT rules.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/pos"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="cart" size={16} />
            <span>POS Register</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={() => (activeTab === 'payment_methods' ? handleOpenPMModal() : handleOpenTaxModal())}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>{activeTab === 'payment_methods' ? 'New Payment Tender' : 'New Tax Rate'}</span>
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
              background: 'rgba(139, 92, 246, 0.12)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="creditCard" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Payment Methods
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalPM}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
              {stats.activePM} active for POS checkout
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
            <Icon name="bolt" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Mobile Money Channels
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
              {paymentMethods.filter((p) => p.method_type === 'mobile_money').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Telebirr & CBE Birr</div>
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
            <Icon name="tag" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Tax Rate Schedules
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalTax}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {stats.activeTax} active VAT/TOT rules
            </div>
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
              Fiscal Compliance
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>15% VAT</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>National standard rate</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 20,
          paddingBottom: 2,
        }}
      >
        <button
          onClick={() => setActiveTab('payment_methods')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            border: 'none',
            background: activeTab === 'payment_methods' ? 'var(--bg-card)' : 'transparent',
            borderBottom: activeTab === 'payment_methods' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'payment_methods' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all var(--transition-fast)',
          }}
        >
          <Icon name="creditCard" size={18} />
          <span>Payment Tender Methods ({paymentMethods.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tax_rates')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            border: 'none',
            background: activeTab === 'tax_rates' ? 'var(--bg-card)' : 'transparent',
            borderBottom: activeTab === 'tax_rates' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'tax_rates' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all var(--transition-fast)',
          }}
        >
          <Icon name="tag" size={18} />
          <span>Tax Rate Schedules ({taxRates.length})</span>
        </button>
      </div>

      {/* TAB 1: PAYMENT METHODS */}
      {activeTab === 'payment_methods' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tender Name</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Code</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Channel Type</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Provider / Gateway</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Requires Ref?</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                  {isAdminOrManager && (
                    <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Icon name="refresh" size={24} className="spin" />
                      <div style={{ marginTop: 8 }}>Loading payment tenders...</div>
                    </td>
                  </tr>
                ) : paymentMethods.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Icon name="creditCard" size={32} color="var(--text-dim)" />
                      <div style={{ marginTop: 8, fontWeight: 600 }}>No payment methods configured</div>
                      <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Add Cash, Telebirr, or CBE Birr tenders.</div>
                    </td>
                  </tr>
                ) : (
                  paymentMethods.map((pm) => {
                    const typeConf = pmTypeConfig[pm.method_type] || pmTypeConfig.other;

                    return (
                      <tr
                        key={pm.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background var(--transition-fast)',
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{pm.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Sort #{pm.sort_order ?? 1}</div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'rgba(139, 92, 246, 0.08)',
                              color: '#8b5cf6',
                            }}
                          >
                            {pm.code}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: typeConf.bg,
                              color: typeConf.color,
                              fontSize: '0.74rem',
                              fontWeight: 700,
                            }}
                          >
                            <Icon name={typeConf.icon} size={14} />
                            <span>{typeConf.label}</span>
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>
                          {pm.provider_name || <span style={{ color: 'var(--text-dim)' }}>In-Store / Direct</span>}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          {pm.requires_reference ? (
                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', fontSize: '0.72rem' }}>
                              Mandatory Tx Ref
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Optional</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          {pm.is_active ? (
                            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Active</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>Disabled</span>
                          )}
                        </td>

                        {isAdminOrManager && (
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => handleOpenPMModal(pm)}
                                className="action-btn action-btn-primary"
                                title="Edit Method"
                              >
                                <Icon name="edit" size={13} />
                                Edit
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => setDeleteTarget({ type: 'pm', item: pm })}
                                  className="action-btn action-btn-danger"
                                  title="Delete Method"
                                >
                                  <Icon name="trash" size={13} />
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TAX RATES */}
      {activeTab === 'tax_rates' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Schedule Name</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tax Code</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Percentage Rate</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Price Inclusion</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                  {isAdminOrManager && (
                    <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Icon name="refresh" size={24} className="spin" />
                      <div style={{ marginTop: 8 }}>Loading tax rate schedules...</div>
                    </td>
                  </tr>
                ) : taxRates.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Icon name="tag" size={32} color="var(--text-dim)" />
                      <div style={{ marginTop: 8, fontWeight: 600 }}>No tax rate schedules configured</div>
                      <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Add National VAT (15%) schedule.</div>
                    </td>
                  </tr>
                ) : (
                  taxRates.map((tax) => (
                    <tr
                      key={tax.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{tax.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Tax ID #{tax.id}</div>
                      </td>

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
                          {tax.code}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                          {parseFloat(tax.rate_percent)}%
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        {tax.is_inclusive ? (
                          <span className="badge" style={{ background: 'rgba(22, 119, 255, 0.1)', color: 'var(--primary)', fontSize: '0.72rem' }}>
                            Tax Inclusive
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            Added at Checkout
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        {tax.is_active ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Active</span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>Disabled</span>
                        )}
                      </td>

                      {isAdminOrManager && (
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleOpenTaxModal(tax)}
                              className="action-btn action-btn-primary"
                              title="Edit Tax Rate"
                            >
                              <Icon name="edit" size={13} />
                              Edit
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => setDeleteTarget({ type: 'tax', item: tax })}
                                className="action-btn action-btn-danger"
                                title="Delete Tax Rate"
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
      )}

      {/* ── CREATE / EDIT PAYMENT METHOD MODAL ─────────────────────────── */}
      <Modal
        isOpen={isPMModalOpen}
        onClose={() => setIsPMModalOpen(false)}
        title={editingPM ? `Edit Tender: ${editingPM.name}` : 'New Payment Method Tender'}
      >
        <form onSubmit={handleSavePM}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Tender Code *
              </label>
              <input
                type="text"
                required
                value={pmFormData.code}
                onChange={(e) => setPmFormData({ ...pmFormData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. TELEBIRR"
                className="input-field"
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Display Name *
              </label>
              <input
                type="text"
                required
                value={pmFormData.name}
                onChange={(e) => setPmFormData({ ...pmFormData, name: e.target.value })}
                placeholder="e.g. Telebirr Mobile Money"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Channel Type *
              </label>
              <select
                required
                value={pmFormData.method_type}
                onChange={(e) => setPmFormData({ ...pmFormData, method_type: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="cash">Cash Tender</option>
                <option value="mobile_money">Mobile Money (Telebirr/CBE)</option>
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Direct Bank Wire</option>
                <option value="cheque">Bank Cheque</option>
                <option value="other">Other Tender</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Provider / Gateway Name
              </label>
              <input
                type="text"
                value={pmFormData.provider_name}
                onChange={(e) => setPmFormData({ ...pmFormData, provider_name: e.target.value })}
                placeholder="e.g. Ethio Telecom"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Sort Order Priority
              </label>
              <input
                type="number"
                min="1"
                value={pmFormData.sort_order}
                onChange={(e) => setPmFormData({ ...pmFormData, sort_order: parseInt(e.target.value, 10) || 1 })}
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={pmFormData.requires_reference}
                  onChange={(e) => setPmFormData({ ...pmFormData, requires_reference: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                />
                <span>Requires Transaction Reference</span>
              </label>
            </div>
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
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Active for POS Checkout</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Cashiers can select this method on the register screen
              </div>
            </div>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={pmFormData.is_active}
                onChange={(e) => setPmFormData({ ...pmFormData, is_active: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsPMModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingPM ? 'Update Tender' : 'Create Tender'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CREATE / EDIT TAX RATE MODAL ────────────────────────────────── */}
      <Modal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        title={editingTax ? `Edit Tax Schedule: ${editingTax.name}` : 'New Tax Rate Schedule'}
      >
        <form onSubmit={handleSaveTax}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Schedule Code *
              </label>
              <input
                type="text"
                required
                value={taxFormData.code}
                onChange={(e) => setTaxFormData({ ...taxFormData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. VAT15"
                className="input-field"
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Tax Name *
              </label>
              <input
                type="text"
                required
                value={taxFormData.name}
                onChange={(e) => setTaxFormData({ ...taxFormData, name: e.target.value })}
                placeholder="e.g. National VAT (15%)"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Rate Percentage (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                value={taxFormData.rate_percent}
                onChange={(e) => setTaxFormData({ ...taxFormData, rate_percent: parseFloat(e.target.value) || 0 })}
                className="input-field"
                style={{ width: '100%', fontSize: '1rem', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={taxFormData.is_inclusive}
                  onChange={(e) => setTaxFormData({ ...taxFormData, is_inclusive: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                />
                <span>Price Inclusive of Tax</span>
              </label>
            </div>
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
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Active Status</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Apply tax to catalog products and POS invoices
              </div>
            </div>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={taxFormData.is_active}
                onChange={(e) => setTaxFormData({ ...taxFormData, is_active: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsTaxModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingTax ? 'Update Tax Rate' : 'Create Tax Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.type === 'pm' ? 'Delete Payment Method' : 'Delete Tax Schedule'}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 20 }}>
            Are you sure you want to permanently delete{' '}
            <strong>"{deleteTarget?.item?.name}"</strong> ({deleteTarget?.item?.code})?
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

export default FinanceSettings;
