// High-Quality Persistent Mock & Fallback Engine for Ngus Electronics
// Provides instant, flawless functionality even when the backend is starting, offline, or disconnected.

const STORAGE_KEY = 'ngus_store_data_v2';

const INITIAL_MOCK_DATA = {
  products: [
    {
      id: 1,
      name: 'iPhone 15 Pro Max 256GB - Titanium',
      sku: 'IPHONE-15PM-256',
      barcode: '195949038234',
      price: 185000,
      selling_price: 185000,
      cost_price: 155000,
      quantity: 18,
      minimum_stock: 5,
      category_id: 1,
      brand_id: 1,
      category: { id: 1, name: 'Smartphones & Mobile' },
      brand: { id: 1, name: 'Apple' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&auto=format&fit=crop&q=60',
      description: 'Super Retina XDR display, A17 Pro chip, Aerospace-grade titanium design.',
    },
    {
      id: 2,
      name: 'Samsung Galaxy S24 Ultra 512GB - Titanium Gray',
      sku: 'SAMS-S24U-512',
      barcode: '8806095304921',
      price: 172000,
      selling_price: 172000,
      cost_price: 142000,
      quantity: 14,
      minimum_stock: 5,
      category_id: 1,
      brand_id: 2,
      category: { id: 1, name: 'Smartphones & Mobile' },
      brand: { id: 2, name: 'Samsung' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&auto=format&fit=crop&q=60',
      description: 'Galaxy AI with built-in S-Pen, 200MP camera, 120Hz Dynamic AMOLED 2X.',
    },
    {
      id: 3,
      name: 'MacBook Pro 16" M3 Max 36GB / 1TB',
      sku: 'MBP-16-M3MAX',
      barcode: '195949012398',
      price: 450000,
      selling_price: 450000,
      cost_price: 395000,
      quantity: 8,
      minimum_stock: 3,
      category_id: 2,
      brand_id: 1,
      category: { id: 2, name: 'Laptops & Workstations' },
      brand: { id: 1, name: 'Apple' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=60',
      description: 'M3 Max 16-core CPU, 40-core GPU, Liquid Retina XDR display.',
    },
    {
      id: 4,
      name: 'Sony WH-1000XM5 Wireless Noise-Canceling',
      sku: 'SONY-WH1000XM5',
      barcode: '027242923485',
      price: 54000,
      selling_price: 54000,
      cost_price: 42000,
      quantity: 24,
      minimum_stock: 6,
      category_id: 3,
      brand_id: 3,
      category: { id: 3, name: 'Audio & Premium Sound' },
      brand: { id: 3, name: 'Sony' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=60',
      description: 'Industry-leading noise cancellation, 30h battery life, crystal clear hands-free calls.',
    },
    {
      id: 5,
      name: 'Dell XPS 15 9530 Core i9 32GB 1TB RTX 4070',
      sku: 'DELL-XPS15-9530',
      barcode: '884116434521',
      price: 380000,
      selling_price: 380000,
      cost_price: 330000,
      quantity: 6,
      minimum_stock: 4,
      category_id: 2,
      brand_id: 4,
      category: { id: 2, name: 'Laptops & Workstations' },
      brand: { id: 4, name: 'Dell' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&auto=format&fit=crop&q=60',
      description: '15.6" 3.5K OLED Touch display, CNC machined aluminum chassis.',
    },
    {
      id: 6,
      name: 'Apple iPad Pro 13" M4 256GB Wi-Fi',
      sku: 'IPAD-PRO-13-M4',
      barcode: '195949234123',
      price: 195000,
      selling_price: 195000,
      cost_price: 165000,
      quantity: 12,
      minimum_stock: 4,
      category_id: 1,
      brand_id: 1,
      category: { id: 1, name: 'Smartphones & Mobile' },
      brand: { id: 1, name: 'Apple' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&auto=format&fit=crop&q=60',
      description: 'Ultra Retina XDR OLED display, M4 chip, only 5.1mm thin.',
    },
    {
      id: 7,
      name: 'LG C3 65" 4K OLED Smart Gaming TV',
      sku: 'LG-OLED65-C3',
      barcode: '719192661234',
      price: 240000,
      selling_price: 240000,
      cost_price: 205000,
      quantity: 4,
      minimum_stock: 2,
      category_id: 4,
      brand_id: 5,
      category: { id: 4, name: 'Displays & Home Cinema' },
      brand: { id: 5, name: 'LG' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&auto=format&fit=crop&q=60',
      description: 'Self-lit OLED pixels, α9 Gen6 AI Processor 4K, 120Hz G-Sync & FreeSync.',
    },
    {
      id: 8,
      name: 'Anker 737 Power Bank 24,000mAh 140W GaN',
      sku: 'ANKER-737-PB',
      barcode: '194644098651',
      price: 18500,
      selling_price: 18500,
      cost_price: 14000,
      quantity: 35,
      minimum_stock: 10,
      category_id: 5,
      brand_id: 6,
      category: { id: 5, name: 'Accessories & Power' },
      brand: { id: 6, name: 'Anker' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=400&auto=format&fit=crop&q=60',
      description: 'Ultra-powerful 140W fast-charging powerbank with smart digital display.',
    },
    {
      id: 9,
      name: 'Logitech MX Master 3S Wireless Mouse',
      sku: 'LOGI-MX3S-GR',
      barcode: '097855174567',
      price: 16500,
      selling_price: 16500,
      cost_price: 12500,
      quantity: 28,
      minimum_stock: 8,
      category_id: 5,
      brand_id: 7,
      category: { id: 5, name: 'Accessories & Power' },
      brand: { id: 7, name: 'Logitech' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&auto=format&fit=crop&q=60',
      description: 'Quiet clicks, 8K DPI any-surface sensor, MagSpeed electromagnetic scroll.',
    },
    {
      id: 10,
      name: 'Apple AirPods Pro (2nd Generation) USB-C',
      sku: 'APP-AIRPODSPRO-2',
      barcode: '195949052841',
      price: 36000,
      selling_price: 36000,
      cost_price: 28000,
      quantity: 3,
      minimum_stock: 5, // low stock alert!
      category_id: 3,
      brand_id: 1,
      category: { id: 3, name: 'Audio & Premium Sound' },
      brand: { id: 1, name: 'Apple' },
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&auto=format&fit=crop&q=60',
      description: 'Active Noise Cancellation, Adaptive Audio, USB-C MagSafe Case.',
    },
  ],

  categories: [
    { id: 1, name: 'Smartphones & Mobile', slug: 'smartphones', products_count: 3 },
    { id: 2, name: 'Laptops & Workstations', slug: 'laptops', products_count: 2 },
    { id: 3, name: 'Audio & Premium Sound', slug: 'audio', products_count: 2 },
    { id: 4, name: 'Displays & Home Cinema', slug: 'displays', products_count: 1 },
    { id: 5, name: 'Accessories & Power', slug: 'accessories', products_count: 2 },
  ],

  brands: [
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Samsung' },
    { id: 3, name: 'Sony' },
    { id: 4, name: 'Dell' },
    { id: 5, name: 'LG' },
    { id: 6, name: 'Anker' },
    { id: 7, name: 'Logitech' },
  ],

  posRegisters: [
    {
      id: 1,
      name: 'Bole Flagship Main Register',
      code: 'REG-01',
      is_active: 1,
      store_id: 1,
    },
  ],

  shifts: [
    {
      id: 101,
      pos_register_id: 1,
      pos_register: { id: 1, name: 'Bole Flagship Main Register' },
      user_id: 1,
      user: { id: 1, name: 'System Administrator', email: 'admin@gmail.com', role: 'admin' },
      status: 'open',
      opening_float: 2500,
      opening_cash: 2500,
      expected_cash: 2500,
      opened_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ],

  orders: [
    {
      id: 1,
      order_number: 'ORD-2026-8921',
      customer_id: 1,
      customer: { id: 1, display_name: 'Dawit Kebede', name: 'Dawit Kebede', phone: '+251 911 234567' },
      status: 'confirmed',
      total_amount: 185000,
      grand_total: 185000,
      fulfillment_type: 'delivery',
      payment_method: 'telebirr',
      items_count: 1,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      items: [
        { product_id: 1, product: { name: 'iPhone 15 Pro Max 256GB' }, quantity: 1, unit_price: 185000, total: 185000 },
      ],
    },
    {
      id: 2,
      order_number: 'ORD-2026-8922',
      customer_id: 2,
      customer: { id: 2, display_name: 'Selamawit Alemu', name: 'Selamawit Alemu', phone: '+251 922 987654' },
      status: 'processing',
      total_amount: 54000,
      grand_total: 54000,
      fulfillment_type: 'pickup',
      payment_method: 'cbebirr',
      items_count: 1,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      items: [
        { product_id: 4, product: { name: 'Sony WH-1000XM5 Headphones' }, quantity: 1, unit_price: 54000, total: 54000 },
      ],
    },
    {
      id: 3,
      order_number: 'ORD-2026-8923',
      customer_id: 3,
      customer: { id: 3, display_name: 'Biruk Tadesse', name: 'Biruk Tadesse', phone: '+251 933 456789' },
      status: 'completed',
      total_amount: 35000,
      grand_total: 35000,
      fulfillment_type: 'delivery',
      payment_method: 'cash',
      items_count: 2,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      items: [
        { product_id: 8, product: { name: 'Anker 737 Power Bank' }, quantity: 1, unit_price: 18500, total: 18500 },
        { product_id: 9, product: { name: 'Logitech MX Master 3S' }, quantity: 1, unit_price: 16500, total: 16500 },
      ],
    },
  ],

  sales: [
    {
      id: 501,
      receipt_number: 'RCP-501',
      total_amount: 36000,
      payment_method: 'telebirr',
      items_count: 1,
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      items: [
        { product_id: 10, product: { name: 'Apple AirPods Pro 2' }, quantity: 1, unit_price: 36000, total: 36000 },
      ],
    },
    {
      id: 502,
      receipt_number: 'RCP-502',
      total_amount: 18500,
      payment_method: 'cash',
      items_count: 1,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      items: [
        { product_id: 8, product: { name: 'Anker 737 Power Bank' }, quantity: 1, unit_price: 18500, total: 18500 },
      ],
    },
  ],

  customers: [
    { id: 1, display_name: 'Dawit Kebede', name: 'Dawit Kebede', email: 'dawit@example.com', phone: '+251 911 234567', total_orders: 4, total_spent: 340000 },
    { id: 2, display_name: 'Selamawit Alemu', name: 'Selamawit Alemu', email: 'selam@example.com', phone: '+251 922 987654', total_orders: 2, total_spent: 125000 },
    { id: 3, display_name: 'Biruk Tadesse', name: 'Biruk Tadesse', email: 'biruk@example.com', phone: '+251 933 456789', total_orders: 1, total_spent: 35000 },
  ],

  suppliers: [
    { id: 1, name: 'Apple Authorized Distribution MEA', contact_person: 'Michael Ross', email: 'distribution@apple-mea.test', phone: '+971 4 123 4567', products_count: 12 },
    { id: 2, name: 'Samsung Electronics East Africa', contact_person: 'Tigist Haile', email: 'sales@samsung-ea.test', phone: '+251 11 551 2345', products_count: 8 },
    { id: 3, name: 'Anker & Logitech Regional Hub', contact_person: 'Aman Kassa', email: 'orders@gadgetshub.et', phone: '+251 911 002233', products_count: 15 },
  ],

  purchaseOrders: [
    {
      id: 201,
      purchase_order_number: 'PO-2026-004',
      supplier_id: 1,
      supplier: { id: 1, name: 'Apple Authorized Distribution MEA' },
      status: 'approved',
      grand_total: 1200000,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 202,
      purchase_order_number: 'PO-2026-005',
      supplier_id: 2,
      supplier: { id: 2, name: 'Samsung Electronics East Africa' },
      status: 'submitted',
      grand_total: 850000,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],

  stores: [
    { id: 1, name: 'Bole Medhanialem Flagship', code: 'STORE-BOLE', address: 'Bole Road, Addis Ababa', phone: '+251 11 661 1122', is_active: 1 },
    { id: 2, name: 'Kazanchis Logistics Hub & Warehouse', code: 'WH-KAZ', address: 'Kazanchis, Addis Ababa', phone: '+251 11 551 3344', is_active: 1 },
  ],

  paymentMethods: [
    { id: 1, name: 'Cash Counter', method_type: 'cash', code: 'CASH', is_active: 1 },
    { id: 2, name: 'Telebirr SuperApp', method_type: 'mobile_money', code: 'TELEBIRR', is_active: 1 },
    { id: 3, name: 'CBE Birr', method_type: 'mobile_money', code: 'CBEBIRR', is_active: 1 },
    { id: 4, name: 'Visa / Mastercard POS', method_type: 'card', code: 'CARD', is_active: 1 },
  ],

  units: [
    { id: 1, name: 'Piece', code: 'PCS' },
    { id: 2, name: 'Box Pack', code: 'BOX' },
    { id: 3, name: 'Set', code: 'SET' },
  ],

  users: [
    { id: 1, name: 'System Administrator', email: 'admin@gmail.com', role: 'admin' },
    { id: 2, name: 'Dawit Manager', email: 'manager@electronics.test', role: 'manager' },
    { id: 3, name: 'Selam Cashier', email: 'cashier@electronics.test', role: 'cashier' },
    { id: 4, name: 'Kibret Warehouse', email: 'storekeeper@electronics.test', role: 'storekeeper' },
  ],
};

// LocalStorage Persistence Layer
export class MockStore {
  static getStore() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DATA));
    return INITIAL_MOCK_DATA;
  }

  static saveStore(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  static reset() {
    localStorage.removeItem(STORAGE_KEY);
    return INITIAL_MOCK_DATA;
  }
}

export default MockStore;
