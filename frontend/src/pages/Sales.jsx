import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Sales = () => {
  const { user, showToast } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCashierId, setSelectedCashierId] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Load sales history
  const loadSalesData = async () => {
    try {
      setLoading(true);
      const res = await api.getSales({ per_page: 200 });
      setSales(res?.data || []);
    } catch (err) {
      showToast?.('Failed to load completed sales history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, []);

  // Breakdown of performance per cashier
  const cashierSummary = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const cId = s.cashier_id || 'unassigned';
      const cName = s.cashier_name || 'Staff Cashier';
      if (!map[cId]) {
        map[cId] = {
          id: cId,
          name: cName,
          transactionsCount: 0,
          totalRevenue: 0,
        };
      }
      map[cId].transactionsCount += 1;
      map[cId].totalRevenue += parseFloat(s.total_amount || s.grand_total || 0);
    });
    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !searchQuery ||
        String(s.id).includes(q) ||
        String(s.sale_number || '').toLowerCase().includes(q) ||
        String(s.customer_name || '').toLowerCase().includes(q) ||
        String(s.cashier_name || '').toLowerCase().includes(q) ||
        String(s.register_code || '').toLowerCase().includes(q) ||
        String(s.total_amount).includes(q);

      const matchesCashier =
        selectedCashierId === 'all' ||
        String(s.cashier_id) === String(selectedCashierId);

      return matchesSearch && matchesCashier;
    });
  }, [sales, searchQuery, selectedCashierId]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalTransactions = sales.length;
    let totalRevenue = 0;
    sales.forEach((s) => {
      totalRevenue += parseFloat(s.total_amount || s.grand_total || 0);
    });
    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return { totalTransactions, totalRevenue, avgTicket };
  }, [sales]);

  const handleViewReceipt = (sale) => {
    setSelectedSale(sale);
    setIsReceiptModalOpen(true);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
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
              <Icon name="receipt" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Completed Sales & Cashier Ledger
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Track individual cashier sales performance, register audit logs, and transaction receipts.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/shifts"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="clock" size={16} />
            <span>Shift Drawers & Variance</span>
          </Link>

          <Link
            to="/returns"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="rotateCcw" size={16} />
            <span>Returns & Refunds</span>
          </Link>

          <Link
            to="/pos"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="cart" size={16} color="#fff" />
            <span>Launch POS Checkout</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
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
            <Icon name="receipt" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Completed Receipts
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalTransactions}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Processed sales</div>
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
            <Icon name="dollarSign" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Retail Revenue
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
              ETB {stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aggregate POS volume</div>
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
            <Icon name="cart" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Average Ticket
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6' }}>
              ETB {stats.avgTicket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Per checkout receipt</div>
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
            <Icon name="user" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Cashiers
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
              {cashierSummary.length} Cashiers
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contributing staff</div>
          </div>
        </div>
      </div>

      {/* ── Cashier Performance Breakdown Leaderboard ────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '20px 24px',
          marginBottom: 24,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🏆</span> Cashier Sales Performance & Audit Leaderboard
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Individual cashier sales volume, receipt count, and average order value breakdown.
            </p>
          </div>
          {selectedCashierId !== 'all' && (
            <button
              onClick={() => setSelectedCashierId('all')}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              ✕ Reset to All Cashiers
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {cashierSummary.map((c, idx) => {
            const isSelected = String(selectedCashierId) === String(c.id);
            const percentage = stats.totalRevenue > 0 ? ((c.totalRevenue / stats.totalRevenue) * 100).toFixed(1) : 0;
            const avgCashierTicket = c.transactionsCount > 0 ? (c.totalRevenue / c.transactionsCount) : 0;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCashierId(isSelected ? 'all' : c.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-app)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isSelected ? '#10b981' : 'var(--border-subtle)',
                        color: isSelected ? '#fff' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ID #{c.id} • {c.transactionsCount} {c.transactionsCount === 1 ? 'sale' : 'sales'}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: isSelected ? '#10b981' : 'rgba(100, 116, 139, 0.15)',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {percentage}% share
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Sold</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                      ETB {c.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Avg Ticket</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      ETB {avgCashierTicket.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: isSelected ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>
                    {isSelected ? '✓ Showing this cashier\'s sales' : 'Click to filter sales ➔'}
                  </span>
                </div>
              </div>
            );
          })}
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1, maxWidth: 650 }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
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
              placeholder="Search by receipt #, cashier, customer, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Cashier Filter Dropdown */}
          <select
            value={selectedCashierId}
            onChange={(e) => setSelectedCashierId(e.target.value)}
            className="input-field"
            style={{ width: 'auto', minWidth: 180, fontSize: '0.85rem', fontWeight: 600 }}
          >
            <option value="all">All Cashiers ({sales.length} receipts)</option>
            {cashierSummary.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.transactionsCount} sales - ETB {c.totalRevenue.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {(searchQuery || selectedCashierId !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCashierId('all');
              }}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            >
              Reset Filters
            </button>
          )}

          <button
            onClick={loadSalesData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh Sales"
          >
            <Icon name="refresh" size={16} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Receipt / Transaction</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Cashier & Terminal</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Customer</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Items</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Amount</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Timestamp</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Loading sales receipts...</div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="receipt" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No sales match the selected criteria</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      Try adjusting the cashier filter or search keyword.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    {/* Receipt Ref */}
                    <td style={{ padding: '14px 18px' }}>
                      <div
                        onClick={() => handleViewReceipt(sale)}
                        style={{
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          fontSize: '0.88rem',
                          color: '#10b981',
                          cursor: 'pointer',
                        }}
                      >
                        {sale.sale_number || `RECEIPT-#${sale.id}`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        {sale.order_number ? `Order: ${sale.order_number}` : `POS Sale #${sale.id}`}
                      </div>
                    </td>

                    {/* Cashier & Terminal */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem' }}>
                        <span style={{ color: '#10b981' }}>👤</span>
                        <span>{sale.cashier_name || 'Staff Cashier'}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ padding: '1px 5px', background: 'var(--bg-app)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
                          📟 {sale.register_code || 'Counter 1'}
                        </span>
                        {sale.cashier_shift_id && (
                          <span style={{ color: 'var(--text-dim)' }}>
                            Shift #{sale.cashier_shift_id}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '14px 18px', fontSize: '0.84rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {sale.customer_name || 'Walk-in Customer'}
                      </span>
                    </td>

                    {/* Items */}
                    <td style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 600 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                        {sale.items_count || (Array.isArray(sale.items) ? sale.items.length : 1)} items
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>
                        ETB {parseFloat(sale.total_amount || sale.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 9999,
                        }}
                      >
                        ✓ Paid
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {sale.created_at ? new Date(sale.created_at).toLocaleString() : 'Recent'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewReceipt(sale)}
                          className="action-btn action-btn-primary"
                          title="View Receipt"
                          style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Icon name="receipt" size={13} />
                          Receipt
                        </button>
                        <Link
                          to={`/returns`}
                          className="action-btn action-btn-danger"
                          style={{ textDecoration: 'none', fontSize: '0.78rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="File Return"
                        >
                          <Icon name="rotateCcw" size={13} />
                          Return
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECEIPT MODAL ──────────────────────────────────────────────── */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title={selectedSale ? `Sale Receipt #${selectedSale.id}` : 'Transaction Receipt'}
        maxWidth={500}
      >
        {selectedSale && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 44, height: 44, margin: '0 auto 12px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Icon name="check" size={24} />
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800 }}>VoltTrack StockWise</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official Retail Checkout Receipt</p>

            <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-sm)', padding: '14px', textAlign: 'left', fontSize: '0.85rem', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Receipt Ref:</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedSale.sale_number || `#${selectedSale.id}`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Attributed Cashier:</span>
                <strong style={{ color: '#10b981' }}>{selectedSale.cashier_name || 'Staff Cashier'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>POS Register / Terminal:</span>
                <span>{selectedSale.register_code || 'COUNTER-1'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                <span>{selectedSale.customer_name || 'Walk-in Customer'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                <span>{selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleString() : 'Now'}</span>
              </div>

              {/* Items Breakdown if present */}
              {Array.isArray(selectedSale.items) && selectedSale.items.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Purchased Items:
                  </div>
                  {selectedSale.items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                      <span>{it.quantity}x {it.product_name || it.name || 'Product'}</span>
                      <span style={{ fontWeight: 600 }}>ETB {parseFloat(it.line_total || it.unit_price * it.quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px dashed var(--border-subtle)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>Total Paid:</span>
                <span style={{ color: '#10b981' }}>ETB {parseFloat(selectedSale.total_amount || selectedSale.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Icon name="receipt" size={14} />
                <span>Print Copy</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Sales;
