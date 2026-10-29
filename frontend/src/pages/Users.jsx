import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';
import { RoleBadge } from '../components/StockBadge';

export const Users = () => {
  const { user: currentUser, addToast } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form State for creating staff
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'cashier',
    password: '',
    password_confirmation: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Users from Laravel API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      const rawUsers = res?.data || [];
      // Initialize users with active status if not set
      const formatted = rawUsers.map((u) => ({
        ...u,
        status: u.status || 'active',
      }));
      setUsers(formatted);
    } catch (err) {
      addToast(err.message || 'Failed to load staff accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Open Create Modal
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      role: 'cashier',
      password: '',
      password_confirmation: '',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Submit Create Staff Member
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password !== formData.password_confirmation) {
      setFormError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createUser(formData);
      addToast(`Staff account for ${formData.name} created!`, 'success');
      setIsAddModalOpen(false);

      // Append newly created user to local list
      if (res?.user) {
        setUsers((prev) => [{ ...res.user, status: 'active', created_at: new Date().toISOString() }, ...prev]);
      } else {
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.data?.message || err.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle User Active / Inactive Status
  const handleToggleStatus = (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      addToast('You cannot deactivate your own admin account.', 'error');
      return;
    }

    const nextStatus = targetUser.status === 'inactive' ? 'active' : 'inactive';

    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
    );

    if (nextStatus === 'inactive') {
      addToast(`${targetUser.name} is now marked as Inactive`, 'info');
    } else {
      addToast(`${targetUser.name} has been Activated`, 'success');
    }
  };

  // Delete User Confirmation
  const confirmDeleteUser = () => {
    if (!userToDelete) return;

    if (userToDelete.id === currentUser?.id) {
      addToast('You cannot delete your own admin account.', 'error');
      setUserToDelete(null);
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
    addToast(`Staff member ${userToDelete.name} removed successfully`, 'info');
    setUserToDelete(null);
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Role pill counter
  const roleCounts = {
    all: users.length,
    manager: users.filter((u) => u.role === 'manager').length,
    cashier: users.filter((u) => u.role === 'cashier').length,
    storekeeper: users.filter((u) => u.role === 'storekeeper').length,
    admin: users.filter((u) => u.role === 'admin').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              Staff User Management
            </h1>
            <span
              style={{
                background: 'rgba(22, 119, 255, 0.1)',
                color: '#1677ff',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '9999px',
              }}
            >
              {users.length} Total Users
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: 4 }}>
            Control staff accounts, assign operational roles, and manage active/inactive statuses.
          </p>
        </div>

        <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ background: '#1677ff' }}>
          <Icon name="plus" size={16} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Filter and Search Bar Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '18px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: 280, flex: 1, maxWidth: 380 }}>
          <Icon
            name="search"
            size={16}
            color="#94a3b8"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px 9px 38px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '0.86rem',
              color: '#1e293b',
              outline: 'none',
            }}
          />
        </div>

        {/* Role Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Roles' },
            { id: 'manager', label: 'Managers' },
            { id: 'cashier', label: 'Cashiers' },
            { id: 'storekeeper', label: 'Storekeepers' },
            { id: 'admin', label: 'Admins' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRole(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                background: selectedRole === tab.id ? '#1677ff' : '#f1f5f9',
                color: selectedRole === tab.id ? '#ffffff' : '#64748b',
              }}
            >
              {tab.label} ({roleCounts[tab.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Staff Directory Table Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Staff Member
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Email Address
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Role
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Joined Date
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                  Management Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <Icon name="refresh" size={24} className="animate-spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                    <div style={{ fontWeight: 500 }}>Loading staff directory...</div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>No staff members found</div>
                    <p style={{ fontSize: '0.84rem', marginTop: 4, color: '#94a3b8' }}>
                      Try adjusting your search query or filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((staff) => {
                  const isActive = staff.status !== 'inactive';
                  const isCurrentAdmin = staff.id === currentUser?.id;

                  return (
                    <tr
                      key={staff.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 150ms ease',
                      }}
                    >
                      {/* Staff Member Name + Avatar */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: isActive ? 'rgba(22, 119, 255, 0.1)' : '#f1f5f9',
                              color: isActive ? '#1677ff' : '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.92rem',
                              border: isActive ? '1px solid rgba(22, 119, 255, 0.2)' : '1px solid #e2e8f0',
                            }}
                          >
                            {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
                              {staff.name}
                              {isCurrentAdmin && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: '0.72rem',
                                    color: '#1677ff',
                                    background: 'rgba(22, 119, 255, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              ID: #{staff.id || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email Address */}
                      <td style={{ padding: '16px 20px', color: '#475569', fontSize: '0.88rem' }}>
                        {staff.email}
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <RoleBadge role={staff.role} />
                      </td>

                      {/* Active / Inactive Status Pill */}
                      <td style={{ padding: '16px 20px' }}>
                        {isActive ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              background: 'rgba(0, 176, 116, 0.1)',
                              color: '#00b074',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00b074' }} />
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              background: '#f1f5f9',
                              color: '#94a3b8',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.84rem' }}>
                        {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Management Action Buttons */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {/* Toggle Active / Inactive Status Button */}
                          <button
                            onClick={() => handleToggleStatus(staff)}
                            disabled={isCurrentAdmin}
                            className={`action-btn ${isActive ? 'action-btn-view' : 'action-btn-success'}`}
                            title={
                              isCurrentAdmin
                                ? 'Cannot deactivate yourself'
                                : isActive
                                ? 'Mark as Inactive'
                                : 'Activate user'
                            }
                            style={{ opacity: isCurrentAdmin ? 0.4 : 1, cursor: isCurrentAdmin ? 'not-allowed' : 'pointer' }}
                          >
                            <Icon name="power" size={13} />
                            <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>

                          {/* Delete User Button */}
                          <button
                            onClick={() => setUserToDelete(staff)}
                            disabled={isCurrentAdmin}
                            className="action-btn action-btn-danger"
                            title={isCurrentAdmin ? 'Cannot delete your own account' : 'Delete user'}
                            style={{ opacity: isCurrentAdmin ? 0.4 : 1, cursor: isCurrentAdmin ? 'not-allowed' : 'pointer' }}
                          >
                            <Icon name="trash" size={13} />
                            <span>Delete</span>
                          </button>
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

      {/* Modal 1: Add New Staff Member */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Staff Member"
        maxWidth={500}
      >
        {formError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <Icon name="alert" size={18} color="#ef4444" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name" style={{ color: '#64748b', fontSize: '0.78rem' }}>
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
              style={{ background: '#f8fafc', color: '#1e293b' }}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email" style={{ color: '#64748b', fontSize: '0.78rem' }}>
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="sarah@stockwise.com"
              value={formData.email}
              onChange={handleChange}
              style={{ background: '#f8fafc', color: '#1e293b' }}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role" style={{ color: '#64748b', fontSize: '0.78rem' }}>
              Assign Operational Role
            </label>
            <select
              id="role"
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
              style={{ background: '#f8fafc', color: '#1e293b' }}
              required
            >
              <option value="cashier">Cashier (Point of Sale & Own Sales History)</option>
              <option value="manager">Manager (Inventory, Products & Categories)</option>
              <option value="storekeeper">Storekeeper (Warehouse Stock)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password" style={{ color: '#64748b', fontSize: '0.78rem' }}>
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
              style={{ background: '#f8fafc', color: '#1e293b' }}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password_confirmation" style={{ color: '#64748b', fontSize: '0.78rem' }}>
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
              style={{ background: '#f8fafc', color: '#1e293b' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#1677ff' }}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Delete User Confirmation */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Remove Staff Member"
        maxWidth={440}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5 }}>
            Are you sure you want to remove <strong>{userToDelete?.name}</strong> (
            <span style={{ color: '#64748b' }}>{userToDelete?.email}</span>)?
          </p>
          <p style={{ color: '#ef4444', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
            ⚠️ This will revoke their access to the StockWise inventory management system.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setUserToDelete(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteUser}
              className="btn btn-danger"
              style={{ background: '#ef4444', color: '#ffffff' }}
            >
              Yes, Remove User
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
