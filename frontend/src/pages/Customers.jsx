import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Customers = () => {
  const { user, showToast } = useAuth();

  // Data states
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Customer Form State
  const [customerForm, setCustomerForm] = useState({
    customer_code: '',
    customer_type: 'individual',
    display_name: '',
    phone: '',
    email: '',
    tax_number: '',
    credit_limit: '0.00',
    default_credit_days: 0,
    is_active: true,
    notes: '',
    address: {
      label: 'Main Office',
      address_type: 'both',
      recipient_name: '',
      phone: '',
      city: 'Addis Ababa',
      sub_city: 'Bole',
      address_line: '',
      is_default: true,
    },
  });

  // New Address Form State
  const [addressForm, setAddressForm] = useState({
    label: 'Branch Warehouse',
    address_type: 'shipping',
    recipient_name: '',
    phone: '',
    city: 'Addis Ababa',
    sub_city: 'Kirkos',
    address_line: '',
    is_default: false,
  });

  // Load customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({ per_page: 150 });
      setCustomers(res?.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        searchQuery === '' ||
        c.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customer_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tax_number?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = typeFilter === 'all' || c.customer_type === typeFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && (c.is_active === 1 || c.is_active === true)) ||
        (statusFilter === 'inactive' && (c.is_active === 0 || c.is_active === false));

      return matchSearch && matchType && matchStatus;
    });
  }, [customers, searchQuery, typeFilter, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const individual = customers.filter((c) => c.customer_type === 'individual').length;
    const corporate = customers.filter((c) => c.customer_type === 'corporate').length;
    const active = customers.filter((c) => c.is_active === 1 || c.is_active === true).length;
    const totalCreditLimit = customers.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);

    return { total, individual, corporate, active, totalCreditLimit };
  }, [customers]);

  // Open Create Customer
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormError('');
    setCustomerForm({
      customer_code: `CUST-${Date.now().toString().slice(-4)}`,
      customer_type: 'individual',
      display_name: '',
      phone: '',
      email: '',
      tax_number: '',
      credit_limit: '0.00',
      default_credit_days: 0,
      is_active: true,
      notes: '',
      address: {
        label: 'Primary Location',
        address_type: 'both',
        recipient_name: '',
        phone: '',
        city: 'Addis Ababa',
        sub_city: 'Bole',
        address_line: '',
        is_default: true,
      },
    });
    setIsCustomerModalOpen(true);
  };

  // Open Edit Customer
  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormError('');
    setCustomerForm({
      customer_code: customer.customer_code || '',
      customer_type: customer.customer_type || 'individual',
      display_name: customer.display_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      tax_number: customer.tax_number || '',
      credit_limit: String(customer.credit_limit || '0.00'),
      default_credit_days: customer.default_credit_days || 0,
      is_active: customer.is_active === 1 || customer.is_active === true,
      notes: customer.notes || '',
    });
    setIsCustomerModalOpen(true);
  };

  // Open View Profile Modal & load customer order history
  const handleOpenView = async (customer) => {
    setViewCustomer(customer);
    setCustomerOrders([]);
    setLoadingOrders(true);
    try {
      const res = await api.getOrders({ customer_id: customer.id, per_page: 20 });
      setCustomerOrders(res?.data || []);
    } catch {
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Toggle Active / Deactivated
  const handleToggleActive = async (customer) => {
    const nextState = !(customer.is_active === 1 || customer.is_active === true);
    try {
      await api.updateCustomer(customer.id, { is_active: nextState });
      showToast(`Customer '${customer.display_name}' ${nextState ? 'activated' : 'deactivated'}`, 'success');
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, is_active: nextState } : c))
      );
      if (viewCustomer?.id === customer.id) {
        setViewCustomer({ ...viewCustomer, is_active: nextState });
      }
    } catch (err) {
      showToast(err.message || 'Failed to update customer status', 'error');
    }
  };

  // Submit Customer Create / Update
  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!customerForm.display_name?.trim()) {
      setFormError('Please enter the customer or business name.');
      return;
    }
    if (!customerForm.phone?.trim()) {
      setFormError('Please enter a primary phone number.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, {
          display_name: customerForm.display_name.trim(),
          customer_type: customerForm.customer_type,
          phone: customerForm.phone.trim(),
          email: customerForm.email?.trim() || null,
          tax_number: customerForm.tax_number?.trim() || null,
          credit_limit: parseFloat(customerForm.credit_limit) || 0,
          default_credit_days: parseInt(customerForm.default_credit_days) || 0,
          is_active: customerForm.is_active,
          notes: customerForm.notes?.trim() || null,
        });
        showToast('Customer profile updated successfully!', 'success');
      } else {
        const payload = {
          customer_code: customerForm.customer_code?.trim() || undefined,
          customer_type: customerForm.customer_type,
          display_name: customerForm.display_name.trim(),
          phone: customerForm.phone.trim(),
          email: customerForm.email?.trim() || null,
          tax_number: customerForm.tax_number?.trim() || null,
          credit_limit: parseFloat(customerForm.credit_limit) || 0,
          default_credit_days: parseInt(customerForm.default_credit_days) || 0,
          is_active: customerForm.is_active,
          notes: customerForm.notes?.trim() || null,
        };

        if (customerForm.address?.address_line?.trim() || customerForm.address?.city?.trim()) {
          payload.address = {
            ...customerForm.address,
            recipient_name: customerForm.address.recipient_name || customerForm.display_name,
            phone: customerForm.address.phone || customerForm.phone,
          };
        }

        await api.createCustomer(payload);
        showToast('New customer profile registered!', 'success');
      }

      setIsCustomerModalOpen(false);
      await loadCustomers();
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to save customer';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Customer (Admin Permission Guard + Safe Deactivate fallback)
  const handleDeleteCustomer = async (customer) => {
    if (user?.role !== 'admin') {
      showToast('Permission Denied: Only Administrators can delete customer records.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete customer '${customer.display_name}'?`)) return;

    try {
      await api.deleteCustomer(customer.id);
      showToast('Customer deleted successfully', 'success');
      await loadCustomers();
    } catch (err) {
      // 409 means customer has associated order history
      const willDeactivate = window.confirm(
        `Cannot delete customer '${customer.display_name}' because they have associated order history.\n\nWould you like to deactivate this customer account instead?`
      );
      if (willDeactivate) {
        await handleToggleActive(customer);
      }
    }
  };

  // Open Address Manager Drawer
  const handleOpenAddresses = (customer) => {
    setSelectedCustomer(customer);
    setAddressForm({
      label: 'Secondary Address',
      address_type: 'shipping',
      recipient_name: customer.display_name,
      phone: customer.phone || '',
      city: 'Addis Ababa',
      sub_city: 'Bole',
      address_line: '',
      is_default: false,
    });
    setIsAddressModalOpen(true);
  };

  // Add Address submit
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      setSubmitting(true);
      await api.createCustomerAddress(selectedCustomer.id, addressForm);
      showToast('Address added to customer profile!', 'success');
      const updated = await api.getCustomer(selectedCustomer.id);
      setSelectedCustomer(updated?.data || updated);
      await loadCustomers();
      setAddressForm({
        label: 'Branch Location',
        address_type: 'shipping',
        recipient_name: selectedCustomer.display_name,
        phone: selectedCustomer.phone || '',
        city: 'Addis Ababa',
        sub_city: 'Kirkos',
        address_line: '',
        is_default: false,
      });
    } catch (err) {
      showToast(err.message || 'Failed to add address', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addressId) => {
    try {
      await api.deleteCustomerAddress(selectedCustomer.id, addressId);
      showToast('Address removed', 'success');
      const updated = await api.getCustomer(selectedCustomer.id);
      setSelectedCustomer(updated?.data || updated);
      await loadCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to delete address', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
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
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="users" size={24} color="var(--brand-blue)" />
            Customer Directory & Accounts
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time customer account profiles, credit lines, delivery addresses, and past order ledgers
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700 }}
        >
          <Icon name="plus" size={18} />
          Register Customer
        </button>
      </div>

      {/* KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Clients</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>{metrics.total}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase' }}>Individual Customers</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--info)', marginTop: 4 }}>{metrics.individual}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-purple)', textTransform: 'uppercase' }}>Corporate Accounts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-purple)', marginTop: 4 }}>{metrics.corporate}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Credit Extended</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)', marginTop: 8 }}>ETB {metrics.totalCreditLimit.toFixed(2)}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: 16,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: 260 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', display: 'flex' }}>
            <Icon name="search" size={17} />
          </div>
          <input
            type="text"
            placeholder="Search by customer name, code, phone, email, TIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 38px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-app)',
              fontSize: '0.88rem',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'individual', 'corporate'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: typeFilter === t ? '1px solid var(--brand-blue)' : '1px solid var(--border-subtle)',
                  background: typeFilter === t ? 'var(--brand-blue)' : 'var(--bg-surface)',
                  color: typeFilter === t ? '#ffffff' : 'var(--text-muted)',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { id: 'all', label: 'All Status' },
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Deactivated' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statusFilter === s.id ? '1px solid var(--brand-purple)' : '1px solid var(--border-subtle)',
                  background: statusFilter === s.id ? 'var(--brand-purple)' : 'var(--bg-surface)',
                  color: statusFilter === s.id ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Code</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Display Name</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Type</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Phone / Contact</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Credit Limit</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Addresses</th>
                <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading customers directory...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No customer profiles found. Click "Register Customer" to add one.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isActive = cust.is_active === 1 || cust.is_active === true;
                  return (
                    <tr key={cust.id} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: isActive ? 1 : 0.65 }}>
                      <td style={{ padding: '12px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-blue)' }}>
                        {cust.customer_code}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{cust.display_name}</div>
                        {cust.email && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{cust.email}</div>}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: cust.customer_type === 'corporate' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0, 176, 116, 0.1)',
                            color: cust.customer_type === 'corporate' ? 'var(--brand-purple)' : 'var(--success)',
                          }}
                        >
                          {cust.customer_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 500 }}>
                        {cust.phone || '—'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <button
                          onClick={() => handleToggleActive(cust)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            background: isActive ? 'rgba(0, 176, 116, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isActive ? '#00b074' : '#ef4444',
                          }}
                          title="Click to toggle status"
                        >
                          {isActive ? '● Active' : '○ Deactivated'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 700 }}>
                        {Number(cust.credit_limit) > 0 ? `ETB ${Number(cust.credit_limit).toFixed(2)}` : 'None'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <button
                          onClick={() => handleOpenAddresses(cust)}
                          className="action-btn action-btn-view"
                          style={{ fontSize: '0.74rem' }}
                        >
                          <Icon name="mapPin" size={12} />
                          {cust.addresses?.length ?? 1} Addresses
                        </button>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleOpenView(cust)}
                            className="action-btn action-btn-secondary"
                            style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                            title="View Full Profile & Order History"
                          >
                            <Icon name="eye" size={13} />
                            View
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="action-btn action-btn-primary"
                            title="Edit Profile"
                          >
                            <Icon name="edit" size={13} />
                            Edit
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteCustomer(cust)}
                              className="action-btn action-btn-danger"
                              title="Delete Profile (Admin Only)"
                            >
                              <Icon name="trash" size={13} />
                              Delete
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

      {/* MODAL 1: View Customer Profile & History */}
      <Modal
        isOpen={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title={viewCustomer ? `Customer Account: ${viewCustomer.display_name}` : 'Customer Profile'}
        maxWidth={700}
      >
        {viewCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Top Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                background: 'var(--bg-app)',
                padding: '16px',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Customer Code</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--brand-blue)' }}>{viewCustomer.customer_code}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Account Type</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'capitalize' }}>{viewCustomer.customer_type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Contact Phone</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{viewCustomer.phone || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Email Address</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{viewCustomer.email || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Credit Limit</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--success)' }}>
                  ETB {Number(viewCustomer.credit_limit || 0).toFixed(2)} ({viewCustomer.default_credit_days || 0} days)
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Account Status</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: viewCustomer.is_active ? 'var(--success)' : 'var(--danger)' }}>
                  {viewCustomer.is_active ? 'Active Customer' : 'Deactivated'}
                </div>
              </div>
            </div>

            {/* Saved Addresses */}
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="mapPin" size={14} color="var(--brand-blue)" />
                Registered Delivery Locations
              </div>
              {viewCustomer.addresses?.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--bg-app)', borderRadius: 8 }}>
                  No saved physical addresses recorded for this client.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
                  {viewCustomer.addresses?.map((addr) => (
                    <div
                      key={addr.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{addr.label || 'Delivery Location'}</span>
                        {addr.is_default && (
                          <span style={{ fontSize: '0.66rem', padding: '1px 6px', background: 'var(--brand-blue-light)', color: 'var(--brand-blue)', borderRadius: 4 }}>
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                        {addr.address_line}, {addr.sub_city}, {addr.city}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders Ledger */}
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="receipt" size={14} color="var(--brand-blue)" />
                Recent Orders Ledger
              </div>
              {loadingOrders ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  Loading client order history...
                </div>
              ) : customerOrders.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px 14px', background: 'var(--bg-app)', borderRadius: 8 }}>
                  No previous orders placed by this customer yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '8px 12px' }}>Order #</th>
                        <th style={{ padding: '8px 12px' }}>Date</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOrders.map((ord) => (
                        <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--brand-blue)' }}>
                            {ord.order_number || `#${ord.id}`}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                            {new Date(ord.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(22, 119, 255, 0.1)', color: '#1677ff', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>
                              {ord.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800 }}>
                            ETB {parseFloat(ord.total_amount || ord.grand_total || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <button
                onClick={() => handleToggleActive(viewCustomer)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  background: viewCustomer.is_active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 176, 116, 0.15)',
                  color: viewCustomer.is_active ? '#ef4444' : '#00b074',
                }}
              >
                {viewCustomer.is_active ? 'Deactivate Customer' : 'Activate Customer'}
              </button>

              <button
                onClick={() => {
                  const target = viewCustomer;
                  setViewCustomer(null);
                  handleOpenEdit(target);
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '7px 16px', fontWeight: 700 }}
              >
                Edit Account Details
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Create / Edit Customer Profile */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.display_name}` : 'Register New Customer Account'}
        maxWidth={580}
      >
        <form onSubmit={handleSubmitCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {formError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon name="alert" size={16} color="#ef4444" />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Customer Type
              </label>
              <select
                value={customerForm.customer_type}
                onChange={(e) => setCustomerForm({ ...customerForm, customer_type: e.target.value })}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.88rem' }}
              >
                <option value="individual">Individual Consumer</option>
                <option value="corporate">Corporate / Wholesale Account</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Customer Code (Optional)
              </label>
              <input
                type="text"
                disabled={!!editingCustomer}
                value={customerForm.customer_code}
                onChange={(e) => setCustomerForm({ ...customerForm, customer_code: e.target.value })}
                placeholder="Auto-generated if blank"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.88rem', fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
              Full Display Name / Corporate Entity Title
            </label>
            <input
              type="text"
              required
              value={customerForm.display_name}
              onChange={(e) => setCustomerForm({ ...customerForm, display_name: e.target.value })}
              placeholder="e.g. Ethio Telecom Procurement or Abebe Bikila"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Primary Phone Number
              </label>
              <input
                type="text"
                required
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="+251 911 223344"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                placeholder="client@domain.et"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                TIN / Tax Number
              </label>
              <input
                type="text"
                value={customerForm.tax_number}
                onChange={(e) => setCustomerForm({ ...customerForm, tax_number: e.target.value })}
                placeholder="TIN-001928"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Credit Limit (ETB)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={customerForm.credit_limit}
                onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                Credit Days
              </label>
              <input
                type="number"
                min="0"
                value={customerForm.default_credit_days}
                onChange={(e) => setCustomerForm({ ...customerForm, default_credit_days: e.target.value })}
                placeholder="30"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {editingCustomer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input
                type="checkbox"
                id="edit_is_active"
                checked={customerForm.is_active}
                onChange={(e) => setCustomerForm({ ...customerForm, is_active: e.target.checked })}
              />
              <label htmlFor="edit_is_active" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Account Active (Client eligible for sales & orders)
              </label>
            </div>
          )}

          {/* Embedded Address if Creating */}
          {!editingCustomer && (
            <div style={{ background: 'var(--bg-app)', padding: 12, borderRadius: 8, border: '1px solid var(--border-subtle)', marginTop: 4 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-blue)', marginBottom: 8 }}>
                Primary Delivery Address
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="City (e.g. Addis Ababa)"
                  value={customerForm.address.city}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: { ...customerForm.address, city: e.target.value } })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  placeholder="Sub-City (e.g. Bole)"
                  value={customerForm.address.sub_city}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: { ...customerForm.address, sub_city: e.target.value } })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                />
              </div>
              <input
                type="text"
                placeholder="Address Line / Building / Office #"
                value={customerForm.address.address_line}
                onChange={(e) => setCustomerForm({ ...customerForm, address: { ...customerForm.address, address_line: e.target.value } })}
                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontWeight: 700 }}
            >
              {submitting ? 'Saving Profile...' : editingCustomer ? 'Update Profile' : 'Register Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Address Book Manager */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={selectedCustomer ? `Address Book: ${selectedCustomer.display_name}` : 'Customer Addresses'}
        maxWidth={620}
      >
        {selectedCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Existing Addresses List */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>Saved Addresses</div>
              {selectedCustomer.addresses?.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '12px', background: 'var(--bg-app)', borderRadius: 6 }}>
                  No saved addresses for this client.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedCustomer.addresses?.map((addr) => (
                    <div
                      key={addr.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          {addr.label || 'Delivery Location'}{' '}
                          {addr.is_default && (
                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'var(--brand-blue-light)', color: 'var(--brand-blue)', borderRadius: 4, marginLeft: 6 }}>
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {addr.address_line}, {addr.sub_city}, {addr.city}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}
                        title="Remove Address"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Address Form */}
            <form onSubmit={handleAddAddress} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-blue)' }}>+ Add New Location / Warehouse</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input
                  type="text"
                  required
                  placeholder="Label (e.g. Megenagna Branch)"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  placeholder="Recipient Contact Name"
                  value={addressForm.recipient_name}
                  onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  required
                  placeholder="Sub-City / Area"
                  value={addressForm.sub_city}
                  onChange={(e) => setAddressForm({ ...addressForm, sub_city: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                />
              </div>

              <input
                type="text"
                required
                placeholder="Street Address Line"
                value={addressForm.address_line}
                onChange={(e) => setAddressForm({ ...addressForm, address_line: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontSize: '0.82rem', padding: '6px 14px', fontWeight: 700 }}>
                  {submitting ? 'Saving...' : 'Add Address'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Customers;
