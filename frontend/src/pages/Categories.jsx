import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Categories = () => {
  const { user, addToast, hasRole } = useAuth();

  // Tab State: 'categories' | 'brands'
  const [activeTab, setActiveTab] = useState('categories');

  // Categories State
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  // Brands State
  const [brands, setBrands] = useState([]);
  const [brandSearch, setBrandSearch] = useState('');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [brandForm, setBrandForm] = useState({ name: '', description: '', is_active: true });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Categories, Brands, and Products
  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, brandsRes, productsRes] = await Promise.all([
        api.getCategories({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getBrands({ per_page: 150 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 500 }).catch(() => ({ data: [] })),
      ]);

      const rawCategories = categoriesRes?.data || [];
      const rawBrands = brandsRes?.data || [];
      const products = productsRes?.data || [];

      // Compute product counts for categories
      const productsByCategory = products.reduce((acc, p) => {
        const catId = p.category_id;
        if (!acc[catId]) acc[catId] = [];
        acc[catId].push(p);
        return acc;
      }, {});

      const formattedCategories = rawCategories.map((c) => {
        const catProducts = productsByCategory[c.id] || [];
        return {
          ...c,
          products_count: catProducts.length,
          example_products: catProducts.slice(0, 3).map((p) => p.name).join(', '),
        };
      });

      // Compute product counts for brands
      const productsByBrand = products.reduce((acc, p) => {
        const bId = p.brand_id;
        if (bId) {
          acc[bId] = (acc[bId] || 0) + 1;
        }
        return acc;
      }, {});

      const formattedBrands = rawBrands.map((b) => ({
        ...b,
        products_count: productsByBrand[b.id] || b.products_count || 0,
      }));

      setCategories(formattedCategories);
      setBrands(formattedBrands);
    } catch (err) {
      addToast?.(err.message || 'Failed to load categories & brands', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── CATEGORY HANDLERS ───────────────────────────────────────────
  const handleOpenCategoryCreate = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
    setFormError('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenCategoryEdit = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name || '', description: cat.description || '' });
    setFormError('');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, categoryForm);
        addToast?.(`Category "${categoryForm.name}" updated!`, 'success');
      } else {
        await api.createCategory(categoryForm);
        addToast?.(`Category "${categoryForm.name}" created!`, 'success');
      }
      setIsCategoryModalOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err.data?.message || err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await api.deleteCategory(categoryToDelete.id);
      addToast?.(`Category "${categoryToDelete.name}" removed`, 'info');
      setCategoryToDelete(null);
      await fetchData();
    } catch (err) {
      addToast?.(err.message || 'Failed to delete category', 'error');
    }
  };

  // ── BRAND HANDLERS ──────────────────────────────────────────────
  const handleOpenBrandCreate = () => {
    setEditingBrand(null);
    setBrandForm({ name: '', description: '', is_active: true });
    setFormError('');
    setIsBrandModalOpen(true);
  };

  const handleOpenBrandEdit = (b) => {
    setEditingBrand(b);
    setBrandForm({ name: b.name || '', description: b.description || '', is_active: b.is_active ?? true });
    setFormError('');
    setIsBrandModalOpen(true);
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (editingBrand) {
        await api.updateBrand(editingBrand.id, brandForm);
        addToast?.(`Brand "${brandForm.name}" updated!`, 'success');
      } else {
        await api.createBrand(brandForm);
        addToast?.(`Brand "${brandForm.name}" added to catalog!`, 'success');
      }
      setIsBrandModalOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err.data?.message || err.message || 'Failed to save brand.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    try {
      await api.deleteBrand(brandToDelete.id);
      addToast?.(`Brand "${brandToDelete.name}" removed`, 'info');
      setBrandToDelete(null);
      await fetchData();
    } catch (err) {
      addToast?.(err.message || 'Failed to delete brand', 'error');
    }
  };

  // Filtered lists
  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, categorySearch]);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.toLowerCase().trim();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  }, [brands, brandSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header Card with Unified Tab Switcher */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 22px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="tag" size={24} color="#38bdf8" />
              Categories & Brands
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Organize products by taxonomy categories and hardware manufacturer brands
          </p>
        </div>

        {/* Tab Switcher & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-app)',
              padding: 4,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setActiveTab('categories')}
              style={{
                padding: '7px 18px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'categories' ? 'var(--brand-blue)' : 'transparent',
                color: activeTab === 'categories' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="tag" size={15} />
              Categories ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              style={{
                padding: '7px 18px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'brands' ? 'var(--brand-blue)' : 'transparent',
                color: activeTab === 'brands' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="package" size={15} />
              Brands ({brands.length})
            </button>
          </div>

          {activeTab === 'categories' && hasRole(['admin', 'manager']) && (
            <button onClick={handleOpenCategoryCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem', fontWeight: 700 }}>
              <Icon name="plus" size={16} />
              + Add Category
            </button>
          )}

          {activeTab === 'brands' && hasRole(['admin', 'manager']) && (
            <button onClick={handleOpenBrandCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem', fontWeight: 700 }}>
              <Icon name="plus" size={16} />
              + Add Brand
            </button>
          )}

          <button
            onClick={fetchData}
            className="btn btn-secondary btn-icon"
            title="Refresh database"
            style={{ width: 36, height: 36 }}
          >
            <Icon name="refresh" size={16} />
          </button>
        </div>
      </div>

      {/* ── TAB 1: CATEGORIES ────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <>
          {/* Categories Search Bar */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <input
              type="text"
              placeholder="Search categories by name or description..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          {/* Categories Table */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Category Name</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Description</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'center' }}>Products Assigned</th>
                    {hasRole(['admin', 'manager']) && (
                      <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Loading categories...
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        {categorySearch ? 'No categories match your search.' : 'No categories yet. Click "+ Add Category" to create one.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                            {c.name}
                          </div>
                          {c.example_products && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              e.g. {c.example_products}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                          {c.description || '—'}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: c.products_count > 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                              color: c.products_count > 0 ? '#16a34a' : 'var(--text-muted)',
                            }}
                          >
                            {c.products_count} {c.products_count === 1 ? 'Product' : 'Products'}
                          </span>
                        </td>
                        {hasRole(['admin', 'manager']) && (
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                onClick={() => handleOpenCategoryEdit(c)}
                                className="action-btn action-btn-primary"
                                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                              >
                                Edit
                              </button>
                              {hasRole(['admin']) && (
                                <button
                                  onClick={() => setCategoryToDelete(c)}
                                  disabled={c.products_count > 0}
                                  className="action-btn action-btn-danger"
                                  style={{ padding: '4px 8px', fontSize: '0.76rem', opacity: c.products_count > 0 ? 0.4 : 1 }}
                                  title={c.products_count > 0 ? 'Cannot delete category with active products' : 'Delete'}
                                >
                                  <Icon name="trash" size={13} />
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
        </>
      )}

      {/* ── TAB 2: BRANDS ────────────────────────────────────────── */}
      {activeTab === 'brands' && (
        <>
          {/* Brands Search Bar */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <input
              type="text"
              placeholder="Search brands (e.g. Apple, Samsung, Sony, Dell)..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          {/* Brands Table */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Brand Name</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Brand Description</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'center' }}>Products Assigned</th>
                    {hasRole(['admin', 'manager']) && (
                      <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Loading brands...
                      </td>
                    </tr>
                  ) : filteredBrands.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        {brandSearch ? 'No brands match your search.' : 'No brands recorded yet. Click "+ Add Brand" to create one.'}
                      </td>
                    </tr>
                  ) : (
                    filteredBrands.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.94rem' }}>
                            {b.name}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                          {b.description || 'Hardware manufacturer brand'}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: b.products_count > 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                              color: b.products_count > 0 ? '#0284c7' : 'var(--text-muted)',
                            }}
                          >
                            {b.products_count} {b.products_count === 1 ? 'Product' : 'Products'}
                          </span>
                        </td>
                        {hasRole(['admin', 'manager']) && (
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                onClick={() => handleOpenBrandEdit(b)}
                                className="action-btn action-btn-primary"
                                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                              >
                                Edit
                              </button>
                              {hasRole(['admin']) && (
                                <button
                                  onClick={() => setBrandToDelete(b)}
                                  disabled={b.products_count > 0}
                                  className="action-btn action-btn-danger"
                                  style={{ padding: '4px 8px', fontSize: '0.76rem', opacity: b.products_count > 0 ? 0.4 : 1 }}
                                  title={b.products_count > 0 ? 'Cannot delete brand with active products' : 'Delete'}
                                >
                                  <Icon name="trash" size={13} />
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
        </>
      )}

      {/* ── MODALS ────────────────────────────────────────────────── */}

      {/* Category Modal (Create / Edit) */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        maxWidth={500}
      >
        <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {formError && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', borderRadius: 6, fontSize: '0.84rem' }}>
              {formError}
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Smartphones, Laptops, Audio & Headphones..."
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Optional description of this product line..."
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Brand Modal (Create / Edit) */}
      <Modal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title={editingBrand ? 'Edit Hardware Brand' : 'Add New Hardware Brand'}
        maxWidth={500}
      >
        <form onSubmit={handleSaveBrand} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {formError && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', borderRadius: 6, fontSize: '0.84rem' }}>
              {formError}
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Brand Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apple, Samsung, Sony, Dell, Anker..."
              value={brandForm.name}
              onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Brand Notes / Description
            </label>
            <textarea
              rows={3}
              placeholder="e.g. iPhones, MacBooks, accessories..."
              value={brandForm.description}
              onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={() => setIsBrandModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingBrand ? 'Update Brand' : 'Save Brand'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Category Confirmation */}
      <Modal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        title="Delete Category"
        maxWidth={440}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            Are you sure you want to delete category <strong>{categoryToDelete?.name}</strong>?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => setCategoryToDelete(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={confirmDeleteCategory} className="btn btn-danger" style={{ background: '#ef4444', color: '#fff' }}>
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Brand Confirmation */}
      <Modal
        isOpen={!!brandToDelete}
        onClose={() => setBrandToDelete(null)}
        title="Delete Brand"
        maxWidth={440}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            Are you sure you want to delete brand <strong>{brandToDelete?.name}</strong>?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => setBrandToDelete(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={confirmDeleteBrand} className="btn btn-danger" style={{ background: '#ef4444', color: '#fff' }}>
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Categories;
