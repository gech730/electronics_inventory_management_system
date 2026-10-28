import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Stores = () => {
  const { user, showToast } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  // Active Tab: 'stores' | 'locations'
  const [activeTab, setActiveTab] = useState('stores');

  // Data states
  const [stores, setStores] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [storeSearch, setStoreSearch] = useState('');
  const [storeStatusFilter, setStoreStatusFilter] = useState('all');

  const [locationSearch, setLocationSearch] = useState('');
  const [locationStoreFilter, setLocationStoreFilter] = useState('all');
  const [locationTypeFilter, setLocationTypeFilter] = useState('all');
  const [locationSellableFilter, setLocationSellableFilter] = useState('all');

  // Modals - Store
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeFormData, setStoreFormData] = useState({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    is_active: true,
  });

  // Modals - Location
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationFormData, setLocationFormData] = useState({
    store_id: '',
    code: '',
    name: '',
    location_type: 'warehouse',
    is_sellable: false,
    is_active: true,
  });

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'store'|'location', item }
  const [submitting, setSubmitting] = useState(false);

  // Fetch all stores and stock locations
  const loadData = async () => {
    try {
      setLoading(true);
      const [storesRes, locsRes] = await Promise.all([
        api.getStores({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getStockLocations({ per_page: 150 }).catch(() => ({ data: [] })),
      ]);
      setStores(storesRes?.data || []);
      setLocations(locsRes?.data || []);
    } catch (err) {
      showToast?.('Failed to load store and warehouse data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Location Types metadata
  const locationTypes = [
    { value: 'warehouse', label: 'Warehouse / Central Depot', icon: 'package', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
    { value: 'shop_floor', label: 'Retail Shop Floor', icon: 'store', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    { value: 'transit', label: 'Transit Bay / Staging', icon: 'truck', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { value: 'returns', label: 'Returns & RMA Hub', icon: 'rotateCcw', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    { value: 'damaged', label: 'Damaged / Quarantine', icon: 'alertTriangle', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  ];

  const getTypeMeta = (type) => {
    return locationTypes.find((t) => t.value === type) || {
      value: type,
      label: type,
      icon: 'package',
      color: '#64748b',
      bg: 'rgba(100, 116, 139, 0.12)',
    };
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalStores = stores.length;
    const activeStores = stores.filter((s) => s.is_active).length;
    const totalLocations = locations.length;
    const sellableFloors = locations.filter((l) => l.is_sellable).length;
    const centralDepots = locations.filter((l) => l.location_type === 'warehouse').length;
    return { totalStores, activeStores, totalLocations, sellableFloors, centralDepots };
  }, [stores, locations]);

  // Filtered Stores
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const q = storeSearch.toLowerCase();
      const matchesSearch =
        !storeSearch ||
        store.name?.toLowerCase().includes(q) ||
        store.code?.toLowerCase().includes(q) ||
        store.address?.toLowerCase().includes(q);
      const matchesStatus =
        storeStatusFilter === 'all' ||
        (storeStatusFilter === 'active' ? store.is_active : !store.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [stores, storeSearch, storeStatusFilter]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const q = locationSearch.toLowerCase();
      const matchesSearch =
        !locationSearch ||
        loc.name?.toLowerCase().includes(q) ||
        loc.code?.toLowerCase().includes(q) ||
        loc.store?.name?.toLowerCase().includes(q);
      const matchesStore =
        locationStoreFilter === 'all' || String(loc.store_id) === String(locationStoreFilter);
      const matchesType =
        locationTypeFilter === 'all' || loc.location_type === locationTypeFilter;
      const matchesSellable =
        locationSellableFilter === 'all' ||
        (locationSellableFilter === 'sellable' ? loc.is_sellable : !loc.is_sellable);
      return matchesSearch && matchesStore && matchesType && matchesSellable;
    });
  }, [locations, locationSearch, locationStoreFilter, locationTypeFilter, locationSellableFilter]);

  // ── Store Form Handlers ──────────────────────────────────────────
  const handleOpenStoreModal = (store = null) => {
    if (store) {
      setEditingStore(store);
      setStoreFormData({
        code: store.code || '',
        name: store.name || '',
        phone: store.phone || '',
        email: store.email || '',
        address: store.address || '',
        is_active: store.is_active ?? true,
      });
    } else {
      setEditingStore(null);
      setStoreFormData({
        code: `STR-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        phone: '',
        email: '',
        address: '',
        is_active: true,
      });
    }
    setIsStoreModalOpen(true);
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!storeFormData.code || !storeFormData.name) {
      showToast?.('Store code and name are required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingStore) {
        await api.updateStore(editingStore.id, storeFormData);
        showToast?.('Store updated successfully', 'success');
      } else {
        await api.createStore(storeFormData);
        showToast?.('Store created successfully', 'success');
      }
      setIsStoreModalOpen(false);
      loadData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to save store', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Location Form Handlers ───────────────────────────────────────
  const handleOpenLocationModal = (location = null, preselectedStoreId = null) => {
    if (location) {
      setEditingLocation(location);
      setLocationFormData({
        store_id: location.store_id ? String(location.store_id) : '',
        code: location.code || '',
        name: location.name || '',
        location_type: location.location_type || 'warehouse',
        is_sellable: Boolean(location.is_sellable),
        is_active: location.is_active ?? true,
      });
    } else {
      setEditingLocation(null);
      const defaultStore = preselectedStoreId || (stores[0]?.id ? String(stores[0].id) : '');
      setLocationFormData({
        store_id: defaultStore,
        code: `LOC-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        location_type: 'warehouse',
        is_sellable: false,
        is_active: true,
      });
    }
    setIsLocationModalOpen(true);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!locationFormData.code || !locationFormData.name) {
      showToast?.('Location code and name are required', 'warning');
      return;
    }

    const payload = {
      ...locationFormData,
      store_id: locationFormData.store_id ? Number(locationFormData.store_id) : null,
    };

    try {
      setSubmitting(true);
      if (editingLocation) {
        await api.updateStockLocation(editingLocation.id, payload);
        showToast?.('Stock location updated successfully', 'success');
      } else {
        await api.createStockLocation(payload);
        showToast?.('Stock location created successfully', 'success');
      }
      setIsLocationModalOpen(false);
      loadData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Failed to save location', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete Handler ───────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      if (deleteTarget.type === 'store') {
        await api.deleteStore(deleteTarget.item.id);
        showToast?.('Store deleted successfully', 'success');
      } else {
        await api.deleteStockLocation(deleteTarget.item.id);
        showToast?.('Stock location deleted successfully', 'success');
      }
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast?.(err?.data?.message || err?.message || 'Delete operation failed', 'error');
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
                background: 'linear-gradient(135deg, #1677ff 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(22, 119, 255, 0.25)',
              }}
            >
              <Icon name="store" size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Warehousing & Multi-Store Network
              </h1>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Centralize retail store branches, inventory storage bays, shop floor sellable locations & depots.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/units"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="tag" size={16} />
            <span>Units of Measure</span>
          </Link>

          <Link
            to="/balances"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <Icon name="cpu" size={16} />
            <span>Stock Balances</span>
          </Link>

          {isAdminOrManager && (
            <button
              onClick={() => (activeTab === 'stores' ? handleOpenStoreModal() : handleOpenLocationModal())}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              <Icon name="plus" size={16} color="#fff" />
              <span>{activeTab === 'stores' ? 'New Store Branch' : 'New Stock Location'}</span>
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
              background: 'rgba(22, 119, 255, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="store" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Store Branches
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalStores}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
              {stats.activeStores} active in network
            </div>
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
            <Icon name="package" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Locations
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalLocations}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {stats.centralDepots} central warehouses
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
            <Icon name="cart" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              POS Sellable Floors
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{stats.sellableFloors}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Direct retail checkout enabled
            </div>
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
            <Icon name="truck" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Storage & Transit
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {stats.totalLocations - stats.sellableFloors}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Depots, bays & quarantine
            </div>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 20,
          paddingBottom: 2,
        }}
      >
        <button
          onClick={() => setActiveTab('stores')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            border: 'none',
            background: activeTab === 'stores' ? 'var(--bg-card)' : 'transparent',
            borderBottom: activeTab === 'stores' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'stores' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all var(--transition-fast)',
          }}
        >
          <Icon name="store" size={18} />
          <span>Retail Stores & Branches ({stores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            border: 'none',
            background: activeTab === 'locations' ? 'var(--bg-card)' : 'transparent',
            borderBottom: activeTab === 'locations' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'locations' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all var(--transition-fast)',
          }}
        >
          <Icon name="package" size={18} />
          <span>Stock Locations & Warehouses ({locations.length})</span>
        </button>
      </div>

      {/* TAB 1: STORES DIRECTORY */}
      {activeTab === 'stores' && (
        <div>
          {/* Filters Bar */}
          <div
            className="glass-card"
            style={{
              padding: '14px 18px',
              marginBottom: 18,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 260, maxWidth: 500 }}>
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
                  placeholder="Search stores by code, name, city or address..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={storeStatusFilter}
                onChange={(e) => setStoreStatusFilter(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.85rem', minWidth: 140 }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <button
                onClick={loadData}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                title="Refresh Store List"
              >
                <Icon name="refresh" size={16} />
                <span style={{ fontSize: '0.82rem' }}>Refresh</span>
              </button>
            </div>
          </div>

          {/* Stores Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Store Details</th>
                    <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Code</th>
                    <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contact Info</th>
                    <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Address / Location</th>
                    <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Stock Locations</th>
                    <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                    {isAdminOrManager && (
                      <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Icon name="refresh" size={24} className="spin" />
                        <div style={{ marginTop: 8 }}>Loading store network...</div>
                      </td>
                    </tr>
                  ) : filteredStores.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Icon name="store" size={32} color="var(--text-dim)" />
                        <div style={{ marginTop: 8, fontWeight: 600 }}>No stores match your search criteria</div>
                        <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Add your first retail store branch or change filters.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredStores.map((store) => (
                      <tr
                        key={store.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background var(--transition-fast)',
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                            {store.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                            Branch ID #{store.id}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'rgba(22, 119, 255, 0.08)',
                              color: 'var(--primary)',
                            }}
                          >
                            {store.code}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.82rem' }}>
                          {store.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)' }}>
                              <span>📞 {store.phone}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>—</span>
                          )}
                          {store.email && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                              ✉️ {store.email}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 220 }}>
                          {store.address || <span style={{ color: 'var(--text-dim)' }}>No address registered</span>}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setLocationStoreFilter(String(store.id));
                              setActiveTab('locations');
                            }}
                            className="badge"
                            style={{
                              background: 'rgba(139, 92, 246, 0.12)',
                              color: '#8b5cf6',
                              border: '1px solid rgba(139, 92, 246, 0.25)',
                              cursor: 'pointer',
                              fontWeight: 700,
                              padding: '4px 10px',
                            }}
                            title="Click to view locations assigned to this store"
                          >
                            {store.stock_locations_count ?? locations.filter((l) => l.store_id === store.id).length} Locations →
                          </button>
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          {store.is_active ? (
                            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Active</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>Inactive</span>
                          )}
                        </td>

                        {isAdminOrManager && (
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                onClick={() => handleOpenLocationModal(null, store.id)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                                title="Add stock location for this store"
                              >
                                <Icon name="plus" size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenStoreModal(store)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                                title="Edit Store"
                              >
                                <Icon name="edit" size={14} />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => setDeleteTarget({ type: 'store', item: store })}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--danger)' }}
                                  title="Delete Store"
                                >
                                  <Icon name="trash" size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK LOCATIONS & WAREHOUSES */}
      {activeTab === 'locations' && (
        <div>
          {/* Filters Bar */}
          <div
            className="glass-card"
            style={{
              padding: '14px 18px',
              marginBottom: 18,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: 220 }}>
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
                  placeholder="Search code or location name..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 36, width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              {/* Store Filter */}
              <select
                value={locationStoreFilter}
                onChange={(e) => setLocationStoreFilter(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.85rem', minWidth: 160 }}
              >
                <option value="all">All Store Branches</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={locationTypeFilter}
                onChange={(e) => setLocationTypeFilter(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.85rem', minWidth: 160 }}
              >
                <option value="all">All Location Types</option>
                {locationTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              {/* Sellable Filter */}
              <select
                value={locationSellableFilter}
                onChange={(e) => setLocationSellableFilter(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.85rem', minWidth: 140 }}
              >
                <option value="all">All Modes</option>
                <option value="sellable">POS Sellable Only</option>
                <option value="non-sellable">Storage / Non-Sellable</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={loadData}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                title="Refresh Locations"
              >
                <Icon name="refresh" size={16} />
                <span style={{ fontSize: '0.82rem' }}>Refresh</span>
              </button>
            </div>
          </div>

          {/* Locations Grid / Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {loading ? (
              <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Icon name="refresh" size={24} className="spin" />
                <div style={{ marginTop: 8 }}>Loading stock locations...</div>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div
                className="glass-card"
                style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}
              >
                <Icon name="package" size={32} color="var(--text-dim)" />
                <div style={{ marginTop: 8, fontWeight: 600 }}>No stock locations match filter criteria</div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                  Create a new stock location or reset your filters.
                </div>
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const meta = getTypeMeta(loc.location_type);
                return (
                  <div
                    key={loc.id}
                    className="glass-card"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: meta.bg,
                            color: meta.color,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          <Icon name={meta.icon} size={14} />
                          <span>{meta.label}</span>
                        </span>

                        <div style={{ display: 'flex', gap: 6 }}>
                          {loc.is_sellable ? (
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}
                            >
                              ✓ POS Sellable
                            </span>
                          ) : (
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(148, 163, 184, 0.12)',
                                color: 'var(--text-muted)',
                                fontSize: '0.7rem',
                              }}
                            >
                              Storage Only
                            </span>
                          )}

                          {loc.is_active ? (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Inactive</span>
                          )}
                        </div>
                      </div>

                      {/* Location Name & Code */}
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                        {loc.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--primary)',
                          }}
                        >
                          {loc.code}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ID #{loc.id}</span>
                      </div>

                      {/* Assigned Store */}
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(0, 0, 0, 0.15)',
                          fontSize: '0.8rem',
                          marginBottom: 16,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Icon name="store" size={16} color="var(--text-muted)" />
                        <div>
                          <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Assigned Store:</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {loc.store ? `${loc.store.name} (${loc.store.code})` : 'Global / Unassigned Warehouse'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: 12,
                        marginTop: 4,
                      }}
                    >
                      <Link
                        to={`/balances?location_id=${loc.id}`}
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>View Balances</span>
                        <span>→</span>
                      </Link>

                      {isAdminOrManager && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleOpenLocationModal(loc)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Edit Location"
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget({ type: 'location', item: loc })}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger)' }}
                              title="Delete Location"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT STORE MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        title={editingStore ? `Edit Store: ${editingStore.name}` : 'Create New Store Branch'}
      >
        <form onSubmit={handleSaveStore}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Store Code *
              </label>
              <input
                type="text"
                required
                value={storeFormData.code}
                onChange={(e) => setStoreFormData({ ...storeFormData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. STR-ADDIS-01"
                className="input-field"
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Store Name *
              </label>
              <input
                type="text"
                required
                value={storeFormData.name}
                onChange={(e) => setStoreFormData({ ...storeFormData, name: e.target.value })}
                placeholder="e.g. Central Flagship Store"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Contact Phone
              </label>
              <input
                type="text"
                value={storeFormData.phone}
                onChange={(e) => setStoreFormData({ ...storeFormData, phone: e.target.value })}
                placeholder="+251-911-000000"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Official Email
              </label>
              <input
                type="email"
                value={storeFormData.email}
                onChange={(e) => setStoreFormData({ ...storeFormData, email: e.target.value })}
                placeholder="store@electronics.com"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Physical Address & Location Details
            </label>
            <textarea
              rows={3}
              value={storeFormData.address}
              onChange={(e) => setStoreFormData({ ...storeFormData, address: e.target.value })}
              placeholder="e.g. Bole Subcity, Cameroon Street, Addis Ababa"
              className="input-field"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Active Status</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Enable branch for POS checkout, cashier shift assignments and inventory orders
              </div>
            </div>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={storeFormData.is_active}
                onChange={(e) => setStoreFormData({ ...storeFormData, is_active: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsStoreModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingStore ? 'Update Store' : 'Create Store'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CREATE / EDIT STOCK LOCATION MODAL ─────────────────────────── */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title={editingLocation ? `Edit Location: ${editingLocation.name}` : 'Create Stock Location / Bay'}
      >
        <form onSubmit={handleSaveLocation}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Assigned Retail Store Branch
            </label>
            <select
              value={locationFormData.store_id}
              onChange={(e) => setLocationFormData({ ...locationFormData, store_id: e.target.value })}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="">-- Global / Standalone Warehouse --</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
              Link this bay or floor to a physical branch for register inventory tracking.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Location Code *
              </label>
              <input
                type="text"
                required
                value={locationFormData.code}
                onChange={(e) => setLocationFormData({ ...locationFormData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WH-MAIN-01"
                className="input-field"
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                Location Name *
              </label>
              <input
                type="text"
                required
                value={locationFormData.name}
                onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                placeholder="e.g. Primary Electronics Depot"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Location Type *
            </label>
            <select
              required
              value={locationFormData.location_type}
              onChange={(e) => setLocationFormData({ ...locationFormData, location_type: e.target.value })}
              className="input-field"
              style={{ width: '100%' }}
            >
              {locationTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>POS Sellable Floor</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Allows point-of-sale cashiers and online orders to deduct stock from this location
              </div>
            </div>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={locationFormData.is_sellable}
                onChange={(e) => setLocationFormData({ ...locationFormData, is_sellable: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
            </label>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Operational Status</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Active locations can receive goods receipts and transfer shipments
              </div>
            </div>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={locationFormData.is_active}
                onChange={(e) => setLocationFormData({ ...locationFormData, is_active: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.type === 'store' ? 'Delete Store Branch' : 'Delete Stock Location'}
      >
        <div style={{ padding: '8px 0' }}>
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Icon name="alertTriangle" size={24} />
            <div>
              <strong>Irreversible Action Warning:</strong>
              <div style={{ fontSize: '0.78rem', marginTop: 2 }}>
                {deleteTarget?.type === 'store'
                  ? 'A store cannot be deleted if it has stock locations or active POS registers assigned.'
                  : 'A stock location cannot be deleted if it holds active on-hand inventory stock balances.'}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 20 }}>
            Are you sure you want to permanently delete{' '}
            <strong>"{deleteTarget?.item?.name}"</strong> ({deleteTarget?.item?.code})?
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

export default Stores;
