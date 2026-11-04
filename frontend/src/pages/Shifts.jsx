import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

const DEFAULT_REGISTERS = [
  { id: 1, name: 'Main Front Counter Register 1', code: 'REG-01', is_active: 1 },
  { id: 2, name: 'Express Checkout Register 2', code: 'REG-02', is_active: 1 },
];

export const Shifts = () => {
  const { user, showToast } = useAuth();

  // Data states
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [movements, setMovements] = useState([]);
  const [posRegisters, setPosRegisters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  // Form states - Open Shift
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [openingFloat, setOpeningFloat] = useState('1000.00');
  const [openNotes, setOpenNotes] = useState('');

  // Form states - Close Shift
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Form states - Cash Movement
  const [movementType, setMovementType] = useState('expense');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load shifts and registers
  const loadShiftData = async () => {
    try {
      setLoading(true);
      const [shiftsRes, regsRes, movesRes] = await Promise.all([
        api.getCashierShifts({ per_page: 30 }).catch(() => ({ data: [] })),
        api.getPosRegisters({ is_active: 1 }).catch(() => ({ data: [] })),
        api.getCashMovements({ per_page: 50 }).catch(() => ({ data: [] })),
      ]);

      const shiftList = Array.isArray(shiftsRes) ? shiftsRes : (shiftsRes?.data || []);
      setShifts(shiftList);

      // Find currently active shift for cashier
      const open = shiftList.find(
        (s) => s.status === 'open' && (
          s.opened_by?.id === user?.id || 
          s.opened_by === user?.id || 
          s.user_id === user?.id || 
          s.user?.id === user?.id
        )
      ) || shiftList.find((s) => s.status === 'open');

      setActiveShift(open || null);
      if (open) {
        const expected = Number(open.expected_cash || open.opening_cash || open.opening_float || 0);
        setCountedCash(expected.toFixed(2));
      } else {
        setCountedCash('');
      }

      const rawRegs = Array.isArray(regsRes) ? regsRes : (regsRes?.data || []);
      const regs = (Array.isArray(rawRegs) && rawRegs.length > 0) ? rawRegs : DEFAULT_REGISTERS;
      setPosRegisters(regs);
      if (regs.length > 0 && !selectedRegisterId) {
        setSelectedRegisterId(String(regs[0].id));
      }

      const movesList = Array.isArray(movesRes) ? movesRes : (movesRes?.data || []);
      setMovements(movesList);
    } catch (err) {
      showToast(err.message || 'Failed to load cashier shift data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShiftData();
  }, [user?.id]);

  // Handle Open Shift (Supports both modal and 1-click quick open)
  const handleOpenShift = async (e, customFloat = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const regId = selectedRegisterId || (posRegisters[0]?.id) || 1;
    const cleanedStr = String(openingFloat || '').replace(/,/g, '').replace(/[oO]/g, '0');
    const floatVal = customFloat !== null ? customFloat : (parseFloat(cleanedStr) || 1000);

    try {
      setSubmitting(true);
      const res = await api.createCashierShift({
        pos_register_id: regId,
        opening_cash: floatVal,
        opening_float: floatVal,
        notes: openNotes || 'Standard shift opening float verified',
      });

      const newShift = res?.cashier_shift || res?.data || res;
      if (newShift) {
        setActiveShift(newShift);
        setCountedCash(floatVal.toFixed(2));
      }

      showToast(`🎉 Cashier shift opened on Register #${regId} with ETB ${floatVal.toFixed(2)} float!`, 'success');
      setIsOpenShiftModalOpen(false);
      setOpenNotes('');
      await loadShiftData();
    } catch (err) {
      showToast(err.message || 'Failed to open cashier shift', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Close Shift (Reconciles counted cash with backend requirement)
  const handleCloseShift = async (e, directCount = null, shiftToClose = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    let targetShift = shiftToClose || activeShift;
    if (!targetShift || targetShift.status !== 'open') {
      targetShift = shifts.find((s) => s.status === 'open');
    }

    if (!targetShift) {
      showToast('No active open shift found to close. All shifts are already closed and balanced!', 'info');
      setIsCloseShiftModalOpen(false);
      return;
    }

    try {
      setSubmitting(true);
      const expected = Number(targetShift.expected_cash || targetShift.opening_cash || targetShift.opening_float || 0);
      const cleanedCountStr = String(countedCash || '').replace(/,/g, '').replace(/[oO]/g, '0').trim();
      const closingVal = directCount !== null 
        ? directCount 
        : (cleanedCountStr !== '' && !isNaN(parseFloat(cleanedCountStr)) ? parseFloat(cleanedCountStr) : expected);

      await api.updateCashierShift(targetShift.id, {
        status: 'closed',
        counted_cash: closingVal,
        closing_cash: closingVal,
        notes: closeNotes || 'Shift end drawer reconciliation completed',
      });

      showToast(`🎉 Shift #${targetShift.id} closed and drawer reconciled successfully!`, 'success');
      setIsCloseShiftModalOpen(false);
      setCloseNotes('');
      setActiveShift(null);
      await loadShiftData();
    } catch (err) {
      showToast(err.message || 'Failed to close shift', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cash Movement (Expense, Drop, Float Addition)
  const handleCashMovement = async (e, quickType = null, quickAmount = null, quickReason = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (!activeShift) {
      showToast('Cannot log movement without an open active shift', 'warning');
      return;
    }

    const type = quickType || movementType;
    const cleanedAmtStr = String(movementAmount || '').replace(/,/g, '').replace(/[oO]/g, '0');
    const amt = quickAmount !== null ? quickAmount : (parseFloat(cleanedAmtStr) || 0);
    const reason = quickReason || movementReason || 'Front desk register drawer cash movement';

    if (amt <= 0) {
      showToast('Amount must be greater than zero', 'warning');
      return;
    }

    // Backend validator strictly accepts 'cash_in' | 'cash_out'
    const backendType = (type === 'expense' || type === 'drop' || type === 'cash_out') ? 'cash_out' : 'cash_in';

    try {
      setSubmitting(true);
      await api.createCashMovement({
        cashier_shift_id: activeShift.id,
        movement_type: backendType,
        amount: amt,
        reason: reason,
      });

      showToast(`Drawer ${backendType === 'cash_in' ? 'cash in' : 'cash out'} of ETB ${amt.toFixed(2)} recorded!`, 'success');
      setIsMovementModalOpen(false);
      setMovementAmount('');
      setMovementReason('');
      await loadShiftData();
    } catch (err) {
      showToast(err.message || 'Failed to record cash movement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate drawer variance in close modal
  const cleanCountForVariance = parseFloat(String(countedCash || '').replace(/,/g, '').replace(/[oO]/g, '0')) || 0;
  const variance = activeShift ? cleanCountForVariance - (Number(activeShift.expected_cash || activeShift.opening_cash || activeShift.opening_float || 0)) : 0;

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
            <Icon name="dollarSign" size={24} color="var(--brand-blue)" />
            Cash Registers & Shift Drawers
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track register cash, starting floats, petty cash expenses, and end-of-day drawer balances
          </p>
        </div>

        {/* Action button */}
        <div>
          {activeShift ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                to="/pos"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none' }}
              >
                <Icon name="cart" size={16} color="#ffffff" />
                Go to POS Register ➔
              </Link>
              <button
                onClick={() => setIsMovementModalOpen(true)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600 }}
              >
                <Icon name="plus" size={16} />
                Add / Take Cash
              </button>
              <button
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="btn btn-danger"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                <Icon name="power" size={16} />
                Count & Close Drawer
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleOpenShift(null, 1000)}
                className="btn btn-primary"
                disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700, background: '#00b074' }}
              >
                ⚡ 1-Click Start Shift (Float: ETB 1,000)
              </button>
              <button
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 600 }}
              >
                <Icon name="plus" size={16} />
                Custom Float...
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Educational Guide Banner: Why Shift Drawers Work */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>💡</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#38bdf8' }}>
              Why does an Electronics Store use Shift Drawers?
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              A <strong>Shift Drawer</strong> tracks the physical metal cash box under your sales counter. It prevents cashier shortages and theft by recording every Birr that enters or leaves the cash register.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>1. Morning Float:</span> The cashier starts the day with initial change money (e.g. ETB 1,000) placed in the cash box.
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
            <span style={{ color: '#00b074', fontWeight: 700 }}>2. Ringing Sales:</span> Cash collected from POS counter sales automatically adds to the expected cash in the drawer.
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>3. Evening Reconcile:</span> When the cashier closes their shift, they count the drawer. The system instantly flags any shortage (- theft) or overage (+ extra).
          </div>
        </div>
      </div>

      {/* Active Shift Widget or Empty Prompt */}
      {activeShift ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #0b132b 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              Active Register Terminal
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00b074' }} />
              {activeShift.pos_register?.name || activeShift.posRegister?.name || `Terminal #${activeShift.pos_register_id}`}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Code: {activeShift.pos_register?.code || activeShift.posRegister?.code || 'REG-01'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              Cashier on Duty
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 4 }}>
              {activeShift.opened_by?.name || activeShift.openedBy?.name || activeShift.user?.name || user?.name || 'Staff Cashier'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Started: {new Date(activeShift.opened_at || activeShift.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              Starting Cash (Float)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4, color: '#38bdf8' }}>
              ETB {Number(activeShift.opening_cash || activeShift.opening_float || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Cash placed in drawer at morning
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              Expected Cash in Drawer
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, color: '#00b074' }}>
              ETB {Number(activeShift.expected_cash || activeShift.opening_cash || activeShift.opening_float || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Starting cash + cash sales - expenses
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '36px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--brand-blue-light)',
              color: 'var(--brand-blue)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Icon name="dollarSign" size={28} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontWeight: 800 }}>No Register Shift Currently Open</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 520, margin: '0 auto 20px' }}>
            To begin ringing up cash sales at the sales counter, start your shift drawer with a starting cash float for change.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleOpenShift(null, 1000)}
              className="btn btn-primary"
              disabled={submitting}
              style={{ padding: '10px 22px', fontWeight: 700, fontSize: '0.92rem', background: '#00b074' }}
            >
              ⚡ 1-Click Start Shift (ETB 1,000 Float)
            </button>
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontWeight: 600, fontSize: '0.92rem' }}
            >
              Custom Float / Terminal...
            </button>
            <Link
              to="/pos"
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontWeight: 600, fontSize: '0.92rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Skip to POS Register ➔
            </Link>
          </div>
        </div>
      )}

      {/* Main Shift Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        {/* Table 1: Recent Cash Drawer Movements */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Drawer Cash Movements</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Petty cash, register float replenishments, and drawer drops audit log
              </p>
            </div>
            {activeShift && (
              <button
                onClick={() => setIsMovementModalOpen(true)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '5px 10px' }}
              >
                + Log Entry
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>ID</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Type</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Amount</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Reason / Audit Description</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No drawer movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.slice(0, 10).map((m) => {
                    const isPositive = m.movement_type === 'cash_in' || m.movement_type === 'float_addition';
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 600 }}>#{m.id}</td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: isPositive ? 'rgba(0, 176, 116, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: isPositive ? 'var(--success)' : 'var(--danger)',
                            }}
                          >
                            {m.movement_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
                          {isPositive ? '+' : '-'} ETB {Number(m.amount).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-main)', maxWidth: 300 }}>
                          {m.reason}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Shift History & Drawer Reconciliation Ledger */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Shift History & Drawer Audits</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Completed work sessions with opening float, counted drawer cash, and calculated variance
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Shift ID</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Terminal</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Cashier</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Opened At</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Closed At</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Opening Float</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Closing Cash</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Variance</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No shifts recorded.
                    </td>
                  </tr>
                ) : (
                  shifts.map((s) => {
                    const diff = Number(s.cash_difference || (s.closing_cash ? (s.closing_cash - s.expected_cash) : 0));
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 700 }}>#{s.id}</td>
                        <td style={{ padding: '12px 18px', fontWeight: 600 }}>
                          {s.pos_register?.name || s.posRegister?.name || `Register #${s.pos_register_id}`}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {s.opened_by?.name || s.openedBy?.name || s.user?.name || 'Staff Cashier'}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {new Date(s.opened_at || s.created_at).toLocaleDateString()} {new Date(s.opened_at || s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {s.closed_at ? (
                            `${new Date(s.closed_at).toLocaleDateString()} ${new Date(s.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          ) : (
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>In Progress</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 600 }}>
                          ETB {Number(s.opening_cash || s.opening_float || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700 }}>
                          {s.closing_cash || s.counted_cash ? `ETB ${Number(s.closing_cash || s.counted_cash).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 800 }}>
                          {s.closing_cash ? (
                            <span style={{ color: diff === 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {diff > 0 ? `+ETB ${diff.toFixed(2)}` : diff < 0 ? `-ETB ${Math.abs(diff).toFixed(2)}` : 'ETB 0.00'}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: s.status === 'open' ? 'rgba(0, 176, 116, 0.1)' : 'rgba(100, 116, 139, 0.12)',
                              color: s.status === 'open' ? 'var(--success)' : 'var(--text-muted)',
                            }}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          {s.status === 'open' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveShift(s);
                                const exp = Number(s.expected_cash || s.opening_cash || s.opening_float || 0);
                                setCountedCash(exp.toFixed(2));
                                setIsCloseShiftModalOpen(true);
                              }}
                              className="btn btn-danger"
                              style={{ padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                            >
                              Count & Close
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>✓ Balanced</span>
                          )}
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

      {/* MODAL 1: Open Register Shift */}
      <Modal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        title="Open Register Work Shift"
        maxWidth={500}
      >
        <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenShift(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Select Physical POS Terminal
            </label>
            <select
              value={selectedRegisterId}
              onChange={(e) => setSelectedRegisterId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                fontSize: '0.9rem',
              }}
            >
              {posRegisters.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name} ({reg.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Starting Drawer Float (ETB)
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={openingFloat}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/,/g, '').replace(/[oO]/g, '0');
                setOpeningFloat(cleaned);
              }}
              placeholder="2000.00"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '1.1rem',
                fontWeight: 700,
              }}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Physical cash counted and placed inside the cash drawer before sales commence.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              Opening Notes (Optional)
            </label>
            <input
              type="text"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              placeholder="e.g. Verified 20x50 Birr notes morning float"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsOpenShiftModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleOpenShift(e)}
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontWeight: 700 }}
            >
              {submitting ? 'Opening Shift...' : 'Open Shift & Unlock POS'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Close Shift & Reconcile Drawer */}
      <Modal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        title="End Shift & Reconcile Cash Drawer"
        maxWidth={500}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCloseShift(e);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {activeShift && (
            <div
              style={{
                background: 'var(--bg-app)',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SYSTEM EXPECTED CASH</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-blue)' }}>
                  ETB {Number(activeShift.expected_cash || activeShift.opening_cash || activeShift.opening_float || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Starting Float</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                  ETB {Number(activeShift.opening_cash || activeShift.opening_float || 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                Actual Physically Counted Cash (ETB) *
              </label>
              {activeShift && (
                <button
                  type="button"
                  onClick={() => setCountedCash(Number(activeShift.expected_cash || activeShift.opening_cash || 0).toFixed(2))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-blue)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Auto-fill Expected Cash
                </button>
              )}
            </div>
            <input
              type="text"
              inputMode="decimal"
              required
              value={countedCash}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/,/g, '').replace(/[oO]/g, '0');
                setCountedCash(cleaned);
              }}
              placeholder="e.g. 2000.00"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '1.2rem',
                fontWeight: 800,
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {activeShift && (
                <button
                  type="button"
                  onClick={() => setCountedCash(Number(activeShift.expected_cash || activeShift.opening_cash || 0).toFixed(2))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#0284c7',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    cursor: 'pointer',
                  }}
                >
                  Exact Expected: ETB {Number(activeShift.expected_cash || activeShift.opening_cash || 0).toFixed(2)}
                </button>
              )}
              <button
                type="button"
                onClick={() => setCountedCash('2000.00')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                ETB 2,000
              </button>
              <button
                type="button"
                onClick={() => setCountedCash('1000.00')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                ETB 1,000
              </button>
            </div>
          </div>

          {/* Variance Display */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: variance === 0 ? 'rgba(0, 176, 116, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${variance === 0 ? 'rgba(0, 176, 116, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: variance === 0 ? 'var(--success)' : 'var(--danger)' }}>
              {variance === 0 ? 'Drawer Balanced (Zero Discrepancy)' : variance > 0 ? 'Drawer Cash Surplus' : 'Drawer Cash Shortage'}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: variance === 0 ? 'var(--success)' : 'var(--danger)' }}>
              {variance > 0 ? `+ETB ${variance.toFixed(2)}` : variance < 0 ? `-ETB ${Math.abs(variance).toFixed(2)}` : 'ETB 0.00'}
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              Closing / Handover Notes (Optional)
            </label>
            <input
              type="text"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="e.g. Counted and handed over to evening manager"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsCloseShiftModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleCloseShift(e)}
              className="btn btn-primary"
              disabled={submitting}
              style={{ background: 'var(--danger)', fontWeight: 700, cursor: 'pointer' }}
            >
              {submitting ? 'Reconciling...' : 'Confirm Closing & Reconcile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Log Cash Movement */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Log Drawer Cash Movement"
        maxWidth={480}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCashMovement(e);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Movement Type
            </label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <option value="expense">Petty Cash Expense (Deduction)</option>
              <option value="drop">Safe Drop (Deduct for safe custody)</option>
              <option value="float_addition">Float Addition (Add change to drawer)</option>
              <option value="cash_in">Other Cash In (Inflow)</option>
              <option value="cash_out">Other Cash Out (Outflow)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Amount (ETB) *
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={movementAmount}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/,/g, '').replace(/[oO]/g, '0');
                setMovementAmount(cleaned);
              }}
              placeholder="Amount in ETB"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '1.1rem',
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Reason / Memo Description
            </label>
            <input
              type="text"
              required
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              placeholder="e.g. Receipt printer thermal paper roll purchase"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleCashMovement(e)}
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontWeight: 700, cursor: 'pointer' }}
            >
              {submitting ? 'Recording...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Shifts;
