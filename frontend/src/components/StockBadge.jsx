import React from 'react';

export const StockBadge = ({ quantity, minimumStock }) => {
  const qty = Number(quantity);
  const min = Number(minimumStock);

  if (qty <= 0) {
    return (
      <span className="badge badge-danger">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} />
        Out of Stock
      </span>
    );
  }

  if (qty <= min) {
    return (
      <span className="badge badge-warning">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)' }} />
        Low Stock ({qty})
      </span>
    );
  }

  return (
    <span className="badge badge-success">
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
      In Stock ({qty})
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const styles = {
    admin: 'badge-purple',
    manager: 'badge-info',
    cashier: 'badge-success',
    storekeeper: 'badge-warning',
  };

  return (
    <span className={`badge ${styles[role] || 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
      {role}
    </span>
  );
};

export default StockBadge;
