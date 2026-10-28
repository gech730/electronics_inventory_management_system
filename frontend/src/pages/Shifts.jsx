import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

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

      const shiftList = shiftsRes?.data || [];
      setShifts(shiftList);

      // Find currently active shift for cashier
      const open = shiftList.find(
        (s) => s.status === 'open' && (s.user_id === user?.id || s.user?.id === user?.id)
      ) || shiftList.find((s) => s.status === 'open');

      setActiveShift(open || null);
      if (open) {
        setCountedCash(Number(open.expected_cash || open.opening_float || 0).toFixed(2));
      }

      const regs = regsRes?.data || [];
      setPosRegisters(regs);
      if (regs.length > 0 && !selectedRegisterId) {
        setSelectedRegisterId(regs[0].id);
      }

      setMovements(movesRes?.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load cashier shift data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShiftData();
  }, [user?.id]);

  // Handle Open Shift
  const handleOpenShift = async (e) => {
    e.preventDefault();
    if (!selectedRegisterId) {
      showToast('Please select a POS Register terminal', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createCashierShift({
        pos_register_id: selectedRegisterId,
        opening_float: parseFloat(openingFloat) || 0,
        notes: openNotes || 'Standard shift opening float verified',
      });

      showToast('Cashier shift opened successfully!', 'success');
      setIsOpenShiftModalOpen(false);
      setOpenNotes('');
      await loadShiftData();
    } catch (err) {
      showToast(err.message || 'Failed to open cashier shift', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Close Shift
  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!activeShift) return;

    try {
      setSubmitting(true);
      const closingVal = parseFloat(countedCash) || 0;

      await api.updateCashierShift(activeShift.id, {
        closing_cash: closingVal,
        status: 'closed',
        notes: closeNotes || 'Shift end drawer reconciliation completed',
      });

      showToast('Shift closed and drawer reconciled successfully!', 'success');
      setIsCloseShiftModalOpen(false);
      setCloseNotes('');
      await loadShiftData();
    } catch (err) {
      showToast(err.message || 'Failed to close shift', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cash Movement (Expense, Drop, Float Addition)
  const handleCashMovement = async (e) => {
    e.preventDefault();
    if (!activeShift) {
      showToast('Cannot log movement without an open active shift', 'warning');
      return;
    }

    const amt = parseFloat(movementAmount) || 0;
    if (amt <= 0) {
      showToast('Amount must be greater than zero', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.createCashMovement({
        cashier_shift_id: activeShift.id,
        movement_type: movementType,
        amount: amt,
        reason: movementReason || 'Front desk register drawer cash movement',
      });

      showToast('Cash movement recorded successfully!', 'success');
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
  const variance = activeShift ? (parseFloat(countedCash) || 0) - (Number(activeShift.expected_cash || activeShift.opening_float || 0)) : 0;

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
            Cashier Shift & Drawer Reconciliation
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Cash drawer management, starting floats, petty cash drops/expenses, and end-of-shift audits
          </p>
        </div>

        {/* Action button */}
        <div>
          {activeShift ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setIsMovementModalOpen(true)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600 }}
              >
                <Icon name="plus" size={16} />
                Log Cash Movement
              </button>
              <button
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'var(--danger)',
                }}
              >
                <Icon name="power" size={16} />
                Close Shift
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700 }}
            >
              <Icon name="plus" size={18} />
              Open Register Shift
            </button>
          )}
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
              Active Terminal
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
              Cashier On Duty
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 4 }}>
              {activeShift.user?.name || user?.name || 'Authorized Cashier'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Opened: {new Date(activeShift.opened_at || activeShift.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              Starting Float
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4, color: '#38bdf8' }}>
              ETB {Number(activeShift.opening_float || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Initial drawer balance
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              Expected Drawer Cash
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, color: '#00b074' }}>
              ETB {Number(activeShift.expected_cash || activeShift.opening_float || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Running float + cash sales - expenses
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
          <h3 style={{ margin: '0 0 6px', fontWeight: 800 }}>No Cashier Register Shift Open</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 460, margin: '0 auto 16px' }}>
            Open a register shift with a starting drawer float before processing cash transactions or logging register movements.
          </p>
          <button
            onClick={() => setIsOpenShiftModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '9px 18px', fontWeight: 700 }}
          >
            Open Cashier Shift Now
          </button>
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
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
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
                          {s.user?.name || 'Staff'}
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
                          ETB {Number(s.opening_float || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700 }}>
                          {s.closing_cash ? `ETB ${Number(s.closing_cash).toFixed(2)}` : '—'}
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
        <form onSubmit={handleOpenShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              type="number"
              step="0.01"
              min="0"
              required
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              placeholder="1000.00"
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
              type="submit"
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
        <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                  ETB {Number(activeShift.expected_cash || activeShift.opening_float || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Starting Float</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                  ETB {Number(activeShift.opening_float || 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Actual Physically Counted Cash (ETB)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              placeholder="Counted cash amount in drawer"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '1.2rem',
                fontWeight: 800,
              }}
            />
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
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ background: 'var(--danger)', fontWeight: 700 }}
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
        <form onSubmit={handleCashMovement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              Amount (ETB)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
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
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontWeight: 700 }}
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
