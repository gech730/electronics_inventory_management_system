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

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      const res = await api.getCustomers({ per_page: 100 });
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

      return matchSearch && matchType;
    });
  }, [customers, searchQuery, typeFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const individual = customers.filter((c) => c.customer_type === 'individual').length;
    const corporate = customers.filter((c) => c.customer_type === 'corporate').length;
    const totalCreditLimit = customers.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);

    return { total, individual, corporate, totalCreditLimit };
  }, [customers]);

  // Open Create Customer
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setCustomerForm({
      customer_code: `CUST-${Date.now().toString().slice(-4)}`,
      customer_type: 'individual',
      display_name: '',
      phone: '',
      email: '',
      tax_number: '',
      credit_limit: '0.00',
      default_credit_days: 0,
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
    setCustomerForm({
      customer_code: customer.customer_code || '',
      customer_type: customer.customer_type || 'individual',
      display_name: customer.display_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      tax_number: customer.tax_number || '',
      credit_limit: String(customer.credit_limit || '0.00'),
      default_credit_days: customer.default_credit_days || 0,
      notes: customer.notes || '',
    });
    setIsCustomerModalOpen(true);
  };

  // Submit Customer Create / Update
  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, {
          display_name: customerForm.display_name,
          customer_type: customerForm.customer_type,
          phone: customerForm.phone || null,
          email: customerForm.email || null,
          tax_number: customerForm.tax_number || null,
          credit_limit: parseFloat(customerForm.credit_limit) || 0,
          default_credit_days: parseInt(customerForm.default_credit_days) || 0,
          notes: customerForm.notes || null,
        });
        showToast('Customer profile updated successfully!', 'success');
      } else {
        await api.createCustomer({
          ...customerForm,
          credit_limit: parseFloat(customerForm.credit_limit) || 0,
          default_credit_days: parseInt(customerForm.default_credit_days) || 0,
        });
        showToast('New customer profile registered!', 'success');
      }

      setIsCustomerModalOpen(false);
      await loadCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to save customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Are you sure you want to delete customer '${customer.display_name}'?`)) return;

    try {
      await api.deleteCustomer(customer.id);
      showToast('Customer deleted successfully', 'success');
      await loadCustomers();
    } catch (err) {
      showToast(err.message || 'Cannot delete customer with order records', 'error');
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
      // Reload customer data
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
            Customer Directory & Credit Accounts
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage individual and corporate wholesale customer accounts, credit limits, and delivery address books
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

        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'individual', 'corporate'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '6px 14px',
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
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>TIN #</th>
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
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
                    <td style={{ padding: '12px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {cust.tax_number || '—'}
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
                          onClick={() => handleOpenEdit(cust)}
                          className="action-btn action-btn-primary"
                          title="Edit Profile"
                        >
                          <Icon name="edit" size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust)}
                          className="action-btn action-btn-danger"
                          title="Delete Profile"
                        >
                          <Icon name="trash" size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create / Edit Customer Profile */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.display_name}` : 'Register New Customer Account'}
        maxWidth={580}
      >
        <form onSubmit={handleSubmitCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                Customer Code
              </label>
              <input
                type="text"
                required
                disabled={!!editingCustomer}
                value={customerForm.customer_code}
                onChange={(e) => setCustomerForm({ ...customerForm, customer_code: e.target.value })}
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

      {/* MODAL 2: Address Book Manager */}
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
