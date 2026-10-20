import React from 'react';
import Icon from './Icons';

export const StatCard = ({ title, value, subtitle, icon, gradient, change, trend = 'up' }) => {
  return (
    <div className="glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '120px',
          height: '120px',
          background: gradient || 'var(--gradient-primary)',
          opacity: 0.12,
          filter: 'blur(30px)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-sm)',
            background: gradient || 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Icon name={icon} size={20} color="#ffffff" />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</h2>
        {change && (
          <span
            className={`badge ${trend === 'up' ? 'badge-success' : 'badge-danger'}`}
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
          >
            {trend === 'up' ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
      {subtitle && (
        <p style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default StatCard;
