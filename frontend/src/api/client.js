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

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Unauthenticated');
    }

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      error.errors = data?.errors;
      throw error;
    }

    return data;
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
}

export const api = new ApiClient();
export default api;
