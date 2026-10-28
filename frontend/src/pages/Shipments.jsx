import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Shipments = () => {
  const { user, showToast } = useAuth();

  // Data states
  const [shipments, setShipments] = useState([]);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Shipment Form
  const [newShipment, setNewShipment] = useState({
    order_id: '',
    shipping_provider: 'DHL Express Ethiopia',
    tracking_number: '',
    recipient_name: '',
    recipient_phone: '',
    notes: '',
  });

  // Load shipments & dispatchable orders
  const loadShipmentsData = async () => {
    try {
      setLoading(true);
      const [shipRes, ordRes] = await Promise.all([
        api.getShipments({ per_page: 50 }).catch(() => ({ data: [] })),
        api.getOrders({ per_page: 100 }).catch(() => ({ data: [] })),
      ]);

      setShipments(shipRes?.data || []);

      // Orders eligible for dispatch: confirmed or processing
      const allOrders = ordRes?.data || [];
      const eligible = allOrders.filter((o) => ['confirmed', 'processing'].includes(o.status));
      setEligibleOrders(eligible);
      if (eligible.length > 0 && !newShipment.order_id) {
        selectOrderForDispatch(eligible[0]);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load shipments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipmentsData();
  }, []);

  // Autofill recipient details when order selected
  const selectOrderForDispatch = (order) => {
    const defaultTracking = `TRK-${Date.now().toString().slice(-6)}`;
    setNewShipment((prev) => ({
      ...prev,
      order_id: order.id,
      recipient_name: order.customer?.display_name || 'Retail Customer',
      recipient_phone: order.customer?.phone || '',
      tracking_number: defaultTracking,
    }));
  };

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((shp) => {
      const matchSearch =
        searchQuery === '' ||
        shp.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shp.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shp.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shp.order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'all' || shp.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [shipments, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = shipments.length;
    const packed = shipments.filter((s) => s.status === 'packed').length;
    const inTransit = shipments.filter((s) => s.status === 'shipped').length;
    const delivered = shipments.filter((s) => s.status === 'delivered').length;

    return { total, packed, inTransit, delivered };
  }, [shipments]);

  // Update shipment status
  const handleUpdateStatus = async (shipmentId, newStatus) => {
    try {
      setSubmitting(true);
      await api.updateShipment(shipmentId, { status: newStatus });
      showToast(`Shipment status updated to '${newStatus}'`, 'success');
      await loadShipmentsData();
      if (selectedShipment?.id === shipmentId) {
        setSelectedShipment((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to update shipment status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Create shipment submit
  const handleCreateShipment = async (e) => {
    e.preventDefault();
    if (!newShipment.order_id) {
      showToast('Please select a confirmed order to dispatch', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const selectedOrd = eligibleOrders.find((o) => String(o.id) === String(newShipment.order_id));
      const itemsPayload = (selectedOrd?.items || [{ id: 1, quantity_ordered: 1 }]).map((it) => ({
        order_item_id: it.id,
        quantity_shipped: it.quantity_ordered || 1,
      }));

      await api.createShipment({
        order_id: newShipment.order_id,
        shipping_provider: newShipment.shipping_provider,
        tracking_number: newShipment.tracking_number,
        recipient_name: newShipment.recipient_name,
        recipient_phone: newShipment.recipient_phone,
        notes: newShipment.notes || null,
        items: itemsPayload,
      });

      showToast('Logistics shipment dispatched successfully!', 'success');
      setIsCreateModalOpen(false);
      await loadShipmentsData();
    } catch (err) {
      showToast(err.message || 'Failed to dispatch shipment', 'error');
    } finally {
      setSubmitting(false);
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
            <Icon name="truck" size={24} color="var(--brand-blue)" />
            Logistics & Courier Shipments
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track order delivery packages, courier tracking numbers, and fulfillment completions
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700 }}
        >
          <Icon name="plus" size={18} />
          Dispatch Package
        </button>
      </div>

      {/* KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Packages</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>{metrics.total}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase' }}>Packed / Ready</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)', marginTop: 4 }}>{metrics.packed}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-purple)', textTransform: 'uppercase' }}>In Transit (Couriers)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-purple)', marginTop: 4 }}>{metrics.inTransit}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Delivered Successfully</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>{metrics.delivered}</div>
        </div>
      </div>

      {/* Filter Bar */}
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
            placeholder="Search tracking #, shipment code, recipient, order..."
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
          {['all', 'packed', 'shipped', 'delivered', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: statusFilter === st ? '1px solid var(--brand-blue)' : '1px solid var(--border-subtle)',
                background: statusFilter === st ? 'var(--brand-blue)' : 'var(--bg-surface)',
                color: statusFilter === st ? '#ffffff' : 'var(--text-muted)',
                textTransform: 'capitalize',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Shipments Table */}
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
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Shipment #</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Order Link</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Courier Provider</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Tracking Code</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Recipient</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Items</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading courier shipments...
                  </td>
                </tr>
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No shipments found. Click "Dispatch Package" to ship confirmed orders.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((shp) => {
                  const statusColors = {
                    packed: { bg: 'rgba(255, 159, 67, 0.15)', text: 'var(--warning)' },
                    shipped: { bg: 'rgba(99, 102, 241, 0.12)', text: 'var(--brand-purple)' },
                    delivered: { bg: 'rgba(0, 176, 116, 0.1)', text: 'var(--success)' },
                    failed: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)' },
                    cancelled: { bg: 'rgba(100, 116, 139, 0.1)', text: 'var(--text-muted)' },
                  };
                  const color = statusColors[shp.status] || statusColors.packed;

                  return (
                    <tr key={shp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--brand-blue)' }}>
                        {shp.shipment_number}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600 }}>
                        {shp.order?.order_number || `#${shp.order_id}`}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {shp.shipping_provider || 'Direct Store Delivery'}
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                        {shp.tracking_number || '—'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600 }}>{shp.recipient_name}</div>
                        {shp.recipient_phone && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{shp.recipient_phone}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {shp.items_count ?? shp.items?.length ?? 1} units
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: color.bg,
                            color: color.text,
                          }}
                        >
                          {shp.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {shp.status === 'packed' && (
                            <button
                              onClick={() => handleUpdateStatus(shp.id, 'shipped')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 700 }}
                            >
                              Dispatch
                            </button>
                          )}
                          {shp.status === 'shipped' && (
                            <button
                              onClick={() => handleUpdateStatus(shp.id, 'delivered')}
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 700, background: 'var(--success)' }}
                            >
                              Mark Delivered
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

      {/* MODAL: Dispatch Package Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Dispatch Logistics Package"
        maxWidth={540}
      >
        <form onSubmit={handleCreateShipment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
              Select Confirmed Order to Fulfill
            </label>
            {eligibleOrders.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--danger)', padding: '8px 10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>
                No confirmed orders awaiting fulfillment. Confirm an order in the Orders tab first.
              </div>
            ) : (
              <select
                value={newShipment.order_id}
                onChange={(e) => {
                  const ord = eligibleOrders.find((o) => String(o.id) === e.target.value);
                  if (ord) selectOrderForDispatch(ord);
                }}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.88rem' }}
              >
                {eligibleOrders.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    {ord.order_number} — {ord.customer?.display_name || 'Retail'} (ETB {Number(ord.grand_total).toFixed(2)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                Courier / Provider
              </label>
              <select
                value={newShipment.shipping_provider}
                onChange={(e) => setNewShipment({ ...newShipment, shipping_provider: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.88rem' }}
              >
                <option value="DHL Express Ethiopia">DHL Express Ethiopia</option>
                <option value="Ethiopian Post (EMS)">Ethiopian Post (EMS)</option>
                <option value="Aramex">Aramex Logistics</option>
                <option value="Store Delivery Van">Store Van (Same-Day)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                Tracking Reference Number
              </label>
              <input
                type="text"
                required
                value={newShipment.tracking_number}
                onChange={(e) => setNewShipment({ ...newShipment, tracking_number: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                Recipient Name
              </label>
              <input
                type="text"
                required
                value={newShipment.recipient_name}
                onChange={(e) => setNewShipment({ ...newShipment, recipient_name: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                Recipient Phone
              </label>
              <input
                type="text"
                required
                value={newShipment.recipient_phone}
                onChange={(e) => setNewShipment({ ...newShipment, recipient_phone: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>
              Logistics Notes (Optional)
            </label>
            <input
              type="text"
              value={newShipment.notes}
              onChange={(e) => setNewShipment({ ...newShipment, notes: e.target.value })}
              placeholder="e.g. Fragile electronics, handle with caution"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || eligibleOrders.length === 0}
              style={{ fontWeight: 700 }}
            >
              {submitting ? 'Dispatching...' : 'Confirm Package Dispatch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Shipments;
