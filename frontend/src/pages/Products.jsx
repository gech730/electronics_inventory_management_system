import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';
import StockBadge from '../components/StockBadge';

export const Products = () => {
  const { user, addToast, hasRole } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // all, in_stock, low_stock, out_of_stock

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  // Image Upload State
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    sku: '',
    category_id: '',
    brand_id: '',
    base_unit_id: '',
    brand: '',
    model_number: '',
    cost_price: '',
    selling_price: '',
    quantity: '',
    minimum_stock: '',
    image_url: '',
    track_inventory: true,
    is_sellable: true,
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Products, Categories, Brands & Units
  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, brandsRes, unitsRes] = await Promise.all([
        api.getProducts({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getCategories({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getBrands({ per_page: 100 }).catch(() => ({ data: [] })),
        api.getUnits({ per_page: 100 }).catch(() => ({ data: [] })),
      ]);
      setProducts(productsRes?.data || []);
      setCategories(categoriesRes?.data || []);
      setBrands(brandsRes?.data || []);
      setUnits(unitsRes?.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview('');
    setFormData({
      ...initialForm,
      category_id: categories.length > 0 ? categories[0].id : '',
      brand_id: brands.length > 0 ? brands[0].id : '',
      base_unit_id: units.length > 0 ? units[0].id : '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setImageFile(null);
    setImagePreview(product.image_url || '');
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      category_id: product.category_id || '',
      brand_id: product.brand_id || '',
      base_unit_id: product.base_unit_id || '',
      brand: typeof product.brand === 'object' && product.brand !== null ? (product.brand.name || '') : (product.brand || ''),
      model_number: product.model_number || '',
      cost_price: product.cost_price || '',
      selling_price: product.selling_price || '',
      quantity: product.quantity || '',
      minimum_stock: product.minimum_stock || '',
      image_url: product.image_url || '',
      track_inventory: product.track_inventory ?? true,
      is_sellable: product.is_sellable ?? true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Drag & Drop and File Selection Handlers
  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      } else {
        addToast('Please upload an image file (PNG, JPG, WEBP, etc.)', 'warning');
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData((prev) => ({ ...prev, image_url: '' }));
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

    // Payload formatting
    const payload = {
      ...formData,
      category_id: Number(formData.category_id),
      brand_id: formData.brand_id ? Number(formData.brand_id) : null,
      base_unit_id: formData.base_unit_id ? Number(formData.base_unit_id) : null,
      cost_price: parseFloat(formData.cost_price),
      selling_price: parseFloat(formData.selling_price),
      quantity: parseInt(formData.quantity, 10),
      minimum_stock: parseInt(formData.minimum_stock, 10),
      image_url: formData.image_url || undefined,
    };

    setSubmitting(true);
    try {
      let savedProduct;

      if (imageFile) {
        // Send as FormData for direct Cloudinary/backend upload
        const data = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null && k !== 'image_url') {
            data.append(k, v);
          }
        });
        data.append('image', imageFile);

        if (editingProduct) {
          savedProduct = await api.updateProduct(editingProduct.id, data);
        } else {
          savedProduct = await api.createProduct(data);
        }
      } else {
        if (editingProduct) {
          savedProduct = await api.updateProduct(editingProduct.id, payload);
        } else {
          savedProduct = await api.createProduct(payload);
        }
      }

      if (editingProduct) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? (savedProduct || { ...p, ...payload }) : p))
        );
        addToast(`Product "${payload.name}" updated successfully!`, 'success');
      } else {
        if (savedProduct) {
          setProducts((prev) => [savedProduct, ...prev]);
        } else {
          fetchData();
        }
        addToast(`Product "${payload.name}" added to catalog!`, 'success');
      }

      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.data?.message || err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product
  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      addToast(`Product "${productToDelete.name}" removed from inventory`, 'info');
    } catch (err) {
      addToast(err.message || 'Failed to delete product', 'error');
    } finally {
      setProductToDelete(null);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const bName = typeof p.brand === 'object' && p.brand !== null ? p.brand.name : (p.brand || '');
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bName && bName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || String(p.category_id) === String(selectedCategory);

    let matchesStock = true;
    const qty = Number(p.quantity);
    const min = Number(p.minimum_stock);

    if (stockFilter === 'in_stock') matchesStock = qty > min;
    if (stockFilter === 'low_stock') matchesStock = qty <= min && qty > 0;
    if (stockFilter === 'out_of_stock') matchesStock = qty <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Calculate live profit margin for the form
  const cost = parseFloat(formData.cost_price) || 0;
  const selling = parseFloat(formData.selling_price) || 0;
  const profit = selling - cost;
  const marginPercent = cost > 0 ? ((profit / cost) * 100).toFixed(1) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              Product Catalog
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
              {products.length} Items Listed
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: 4 }}>
            Monitor electronic components, hardware pricing, SKU identifiers, and stock levels.
          </p>
        </div>

        {hasRole(['admin', 'manager']) && (
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ background: '#1677ff' }}>
            <Icon name="plus" size={16} />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '18px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: 260, flex: 1, maxWidth: 360 }}>
          <Icon
            name="search"
            size={16}
            color="#94a3b8"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search by product, SKU, or brand..."
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

        {/* Category Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '0.84rem',
              color: '#1e293b',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Level Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { id: 'all', label: 'All Stock' },
              { id: 'in_stock', label: 'In Stock' },
              { id: 'low_stock', label: 'Low Stock' },
              { id: 'out_of_stock', label: 'Out of Stock' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStockFilter(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  background: stockFilter === tab.id ? '#1677ff' : '#f1f5f9',
                  color: stockFilter === tab.id ? '#ffffff' : '#64748b',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Table Card */}
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
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Product Details
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  SKU
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Category
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Cost / Selling Price
                </th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Stock Status
                </th>
                {hasRole(['admin', 'manager']) && (
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <Icon name="refresh" size={24} className="animate-spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                    <div style={{ fontWeight: 500 }}>Loading electronic inventory...</div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>No products match your criteria</div>
                    <p style={{ fontSize: '0.84rem', marginTop: 4, color: '#94a3b8' }}>
                      Try clearing search filters or click "Add New Product" to list inventory.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const costPrice = parseFloat(p.cost_price) || 0;
                  const sellPrice = parseFloat(p.selling_price) || 0;
                  const margin = sellPrice - costPrice;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 150ms ease',
                      }}
                    >
                      {/* Product Name & Brand */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: '10px',
                              background: 'rgba(22, 119, 255, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                              border: '1px solid rgba(0,0,0,0.06)',
                            }}
                          >
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <Icon name="package" size={20} color="#1677ff" />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
                              {p.name}
                            </div>
                            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              {typeof p.brand === 'object' && p.brand !== null ? (p.brand.name || 'Generic') : (p.brand || 'Generic')} {p.model_number ? `• ${p.model_number}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          className="font-mono"
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {p.sku}
                        </span>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            background: 'rgba(99, 102, 241, 0.08)',
                            color: '#6366f1',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          <Icon name="tag" size={12} color="#6366f1" />
                          {p.category?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Cost / Selling Price */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
                            ${sellPrice.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            (cost: ${costPrice.toFixed(2)})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: margin >= 0 ? '#00b074' : '#ef4444', fontWeight: 600, marginTop: 1 }}>
                          {margin >= 0 ? `+$${margin.toFixed(2)} margin` : `-$${Math.abs(margin).toFixed(2)} loss`}
                        </div>
                      </td>

                      {/* Stock Status Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <StockBadge quantity={p.quantity} minimumStock={p.minimum_stock} />
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            Min. safety: {p.minimum_stock} units
                          </span>
                        </div>
                      </td>

                      {/* Management Action Buttons */}
                      {hasRole(['admin', 'manager']) && (
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="action-btn action-btn-view"
                              title="Edit Product"
                            >
                              <Icon name="edit" size={13} color="#1677ff" />
                              <span>Edit</span>
                            </button>

                            {/* Delete Button (Admin Only) */}
                            {hasRole(['admin']) && (
                              <button
                                onClick={() => setProductToDelete(p)}
                                className="action-btn action-btn-danger"
                                title="Delete Product"
                              >
                                <Icon name="trash" size={13} color="#ef4444" />
                                <span>Delete</span>
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

      {/* Modal 1: Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product Details' : 'Add New Hardware Product'}
        maxWidth={620}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Row 1: Name and SKU */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="name" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                Product Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                placeholder="e.g. Raspberry Pi 4 Model B"
                value={formData.name}
                onChange={handleInputChange}
                style={{ background: '#f8fafc', color: '#1e293b' }}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="sku" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                SKU Identifier *
              </label>
              <input
                id="sku"
                name="sku"
                type="text"
                className="form-input font-mono"
                placeholder="e.g. RPI-4B-4GB"
                value={formData.sku}
                onChange={handleInputChange}
                style={{ background: '#f8fafc', color: '#1e293b' }}
                required
              />
            </div>
          </div>

          {/* Row 2: Category & Brand Dropdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="category_id" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                Hardware Category *
              </label>
              <select
                id="category_id"
                name="category_id"
                className="form-select"
                value={formData.category_id}
                onChange={handleInputChange}
                style={{ background: '#f8fafc', color: '#1e293b' }}
                required
              >
                <option value="" disabled>Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="brand_id" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                Hardware Brand
              </label>
              <select
                id="brand_id"
                name="brand_id"
                className="form-select"
                value={formData.brand_id}
                onChange={(e) => {
                  const sel = brands.find((b) => String(b.id) === e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    brand_id: e.target.value,
                    brand: sel ? sel.name : prev.brand,
                  }));
                }}
                style={{ background: '#f8fafc', color: '#1e293b' }}
              >
                <option value="">-- Select Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Unit of Measure & Model */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="base_unit_id" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                Unit of Measure
              </label>
              <select
                id="base_unit_id"
                name="base_unit_id"
                className="form-select"
                value={formData.base_unit_id}
                onChange={handleInputChange}
                style={{ background: '#f8fafc', color: '#1e293b' }}
              >
                <option value="">-- Standard (Piece/Unit) --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="model_number" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                Model Number (Optional)
              </label>
              <input
                id="model_number"
                name="model_number"
                type="text"
                className="form-input"
                placeholder="e.g. MX Master 3S"
                value={formData.model_number}
                onChange={handleInputChange}
                style={{ background: '#f8fafc', color: '#1e293b' }}
              />
            </div>
          </div>

          {/* Row 4: Pricing & Margin Calculator */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="cost_price" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                  Cost Price ($) *
                </label>
                <input
                  id="cost_price"
                  name="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={formData.cost_price}
                  onChange={handleInputChange}
                  style={{ background: '#ffffff', color: '#1e293b' }}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="selling_price" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                  Selling Price ($) *
                </label>
                <input
                  id="selling_price"
                  name="selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={formData.selling_price}
                  onChange={handleInputChange}
                  style={{ background: '#ffffff', color: '#1e293b' }}
                  required
                />
              </div>
            </div>

            {/* Live Profit Preview */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0', fontSize: '0.8rem' }}>
              <span style={{ color: '#64748b' }}>Estimated Margin / Item:</span>
              <span style={{ fontWeight: 700, color: profit >= 0 ? '#00b074' : '#ef4444' }}>
                ${profit.toFixed(2)} ({marginPercent}%)
              </span>
            </div>
          </div>

          {/* Row 5: Quantities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="quantity" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                Available Stock Quantity *
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                className="form-input"
                placeholder="e.g. 50"
                value={formData.quantity}
                onChange={handleInputChange}
                style={{ background: '#f8fafc', color: '#1e293b' }}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="minimum_stock" style={{ color: '#64748b', fontSize: '0.78rem' }}>
                Minimum Safety Stock *
              </label>
              <input
                id="minimum_stock"
                name="minimum_stock"
                type="number"
                min="0"
                className="form-input"
                placeholder="e.g. 10"
                value={formData.minimum_stock}
                onChange={handleInputChange}
                style={{ background: '#f8fafc', color: '#1e293b' }}
                required
              />
            </div>
          </div>

          {/* Row 6: Drag & Drop Product Image Upload */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>
              Product Image (Upload / Drag & Drop)
            </label>

            {imagePreview ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {imageFile ? imageFile.name : 'Current Product Image'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                    {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB • Ready to save to Cloudinary` : 'Active Cloudinary image'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px', color: '#ef4444' }}
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? '#1677ff' : '#cbd5e1'}`,
                  borderRadius: '14px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? 'rgba(22, 119, 255, 0.05)' : '#f8fafc',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                  Drag & drop product image here, or <span style={{ color: '#1677ff' }}>click to browse</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 4 }}>
                  Supports PNG, JPG, WEBP • Saves directly via Cloudinary & inventory storage
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
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
              {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Delete Confirmation Modal */}
      <Modal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        title="Delete Product"
        maxWidth={440}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5 }}>
            Are you sure you want to permanently delete <strong>{productToDelete?.name}</strong> (SKU: {productToDelete?.sku})?
          </p>
          <p style={{ color: '#ef4444', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
            ⚠️ This will remove the item from active inventory and cannot be undone.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setProductToDelete(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="btn btn-danger"
              style={{ background: '#ef4444', color: '#ffffff' }}
            >
              Yes, Delete Product
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
