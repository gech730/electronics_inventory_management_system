import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

export const Categories = () => {
  const { user, addToast, hasRole } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Form State
  const initialForm = {
    name: '',
    description: '',
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Categories and Products to compute counts & examples
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        api.getCategories({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getProducts({ per_page: 500 }).catch(() => ({ data: [] })),
      ]);

      const rawCategories = categoriesRes?.data || [];
      const products = productsRes?.data || [];

      // Group products by category_id and compute counts + example names
      const productsByCategory = products.reduce((acc, p) => {
        const catId = p.category_id;
        if (!acc[catId]) acc[catId] = [];
        acc[catId].push(p);
        return acc;
      }, {});

      // Format categories with product data
      const formatted = rawCategories.map((c) => {
        const catProducts = productsByCategory[c.id] || [];
        const productCount = catProducts.length;
        // Get up to 3 example product names
        const exampleProducts = catProducts
          .slice(0, 3)
          .map((p) => p.name)
          .join(', ');
        return {
          ...c,
          products_count: productCount,
          example_products: exampleProducts,
        };
      });

      setCategories(formatted);
    } catch (err) {
      addToast(err.message || 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData(initialForm);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Add / Edit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    setSubmitting(true);
    try {
      if (editingCategory) {
        // Update existing category
        const updated = await api.updateCategory(editingCategory.id, formData);
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? { ...c, ...updated } : c))
        );
        addToast(`Category "${formData.name}" updated successfully!`, 'success');
      } else {
        // Create new category
        const created = await api.createCategory(formData);
        if (created) {
          setCategories((prev) => [{ ...created, products_count: 0 }, ...prev]);
        } else {
          fetchCategories();
        }
        addToast(`Category "${formData.name}" created!`, 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.data?.message || err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Category
  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await api.deleteCategory(categoryToDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      addToast(`Category "${categoryToDelete.name}" removed`, 'info');
    } catch (err) {
      addToast(err.message || 'Failed to delete category', 'error');
    } finally {
      setCategoryToDelete(null);
    }
  };

  // Filtered Categories
  const filteredCategories = categories.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalCategories = categories.length;
  const totalProducts = categories.reduce((sum, c) => sum + (c.products_count || 0), 0);
  const emptyCategories = categories.filter((c) => (c.products_count || 0) === 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats Grid */}
      <div className="grid-cols-4" style={{ gap: 16 }}>
        <div
          className="glass-card"
          style={{
            padding: '20px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              background: 'rgba(22, 119, 255, 0.12)',
              color: '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="tag" size={24} color="#1677ff" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {totalCategories}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500, marginTop: 2 }}>
              Total Categories
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '20px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              background: 'rgba(0, 176, 116, 0.12)',
              color: '#00b074',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="package" size={24} color="#00b074" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {totalProducts}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500, marginTop: 2 }}>
              Total Products
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '20px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              background: 'rgba(255, 159, 67, 0.12)',
              color: '#ff9f43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="alert" size={24} color="#ff9f43" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {emptyCategories}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500, marginTop: 2 }}>
              Empty Categories
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '20px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="cpu" size={24} color="#6366f1" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {categories.length > 0 ? Math.round(totalProducts / totalCategories) : 0}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500, marginTop: 2 }}>
              Avg. Products/Category
            </div>
          </div>
        </div>
      </div>

      {/* Top Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              Inventory Categories
            </h1>
            <span
              style={{
                background: 'rgba(22, 119, 255, 0.1)',
                color: '#1677ff',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '9999px',
              }}
            >
              {totalCategories} Categories
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: 4 }}>
            Organize electronic components into logical groups (Microcontrollers, Sensors, Displays, Power, etc.)
          </p>
        </div>

        {hasRole(['admin', 'manager']) && (
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ background: '#1677ff' }}>
            <Icon name="plus" size={16} />
            <span>Add New Category</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: 0, flex: 1, maxWidth: '100%' }}>
          <Icon
            name="search"
            size={16}
            color="#94a3b8"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search categories by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px 9px 38px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '0.86rem',
              color: '#1e293b',
              outline: 'none',
            }}
          />
        </div>

        {/* Sort/View Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value="name"
            onChange={() => {}}
            style={{
              padding: '9px 36px 9px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2364748b%27 stroke-width=%272%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E") no-repeat right 12px center',
              backgroundSize: '16px',
              fontSize: '0.82rem',
              color: '#475569',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
            }}
          >
            <option value="name">Sort: A–Z</option>
            <option value="name_desc">Sort: Z–A</option>
            <option value="products_desc">Sort: Most Products</option>
            <option value="products_asc">Sort: Fewest Products</option>
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* Categories Table Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '60px' }}>
                  #
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Category
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', minWidth: '280px' }}>
                  Description
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '140px', textAlign: 'center' }}>
                  Products
                </th>
                {hasRole(['admin', 'manager']) && (
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '140px', textAlign: 'right' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={hasRole(['admin', 'manager']) ? 5 : 4} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <Icon name="refresh" size={24} className="animate-spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                    <div style={{ fontWeight: 500 }}>Loading categories...</div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={hasRole(['admin', 'manager']) ? 5 : 4} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                      {searchQuery ? 'No categories match your search' : 'No categories yet'}
                    </div>
                    <p style={{ fontSize: '0.84rem', marginTop: 4, color: '#94a3b8' }}>
                      {searchQuery
                        ? 'Try adjusting your search query.'
                        : 'Click "Add New Category" to create your first category.'}
                    </p>
                    {!searchQuery && hasRole(['admin', 'manager']) && (
                      <button onClick={handleOpenCreate} className="btn btn-primary" style={{ marginTop: 16, background: '#1677ff' }}>
                        <Icon name="plus" size={14} />
                        Create First Category
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCategories.map((c, index) => {
                  const productCount = c.products_count || 0;
                  const isEmpty = productCount === 0;

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 150ms ease',
                      }}
                    >
                      {/* ID / Index */}
                      <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 500 }}>
                        #{c.id}
                      </td>

                      {/* Category Name with Icon */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '10px',
                              background: isEmpty ? 'rgba(148, 163, 184, 0.12)' : 'rgba(22, 119, 255, 0.1)',
                              color: isEmpty ? '#94a3b8' : '#1677ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              border: isEmpty ? '1px solid #e2e8f0' : '1px solid rgba(22, 119, 255, 0.2)',
                            }}
                          >
                            <Icon name={isEmpty ? 'package' : 'tag'} size={20} color={isEmpty ? '#94a3b8' : '#1677ff'} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
                              {c.name}
                            </div>
                            {c.example_products && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Icon name="package" size={10} color="#94a3b8" />
                                e.g. {c.example_products}
                              </span>
                            )}
                            {isEmpty && !c.example_products && (
                              <span style={{ fontSize: '0.72rem', color: '#ff9f43', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Icon name="alert" size={10} color="#ff9f43" />
                                Empty category
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ color: c.description ? '#475569' : '#94a3b8', fontSize: '0.86rem', lineHeight: 1.5, maxWidth: '320px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.description || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>No description provided</span>}
                        </span>
                      </td>

                      {/* Products Count Badge */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            background: productCount > 0 ? 'rgba(0, 176, 116, 0.1)' : 'rgba(148, 163, 184, 0.12)',
                            color: productCount > 0 ? '#00b074' : '#94a3b8',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: productCount > 0 ? '1px solid rgba(0, 176, 116, 0.2)' : '1px solid #e2e8f0',
                            minWidth: 80,
                          }}
                        >
                          <Icon name="package" size={12} color={productCount > 0 ? '#00b074' : '#94a3b8'} />
                          {productCount} {productCount === 1 ? 'Product' : 'Products'}
                        </span>
                      </td>

                      {/* Management Action Buttons */}
                      {hasRole(['admin', 'manager']) && (
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="action-btn action-btn-primary"
                              title="Edit Category"
                            >
                              <Icon name="edit" size={13} />
                              Edit
                            </button>

                            {/* Delete Button (Admin Only) */}
                            {hasRole(['admin']) && (
                              <button
                                onClick={() => setCategoryToDelete(c)}
                                className="action-btn action-btn-danger"
                                title={productCount > 0 ? "Cannot delete category with associated products" : "Delete Category"}
                                disabled={productCount > 0}
                                style={{ opacity: productCount > 0 ? 0.45 : 1, cursor: productCount > 0 ? 'not-allowed' : 'pointer' }}
                              >
                                <Icon name="trash" size={13} />
                                Delete
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

      {/* Modal 1: Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        maxWidth={520}
      >
        {formError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <Icon name="alert" size={18} color="#ef4444" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category Name */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="name" style={{ color: '#64748b', fontSize: '0.78rem' }}>
              Category Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              placeholder="e.g. Microcontrollers, Sensors, Displays"
              value={formData.name}
              onChange={handleInputChange}
              style={{ background: '#f8fafc', color: '#1e293b' }}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="description" style={{ color: '#64748b', fontSize: '0.78rem' }}>
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="Describe what types of components belong in this category..."
              value={formData.description}
              onChange={handleInputChange}
              style={{
                background: '#f8fafc',
                color: '#1e293b',
                minHeight: 100,
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
              rows={4}
            />
          </div>

          {/* Info hint */}
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(22, 119, 255, 0.06)',
              border: '1px solid rgba(22, 119, 255, 0.15)',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: '#1677ff',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <Icon name="info" size={16} color="#1677ff" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ lineHeight: 1.5 }}>
              <strong>Tip:</strong> Use clear, descriptive names like "Microcontrollers" or "Power Management" so team members can easily find components.
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#1677ff' }}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Delete Confirmation Modal */}
      <Modal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        title="Delete Category"
        maxWidth={460}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '16px',
              background: 'rgba(255, 159, 67, 0.1)',
              border: '1px solid rgba(255, 159, 67, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <Icon name="alert" size={20} color="#ff9f43" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
              <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>?
              </p>
              <p style={{ fontSize: '0.82rem' }}>
                This category currently has <strong>{categoryToDelete?.products_count || 0} product{categoryToDelete?.products_count === 1 ? '' : 's'}</strong> assigned to it.
              </p>
            </div>
          </div>

          {categoryToDelete && categoryToDelete.products_count > 0 && (
            <p style={{ color: '#ef4444', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert" size={14} color="#ef4444" />
              <span>Cannot delete: reassign or remove products first.</span>
            </p>
          )}

          {categoryToDelete && categoryToDelete.products_count === 0 && (
            <p style={{ color: '#64748b', fontSize: '0.82rem', background: 'rgba(0, 176, 116, 0.08)', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="check" size={14} color="#00b074" />
              <span>Safe to delete: no products are assigned to this category.</span>
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setCategoryToDelete(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="btn btn-danger"
              style={{ background: '#ef4444', color: '#ffffff' }}
              disabled={categoryToDelete?.products_count > 0}
            >
              {categoryToDelete?.products_count > 0 ? 'Cannot Delete' : 'Yes, Delete Category'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Categories;