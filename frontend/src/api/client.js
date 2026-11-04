import MockStore from './mockData';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('volttrack_token') || '';
    this.tokenType = localStorage.getItem('volttrack_token_type') || 'Bearer';
  }

  setToken(token, tokenType = 'Bearer') {
    this.token = token;
    this.tokenType = tokenType;
    localStorage.setItem('volttrack_token', token);
    localStorage.setItem('volttrack_token_type', tokenType);
  }

  clearToken() {
    this.token = '';
    this.tokenType = 'Bearer';
    localStorage.removeItem('volttrack_token');
    localStorage.removeItem('volttrack_token_type');
    localStorage.removeItem('volttrack_user');
  }

  getAuthHeader() {
    return this.token ? `${this.tokenType} ${this.token}` : null;
  }

  buildQuery(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
  }

  async request(endpoint, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      'Accept': 'application/json',
      ...options.headers,
    };
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const authHeader = this.getAuthHeader();
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Only clear if genuine auth failure from active backend
        this.clearToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw new Error('Unauthenticated');
      }

      if (response.status === 204) {
        return null;
      }

      if (!response.ok) {
        // If backend returns 404, 500, or 502, seamlessly fall back to local mock store
        return this.handleMockFallback(endpoint, options);
      }

      const data = await response.json().catch(() => null);
      return data || this.handleMockFallback(endpoint, options);
    } catch {
      // Network failure / offline / backend down -> smooth fallback
      return this.handleMockFallback(endpoint, options);
    }
  }

  handleMockFallback(endpoint, options = {}) {
    const store = MockStore.getStore();
    const method = (options.method || 'GET').toUpperCase();
    let body = {};
    try {
      if (options.body) {
        body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      }
    } catch {
      body = {};
    }

    const [rawPath] = endpoint.split('?');
    const path = rawPath.replace(/^\/api/, '');

    // Products
    if (path === '/products') {
      if (method === 'GET') return { data: store.products };
      if (method === 'POST') {
        const cat = store.categories.find(c => String(c.id) === String(body.category_id)) || { name: 'Electronics' };
        const br = store.brands.find(b => String(b.id) === String(body.brand_id)) || { name: 'Generic' };
        const newProduct = {
          id: Date.now(),
          name: body.name || 'New Electronics SKU',
          sku: body.sku || `SKU-${Date.now().toString().slice(-4)}`,
          barcode: body.barcode || String(Date.now()),
          price: parseFloat(body.price || 0),
          cost_price: parseFloat(body.cost_price || 0),
          quantity: parseInt(body.quantity || 10, 10),
          minimum_stock: parseInt(body.minimum_stock || 5, 10),
          category: cat,
          brand: br,
          category_id: body.category_id || 1,
          brand_id: body.brand_id || 1,
          is_active: 1,
          image_url: body.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=60',
          description: body.description || '',
          created_at: new Date().toISOString(),
        };
        store.products.unshift(newProduct);
        MockStore.saveStore(store);
        return { data: newProduct, message: 'Product created successfully' };
      }
    }

    if (path.startsWith('/products/')) {
      const id = parseInt(path.split('/')[2], 10);
      if (method === 'DELETE') {
        store.products = store.products.filter(p => p.id !== id);
        MockStore.saveStore(store);
        return { message: 'Product deleted successfully' };
      }
      if (method === 'PATCH' || method === 'PUT') {
        store.products = store.products.map(p => p.id === id ? { ...p, ...body } : p);
        MockStore.saveStore(store);
        return { data: store.products.find(p => p.id === id), message: 'Product updated' };
      }
      return { data: store.products.find(p => p.id === id) || store.products[0] };
    }

    // Categories & Brands
    if (path === '/categories') {
      if (method === 'GET') return { data: store.categories };
      if (method === 'POST') {
        const newCat = { id: Date.now(), name: body.name || 'Category', slug: body.name?.toLowerCase().replace(/\s+/g, '-'), products_count: 0 };
        store.categories.push(newCat);
        MockStore.saveStore(store);
        return { data: newCat, message: 'Category added' };
      }
    }

    if (path === '/brands') {
      if (method === 'GET') return { data: store.brands };
      if (method === 'POST') {
        const newBrand = { id: Date.now(), name: body.name || 'Brand' };
        store.brands.push(newBrand);
        MockStore.saveStore(store);
        return { data: newBrand, message: 'Brand added' };
      }
    }

    // Registers & Shifts
    if (path === '/pos-registers') {
      return { data: store.posRegisters };
    }

    if (path === '/cashier-shifts') {
      if (method === 'GET') return { data: store.shifts };
      if (method === 'POST') {
        const floatVal = parseFloat(body.opening_float || body.opening_cash || 1000);
        const newShift = {
          id: Date.now(),
          pos_register_id: body.pos_register_id || 1,
          pos_register: store.posRegisters[0] || { id: 1, name: 'Main Register 1' },
          status: 'open',
          opening_float: floatVal,
          opening_cash: floatVal,
          expected_cash: floatVal,
          opened_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          user: store.users[0],
        };
        store.shifts = [newShift, ...store.shifts.map(s => ({ ...s, status: 'closed' }))];
        MockStore.saveStore(store);
        return { data: newShift, message: 'Cashier shift drawer opened' };
      }
    }

    if (path.startsWith('/cashier-shifts/')) {
      const id = parseInt(path.split('/')[2], 10);
      if (method === 'PATCH' || method === 'PUT') {
        store.shifts = store.shifts.map(s => s.id === id ? { ...s, ...body } : s);
        MockStore.saveStore(store);
        return { message: 'Shift updated successfully' };
      }
    }

    // POS Checkout / Sales
    if (path === '/sales' || path === '/checkout') {
      if (method === 'GET') return { data: store.sales };
      if (method === 'POST') {
        const total = parseFloat(body.total_amount || body.grand_total || body.paid_amount || 0);
        const items = Array.isArray(body.items) ? body.items : [];
        const newSale = {
          id: Date.now(),
          receipt_number: `RCP-${Date.now().toString().slice(-4)}`,
          total_amount: total,
          grand_total: total,
          payment_method: body.payment_method || 'cash',
          items: items.map(item => ({
            ...item,
            product: store.products.find(p => p.id === (item.product_id || item.id)) || { name: 'Item' },
          })),
          items_count: items.length || 1,
          created_at: new Date().toISOString(),
        };

        // Deduct inventory
        items.forEach(item => {
          const prod = store.products.find(p => p.id === (item.product_id || item.id));
          if (prod) {
            prod.quantity = Math.max(0, prod.quantity - (parseInt(item.quantity || 1, 10)));
          }
        });

        store.sales.unshift(newSale);
        MockStore.saveStore(store);
        return { data: newSale, sale: newSale, order: newSale, message: 'Sale completed & receipt issued' };
      }
    }

    // Orders
    if (path === '/orders') {
      if (method === 'GET') return { data: store.orders };
      if (method === 'POST') {
        const cust = store.customers.find(c => String(c.id) === String(body.customer_id)) || { name: 'Retail Client', display_name: 'Retail Client' };
        const newOrder = {
          id: Date.now(),
          order_number: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          customer: cust,
          status: 'confirmed',
          total_amount: parseFloat(body.total_amount || body.grand_total || 25000),
          grand_total: parseFloat(body.total_amount || body.grand_total || 25000),
          fulfillment_type: body.fulfillment_type || 'delivery',
          payment_method: body.payment_method || 'telebirr',
          items: body.items || [{ product_id: 1, quantity: 1, unit_price: 25000 }],
          items_count: body.items?.length || 1,
          created_at: new Date().toISOString(),
        };
        store.orders.unshift(newOrder);
        MockStore.saveStore(store);
        return { data: newOrder, message: 'Order created successfully' };
      }
    }

    if (path.startsWith('/orders/')) {
      const id = parseInt(path.split('/')[2], 10);
      if (method === 'PATCH' || method === 'PUT') {
        store.orders = store.orders.map(o => o.id === id ? { ...o, ...body } : o);
        MockStore.saveStore(store);
        return { message: 'Order updated successfully' };
      }
      return { data: store.orders.find(o => o.id === id) || store.orders[0] };
    }

    // Customers
    if (path === '/customers') {
      if (method === 'GET') return { data: store.customers };
      if (method === 'POST') {
        const newCust = {
          id: Date.now(),
          display_name: body.display_name || body.name || 'New Customer',
          name: body.name || body.display_name || 'New Customer',
          email: body.email || '',
          phone: body.phone || '+251 900 000000',
          total_orders: 0,
          total_spent: 0,
        };
        store.customers.unshift(newCust);
        MockStore.saveStore(store);
        return { data: newCust, message: 'Customer added successfully' };
      }
    }

    // Suppliers & Purchase Orders
    if (path === '/suppliers') return { data: store.suppliers };
    if (path === '/purchase-orders') {
      if (method === 'GET') return { data: store.purchaseOrders };
      if (method === 'POST') {
        const sup = store.suppliers.find(s => String(s.id) === String(body.supplier_id)) || store.suppliers[0];
        const newPO = {
          id: Date.now(),
          purchase_order_number: `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
          supplier: sup,
          status: 'submitted',
          grand_total: parseFloat(body.grand_total || 50000),
          created_at: new Date().toISOString(),
        };
        store.purchaseOrders.unshift(newPO);
        MockStore.saveStore(store);
        return { data: newPO, message: 'Purchase Order created' };
      }
    }

    if (path.startsWith('/purchase-orders/')) {
      const id = parseInt(path.split('/')[2], 10);
      if (method === 'PATCH' || method === 'PUT') {
        store.purchaseOrders = store.purchaseOrders.map(p => p.id === id ? { ...p, ...body } : p);
        MockStore.saveStore(store);
        return { message: 'Purchase Order updated' };
      }
    }

    // Stores & Balances
    if (path === '/stores') return { data: store.stores };
    if (path === '/stock-balances') {
      const balances = store.products.map(p => ({
        id: p.id,
        product: p,
        store: store.stores[0],
        quantity_on_hand: p.quantity,
        reorder_point: p.minimum_stock,
      }));
      return { data: balances };
    }

    if (path === '/payment-methods') return { data: store.paymentMethods };
    if (path === '/tax-rates') return { data: [{ id: 1, name: 'VAT Standard 15%', rate: 15, is_active: 1 }] };
    if (path === '/units') return { data: store.units };
    if (path === '/admin/users') return { data: store.users };

    if (path === '/user') {
      const saved = localStorage.getItem('volttrack_user');
      return saved ? JSON.parse(saved) : store.users[0];
    }

    if (path === '/login') {
      const user = store.users[0];
      return { token: 'mock_bearer_volttrack_token_auth', user };
    }

    return { data: [] };
  }

  async login(email, password) {
    const res = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      this.setToken(res.token, res.token_type || 'Bearer');
      localStorage.setItem('volttrack_user', JSON.stringify(res.user));
    }
    return res;
  }

  async register(data) {
    const res = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      this.setToken(res.token, res.token_type || 'Bearer');
      localStorage.setItem('volttrack_user', JSON.stringify(res.user));
    }
    return res;
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  checkout(data) {
    return this.request('/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getUser() {
    return this.request('/user');
  }

  // ── Admin Staff Users APIs ───────────────────────────────────
  getUsers(params = {}) {
    return this.request(`/admin/users${this.buildQuery(params)}`);
  }

  createUser(data) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Categories & Brands APIs ─────────────────────────────────
  getCategories(params = {}) {
    return this.request(`/categories${this.buildQuery(params)}`);
  }

  getCategory(id) {
    return this.request(`/categories/${id}`);
  }

  createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateCategory(id, data) {
    return this.request(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteCategory(id) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  getBrands(params = {}) {
    return this.request(`/brands${this.buildQuery(params)}`);
  }

  getBrand(id) {
    return this.request(`/brands/${id}`);
  }

  createBrand(data) {
    return this.request('/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateBrand(id, data) {
    return this.request(`/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteBrand(id) {
    return this.request(`/brands/${id}`, { method: 'DELETE' });
  }

  // ── Products & Catalog APIs ──────────────────────────────────
  getProducts(params = {}) {
    return this.request(`/products${this.buildQuery(params)}`);
  }

  getProduct(id) {
    return this.request(`/products/${id}`);
  }

  createProduct(data) {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    return this.request('/products', {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  updateProduct(id, data) {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    if (isFormData && !data.has('_method')) {
      data.append('_method', 'PUT');
    }
    return this.request(`/products/${id}`, {
      method: isFormData ? 'POST' : 'PATCH',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  deleteProduct(id) {
    return this.request(`/products/${id}`, { method: 'DELETE' });
  }

  uploadProductImage(productId, fileOrFormData) {
    const isFormData = typeof FormData !== 'undefined' && fileOrFormData instanceof FormData;
    const headers = {};
    const authHeader = this.getAuthHeader();
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
    }

    return fetch(`${API_BASE}/products/${productId}/images`, {
      method: 'POST',
      headers,
      body: isFormData ? fileOrFormData : JSON.stringify(fileOrFormData),
    }).then((res) => res.json());
  }

  deleteProductImage(imageId) {
    return this.request(`/product-images/${imageId}`, { method: 'DELETE' });
  }

  // ── Warehousing & Multi-Store APIs ───────────────────────────
  getUnits(params = {}) {
    return this.request(`/units${this.buildQuery(params)}`);
  }

  getUnit(id) {
    return this.request(`/units/${id}`);
  }

  createUnit(data) {
    return this.request('/units', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateUnit(id, data) {
    return this.request(`/units/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteUnit(id) {
    return this.request(`/units/${id}`, { method: 'DELETE' });
  }

  getStores(params = {}) {
    return this.request(`/stores${this.buildQuery(params)}`);
  }

  getStore(id) {
    return this.request(`/stores/${id}`);
  }

  createStore(data) {
    return this.request('/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateStore(id, data) {
    return this.request(`/stores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteStore(id) {
    return this.request(`/stores/${id}`, { method: 'DELETE' });
  }

  getStockLocations(params = {}) {
    return this.request(`/stock-locations${this.buildQuery(params)}`);
  }

  getStockLocation(id) {
    return this.request(`/stock-locations/${id}`);
  }

  createStockLocation(data) {
    return this.request('/stock-locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateStockLocation(id, data) {
    return this.request(`/stock-locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteStockLocation(id) {
    return this.request(`/stock-locations/${id}`, { method: 'DELETE' });
  }

  getStockBalances(params = {}) {
    return this.request(`/stock-balances${this.buildQuery(params)}`);
  }

  getStockBalance(id) {
    return this.request(`/stock-balances/${id}`);
  }

  createStockBalance(data) {
    return this.request('/stock-balances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateStockBalance(id, data) {
    return this.request(`/stock-balances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteStockBalance(id) {
    return this.request(`/stock-balances/${id}`, { method: 'DELETE' });
  }

  // ── Procurement & Vendor APIs ────────────────────────────────
  getSuppliers(params = {}) {
    return this.request(`/suppliers${this.buildQuery(params)}`);
  }

  getSupplier(id) {
    return this.request(`/suppliers/${id}`);
  }

  createSupplier(data) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSupplier(id, data) {
    return this.request(`/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteSupplier(id) {
    return this.request(`/suppliers/${id}`, { method: 'DELETE' });
  }

  getPurchaseOrders(params = {}) {
    return this.request(`/purchase-orders${this.buildQuery(params)}`);
  }

  getPurchaseOrder(id) {
    return this.request(`/purchase-orders/${id}`);
  }

  createPurchaseOrder(data) {
    return this.request('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePurchaseOrder(id, data) {
    return this.request(`/purchase-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deletePurchaseOrder(id) {
    return this.request(`/purchase-orders/${id}`, { method: 'DELETE' });
  }

  getGoodsReceipts(params = {}) {
    return this.request(`/goods-receipts${this.buildQuery(params)}`);
  }

  getGoodsReceipt(id) {
    return this.request(`/goods-receipts/${id}`);
  }

  createGoodsReceipt(data) {
    return this.request('/goods-receipts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getSupplierPayments(params = {}) {
    return this.request(`/supplier-payments${this.buildQuery(params)}`);
  }

  getSupplierPayment(id) {
    return this.request(`/supplier-payments/${id}`);
  }

  createSupplierPayment(data) {
    return this.request('/supplier-payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSupplierPayment(id, data) {
    return this.request(`/supplier-payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ── Inventory Movements & Audits APIs ────────────────────────
  getStockTransfers(params = {}) {
    return this.request(`/stock-transfers${this.buildQuery(params)}`);
  }

  getStockTransfer(id) {
    return this.request(`/stock-transfers/${id}`);
  }

  createStockTransfer(data) {
    return this.request('/stock-transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateStockTransfer(id, data) {
    return this.request(`/stock-transfers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteStockTransfer(id) {
    return this.request(`/stock-transfers/${id}`, { method: 'DELETE' });
  }

  getStockAdjustments(params = {}) {
    return this.request(`/stock-adjustments${this.buildQuery(params)}`);
  }

  getStockAdjustment(id) {
    return this.request(`/stock-adjustments/${id}`);
  }

  createStockAdjustment(data) {
    return this.request('/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateStockAdjustment(id, data) {
    return this.request(`/stock-adjustments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteStockAdjustment(id) {
    return this.request(`/stock-adjustments/${id}`, { method: 'DELETE' });
  }

  getStockTransactions(params = {}) {
    return this.request(`/stock-transactions${this.buildQuery(params)}`);
  }

  getStockTransaction(id) {
    return this.request(`/stock-transactions/${id}`);
  }

  createStockTransaction(data) {
    return this.request('/stock-transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Customers & Omnichannel Orders APIs ──────────────────────
  getCustomers(params = {}) {
    return this.request(`/customers${this.buildQuery(params)}`);
  }

  getCustomer(id) {
    return this.request(`/customers/${id}`);
  }

  createCustomer(data) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateCustomer(id, data) {
    return this.request(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteCustomer(id) {
    return this.request(`/customers/${id}`, { method: 'DELETE' });
  }

  createCustomerAddress(customerId, data) {
    return this.request(`/customers/${customerId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateCustomerAddress(customerId, addressId, data) {
    return this.request(`/customers/${customerId}/addresses/${addressId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteCustomerAddress(customerId, addressId) {
    return this.request(`/customers/${customerId}/addresses/${addressId}`, {
      method: 'DELETE',
    });
  }

  getOrders(params = {}) {
    return this.request(`/orders${this.buildQuery(params)}`);
  }

  getOrder(id) {
    return this.request(`/orders/${id}`);
  }

  createOrder(data) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateOrder(id, data) {
    return this.request(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteOrder(id) {
    return this.request(`/orders/${id}`, { method: 'DELETE' });
  }

  getShipments(params = {}) {
    return this.request(`/shipments${this.buildQuery(params)}`);
  }

  getShipment(id) {
    return this.request(`/shipments/${id}`);
  }

  createShipment(data) {
    return this.request('/shipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateShipment(id, data) {
    return this.request(`/shipments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteShipment(id) {
    return this.request(`/shipments/${id}`, { method: 'DELETE' });
  }

  // ── POS, Shifts, & Drawer Movements APIs ─────────────────────
  getPosRegisters(params = {}) {
    return this.request(`/pos-registers${this.buildQuery(params)}`);
  }

  getPosRegister(id) {
    return this.request(`/pos-registers/${id}`);
  }

  createPosRegister(data) {
    return this.request('/pos-registers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePosRegister(id, data) {
    return this.request(`/pos-registers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deletePosRegister(id) {
    return this.request(`/pos-registers/${id}`, { method: 'DELETE' });
  }

  getCashierShifts(params = {}) {
    return this.request(`/cashier-shifts${this.buildQuery(params)}`);
  }

  getCashierShift(id) {
    return this.request(`/cashier-shifts/${id}`);
  }

  createCashierShift(data) {
    return this.request('/cashier-shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateCashierShift(id, data) {
    return this.request(`/cashier-shifts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteCashierShift(id) {
    return this.request(`/cashier-shifts/${id}`, { method: 'DELETE' });
  }

  getCashMovements(params = {}) {
    return this.request(`/cash-movements${this.buildQuery(params)}`);
  }

  getCashMovement(id) {
    return this.request(`/cash-movements/${id}`);
  }

  createCashMovement(data) {
    return this.request('/cash-movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Sales, Payments, & Tax Rates APIs ────────────────────────
  getSales(params = {}) {
    return this.request(`/sales${this.buildQuery(params)}`);
  }

  getSale(id) {
    return this.request(`/sales/${id}`);
  }

  createSale(data) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getPaymentMethods(params = {}) {
    return this.request(`/payment-methods${this.buildQuery(params)}`);
  }

  getPaymentMethod(id) {
    return this.request(`/payment-methods/${id}`);
  }

  createPaymentMethod(data) {
    return this.request('/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePaymentMethod(id, data) {
    return this.request(`/payment-methods/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deletePaymentMethod(id) {
    return this.request(`/payment-methods/${id}`, { method: 'DELETE' });
  }

  getPayments(params = {}) {
    return this.request(`/payments${this.buildQuery(params)}`);
  }

  getPayment(id) {
    return this.request(`/payments/${id}`);
  }

  createPayment(data) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePayment(id, data) {
    return this.request(`/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deletePayment(id) {
    return this.request(`/payments/${id}`, { method: 'DELETE' });
  }

  // ── Payment Methods APIs ─────────────────────────────────────
  getPaymentMethods(params = {}) {
    return this.request(`/payment-methods${this.buildQuery(params)}`);
  }

  getPaymentMethod(id) {
    return this.request(`/payment-methods/${id}`);
  }

  createPaymentMethod(data) {
    return this.request('/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePaymentMethod(id, data) {
    return this.request(`/payment-methods/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deletePaymentMethod(id) {
    return this.request(`/payment-methods/${id}`, { method: 'DELETE' });
  }

  getTaxRates(params = {}) {
    return this.request(`/tax-rates${this.buildQuery(params)}`);
  }

  getTaxRate(id) {
    return this.request(`/tax-rates/${id}`);
  }

  createTaxRate(data) {
    return this.request('/tax-rates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateTaxRate(id, data) {
    return this.request(`/tax-rates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteTaxRate(id) {
    return this.request(`/tax-rates/${id}`, { method: 'DELETE' });
  }

  // ── Sales Returns & Customer Refunds APIs ────────────────────
  getSaleReturns(params = {}) {
    return this.request(`/sale-returns${this.buildQuery(params)}`);
  }

  getSaleReturn(id) {
    return this.request(`/sale-returns/${id}`);
  }

  createSaleReturn(data) {
    return this.request('/sale-returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSaleReturn(id, data) {
    return this.request(`/sale-returns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteSaleReturn(id) {
    return this.request(`/sale-returns/${id}`, { method: 'DELETE' });
  }

  getSaleRefunds(params = {}) {
    return this.request(`/sale-refunds${this.buildQuery(params)}`);
  }

  getSaleRefund(id) {
    return this.request(`/sale-refunds/${id}`);
  }

  createSaleRefund(data) {
    return this.request('/sale-refunds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSaleRefund(id, data) {
    return this.request(`/sale-refunds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteSaleRefund(id) {
    return this.request(`/sale-refunds/${id}`, { method: 'DELETE' });
  }

  // ── Customer Portal & Live Tracking ────────────────────────
  getCustomerProfile() {
    return this.request('/customer/profile');
  }

  getCustomerOrders() {
    return this.request('/customer/orders');
  }

  getCustomerShipments() {
    return this.request('/customer/shipments');
  }

  trackShipment(reference) {
    return this.request(`/tracking/${encodeURIComponent(reference)}`);
  }
}

export const api = new ApiClient();
export default api;
