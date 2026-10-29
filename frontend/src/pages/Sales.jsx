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
  const [selectedSale, setSelectedSale] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Load sales history
  const loadSalesData = async () => {
    try {
      setLoading(true);
      const res = await api.getSales({ per_page: 150 });
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

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        String(s.id).includes(q) ||
        String(s.total_amount).includes(q);
      return matchesSearch;
    });
  }, [sales, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalTransactions = sales.length;
    let totalRevenue = 0;
    sales.forEach((s) => {
      totalRevenue += parseFloat(s.total_amount || 0);
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
                Completed Sales & Register Receipts
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Audited retail transactions, cashier drawer settlements, and historical receipt lookup.
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
            <span>Cashier Shifts</span>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Processed transactions</div>
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
              Total Gross Revenue
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
              ETB {stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aggregate retail volume</div>
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
              Average Basket Value
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6' }}>
              ETB {stats.avgTicket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Per checkout receipt</div>
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1, maxWidth: 450 }}>
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
              placeholder="Search by Sale ID or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Amount</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Transaction Date</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Loading sales receipts...</div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="receipt" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No sales recorded yet</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      Launch POS Terminal to process walk-in customer checkouts.
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
                        RECEIPT-#{sale.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        Register Sale Ref
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        ETB {parseFloat(sale.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}
                      >
                        ✓ Completed & Paid
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {sale.created_at ? new Date(sale.created_at).toLocaleString() : 'Recent'}
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewReceipt(sale)}
                          className="action-btn action-btn-primary"
                          title="View Receipt"
                        >
                          <Icon name="receipt" size={13} />
                          Receipt
                        </button>
                        <Link
                          to={`/returns`}
                          className="action-btn action-btn-danger"
                          style={{ textDecoration: 'none' }}
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
        maxWidth={480}
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
                <span style={{ color: 'var(--text-muted)' }}>Receipt ID:</span>
                <strong style={{ fontFamily: 'monospace' }}>#{selectedSale.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Cashier:</span>
                <span>{user?.name || 'Authorized Cashier'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                <span>{selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleString() : 'Now'}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--border-subtle)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>Total Paid:</span>
                <span style={{ color: '#10b981' }}>ETB {parseFloat(selectedSale.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
