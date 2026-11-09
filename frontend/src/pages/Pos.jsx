import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';
import Modal from '../components/Modal';

const DEFAULT_PAYMENT_METHODS = [
  { id: 1, name: 'Cash', method_type: 'cash', code: 'CASH', requires_reference: false },
  { id: 2, name: 'Telebirr', method_type: 'mobile_money', code: 'TELEBIRR', requires_reference: true },
  { id: 3, name: 'CBE Birr', method_type: 'mobile_money', code: 'CBEBIRR', requires_reference: true },
];

export const Pos = () => {
  const { user, showToast } = useAuth();

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Shopping cart state
  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);

  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(DEFAULT_PAYMENT_METHODS[0]);
  const [tenderAmount, setTenderAmount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  // In-terminal Shift Opening Modal state
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('500.00');
  const [posRegisters, setPosRegisters] = useState([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [openingShiftSubmitting, setOpeningShiftSubmitting] = useState(false);

  // Terminal vs History Tab Switch
  const [activeTab, setActiveTab] = useState('terminal');
  const [salesHistory, setSalesHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchPosData = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes, pmRes, shiftsRes, regsRes] = await Promise.all([
          api.getProducts({ per_page: 150 }).catch(() => ({ data: [] })),
          api.getCategories({ per_page: 50 }).catch(() => ({ data: [] })),
          api.getPaymentMethods({ per_page: 20 }).catch(() => ({ data: [] })),
          api.getCashierShifts({ status: 'open' }).catch(() => ({ data: [] })),
          api.getPosRegisters({ is_active: 1 }).catch(() => ({ data: [] })),
        ]);

        const prodList = prodRes?.data || [];
        setProducts(prodList);
        setCategories(catRes?.data || []);

        const regs = regsRes?.data || [];
        setPosRegisters(regs);
        if (regs.length > 0) {
          setSelectedRegisterId(String(regs[0].id));
        }

        const rawPms = Array.isArray(pmRes) ? pmRes : (pmRes?.data || []);
        const activePms = (rawPms.length > 0 ? rawPms : DEFAULT_PAYMENT_METHODS)
          .filter((m) => m.is_active !== false && !['bank_transfer', 'card'].includes(m.code?.toLowerCase()));
        setPaymentMethods(activePms);
        const defaultPm = activePms.find((m) => m.method_type === 'cash' || m.code?.toLowerCase() === 'cash') || activePms[0];
        setSelectedPaymentMethod(defaultPm);

        // Check if cashier has active open shift strictly for this logged-in user
        const openShifts = Array.isArray(shiftsRes) ? shiftsRes : (shiftsRes?.data || []);
        const myOpenShift = openShifts.find((s) => {
          if (s.status !== 'open') return false;
          const opId = typeof s.opened_by === 'object' ? s.opened_by?.id : (s.opened_by || s.openedBy?.id);
          return Number(opId) === Number(user?.id);
        });
        setActiveShift(myOpenShift || null);
      } catch (err) {
        showToast(err.message || 'Failed to load POS data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchPosData();
    fetchSalesHistory();
  }, [user?.id]);

  const fetchSalesHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.getSales({ per_page: 50 });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setSalesHistory(list);
    } catch (err) {
      console.warn('Failed to load sales history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewReceipt = async (sale) => {
    try {
      const fullRes = await api.getSale(sale.id);
      const s = fullRes?.sale || fullRes?.data || fullRes;
      const rawItems = (s.items && s.items.length > 0) ? s.items : (s.order?.items || []);

      const formattedItems = rawItems.map((it) => ({
        product: {
          id: it.id || it.product_variant_id || it.product_id,
          name: it.product_name_snapshot || it.product_variant?.product?.name || it.product?.name || 'Electronic Item',
          sku: it.sku_snapshot || it.product_variant?.sku || it.sku || '-',
          selling_price: Number(it.unit_price || 0),
        },
        quantity: Number(it.quantity || 1),
      }));

      const grandTotalNum = Number(s.grand_total || s.total_amount || 0);
      const subtotalNum = Number(s.subtotal || grandTotalNum);
      const discountNum = Number(s.discount_amount || 0);
      const taxNum = Number(s.tax_amount || (subtotalNum * 0.15));

      setCompletedSale({
        ...s,
        sale_number: s.sale_number || `SALE-${s.id}`,
        cartItems: formattedItems,
        subtotal: subtotalNum,
        discountAmount: discountNum,
        taxAmount: taxNum,
        grandTotal: grandTotalNum,
        tendered: grandTotalNum,
        changeDue: 0,
        paymentMethodName: s.cashier_shift_id ? 'Cash Drawer (POS)' : 'Counter Tender',
        cashierName: s.cashier?.name || user?.name || 'Authorized Cashier',
        timestamp: s.issued_at ? new Date(s.issued_at).toLocaleString() : (s.created_at ? new Date(s.created_at).toLocaleString() : new Date().toLocaleString()),
      });
      setIsReceiptOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to load receipt details', 'error');
    }
  };

  // In-terminal Shift Opening Handler
  const handleQuickOpenShift = async (e) => {
    e.preventDefault();
    const regId = selectedRegisterId || (posRegisters[0]?.id) || 1;
    const cleanedStr = String(openingFloat || '').replace(/,/g, '').replace(/[oO]/g, '0');
    const floatNum = parseFloat(cleanedStr) || 0;

    try {
      setOpeningShiftSubmitting(true);
      const res = await api.createCashierShift({
        pos_register_id: regId,
        opening_cash: floatNum,
        opening_float: floatNum,
        notes: shiftNotes || 'Opened via POS Terminal Quick Launch',
      });
      const created = res?.cashier_shift || res?.data || res;
      setActiveShift(created);
      setIsOpenShiftModalOpen(false);
      showToast(`Shift #${created.id || ''} successfully opened! Float: ETB ${floatNum.toFixed(2)}`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to open cashier shift', 'error');
    } finally {
      setOpeningShiftSubmitting(false);
    }
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        selectedCategory === 'all' ||
        String(p.category_id) === String(selectedCategory);

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Filtered sales history for cashier
  const filteredSalesHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return salesHistory;
    const q = historySearchQuery.toLowerCase();
    return salesHistory.filter((s) => {
      const num = (s.sale_number || '').toLowerCase();
      const cust = (s.customer?.name || '').toLowerCase();
      const date = (s.issued_at || s.created_at || '').toLowerCase();
      return num.includes(q) || cust.includes(q) || date.includes(q);
    });
  }, [salesHistory, historySearchQuery]);

  // Cart operations
  const addToCart = (product) => {
    if (product.quantity <= 0) {
      showToast(`${product.name} is out of stock!`, 'warning');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          showToast(`Cannot add more than available stock (${product.quantity})`, 'warning');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  const updateCartQuantity = (productId, newQty) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > product.quantity) {
      showToast(`Only ${product.quantity} units available in stock`, 'warning');
      newQty = product.quantity;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.product.selling_price) * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.15; // 15% VAT
  const taxAmount = taxableAmount * taxRate;
  const grandTotal = taxableAmount + taxAmount;

  // Tender change calculation
  const changeDue = useMemo(() => {
    const tendered = parseFloat(tenderAmount) || 0;
    return Math.max(0, tendered - grandTotal);
  }, [tenderAmount, grandTotal]);

  // Handle Checkout submission
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!selectedPaymentMethod) {
      showToast('Please select a payment method', 'warning');
      return;
    }

    const isCash = selectedPaymentMethod.method_type === 'cash' || selectedPaymentMethod.code?.toLowerCase() === 'cash';
    const tendered = parseFloat(tenderAmount) || 0;
    if (isCash && tendered < grandTotal) {
      showToast(`Tendered amount is less than total (ETB ${grandTotal.toFixed(2)})`, 'warning');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Process Sale Checkout via POST /api/sales
      const salePayload = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      };

      const saleRes = await api.createSale(salePayload);
      const createdSale = saleRes?.sale || saleRes?.data || saleRes;

      // 2. Process Tender Payment record via POST /api/payments
      if (selectedPaymentMethod) {
        await api.createPayment({
          payment_method_id: selectedPaymentMethod.id,
          amount: grandTotal,
          currency: 'ETB',
          cashier_shift_id: activeShift?.id || null,
          transaction_reference: transactionRef || (isCash ? `CASH-DRAWER-${Date.now()}` : null),
          notes: paymentNotes || `POS Terminal Checkout by ${user?.name || 'Cashier'}`,
        }).catch((err) => {
          console.warn('Payment ledger logging notice:', err);
        });
      }

      // Update remaining local inventory balances
      setProducts((prev) =>
        prev.map((p) => {
          const cartItem = cart.find((c) => c.product.id === p.id);
          if (cartItem) {
            return { ...p, quantity: Math.max(0, p.quantity - cartItem.quantity) };
          }
          return p;
        })
      );

      // Save completed sale details for receipt modal
      setCompletedSale({
        ...createdSale,
        cartItems: [...cart],
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        tendered: isCash ? tendered : grandTotal,
        changeDue: isCash ? changeDue : 0,
        paymentMethodName: selectedPaymentMethod.name,
        cashierName: user?.name || 'Authorized Staff',
        timestamp: new Date().toLocaleString(),
      });

      // Reset cart and checkout modal
      setCart([]);
      setIsCheckoutOpen(false);
      setTenderAmount('');
      setTransactionRef('');
      setPaymentNotes('');

      // Open receipt modal
      setIsReceiptOpen(true);
      showToast('Transaction completed successfully!', 'success');
      fetchSalesHistory();
    } catch (err) {
      showToast(err.message || 'Checkout failed to process', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header & Shift Banner */}
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
            <Icon name="cart" size={24} color="var(--brand-blue)" />
            Point of Sale Terminal
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            High-speed barcode, SKU catalog search, and multi-tender counter checkout
          </p>
        </div>

        {/* Shift status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activeShift ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                background: 'rgba(0, 176, 116, 0.1)',
                border: '1px solid rgba(0, 176, 116, 0.25)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--success)' }}>
                Shift Active #{activeShift.id} (Float: ETB {Number(activeShift.opening_float || 0).toFixed(2)})
              </span>
              <Link
                to="/shifts"
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--brand-blue)',
                  marginLeft: 6,
                  textDecoration: 'none',
                }}
              >
                Manage Shift &rarr;
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                background: 'rgba(255, 159, 67, 0.12)',
                border: '1px solid rgba(255, 159, 67, 0.3)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <Icon name="alert" size={15} color="var(--warning)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--warning)' }}>
                No Active Shift Opened
              </span>
              <button
                type="button"
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="btn btn-primary"
                style={{ padding: '4px 12px', fontSize: '0.76rem', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
              >
                Open Drawer Float
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation: Terminal Catalog vs Cashier Sales History */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
        <button
          type="button"
          onClick={() => setActiveTab('terminal')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeTab === 'terminal' ? 'var(--brand-blue)' : 'var(--bg-surface)',
            color: activeTab === 'terminal' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab === 'terminal' ? '0 2px 6px rgba(22, 119, 255, 0.3)' : 'none',
            transition: 'all 150ms ease',
          }}
        >
          <Icon name="cart" size={16} />
          Terminal Register & Catalog
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            fetchSalesHistory();
          }}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeTab === 'history' ? 'var(--brand-blue)' : 'var(--bg-surface)',
            color: activeTab === 'history' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab === 'history' ? '0 2px 6px rgba(22, 119, 255, 0.3)' : 'none',
            transition: 'all 150ms ease',
          }}
        >
          <Icon name="fileText" size={16} />
          My Sales History
          <span
            style={{
              fontSize: '0.74rem',
              background: activeTab === 'history' ? 'rgba(255,255,255,0.25)' : 'var(--bg-app)',
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 800,
            }}
          >
            {salesHistory.length}
          </span>
        </button>
      </div>

      {/* Main Terminal Workspace Layout */}
      {activeTab === 'terminal' && (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Product Search, Category Tabs & Catalog Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Search bar & Filters */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: 'var(--bg-surface)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                  display: 'flex',
                }}
              >
                <Icon name="search" size={18} />
              </div>
              <input
                type="text"
                placeholder="Scan barcode, SKU, or search electronic product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-app)',
                  fontSize: '0.92rem',
                  outline: 'none',
                  color: 'var(--text-main)',
                  transition: 'border-color 150ms ease',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                  }}
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'none',
              }}
            >
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedCategory === 'all' ? '1px solid var(--brand-blue)' : '1px solid var(--border-subtle)',
                  background: selectedCategory === 'all' ? 'var(--brand-blue)' : 'var(--bg-surface)',
                  color: selectedCategory === 'all' ? '#ffffff' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  transition: 'all 150ms ease',
                }}
              >
                All Products ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: selectedCategory === cat.id ? '1px solid var(--brand-blue)' : '1px solid var(--border-subtle)',
                    background: selectedCategory === cat.id ? 'var(--brand-blue)' : 'var(--bg-surface)',
                    color: selectedCategory === cat.id ? '#ffffff' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    transition: 'all 150ms ease',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Icon name="refresh" size={28} color="var(--brand-blue)" />
              <span style={{ marginLeft: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Loading product catalog...
              </span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Icon name="package" size={40} color="var(--text-dim)" />
              <h3 style={{ margin: '12px 0 6px', fontWeight: 700 }}>No products found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Try adjusting your search query or category filter.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 14,
              }}
            >
              {filteredProducts.map((product) => {
                const isOutOfStock = product.quantity <= 0;
                const isLowStock = product.quantity > 0 && product.quantity <= (product.minimum_stock || 5);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.6 : 1,
                      transition: 'all 150ms ease',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isOutOfStock) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        e.currentTarget.style.borderColor = 'var(--brand-blue)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isOutOfStock) {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      }
                    }}
                  >
                    <div>
                      {/* Top SKU & Stock badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: 'var(--text-dim)',
                            background: 'var(--bg-app)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {product.sku}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isOutOfStock
                              ? 'rgba(239, 68, 68, 0.1)'
                              : isLowStock
                              ? 'rgba(255, 159, 67, 0.15)'
                              : 'rgba(0, 176, 116, 0.1)',
                            color: isOutOfStock
                              ? 'var(--danger)'
                              : isLowStock
                              ? 'var(--warning)'
                              : 'var(--success)',
                          }}
                        >
                          {isOutOfStock ? 'Out of Stock' : `${product.quantity} in stock`}
                        </span>
                      </div>

                      {/* Product Image Thumbnail */}
                      {product.image_url && (
                        <div
                          style={{
                            width: '100%',
                            height: 90,
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: 10,
                            background: 'rgba(0,0,0,0.04)',
                          }}
                        >
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}

                      {/* Product Name */}
                      <h4
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          margin: '0 0 6px',
                          color: 'var(--text-main)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.3',
                        }}
                      >
                        {product.name}
                      </h4>

                      {/* Category Title */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        {product.category?.name || 'Electronics'}
                      </div>
                    </div>

                    {/* Price & Add button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-blue)' }}>
                        ETB {Number(product.selling_price || 0).toFixed(2)}
                      </div>
                      <button
                        disabled={isOutOfStock}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: isOutOfStock ? 'var(--border-subtle)' : 'var(--brand-blue)',
                          color: '#ffffff',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          transition: 'background 150ms ease',
                        }}
                      >
                        <Icon name="plus" size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Shopping Cart & Live Totals */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 120px)',
            position: 'sticky',
            top: 20,
          }}
        >
          {/* Cart Header */}
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="cart" size={18} color="var(--brand-blue)" />
              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>Active Order</span>
              <span
                style={{
                  background: 'var(--brand-blue-light)',
                  color: 'var(--brand-blue)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {cart.reduce((a, b) => a + b.quantity, 0)} items
              </span>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                <Icon name="cart" size={36} color="var(--text-dim)" />
                <p style={{ marginTop: 10, fontSize: '0.88rem', fontWeight: 600 }}>Cart is currently empty</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
                  Click products on the left or scan items to add.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'var(--text-main)',
                      }}
                    >
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      ETB {Number(item.product.selling_price).toFixed(2)} each
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-dim)',
                        padding: 2,
                        marginLeft: 4,
                      }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Calculations & Checkout Footer */}
          {cart.length > 0 && (
            <div
              style={{
                padding: '16px 18px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Discount Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Discount</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 5, 10].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDiscountPercent(d)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        borderRadius: 4,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: discountPercent === d ? '1px solid var(--brand-blue)' : '1px solid var(--border-subtle)',
                        background: discountPercent === d ? 'var(--brand-blue-light)' : 'var(--bg-app)',
                        color: discountPercent === d ? 'var(--brand-blue)' : 'var(--text-muted)',
                      }}
                    >
                      {d}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtotal & Tax Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Subtotal</span>
                  <span>ETB {subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                    <span>Discount ({discountPercent}%)</span>
                    <span>- ETB {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>VAT (15%)</span>
                  <span>ETB {taxAmount.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: 'var(--text-main)',
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-subtle)',
                  }}
                >
                  <span>Grand Total</span>
                  <span style={{ color: 'var(--brand-blue)' }}>ETB {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  if (!selectedPaymentMethod && paymentMethods.length > 0) {
                    const defaultPm = paymentMethods.find((m) => m.method_type === 'cash' || m.code?.toLowerCase() === 'cash') || paymentMethods[0];
                    setSelectedPaymentMethod(defaultPm);
                  }
                  setTenderAmount(grandTotal.toFixed(2));
                  setIsCheckoutOpen(true);
                }}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '0.96rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 10,
                }}
              >
                <Icon name="check" size={18} />
                Pay ETB {grandTotal.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* TAB 2: Cashier Sales History */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Cashier Shift & Summary KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cashier Identity</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 4, color: 'var(--text-main)' }}>
                {user?.name || 'Cashier'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>{user?.email}</div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Register Session</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 4, color: activeShift ? 'var(--success)' : 'var(--warning)' }}>
                {activeShift ? (activeShift.pos_register?.name || activeShift.posRegister?.name || `Shift #${activeShift.id}`) : 'No Active Shift'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                {activeShift ? `Float: ETB ${Number(activeShift.opening_float || 0).toFixed(2)}` : 'Shift closed'}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Counter Sales</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 4, color: 'var(--brand-blue)' }}>
                {salesHistory.length} orders
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>This session & cashier</div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Revenue Processed</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 4, color: 'var(--success)' }}>
                ETB {salesHistory.reduce((acc, s) => acc + Number(s.grand_total || s.total_amount || 0), 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>Gross receipts collected</div>
            </div>
          </div>

          {/* Sales History Table Container */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            {/* Top Table Controls */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Cashier Transactions Log</h3>
                <span
                  style={{
                    background: 'var(--bg-app)',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  {filteredSalesHistory.length} records
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', minWidth: 260 }}>
                  <input
                    type="text"
                    placeholder="Search by sale #, customer..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-app)',
                      fontSize: '0.82rem',
                    }}
                  />
                  <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                    <Icon name="search" size={14} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchSalesHistory}
                  disabled={loadingHistory}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '8px 12px' }}
                >
                  <Icon name="refresh" size={14} />
                  {loadingHistory ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 700 }}>Sale Number</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Date & Time</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Customer</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Shift / Terminal</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Total (ETB)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 20px', fontWeight: 700, textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        Loading cashier transactions...
                      </td>
                    </tr>
                  ) : filteredSalesHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '50px 20px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 10 }}>
                          No sales found for this cashier session.
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('terminal')}
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '6px 16px' }}
                        >
                          Go to Terminal & Ring Sale
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredSalesHistory.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--brand-blue)' }}>
                          {s.sale_number || `SALE-${s.id}`}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                          {s.issued_at ? new Date(s.issued_at).toLocaleString() : (s.created_at ? new Date(s.created_at).toLocaleString() : '-')}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 600 }}>{s.customer?.name || 'Walk-in Customer'}</span>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {s.cashier_shift_id ? `Shift #${s.cashier_shift_id}` : (s.pos_register?.name || 'Counter')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800 }}>
                          ETB {Number(s.grand_total || s.total_amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(0, 176, 116, 0.1)',
                              color: 'var(--success)',
                              border: '1px solid rgba(0, 176, 116, 0.25)',
                            }}
                          >
                            {s.payment_status || s.status || 'PAID'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(s)}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.76rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontWeight: 700,
                            }}
                          >
                            <Icon name="receipt" size={14} />
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Payment & Checkout Tender Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Complete POS Sale Checkout"
        maxWidth={580}
      >
        <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Total Due Banner */}
          <div
            style={{
              background: 'var(--brand-blue-light)',
              padding: '16px',
              borderRadius: 10,
              textAlign: 'center',
              border: '1px solid rgba(22, 119, 255, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--brand-blue)', fontWeight: 600, textTransform: 'uppercase' }}>
              Amount Due
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-blue)' }}>
              ETB {grandTotal.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Includes 15% VAT (ETB {taxAmount.toFixed(2)}) across {cart.reduce((a, b) => a + b.quantity, 0)} items
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Select Payment Tender
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Active: <strong style={{ color: 'var(--brand-blue)' }}>{selectedPaymentMethod?.name || 'Cash'}</strong>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              {paymentMethods.map((pm) => {
                const isSelected = (selectedPaymentMethod?.id === pm.id) || (!selectedPaymentMethod && pm.method_type === 'cash');
                const isCash = pm.method_type === 'cash' || pm.code?.toLowerCase() === 'cash';
                const isMobile = pm.method_type === 'mobile_money' || pm.code?.toLowerCase().includes('birr');
                const isCard = pm.method_type === 'card' || pm.code?.toLowerCase() === 'card';

                return (
                  <button
                    type="button"
                    key={pm.id}
                    onClick={() => setSelectedPaymentMethod(pm)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 10,
                      border: isSelected
                        ? '2px solid var(--brand-blue)'
                        : '1px solid var(--border-subtle)',
                      background: isSelected
                        ? 'var(--brand-blue-light)'
                        : 'var(--bg-app)',
                      color: isSelected ? 'var(--brand-blue)' : 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: isSelected ? '0 2px 8px rgba(22, 119, 255, 0.2)' : 'none',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Icon
                      name={isCash ? 'dollarSign' : isMobile ? 'phone' : isCard ? 'creditCard' : 'check'}
                      size={20}
                      color={isSelected ? 'var(--brand-blue)' : 'var(--text-muted)'}
                    />
                    <span>{pm.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Tender Options depending on Method */}
          {(!selectedPaymentMethod || selectedPaymentMethod?.method_type === 'cash' || selectedPaymentMethod?.code?.toLowerCase() === 'cash') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                  Cash Tendered (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={grandTotal}
                  required
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(e.target.value)}
                  placeholder={`Min ETB ${grandTotal.toFixed(2)}`}
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

              {/* Quick Cash Suggestions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[grandTotal, Math.ceil(grandTotal / 50) * 50, Math.ceil(grandTotal / 100) * 100, Math.ceil(grandTotal / 500) * 500].map((val, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setTenderAmount(val.toFixed(2))}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-app)',
                      cursor: 'pointer',
                    }}
                  >
                    ETB {val.toFixed(0)}
                  </button>
                ))}
              </div>

              {/* Change Due Display */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'rgba(0, 176, 116, 0.1)',
                  border: '1px solid rgba(0, 176, 116, 0.25)',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)' }}>Change Due</span>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--success)' }}>
                  ETB {changeDue.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    {selectedPaymentMethod?.name} Reference (Sandbox / Slip)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const isCbe = selectedPaymentMethod?.code?.toUpperCase().includes('CBE');
                      const prefix = isCbe ? 'CBE-POS' : 'TLB-POS';
                      setTransactionRef(`${prefix}-${Math.floor(100000 + Math.random() * 900000)}`);
                    }}
                    style={{
                      background: 'rgba(22, 119, 255, 0.1)',
                      border: '1px solid #1677ff',
                      color: '#1677ff',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Auto-Fill Sandbox Ref
                  </button>
                </div>
                <input
                  type="text"
                  required={selectedPaymentMethod?.requires_reference}
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. TLB-POS-984210 or CBE-POS-448102"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>
          )}

          {/* Optional notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              Transaction Memo / Notes (Optional)
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. Counter sales receipt, customer TIN, etc."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
            >
              {isSubmitting ? (
                <>
                  <Icon name="refresh" size={16} />
                  Processing...
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  Confirm & Print Receipt
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Printable Receipt Modal */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Transaction Receipt"
        maxWidth={460}
      >
        {completedSale && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Printable Receipt Canvas */}
            <div
              id="printable-pos-receipt"
              style={{
                background: '#ffffff',
                color: '#0f172a',
                padding: '24px 20px',
                borderRadius: 8,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.8rem',
                border: '1px solid #cbd5e1',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>STOCKWISE ELECTRONICS</h2>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                  Bole Medhanialem Mall, Addis Ababa, Ethiopia
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  TIN: 0092184910 | Tel: +251 911 223344
                </div>
                <div style={{ marginTop: 8, fontSize: '0.74rem', fontWeight: 700 }}>
                  RECEIPT #{completedSale.sale_number || completedSale.id}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {completedSale.timestamp}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Cashier: {completedSale.cashierName}
                </div>
              </div>

              {/* Items List */}
              <div style={{ padding: '12px 0', borderBottom: '1px dashed #94a3b8' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ paddingBottom: 4 }}>Item</th>
                      <th style={{ paddingBottom: 4, textAlign: 'center' }}>Qty</th>
                      <th style={{ paddingBottom: 4, textAlign: 'right' }}>Price</th>
                      <th style={{ paddingBottom: 4, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedSale.cartItems?.map((item) => (
                      <tr key={item.product.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '6px 0', maxWidth: 160 }}>
                          <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                          <div style={{ fontSize: '0.66rem', color: '#64748b' }}>{item.product.sku}</div>
                        </td>
                        <td style={{ padding: '6px 0', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '6px 0', textAlign: 'right' }}>
                          {Number(item.product.selling_price).toFixed(2)}
                        </td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>
                          {(Number(item.product.selling_price) * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Breakdown */}
              <div style={{ padding: '10px 0', borderBottom: '1px dashed #94a3b8', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>Subtotal:</span>
                  <span>ETB {completedSale.subtotal.toFixed(2)}</span>
                </div>
                {completedSale.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, color: '#dc2626' }}>
                    <span>Discount:</span>
                    <span>- ETB {completedSale.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>VAT (15%):</span>
                  <span>ETB {completedSale.taxAmount.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px solid #cbd5e1',
                  }}
                >
                  <span>GRAND TOTAL:</span>
                  <span>ETB {completedSale.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div style={{ padding: '10px 0', borderBottom: '1px dashed #94a3b8', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>Payment Tender:</span>
                  <span style={{ fontWeight: 600 }}>{completedSale.paymentMethodName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>Amount Tendered:</span>
                  <span>ETB {completedSale.tendered.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Change Given:</span>
                  <span style={{ fontWeight: 700 }}>ETB {completedSale.changeDue.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', paddingTop: 12, fontSize: '0.68rem', color: '#64748b' }}>
                <div>Thank you for your purchase!</div>
                <div>Goods returnable within 7 days with valid receipt</div>
                <div style={{ marginTop: 6, letterSpacing: '0.15em' }}>*** POWERED BY STOCKWISE ***</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <Link
                to="/sales"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}
              >
                <Icon name="fileText" size={16} />
                View in Sales Ledger
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
              >
                <Icon name="receipt" size={16} />
                Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: In-Terminal Quick Open Shift Drawer Modal */}
      <Modal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        title="Open POS Register Drawer"
        maxWidth={480}
      >
        <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); handleQuickOpenShift(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: 'var(--brand-blue-light)',
              padding: '14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              color: 'var(--brand-blue)',
              border: '1px solid rgba(22, 119, 255, 0.2)',
            }}
          >
            Assign this register terminal to your session and initialize your opening cash drawer balance to start processing sales.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Select Physical Register Terminal *
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
                color: 'var(--text-main)',
                fontSize: '0.9rem',
              }}
            >
              {posRegisters.length === 0 ? (
                <option value="">No active registers configured</option>
              ) : (
                posRegisters.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name || reg.code || `Register #${reg.id}`} - {reg.location || 'Store Counter'}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
              Opening Cash Float (ETB) *
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value.replace(/[oO]/g, '0'))}
              placeholder="2000.00"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {[0, 500, 1000, 2000].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setOpeningFloat(amt.toFixed(2))}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.74rem',
                    borderRadius: 4,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-app)',
                    cursor: 'pointer',
                  }}
                >
                  ETB {amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              Opening Notes (Optional)
            </label>
            <input
              type="text"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="e.g. Morning counter shift, float counted & verified"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setIsOpenShiftModalOpen(false)}
              className="btn btn-secondary"
              disabled={openingShiftSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleQuickOpenShift(e)}
              className="btn btn-primary"
              disabled={openingShiftSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
            >
              {openingShiftSubmitting ? (
                <>
                  <Icon name="refresh" size={16} />
                  Opening Drawer...
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  Open Shift Drawer
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Pos;
