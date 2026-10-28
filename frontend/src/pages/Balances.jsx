import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Balances = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get('location_id') || 'all';

  // Data states
  const [balances, setBalances] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState(locationParam);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [initFormData, setInitFormData] = useState({
    stock_location_id: '',
    product_variant_id: '',
    quantity_on_hand: 0,
    quantity_reserved: 0,
    reorder_level: 10,
  });

  const [editFormData, setEditFormData] = useState({
    quantity_on_hand: 0,
    quantity_reserved: 0,
    reorder_level: 0,
  });

  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load balances and master data
  const loadBalancesData = async () => {
    try {
      setLoading(true);
      const [balRes, locRes, storeRes, prodRes] = await Promise.all([
        api.getStockBalances({ per_page: 200 }).catch(() => ({ data: [] })),
        api.getStockLocations({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getStores({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 150 }).catch(() => ({ data: [] })),
      ]);

      setBalances(balRes?.data || []);
      setLocations(locRes?.data || []);
      setStores(storeRes?.data || []);
      setProducts(prodRes?.data || []);

      if (locRes?.data?.length && !initFormData.stock_location_id) {
        setInitFormData((prev) => ({
          ...prev,
          stock_location_id: locRes.data[0].id,
        }));
      }
    } catch (err) {
      showToast?.('Failed to load stock balances matrix', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalancesData();
  }, []);

  // Update location filter if query param changes
  useEffect(() => {
    if (locationParam && locationParam !== 'all') {
      setSelectedLocation(locationParam);
    }
  }, [locationParam]);

  // Extract known variants from existing balances or fallback to product IDs
  const availableVariants = useMemo(() => {
    const variantMap = new Map();
    balances.forEach((b) => {
      if (b.product_variant) {
        variantMap.set(b.product_variant.id, {
          id: b.product_variant.id,
          sku: b.product_variant.sku,
          name: b.product_variant.product?.name || b.product_variant.variant_name || b.product_variant.sku,
          selling_price: b.product_variant.selling_price,
        });
      }
    });

    // If variants in DB are known (id 1, 2, etc.), also map products
    products.forEach((p, idx) => {
      const variantId = idx + 1;
      if (!variantMap.has(variantId)) {
        variantMap.set(variantId, {
          id: variantId,
          sku: p.sku,
          name: p.name,
          selling_price: p.selling_price,
        });
      }
    });

    return Array.from(variantMap.values());
  }, [balances, products]);

  // Filtered balances calculation
  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      const q = searchQuery.toLowerCase();
      const variant = b.product_variant;
      const product = variant?.product;
      const loc = b.stock_location;
      const store = loc?.store;

      const matchesSearch =
        !searchQuery ||
        product?.name?.toLowerCase().includes(q) ||
        variant?.sku?.toLowerCase().includes(q) ||
        loc?.name?.toLowerCase().includes(q) ||
        loc?.code?.toLowerCase().includes(q) ||
        store?.name?.toLowerCase().includes(q);

      const matchesStore =
        selectedStore === 'all' || String(loc?.store_id) === String(selectedStore);

      const matchesLocation =
        selectedLocation === 'all' || String(b.stock_location_id) === String(selectedLocation);

      const onHand = parseFloat(b.quantity_on_hand) || 0;
      const reorder = parseFloat(b.reorder_level) || 0;
      const isLow = onHand <= reorder;

      const matchesLowStock = !lowStockOnly || isLow;

      return matchesSearch && matchesStore && matchesLocation && matchesLowStock;
    });
  }, [balances, searchQuery, selectedStore, selectedLocation, lowStockOnly]);

  // Aggregate KPI Calculations
  const stats = useMemo(() => {
    let totalOnHand = 0;
    let totalReserved = 0;
    let lowStockCount = 0;

    balances.forEach((b) => {
      const onHand = parseFloat(b.quantity_on_hand) || 0;
      const reserved = parseFloat(b.quantity_reserved) || 0;
      const reorder = parseFloat(b.reorder_level) || 0;

      totalOnHand += onHand;
      totalReserved += reserved;
      if (onHand <= reorder) {
        lowStockCount++;
      }
    });

    const totalAvailable = Math.max(0, totalOnHand - totalReserved);
    return {
      totalItems: balances.length,
      totalOnHand,
      totalReserved,
      totalAvailable,
      lowStockCount,
    };
  }, [balances]);

  // Handlers for Initialize Balance Modal
  const handleOpenInitModal = () => {
    setInitFormData({
      stock_location_id: locations[0]?.id || '',
      product_variant_id: availableVariants[0]?.id || '',
      quantity_on_hand: 50,
      quantity_reserved: 0,
      reorder_level: 10,
    });
    setIsInitModalOpen(true);
  };

  const handleCreateBalance = async (e) => {
    e.preventDefault();
    if (!initFormData.stock_location_id || !initFormData.product_variant_id) {
      showToast?.('Location and Product Variant are required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.createStockBalance({
        stock_location_id: Number(initFormData.stock_location_id),
        product_variant_id: Number(initFormData.product_variant_id),
        quantity_on_hand: parseFloat(initFormData.quantity_on_hand) || 0,
        quantity_reserved: parseFloat(initFormData.quantity_reserved) || 0,
        reorder_level: parseFloat(initFormData.reorder_level) || 0,
      });

      showToast?.('Stock balance initialized successfully', 'success');
      setIsInitModalOpen(false);
      loadBalancesData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to initialize balance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Edit Balance Modal
  const handleOpenEditModal = (balance) => {
    setSelectedBalance(balance);
    setEditFormData({
      quantity_on_hand: parseFloat(balance.quantity_on_hand) || 0,
      quantity_reserved: parseFloat(balance.quantity_reserved) || 0,
      reorder_level: parseFloat(balance.reorder_level) || 0,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    if (!selectedBalance) return;

    try {
      setSubmitting(true);
      await api.updateStockBalance(selectedBalance.id, {
        quantity_on_hand: parseFloat(editFormData.quantity_on_hand) || 0,
        quantity_reserved: parseFloat(editFormData.quantity_reserved) || 0,
        reorder_level: parseFloat(editFormData.reorder_level) || 0,
      });

      showToast?.('Stock levels updated successfully', 'success');
      setIsEditModalOpen(false);
      loadBalancesData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to update stock levels', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Delete Balance
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await api.deleteStockBalance(deleteTarget.id);
      showToast?.('Stock balance record deleted successfully', 'success');
      setDeleteTarget(null);
      loadBalancesData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to delete stock balance record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
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
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              }}
            >
              <Icon name="cpu" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Multi-Location Stock Balances Matrix
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Live inventory on-hand quantities, order reservations, and low-stock replenishment reorder alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/stores"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="store" size={16} />
            <span>Warehouses & Stores</span>
          </Link>

          <Link
            to="/units"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="tag" size={16} />
            <span>Units of Measure</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={handleOpenInitModal}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>Initialize Stock Balance</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
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
              background: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="package" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Tracked Balances
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalItems}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Across {locations.length} storage locations
            </div>
          </div>
        </div>

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
            <Icon name="check" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total On Hand
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              {stats.totalOnHand.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Physical units present</div>
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
            <Icon name="cart" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Reserved for Orders
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
              {stats.totalReserved.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Committed to open sales</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-sm)',
              background: stats.lowStockCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              color: stats.lowStockCount > 0 ? '#ef4444' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="alertTriangle" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Reorder Alerts
            </div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: stats.lowStockCount > 0 ? '#ef4444' : 'var(--text-main)',
              }}
            >
              {stats.lowStockCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Stock at or below reorder level
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 260 }}>
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
              placeholder="Search by product, SKU, or bay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Store Filter */}
          <select
            value={selectedStore}
            onChange={(e) => {
              setSelectedStore(e.target.value);
              setSelectedLocation('all');
            }}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 160 }}
          >
            <option value="all">All Retail Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', minWidth: 180 }}
          >
            <option value="all">All Stock Locations</option>
            {locations
              .filter((l) => selectedStore === 'all' || String(l.store_id) === String(selectedStore))
              .map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
          </select>
        </div>

        {/* Right Toggle & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className="btn"
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: lowStockOnly ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: lowStockOnly ? '#ef4444' : 'var(--text-main)',
              border: lowStockOnly ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="alertTriangle" size={14} color={lowStockOnly ? '#ef4444' : 'currentColor'} />
            <span>Low Stock Alerts Only</span>
          </button>

          <button
            onClick={loadBalancesData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh Balances Matrix"
          >
            <Icon name="refresh" size={16} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stock Balances Data Matrix */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Product & Variant</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location / Depot</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>On Hand</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reserved</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Available</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reorder Threshold</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Stock Health</th>
                {isAdminOrManager && (
                  <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="refresh" size={24} className="spin" />
                    <div style={{ marginTop: 8 }}>Computing real-time stock balances...</div>
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Icon name="cpu" size={32} color="var(--text-dim)" />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>No stock balances found matching criteria</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      Initialize a stock balance record or adjust search filters.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBalances.map((item) => {
                  const onHand = parseFloat(item.quantity_on_hand) || 0;
                  const reserved = parseFloat(item.quantity_reserved) || 0;
                  const available = Math.max(0, onHand - reserved);
                  const reorder = parseFloat(item.reorder_level) || 0;

                  // Health Status
                  let healthLabel = 'Optimal';
                  let healthBg = 'rgba(16, 185, 129, 0.12)';
                  let healthColor = '#10b981';

                  if (onHand <= reorder) {
                    healthLabel = 'Low Stock Alert';
                    healthBg = 'rgba(239, 68, 68, 0.12)';
                    healthColor = '#ef4444';
                  } else if (onHand <= reorder * 1.5) {
                    healthLabel = 'Moderate';
                    healthBg = 'rgba(245, 158, 11, 0.12)';
                    healthColor = '#f59e0b';
                  }

                  const loc = item.stock_location;
                  const store = loc?.store;
                  const variant = item.product_variant;
                  const prod = variant?.product;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      {/* Product & Variant */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {prod?.name || variant?.variant_name || 'Hardware Component'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(22, 119, 255, 0.08)',
                              color: 'var(--primary)',
                            }}
                          >
                            {variant?.sku || prod?.sku || 'SKU-N/A'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            ID #{item.id}
                          </span>
                        </div>
                      </td>

                      {/* Location & Store */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                          {loc?.name || 'Central Warehouse'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {store?.name || 'Main Retail Hub'} ({loc?.code})
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {loc?.is_sellable ? (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '1px 6px',
                                borderRadius: 4,
                                fontWeight: 700,
                              }}
                            >
                              POS Sellable
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: 'var(--text-muted)',
                                background: 'rgba(148, 163, 184, 0.1)',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              Storage
                            </span>
                          )}
                        </div>
                      </td>

                      {/* On Hand */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {onHand.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Reserved */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        {reserved > 0 ? (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                            }}
                          >
                            {reserved.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>0</span>
                        )}
                      </td>

                      {/* Available to Sell */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: available > 0 ? '#10b981' : 'var(--danger)',
                          }}
                        >
                          {available.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Reorder Threshold */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {reorder.toLocaleString()}
                        </span>
                      </td>

                      {/* Health Status */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: healthBg,
                            color: healthColor,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          <span>{healthLabel}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      {isAdminOrManager && (
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                              title="Adjust Stock Levels"
                            >
                              <Icon name="edit" size={14} />
                            </button>
                            {isAdmin && onHand === 0 && (
                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--danger)' }}
                                title="Delete 0-Balance Record"
                              >
                                <Icon name="trash" size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── INITIALIZE STOCK BALANCE MODAL ──────────────────────────────── */}
      <Modal
        isOpen={isInitModalOpen}
        onClose={() => setIsInitModalOpen(false)}
        title="Initialize New Stock Balance Record"
      >
        <form onSubmit={handleCreateBalance}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Target Stock Location / Bay *
            </label>
            <select
              required
              value={initFormData.stock_location_id}
              onChange={(e) => setInitFormData({ ...initFormData, stock_location_id: e.target.value })}
              className="input-field"
              style={{ width: '100%' }}
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code}) — {loc.store ? loc.store.name : 'Central Warehouse'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Product SKU & Variant *
            </label>
            <select
              required
              value={initFormData.product_variant_id}
              onChange={(e) => setInitFormData({ ...initFormData, product_variant_id: e.target.value })}
              className="input-field"
              style={{ width: '100%' }}
            >
              {availableVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.sku}) — ID #{v.id}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Initial On-Hand Quantity *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={initFormData.quantity_on_hand}
                onChange={(e) => setInitFormData({ ...initFormData, quantity_on_hand: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Reorder Alert Level *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={initFormData.reorder_level}
                onChange={(e) => setInitFormData({ ...initFormData, reorder_level: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Initial Reserved Quantity
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={initFormData.quantity_reserved}
              onChange={(e) => setInitFormData({ ...initFormData, quantity_reserved: e.target.value })}
              className="input-field"
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
              Normally 0 unless backlogged orders already reserve this stock.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsInitModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Initializing...' : 'Initialize Balance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── ADJUST STOCK LEVELS MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Adjust Stock Balance & Reorder Levels"
      >
        <form onSubmit={handleUpdateBalance}>
          {selectedBalance && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.04)',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                {selectedBalance.product_variant?.product?.name || 'Selected Item'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Location: {selectedBalance.stock_location?.name} ({selectedBalance.stock_location?.code})
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Quantity On Hand *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={editFormData.quantity_on_hand}
                onChange={(e) => setEditFormData({ ...editFormData, quantity_on_hand: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Reorder Alert Level *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={editFormData.reorder_level}
                onChange={(e) => setEditFormData({ ...editFormData, reorder_level: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Quantity Reserved
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={editFormData.quantity_reserved}
              onChange={(e) => setEditFormData({ ...editFormData, quantity_reserved: e.target.value })}
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Save Stock Levels'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Stock Balance Record"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 20 }}>
            Are you sure you want to remove this 0-stock balance record for{' '}
            <strong>"{deleteTarget?.product_variant?.product?.name || deleteTarget?.product_variant?.sku}"</strong>{' '}
            at <strong>"{deleteTarget?.stock_location?.name}"</strong>?
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="btn btn-danger"
              disabled={submitting}
              style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
            >
              {submitting ? 'Deleting...' : 'Confirm Deletion'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Balances;
