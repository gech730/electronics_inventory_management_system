import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';
import { RoleBadge } from '../components/StockBadge';

export const Users = () => {
  const { addToast } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'cashier',
    password: '',
    password_confirmation: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch Users from Laravel API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      // Laravel pagination returns an object with a `data` array
      setUsers(res.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to load staff accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = () => {
    setFormData({
      name: '',
      email: '',
      role: 'cashier',
      password: '',
      password_confirmation: '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createUser(formData);
      addToast(`Staff account for ${formData.name} created!`, 'success');
      setIsModalOpen(false);
      fetchUsers(); // Refresh the staff table
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header Card */}
      <div
        className="glass-card"
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Staff User Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
            Create and manage staff accounts with role-based permissions (Manager, Cashier, Storekeeper).
          </p>
        </div>

        <button onClick={handleOpenModal} className="btn btn-primary">
          <Icon name="plus" size={18} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Email Address</th>
              <th>Assigned Role</th>
              <th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Icon name="refresh" size={24} className="animate-spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                  <div>Loading staff accounts...</div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No staff accounts found. Click "Add Staff Member" to create one.
                </td>
              </tr>
            ) : (
              users.map((staff) => (
                <tr key={staff.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}
                      >
                        {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span style={{ fontWeight: 600 }}>{staff.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{staff.email}</td>
                  <td>
                    <RoleBadge role={staff.role} />
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                    {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Staff Member Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Staff Member"
        maxWidth={500}
      >
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <Icon name="alert" size={18} color="var(--danger)" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              placeholder="e.g. Sarah Jenkins"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="sarah@volttrack.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Role Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="role">
              Assign Staff Role
            </label>
            <select
              id="role"
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="cashier">Cashier (Point of Sale & Own Sales History)</option>
              <option value="manager">Manager (Inventory, Products & Categories)</option>
              <option value="storekeeper">Storekeeper (Stock & Warehousing)</option>
            </select>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password (Min. 8 characters)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password_confirmation">
              Confirm Password
            </label>
            <input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password_confirmation}
              onChange={handleChange}
              required
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Icon name="refresh" size={16} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <Icon name="plus" size={16} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
