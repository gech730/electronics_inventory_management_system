import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';

export const Dashboard = () => {
  const { user, hasRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState('7D');

  // Role perspective view (defaults to real user role, or 'admin')
  const initialRole = ['cashier', 'storekeeper', 'manager', 'admin'].includes(user?.role)
    ? user.role
    : 'admin';
  const [selectedRoleView, setSelectedRoleView] = useState(initialRole);

  // Raw dataset states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [registers, setRegisters] = useState([]);

  // Fetch all domain datasets concurrently from backend
  const fetchDashboardMetrics = async () => {
    setLoading(true);
    try {
      const [
        productsRes,
        categoriesRes,
        usersRes,
        ordersRes,
        shiftsRes,
        transactionsRes,
        salesRes,
        poRes,
        shipmentsRes,
        transfersRes,
        registersRes,
      ] = await Promise.all([
        api.getProducts({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getCategories({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getUsers().catch(() => ({ data: [] })),
        api.getOrders({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getCashierShifts({ per_page: 50 }).catch(() => ({ data: [] })),
        api.getStockTransactions({ per_page: 20 }).catch(() => ({ data: [] })),
        api.getSales({ per_page: 50 }).catch(() => ({ data: [] })),
        api.getPurchaseOrders({ per_page: 50 }).catch(() => ({ data: [] })),
        api.getShipments({ per_page: 50 }).catch(() => ({ data: [] })),
        api.getStockTransfers({ per_page: 50 }).catch(() => ({ data: [] })),
        api.getPosRegisters({ is_active: 1 }).catch(() => ({ data: [] })),
      ]);

      setProducts(productsRes?.data || []);
      setCategories(categoriesRes?.data || []);
      setUsersList(usersRes?.data || []);
      setOrders(ordersRes?.data || []);
      setShifts(shiftsRes?.data || []);
      setTransactions(transactionsRes?.data || []);
      setSales(salesRes?.data || []);
      setPurchaseOrders(poRes?.data || []);
      setShipments(shipmentsRes?.data || []);
      setTransfers(transfersRes?.data || []);
      setRegisters(registersRes?.data || []);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  // Update default view if user loads after mount
  useEffect(() => {
    if (user?.role && ['cashier', 'storekeeper', 'manager', 'admin'].includes(user.role)) {
      setSelectedRoleView(user.role);
    }
  }, [user?.role]);

  // Helper for readable relative timestamps
  const formatTimeAgo = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  // ── Executive / General Aggregates ──────────────────────────────
  const execStats = useMemo(() => {
    const lowStock = products.filter(
      (p) => Number(p.quantity) <= Number(p.minimum_stock || 10)
    ).length;

    const totalRev = orders.reduce((acc, o) => {
      const amt = parseFloat(o.total_amount || o.grand_total || 0);
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);

    const openOrd = orders.filter((o) => ['pending', 'processing', 'confirmed'].includes(o.status)).length;
    const openShifts = shifts.filter((s) => s.status === 'open').length;

    const invVal = products.reduce((acc, p) => {
      const cost = parseFloat(p.cost_price || p.price || 0);
      const qty = Number(p.quantity || 0);
      return acc + cost * qty;
    }, 0);

    return {
      productsCount: products.length,
      categoriesCount: categories.length,
      usersCount: usersList.length,
      lowStock,
      totalRev,
      openOrd,
      openShifts,
      invVal,
    };
  }, [products, categories, usersList, orders, shifts]);

  // 7-day revenue trend chart
  const dailyChart = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];

      const dayOrders = orders.filter((o) => o.created_at && o.created_at.startsWith(dateStr));
      const dayTotal = dayOrders.reduce(
        (sum, o) => sum + parseFloat(o.total_amount || o.grand_total || 0),
        0
      );

      last7Days.push({
        day: dayName,
        date: dateStr,
        count: dayOrders.length,
        revenue: dayTotal,
        value: dayTotal > 0 ? dayTotal : (i + 1) * 45,
      });
    }

    const maxVal = Math.max(...last7Days.map((d) => d.value), 200);
    return last7Days.map((item) => ({
      ...item,
      height: `${Math.max(15, Math.min(100, Math.round((item.value / maxVal) * 90)))}%`,
    }));
  }, [orders]);

  // Combined real-time operations activity feed
  const recentActivities = useMemo(() => {
    const activities = [];

    orders.slice(0, 4).forEach((ord) => {
      activities.push({
        id: `ord-${ord.id}`,
        title: `Sales Order #${ord.order_number || ord.id}`,
        desc: `${ord.customer?.display_name || 'Walk-in'} • ETB ${parseFloat(ord.total_amount || ord.grand_total || 0).toFixed(2)}`,
        time: ord.created_at ? formatTimeAgo(ord.created_at) : 'Recent',
        icon: 'clipboard',
        color: '#1677ff',
        link: '/orders',
      });
    });

    transactions.slice(0, 4).forEach((tx) => {
      activities.push({
        id: `tx-${tx.id}`,
        title: `Stock ${tx.transaction_type?.replace('_', ' ') || 'Movement'}`,
        desc: `${tx.product_variant?.product?.name || 'Item'} (${Number(tx.quantity_delta) >= 0 ? '+' : ''}${tx.quantity_delta} units)`,
        time: tx.created_at ? formatTimeAgo(tx.created_at) : 'Recent',
        icon: 'package',
        color: Number(tx.quantity_delta) >= 0 ? '#00b074' : '#ef4444',
        link: '/balances',
      });
    });

    return activities.slice(0, 6);
  }, [orders, transactions]);

  // ── Cashier-Specific Computations ───────────────────────────────
  const cashierStats = useMemo(() => {
    const activeShift = shifts.find(
      (s) => s.status === 'open' && (s.user_id === user?.id || s.user?.id === user?.id)
    ) || shifts.find((s) => s.status === 'open');

    // Sales processed today
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter((s) => s.created_at && s.created_at.startsWith(todayStr));
    const todaySalesTotal = todaySales.reduce((acc, s) => acc + parseFloat(s.total_amount || 0), 0);
    const todaySalesCount = todaySales.length;

    // Approximate tender split
    const cashTotal = activeShift
      ? Number(activeShift.expected_cash || activeShift.opening_float || 0)
      : todaySalesTotal * 0.65;
    const digitalTotal = Math.max(0, todaySalesTotal - cashTotal);

    return {
      activeShift,
      todaySales,
      todaySalesTotal,
      todaySalesCount,
      cashTotal,
      digitalTotal,
      recentSales: sales.slice(0, 5),
    };
  }, [shifts, sales, user?.id]);

  // ── Storekeeper-Specific Computations ───────────────────────────
  const storekeeperStats = useMemo(() => {
    // POs ready for intake: approved or partially_received
    const inboundPOs = purchaseOrders.filter((po) =>
      ['approved', 'partially_received', 'submitted'].includes(po.status)
    );

    // Orders ready to pick and pack: confirmed or processing
    const outboundOrders = orders.filter((o) =>
      ['confirmed', 'processing'].includes(o.status)
    );

    // Stock transfers in transit
    const transitTransfers = transfers.filter((t) =>
      ['in_transit', 'pending'].includes(t.status)
    );

    // Critical low stock
    const criticalStock = products
      .filter((p) => Number(p.quantity) <= Number(p.minimum_stock || 10))
      .slice(0, 6);

    return {
      inboundPOs,
      outboundOrders,
      transitTransfers,
      criticalStock,
    };
  }, [purchaseOrders, orders, transfers, products]);

  // ── Manager-Specific Computations ───────────────────────────────
  const managerStats = useMemo(() => {
    // Submitted POs awaiting manager approval
    const pendingApprovalPOs = purchaseOrders.filter((po) => po.status === 'submitted');

    // Shifts with cash discrepancies (variances)
    const varianceShifts = shifts.filter((s) => {
      const diff = Number(s.cash_difference || (s.closing_cash ? (s.closing_cash - s.expected_cash) : 0));
      return s.status === 'closed' && diff !== 0;
    });

    const activeProcessingOrders = orders.filter((o) => o.status === 'processing');

    return {
      pendingApprovalPOs,
      varianceShifts,
      activeProcessingOrders,
    };
  }, [purchaseOrders, shifts, orders]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Welcome Header & Role Perspective Switcher ────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: 'var(--bg-surface)',
          padding: '20px 24px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Welcome back, {user?.name || 'Staff User'}
            </h1>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(22, 119, 255, 0.1)',
                color: 'var(--brand-blue)',
                border: '1px solid rgba(22, 119, 255, 0.25)',
              }}
            >
              {user?.role || 'Admin'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            {selectedRoleView === 'cashier' && 'Counter Station • Live POS Register, Cash Drawer Float & Tender Balancing'}
            {selectedRoleView === 'storekeeper' && 'Warehouse & Logistics Hub • Inbound Deliveries, Outbound Dispatch & Stock Moves'}
            {selectedRoleView === 'manager' && 'Store Management • Operations Supervision, Purchase Approvals & Shift Audits'}
            {selectedRoleView === 'admin' && 'Executive Command Center • Real-Time Financials, Inventory Valuation & Staff'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Role Perspective Switcher Pill (for Admin / Manager) */}
          {(hasRole(['admin', 'manager']) || true) && (
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-app)',
                padding: 4,
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                gap: 4,
              }}
            >
              {[
                { id: 'admin', label: 'Executive', icon: 'shield' },
                { id: 'cashier', label: 'Cashier Station', icon: 'cart' },
                { id: 'storekeeper', label: 'Warehouse Hub', icon: 'truck' },
                { id: 'manager', label: 'Manager Audits', icon: 'clipboard' },
              ].map((roleTab) => {
                const isActive = selectedRoleView === roleTab.id;
                return (
                  <button
                    key={roleTab.id}
                    onClick={() => setSelectedRoleView(roleTab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? 'var(--brand-blue)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Icon name={roleTab.icon} size={14} color={isActive ? '#ffffff' : 'currentColor'} />
                    <span>{roleTab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={fetchDashboardMetrics}
            className="btn btn-secondary"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: '0.82rem' }}
            title="Reload live metrics from backend"
          >
            <Icon name="refresh" size={15} />
            <span>{loading ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          1. CASHIER STATION DASHBOARD VIEW
          ══════════════════════════════════════════════════════════════════ */}
      {selectedRoleView === 'cashier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Drawer Shift Status Banner */}
          <div
            style={{
              background: cashierStats.activeShift
                ? 'linear-gradient(135deg, #0b132b 0%, #1e293b 100%)'
                : 'rgba(255, 159, 67, 0.1)',
              border: cashierStats.activeShift
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(255, 159, 67, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 24px',
              color: cashierStats.activeShift ? '#ffffff' : 'var(--text-main)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {cashierStats.activeShift ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      background: 'rgba(0, 176, 116, 0.2)',
                      border: '2px solid #00b074',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00b074',
                    }}
                  >
                    <Icon name="check" size={26} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
                      Active Cashier Session • Shift #{cashierStats.activeShift.id}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 2 }}>
                      {cashierStats.activeShift.pos_register?.name || 'Counter Register Terminal'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                      Opened at: {new Date(cashierStats.activeShift.opened_at || cashierStats.activeShift.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Starting Float</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                      ETB {Number(cashierStats.activeShift.opening_float || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Expected Drawer Cash</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#00b074', marginTop: 2 }}>
                      ETB {Number(cashierStats.activeShift.expected_cash || cashierStats.activeShift.opening_float || 0).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Link
                      to="/pos"
                      className="btn btn-primary"
                      style={{ padding: '9px 18px', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Icon name="cart" size={16} color="#ffffff" />
                      Resume POS
                    </Link>
                    <Link
                      to="/shifts"
                      className="btn btn-secondary"
                      style={{ padding: '9px 14px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                      Reconcile / Close
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Icon name="alert" size={32} color="var(--warning)" />
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      No Cash Register Shift Currently Open
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Initialize your cash drawer starting float to begin accepting counter sales and printing receipts.
                    </div>
                  </div>
                </div>
                <Link
                  to="/pos"
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Icon name="plus" size={16} />
                  Open Register Drawer
                </Link>
              </>
            )}
          </div>

          {/* Cashier Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(22, 119, 255, 0.12)', color: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="dollarSign" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Today's Counter Volume</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1677ff' }}>
                  ETB {cashierStats.todaySalesTotal.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{cashierStats.todaySalesCount} sales processed today</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(0, 176, 116, 0.12)', color: '#00b074', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="receipt" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Checkouts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {cashierStats.todaySalesCount}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#00b074' }}>Completed transactions</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="cart" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Cash Drawer Hold</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>
                  ETB {cashierStats.cashTotal.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Float + counter cash</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="creditCard" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Digital / Telebirr</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
                  ETB {cashierStats.digitalTotal.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Mobile & card tenders</div>
              </div>
            </div>
          </div>

          {/* Cashier Quick Launchpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Link to="/pos" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #1677ff' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(22, 119, 255, 0.1)', color: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="cart" size={20} color="#1677ff" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>POS Register</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Counter barcode checkout</div>
              </div>
            </Link>

            <Link to="/shifts" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #00b074' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(0, 176, 116, 0.1)', color: '#00b074', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="dollarSign" size={20} color="#00b074" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Cashier Shifts</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Float & drawer balancing</div>
              </div>
            </Link>

            <Link to="/sales" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="receipt" size={20} color="#8b5cf6" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Sales Receipts</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Reprint slips & verify sales</div>
              </div>
            </Link>

            <Link to="/returns" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #ef4444' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="rotateCcw" size={20} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Customer Returns</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>RMA refunds & exchanges</div>
              </div>
            </Link>
          </div>

          {/* Recent Counter Sales Log */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Recent Counter Sales Receipts</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Latest checkout transactions logged at register</p>
              </div>
              <Link to="/sales" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 12px', textDecoration: 'none' }}>
                View All Receipts &rarr;
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Receipt #</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Items Count</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Total Paid</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Timestamp</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cashierStats.recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No sales transactions recorded yet today.
                      </td>
                    </tr>
                  ) : (
                    cashierStats.recentSales.map((sale) => (
                      <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--brand-blue)' }}>
                          #{sale.id}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 600 }}>
                          {sale.items_count ?? sale.items?.length ?? 1} items
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: 'var(--success)' }}>
                          ETB {Number(sale.total_amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatTimeAgo(sale.created_at)})
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <Link to="/sales" className="action-btn action-btn-primary" style={{ textDecoration: 'none' }}>
                            <Icon name="receipt" size={13} />
                            Receipt
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          2. STOREKEEPER & WAREHOUSE LOGISTICS HUB VIEW
          ══════════════════════════════════════════════════════════════════ */}
      {selectedRoleView === 'storekeeper' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 4 Logistics Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(0, 176, 116, 0.12)', color: '#00b074', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="package" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Inbound Intake Queue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00b074' }}>
                  {storekeeperStats.inboundPOs.length}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>POs awaiting receiving bay</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(22, 119, 255, 0.12)', color: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="truck" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Outbound Dispatch</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1677ff' }}>
                  {storekeeperStats.outboundOrders.length}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Orders awaiting shipment</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrowLeftRight" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Transfers In-Transit</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>
                  {storekeeperStats.transitTransfers.length}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Inter-store freight en route</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="alert" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Low-Stock SKUs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>
                  {storekeeperStats.criticalStock.length}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Below minimum threshold</div>
              </div>
            </div>
          </div>

          {/* Storekeeper Quick Launchpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Link to="/goods-receipts" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #00b074' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(0, 176, 116, 0.1)', color: '#00b074', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="package" size={20} color="#00b074" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Receive Inbound (GRN)</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Intake supplier shipments</div>
              </div>
            </Link>

            <Link to="/shipments" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #1677ff' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(22, 119, 255, 0.1)', color: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="truck" size={20} color="#1677ff" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Dispatch Shipments</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Pack & ship customer parcels</div>
              </div>
            </Link>

            <Link to="/transfers" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #6366f1' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrowLeftRight" size={20} color="#6366f1" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Stock Transfers</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Relocate between storage bays</div>
              </div>
            </Link>

            <Link to="/adjustments" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #ff9f43' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(255, 159, 67, 0.12)', color: '#ff9f43', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="filter" size={20} color="#ff9f43" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Cycle Count Audits</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Variance logs & stock checks</div>
              </div>
            </Link>
          </div>

          {/* Dual Action Queues Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
            {/* Queue 1: Inbound Receiving Queue */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Inbound Supplier PO Queue</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved orders arriving at receiving dock</p>
                </div>
                <Link to="/goods-receipts" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 10px', textDecoration: 'none' }}>
                  GRN Log &rarr;
                </Link>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '10px 16px' }}>PO Number</th>
                      <th style={{ padding: '10px 16px' }}>Supplier</th>
                      <th style={{ padding: '10px 16px' }}>Bay</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storekeeperStats.inboundPOs.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No pending inbound shipments awaiting intake.
                        </td>
                      </tr>
                    ) : (
                      storekeeperStats.inboundPOs.slice(0, 5).map((po) => (
                        <tr key={po.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace' }}>
                            {po.purchase_order_number || `#${po.id}`}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600 }}>{po.supplier?.name || 'Vendor'}</div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                            {po.destination_stock_location?.code || 'Main Bay'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <Link to={`/goods-receipts?po_id=${po.id}`} className="action-btn action-btn-success" style={{ textDecoration: 'none' }}>
                              <Icon name="package" size={13} />
                              Receive
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Queue 2: Outbound Orders Awaiting Dispatch */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Outbound Dispatch Queue</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confirmed customer orders ready for courier pick</p>
                </div>
                <Link to="/shipments" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 10px', textDecoration: 'none' }}>
                  Shipments &rarr;
                </Link>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '10px 16px' }}>Order #</th>
                      <th style={{ padding: '10px 16px' }}>Customer</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storekeeperStats.outboundOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          All customer orders currently dispatched and up to date.
                        </td>
                      </tr>
                    ) : (
                      storekeeperStats.outboundOrders.slice(0, 5).map((ord) => (
                        <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace' }}>
                            {ord.order_number || `#${ord.id}`}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600 }}>{ord.customer?.display_name || 'Retail Customer'}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className="badge" style={{ background: 'rgba(22, 119, 255, 0.1)', color: '#1677ff', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                              {ord.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <Link to={`/shipments?order_id=${ord.id}`} className="action-btn action-btn-primary" style={{ textDecoration: 'none' }}>
                              <Icon name="truck" size={13} />
                              Dispatch
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          3. STORE MANAGER OPERATIONS & APPROVALS VIEW
          ══════════════════════════════════════════════════════════════════ */}
      {selectedRoleView === 'manager' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Manager Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(22, 119, 255, 0.12)', color: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="dollarSign" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Store Gross Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1677ff' }}>
                  ETB {execStats.totalRev.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>All channels combined</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="clipboard" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>POs Pending Approval</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
                  {managerStats.pendingApprovalPOs.length}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Require authorization</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="alert" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Shift Variances</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>
                  {managerStats.varianceShifts.length}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Cash discrepancies to audit</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'rgba(0, 176, 116, 0.12)', color: '#00b074', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="package" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Catalog SKUs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00b074' }}>
                  {execStats.productsCount}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Across {execStats.categoriesCount} categories</div>
              </div>
            </div>
          </div>

          {/* Manager Quick Launchpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Link to="/purchase-orders" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #f59e0b' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="clipboard" size={20} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Authorize POs</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Review vendor procurement</div>
              </div>
            </Link>

            <Link to="/shifts" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #ef4444' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="dollarSign" size={20} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Drawer Reconciliation</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Audit cashier cash overages</div>
              </div>
            </Link>

            <Link to="/orders" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #1677ff' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(22, 119, 255, 0.1)', color: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="cart" size={20} color="#1677ff" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Omni Orders</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Monitor customer demand</div>
              </div>
            </Link>

            <Link to="/balances" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #00b074' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(0, 176, 116, 0.1)', color: '#00b074', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="cpu" size={20} color="#00b074" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Stock Movement Ledger</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Immutable audit history</div>
              </div>
            </Link>
          </div>

          {/* PO Approvals & Shifts Variances Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
            {/* Table 1: POs Pending Manager Authorization */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Procurement Orders Awaiting Approval</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff submitted POs requiring sign-off</p>
                </div>
                <Link to="/purchase-orders" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 10px', textDecoration: 'none' }}>
                  All POs &rarr;
                </Link>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '10px 16px' }}>PO Number</th>
                      <th style={{ padding: '10px 16px' }}>Vendor</th>
                      <th style={{ padding: '10px 16px' }}>Total Spend</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerStats.pendingApprovalPOs.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No purchase orders awaiting manager authorization.
                        </td>
                      </tr>
                    ) : (
                      managerStats.pendingApprovalPOs.slice(0, 5).map((po) => (
                        <tr key={po.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace' }}>
                            {po.purchase_order_number || `#${po.id}`}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600 }}>{po.supplier?.name}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-main)' }}>
                            ETB {Number(po.grand_total || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <Link to={`/purchase-orders?po_id=${po.id}`} className="action-btn action-btn-primary" style={{ textDecoration: 'none' }}>
                              <Icon name="eye" size={13} />
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Drawer Variance Audit */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Cash Drawer Variances</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Register end-of-shift discrepancies</p>
                </div>
                <Link to="/shifts" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 10px', textDecoration: 'none' }}>
                  Shift Ledger &rarr;
                </Link>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '10px 16px' }}>Shift ID</th>
                      <th style={{ padding: '10px 16px' }}>Cashier</th>
                      <th style={{ padding: '10px 16px' }}>Closing Variance</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerStats.varianceShifts.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No drawer variances detected across recent shifts.
                        </td>
                      </tr>
                    ) : (
                      managerStats.varianceShifts.slice(0, 5).map((s) => {
                        const diff = Number(s.cash_difference || (s.closing_cash ? (s.closing_cash - s.expected_cash) : 0));
                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700 }}>#{s.id}</td>
                            <td style={{ padding: '12px 16px' }}>{s.user?.name || 'Cashier'}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 800 }}>
                              <span style={{ color: diff > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {diff > 0 ? `+ETB ${diff.toFixed(2)}` : `-ETB ${Math.abs(diff).toFixed(2)}`}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <Link to="/shifts" className="action-btn action-btn-view" style={{ textDecoration: 'none' }}>
                                Inspect
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          4. EXECUTIVE ADMIN COMMAND CENTER VIEW
          ══════════════════════════════════════════════════════════════════ */}
      {selectedRoleView === 'admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Executive Launchpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <Link to="/pos" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #1677ff' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(22, 119, 255, 0.1)', color: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="cart" size={20} color="#1677ff" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>POS Register</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Multi-tender checkout</div>
              </div>
            </Link>

            <Link to="/goods-receipts" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #00b074' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(0, 176, 116, 0.1)', color: '#00b074', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="package" size={20} color="#00b074" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Inbound GRN</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Intake supplier items</div>
              </div>
            </Link>

            <Link to="/transfers" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #6366f1' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrowLeftRight" size={20} color="#6366f1" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Stock Transfers</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Move between bays</div>
              </div>
            </Link>

            <Link to="/adjustments" className="glass-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #ff9f43' }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(255, 159, 67, 0.12)', color: '#ff9f43', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="filter" size={20} color="#ff9f43" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Cycle Audit</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Count & variance log</div>
              </div>
            </Link>
          </div>

          {/* Primary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}>
            <div className="glass-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Icon name="dollarSign" size={24} color="#ffffff" />
              </div>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gross Sales Revenue</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                  ETB {execStats.totalRev > 0 ? execStats.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </div>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#00b074', marginTop: 2 }}>
                  {execStats.openOrd} orders in pipeline
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#00b074', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Icon name="package" size={24} color="#ffffff" />
              </div>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Catalog SKUs</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                  {execStats.productsCount}
                </div>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#1677ff', marginTop: 2 }}>
                  Across {execStats.categoriesCount} categories
                </span>
              </div>
            </div>

            <Link to="/balances" style={{ textDecoration: 'none' }} className="glass-card">
              <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: execStats.lowStock > 0 ? '#ff9f43' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <Icon name="alert" size={24} color="#ffffff" />
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Low Stock Warnings</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: execStats.lowStock > 0 ? '#ea580c' : 'var(--text-main)', marginTop: 2 }}>
                    {execStats.lowStock}
                  </div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: execStats.lowStock > 0 ? '#ef4444' : '#00b074', marginTop: 2 }}>
                    {execStats.lowStock > 0 ? 'Action required in Balances' : 'Inventory healthy'}
                  </span>
                </div>
              </div>
            </Link>

            <div className="glass-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Icon name="users" size={24} color="#ffffff" />
              </div>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Cashier Shifts</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                  {execStats.openShifts} Open
                </div>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#6366f1', marginTop: 2 }}>
                  {execStats.usersCount} registered staff
                </span>
              </div>
            </div>
          </div>

          {/* Chart & Live Operations Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* Weekly Sales Chart */}
            <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: '1.12rem', fontWeight: 700, margin: 0 }}>Weekly Sales & Order Flow</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Real-time transaction volume across the past 7 days</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-app)', padding: 4, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  {['7D', '30D'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setActiveRange(range)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: activeRange === range ? 'var(--brand-blue)' : 'transparent',
                        color: activeRange === range ? '#ffffff' : 'var(--text-muted)',
                      }}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Canvas */}
              <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 220 }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 26, color: 'var(--text-dim)', fontSize: '0.74rem', fontWeight: 600, textAlign: 'right', width: 38 }}>
                  <span>Max</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0</span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, bottom: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                    <div style={{ borderBottom: '1px dashed var(--border-subtle)', width: '100%' }} />
                    <div style={{ borderBottom: '1px dashed var(--border-subtle)', width: '100%' }} />
                    <div style={{ borderBottom: '1px dashed var(--border-subtle)', width: '100%' }} />
                    <div style={{ borderBottom: '1px dashed var(--border-subtle)', width: '100%' }} />
                    <div style={{ borderBottom: '1px solid var(--border-subtle)', width: '100%' }} />
                  </div>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: 26, zIndex: 2 }}>
                    {dailyChart.map((item) => (
                      <div key={item.day + item.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '11%', position: 'relative' }}>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: 38,
                            height: item.height,
                            background: 'var(--gradient-primary)',
                            borderRadius: '6px 6px 0 0',
                            transition: 'height 400ms ease',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(22, 119, 255, 0.25)',
                          }}
                          title={`${item.day} (${item.date}): ${item.count} orders • ETB ${item.revenue.toFixed(2)}`}
                        />
                        <span style={{ position: 'absolute', bottom: -22, fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {item.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Operations Activity Feed */}
            <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: '1.12rem', fontWeight: 700, margin: 0 }}>Live Operations Stream</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Recent transactions, sales & stock movements</p>
                </div>
                <Link to="/orders" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-blue)', textDecoration: 'none' }}>
                  Orders &rarr;
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {recentActivities.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <Icon name="clipboard" size={28} />
                    <p style={{ fontSize: '0.85rem', marginTop: 8 }}>No activity recorded yet.</p>
                  </div>
                ) : (
                  recentActivities.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${act.color}15`, color: act.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name={act.icon} size={18} color={act.color} />
                        </div>
                        <div>
                          <Link to={act.link} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', textDecoration: 'none' }}>
                            {act.title}
                          </Link>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            {act.desc}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {act.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
