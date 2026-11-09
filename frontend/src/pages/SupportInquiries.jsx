import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export default function SupportInquiries() {
  const { showToast } = useAuth();

  const [messages, setMessages] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected message for details modal & admin note editing
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [adminNoteText, setAdminNoteText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch inquiries from backend
  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getContactMessages(params);
      const items = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
      setMessages(items);
      if (res?.counts) {
        setCounts(res.counts);
      }
    } catch (err) {
      console.error('Failed to load inquiries:', err);
      showToast?.('Unable to load support messages', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, showToast]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // Handle status update
  const handleStatusChange = async (messageId, newStatus) => {
    try {
      await api.updateContactMessage(messageId, { status: newStatus });
      showToast?.(`Inquiry marked as ${newStatus.replace('_', ' ')}`, 'success');
      // Update local state
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: newStatus } : m))
      );
      if (selectedMessage && selectedMessage.id === messageId) {
        setSelectedMessage((prev) => ({ ...prev, status: newStatus }));
      }
      // Re-fetch counts
      fetchInquiries();
    } catch (err) {
      showToast?.(err.message || 'Failed to update status', 'error');
    }
  };

  // Save admin notes
  const handleSaveNotes = async () => {
    if (!selectedMessage) return;
    try {
      setIsUpdating(true);
      await api.updateContactMessage(selectedMessage.id, {
        status: selectedMessage.status,
        admin_notes: adminNoteText,
      });
      showToast?.('Support notes saved successfully', 'success');
      setMessages((prev) =>
        prev.map((m) => (m.id === selectedMessage.id ? { ...m, admin_notes: adminNoteText } : m))
      );
      setSelectedMessage((prev) => ({ ...prev, admin_notes: adminNoteText }));
    } catch (err) {
      showToast?.(err.message || 'Failed to save notes', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete inquiry
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer inquiry?')) return;
    try {
      await api.deleteContactMessage(id);
      showToast?.('Inquiry removed', 'success');
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      fetchInquiries();
    } catch (err) {
      showToast?.(err.message || 'Failed to delete inquiry', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}>
            ● Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.25)',
          }}>
            ● In Progress
          </span>
        );
      case 'pending':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}>
            ● Pending
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px' }}>
            Customer Support & Inquiries
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
            Live customer questions, website consultation requests, and support tickets from the storefront.
          </p>
        </div>

        <button
          onClick={fetchInquiries}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Icon name="refresh" size={16} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 18, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Inquiries</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', marginTop: 4 }}>{counts.total}</div>
        </div>
        <div style={{ padding: 18, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>Pending Action</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b', marginTop: 4 }}>{counts.pending}</div>
        </div>
        <div style={{ padding: 18, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600 }}>In Progress</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3b82f6', marginTop: 4 }}>{counts.in_progress}</div>
        </div>
        <div style={{ padding: 18, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Resolved</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', marginTop: 4 }}>{counts.resolved}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: 16,
          borderRadius: 12,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 20,
        }}
      >
        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Inquiries' },
            { id: 'pending', label: 'Pending' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'resolved', label: 'Resolved' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: statusFilter === tab.id ? 'var(--primary, #1677ff)' : 'rgba(255, 255, 255, 0.05)',
                color: statusFilter === tab.id ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: 260, position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sender, email, subject..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: 8,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.84rem',
              outline: 'none',
            }}
          />
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
            <Icon name="search" size={14} />
          </div>
        </div>
      </div>

      {/* Messages List / Table */}
      <div style={{ borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            Loading inquiries from database...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>No customer inquiries found</div>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
              When customers submit the contact or inquiry form on the website, their messages will appear here.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Customer / Contact</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Subject & Message</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr
                    key={msg.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setSelectedMessage(msg);
                      setAdminNoteText(msg.admin_notes || '');
                    }}
                  >
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(msg.created_at).toLocaleDateString()}
                      <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{msg.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{msg.email}</div>
                      {msg.phone && <div style={{ fontSize: '0.74rem', color: '#1677ff' }}>📞 {msg.phone}</div>}
                    </td>

                    <td style={{ padding: '14px 16px', maxWidth: 380 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>
                        {msg.subject || 'General Inquiry'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {msg.message}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={msg.status}
                        onChange={(e) => handleStatusChange(msg.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedMessage(msg);
                          setAdminNoteText(msg.admin_notes || '');
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: 'rgba(22, 119, 255, 0.1)',
                          border: '1px solid rgba(22, 119, 255, 0.3)',
                          color: '#1677ff',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginRight: 8,
                        }}
                      >
                        View & Notes
                      </button>

                      <button
                        onClick={() => handleDelete(msg.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                        }}
                        title="Delete Inquiry"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Notes Modal */}
      {selectedMessage && (
        <Modal
          isOpen={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          title={`Inquiry from ${selectedMessage.name}`}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Sender Metadata Box */}
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Received: {new Date(selectedMessage.created_at).toLocaleString()}
                </span>
                {getStatusBadge(selectedMessage.status)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.84rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                  <a href={`mailto:${selectedMessage.email}`} style={{ color: '#1677ff', fontWeight: 600 }}>
                    {selectedMessage.email}
                  </a>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Phone: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedMessage.phone || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Subject & Full Message */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                Subject
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 12 }}>
                {selectedMessage.subject || 'Customer Inquiry'}
              </div>

              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                Message Content
              </div>
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedMessage.message}
              </div>
            </div>

            {/* Change Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Update Status
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['pending', 'in_progress', 'resolved'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(selectedMessage.id, st)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: selectedMessage.status === st ? '2px solid #1677ff' : '1px solid var(--border-subtle)',
                      background: selectedMessage.status === st ? 'rgba(22, 119, 255, 0.15)' : 'var(--bg-surface)',
                      color: selectedMessage.status === st ? '#1677ff' : 'var(--text-muted)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Response & Action Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Internal Staff Notes / Follow-up Record
              </label>
              <textarea
                rows={3}
                value={adminNoteText}
                onChange={(e) => setAdminNoteText(e.target.value)}
                placeholder="e.g. Called customer on +251 911... Sent quotation for 10 units..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveNotes}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'var(--primary, #1677ff)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUpdating ? 'Saving...' : 'Save Staff Notes'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
