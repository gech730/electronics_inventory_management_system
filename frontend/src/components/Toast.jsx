import React from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from './Icons';

export const ToastContainer = () => {
  const { toasts, removeToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <Icon
            name={toast.type === 'success' ? 'check' : toast.type === 'error' ? 'alert' : 'bolt'}
            size={18}
            color={toast.type === 'success' ? 'var(--success)' : toast.type === 'error' ? 'var(--danger)' : 'var(--info)'}
          />
          <span style={{ flex: 1, fontWeight: 500 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim)',
              display: 'flex',
              padding: 2,
            }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
