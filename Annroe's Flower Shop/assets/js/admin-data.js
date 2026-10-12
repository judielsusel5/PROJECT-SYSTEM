/* admin-data.js — centralized MOCK data + LocalStorage access + domain helpers.
   Prototype only. LocalStorage is NOT a database and is NOT secure.
   Data shapes are kept table-like (ids + foreign keys) so they can map to a database later:
     products  (id)                       <- inventory movements (productId)
     orders    (id, items[productId])     <- schedules (orderId)                          */
(function (global) {
  'use strict';

  const KEYS = AnnroeAdmin.STORAGE_KEYS;

  const ORDER_STATUSES   = ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Completed', 'Cancelled'];
  const CLOSED_STATUSES  = ['Completed', 'Cancelled'];
  const PAYMENT_STATUSES = ['Unpaid', 'Paid', 'Refunded'];
  const PAYMENT_METHODS  = ['GCash', 'Cash', 'Bank Transfer'];
  const FULFILLMENT      = ['Pickup', 'Delivery'];

  /* ---------- Date helpers (local dates as 'YYYY-MM-DD', times as 'HH:MM') ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function toISODate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayISO() { return toISODate(new Date()); }
  function addDays(iso, n) {
    const p = iso.split('-').map(Number);
    return toISODate(new Date(p[0], p[1] - 1, p[2] + n));
  }
  function isoDaysAgo(n, hour) {
    const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour || 9, 0, 0, 0);
    return d.toISOString();
  }

  /* ---------- Seed data (dates are relative to the day the demo data is created) ---------- */
  function seedProducts() {
    const o = function (label, stems, price) { return { label: label, stems: stems, price: price }; };
    const base = function (p) { p.price = p.priceOptions.length ? p.priceOptions[0].price : null; return p; };
    return [
      base({
        id: 'PRD-001', name: 'Imported Rose Bouquet — Red', category: 'Bouquets', flowerType: 'Rose', color: 'Red',
        description: 'Long-stem imported red roses with eucalyptus, wrapped in cream paper and ribbon.',
        priceOptions: [o('Single', 1, 500), o('3 stems', 3, 1000), o('6 stems', 6, 2000), o('12 stems', 12, 3500)], priceNote: '',
        stockQuantity: 84, lowStockThreshold: 30, unit: 'stems', image: 'assets/images/products/rose-red.jpg',
        availability: 'Available', updatedAt: isoDaysAgo(3, 15)
      }),
      base({
        id: 'PRD-002', name: 'Pink Carnation', category: 'Bouquets', flowerType: 'Carnation', color: 'Pink',
        description: 'Soft pink carnations with leafy greens in a cream wrap.',
        priceOptions: [o('Single', 1, 250), o('3 stems', 3, 600), o('6 stems', 6, 1200), o('8 stems', 8, 1600), o('10 stems', 10, 1800), o('12 stems', 12, 2200)], priceNote: '',
        stockQuantity: 120, lowStockThreshold: 40, unit: 'stems', image: 'assets/images/products/carnation-pink.jpg',
        availability: 'Available', updatedAt: isoDaysAgo(6, 11)
      }),
      base({
        id: 'PRD-003', name: 'Pink Tulips', category: 'Bouquets', flowerType: 'Tulip', color: 'Pink',
        description: 'Fresh pink tulips wrapped in cream paper with a satin ribbon.',
        priceOptions: [o('Single', 1, 500), o('Double', 2, 900), o('3 stems', 3, 1300), o('6 stems', 6, 2400), o('12 stems', 12, 4800), o('24 stems', 24, 8000)], priceNote: '',
        stockQuantity: 30, lowStockThreshold: 36, unit: 'stems', image: 'assets/images/products/tulip-pink.jpg',
        availability: 'Available', updatedAt: isoDaysAgo(2, 14)
      }),
      base({
        id: 'PRD-004', name: 'Pink/Violet Lisianthus', category: 'Bouquets', flowerType: 'Lisianthus', color: 'Pink/Violet',
        description: 'Ruffled lisianthus in pink and violet, wrapped in kraft paper.',
        priceOptions: [o('2 stems', 2, 600), o('3 stems', 3, 800), o('6 stems', 6, 1500), o('12 stems', 12, 2500)], priceNote: '',
        stockQuantity: 18, lowStockThreshold: 24, unit: 'stems', image: 'assets/images/products/lisianthus-pink-violet.jpg',
        availability: 'Available', updatedAt: isoDaysAgo(1, 16)
      }),
      base({
        id: 'PRD-005', name: 'Gerbera — Pink/Yellow/White', category: 'Bouquets', flowerType: 'Gerbera', color: 'Pink/Yellow/White',
        description: 'Cheerful gerbera daisies in pink, yellow and white with green leaves.',
        priceOptions: [o('Single', 1, 250), o('3 stems', 3, 600), o('4 stems', 4, 750), o('6 stems', 6, 1200), o('12 stems', 12, 2400)], priceNote: '',
        stockQuantity: 110, lowStockThreshold: 40, unit: 'stems', image: 'assets/images/products/gerbera-mixed.jpg',
        availability: 'Available', updatedAt: isoDaysAgo(4, 9)
      }),
      base({
        id: 'PRD-006', name: 'Blue Tulips', category: 'Bouquets', flowerType: 'Tulip', color: 'Blue',
        description: 'Blue tulips with eucalyptus in cream paper. Price to be confirmed by the owner.',
        priceOptions: [], priceNote: 'Price to be confirmed',
        stockQuantity: 0, lowStockThreshold: 12, unit: 'stems', image: 'assets/images/products/tulip-blue.jpg',
        availability: 'Unavailable', updatedAt: isoDaysAgo(6, 10)
      }),
      base({
        id: 'PRD-007', name: 'Mixed Pastel Bouquet', category: 'Bouquets', flowerType: 'Mixed (Rose, Lisianthus)', color: 'Pink/Cream',
        description: 'Roses and lisianthus with baby\'s breath and eucalyptus in kraft paper. Placeholder entry; price to be confirmed.',
        priceOptions: [], priceNote: 'Price to be confirmed',
        stockQuantity: 12, lowStockThreshold: 10, unit: 'stems', image: 'assets/images/products/mixed-bouquet.jpg',
        availability: 'Unavailable', updatedAt: isoDaysAgo(5, 13)
      }),
      base({
        id: 'PRD-008', name: 'Gift Add-ons (Chocolates, Card, Plush)', category: 'Add-ons', flowerType: '—', color: 'Assorted',
        description: 'Optional gift extras to go with a bouquet. Placeholder entry; price to be confirmed.',
        priceOptions: [], priceNote: 'Price to be confirmed',
        stockQuantity: 20, lowStockThreshold: 8, unit: 'pcs', image: 'assets/images/products/addons.jpg',
        availability: 'Unavailable', updatedAt: isoDaysAgo(5, 13)
      })
    ];
  }

  function seedMovements() {
    const m = function (n, productId, type, change, balanceAfter, reason, daysAgo, hour) {
      return { id: 'MOV-' + String(n).padStart(3, '0'), productId: productId, type: type, change: change,
               balanceAfter: balanceAfter, reason: reason, date: isoDaysAgo(daysAgo, hour), recordedBy: 'Shop Admin' };
    };
    return [
      m(1,  'PRD-001', 'Addition',         60,  90,  'Weekly flower delivery received', 7, 8),
      m(2,  'PRD-001', 'Spoilage/Damaged', -6,  84,  'Wilted stems removed',            3, 15),
      m(3,  'PRD-002', 'Addition',         80,  140, 'Weekly flower delivery received', 6, 8),
      m(4,  'PRD-002', 'Reduction',        -20, 120, 'Used for weekend orders',         4, 17),
      m(5,  'PRD-003', 'Addition',         36,  66,  'Supplier delivery received',      9, 9),
      m(6,  'PRD-003', 'Reduction',        -30, 36,  'Used for orders',                 4, 16),
      m(7,  'PRD-003', 'Spoilage/Damaged', -6,  30,  'Damaged in transport',            2, 14),
      m(8,  'PRD-004', 'Addition',         24,  24,  'Supplier delivery received',      5, 9),
      m(9,  'PRD-004', 'Spoilage/Damaged', -6,  18,  'Petals browning',                 1, 16),
      m(10, 'PRD-005', 'Addition',         60,  110, 'Weekly flower delivery received', 4, 8),
      m(11, 'PRD-006', 'Reduction',        -12, 0,   'Sold out; waiting for restock',   6, 10)
    ];
  }

  /* Raw order rows: [number, customer, phone, orderDayOffset, [[productId, option, qty]],
                      fulfillment, scheduleDayOffset, time, status, method, payment, address, notes] */
  function seedOrdersAndSchedules(products) {
    const R = 'PRD-001', C = 'PRD-002', T = 'PRD-003', L = 'PRD-004', G = 'PRD-005';
    const rows = [
      [1001, 'Maria Santos',    '0917 555 0101', -12, [[R, '12 stems', 1]], 'Pickup',   -11, '10:00', 'Completed',        'GCash',         'Paid',     '', 'Anniversary bouquet.'],
      [1002, 'Jose Reyes',      '0917 555 0102', -10, [[C, '6 stems', 1]],  'Delivery', -9,  '15:00', 'Completed',        'Cash',          'Paid',     '45 Sampaguita St., Brgy. Mabini', 'Call on arrival.'],
      [1003, 'Liza Mendoza',    '0917 555 0103', -8,  [[T, '12 stems', 1]], 'Delivery', -7,  '11:00', 'Completed',        'GCash',         'Paid',     '8 Ilang-Ilang Ave., Brgy. San Roque', ''],
      [1004, 'Carlo Dizon',     '0917 555 0104', -6,  [[G, '6 stems', 1]],  'Pickup',   -5,  '09:30', 'Completed',        'Cash',          'Paid',     '', ''],
      [1005, 'Ana Villanueva',  '0917 555 0105', -5,  [[L, '6 stems', 1]],  'Delivery', -4,  '14:00', 'Cancelled',        'GCash',         'Refunded', '21 Dahlia Lane, Brgy. Poblacion', 'Customer changed plans.'],
      [1006, 'Paolo Garcia',    '0917 555 0106', -4,  [[R, '6 stems', 1]],  'Pickup',   -3,  '16:00', 'Completed',        'GCash',         'Paid',     '', ''],
      [1007, 'Isabel Cruz',     '0917 555 0107', -3,  [[T, '6 stems', 1], [C, '3 stems', 1]], 'Delivery', -2, '13:00', 'Completed', 'Bank Transfer', 'Paid', '17 Orchid Rd., Brgy. Bagong Silang', 'Leave with the guard if no answer.'],
      [1008, 'Miguel Torres',   '0917 555 0108', -2,  [[C, '12 stems', 1]], 'Pickup',   -1,  '17:00', 'Completed',        'Cash',          'Paid',     '', ''],
      [1009, 'Ramon Dela Cruz', '0917 555 0109', -2,  [[R, '6 stems', 1]],  'Delivery', -1,  '11:00', 'Preparing',        'Bank Transfer', 'Paid',     '63 Jasmine St., Brgy. Mabini', 'Birthday surprise.'],
      [1010, 'Grace Navarro',   '0917 555 0110', -1,  [[G, '12 stems', 1]], 'Delivery', 0,   '10:00', 'Out for Delivery', 'GCash',         'Paid',     '9 Gumamela St., Brgy. San Roque', ''],
      [1011, 'Daniel Ramos',    '0917 555 0111', -1,  [[R, '3 stems', 1]],  'Pickup',   0,   '15:00', 'Ready for Pickup', 'Cash',          'Unpaid',   '', 'Pay on pickup.'],
      [1012, 'Jun Soriano',     '0917 555 0112', -1,  [[T, '24 stems', 1]], 'Delivery', 3,   '09:00', 'Confirmed',        'GCash',         'Paid',     '30 Waling-Waling Blvd., Brgy. Poblacion', 'Event arrangement.'],
      [1013, 'Sofia Bautista',  '0917 555 0113', 0,   [[T, '3 stems', 1]],  'Pickup',   0,   '17:30', 'Preparing',        'GCash',         'Paid',     '', ''],
      [1014, 'Rafael Aquino',   '0917 555 0114', 0,   [[L, '12 stems', 1]], 'Delivery', 1,   '10:00', 'Confirmed',        'GCash',         'Paid',     '5 Rosal Ave., Brgy. Bagong Silang', ''],
      [1015, 'Camille Flores',  '0917 555 0115', 0,   [[R, '12 stems', 1]], 'Delivery', 1,   '14:00', 'Pending',          'Bank Transfer', 'Unpaid',   '112 Camia St., Brgy. Mabini', 'Awaiting payment proof.'],
      [1016, 'Noel Castillo',   '0917 555 0116', 0,   [[C, '8 stems', 1]],  'Pickup',   2,   '11:00', 'Pending',          'Cash',          'Unpaid',   '', ''],
      [1017, 'Bianca Lopez',    '0917 555 0117', 0,   [[G, '4 stems', 2]],  'Pickup',   2,   '11:00', 'Confirmed',        'GCash',         'Paid',     '', 'Same pickup time as ORD-1016.'],
      [1018, 'Patricia Gomez',  '0917 555 0118', 0,   [[L, '3 stems', 1], [R, 'Single', 1]], 'Pickup', 4, '13:00', 'Pending', 'GCash', 'Unpaid', '', '']
    ];
    const today = todayISO();
    const orders = [], schedules = [];
    rows.forEach(function (r) {
      const items = r[4].map(function (it) {
        const p = products.filter(function (x) { return x.id === it[0]; })[0];
        const opt = p.priceOptions.filter(function (x) { return x.label === it[1]; })[0];
        return { productId: p.id, name: p.name, option: opt.label, stems: opt.stems, qty: it[2], unitPrice: opt.price };
      });
      const total = items.reduce(function (s, i) { return s + i.qty * i.unitPrice; }, 0);
      orders.push({
        id: 'ORD-' + r[0], customerName: r[1], customerPhone: r[2], orderDate: addDays(today, r[3]),
        items: items, totalAmount: total, fulfillment: r[5], paymentMethod: r[9], paymentStatus: r[10], status: r[8]
      });
      schedules.push({
        id: 'SCH-' + r[0], orderId: 'ORD-' + r[0], type: r[5], scheduledDate: addDays(today, r[6]), scheduledTime: r[7],
        address: r[11], notes: r[12], updatedAt: isoDaysAgo(0, 8)
      });
    });
    return { orders: orders, schedules: schedules };
  }

  /* ---------- Validation of stored data (guards against missing/malformed LocalStorage) ---------- */
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  const validators = {
    products: function (p) { return isObj(p) && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.stockQuantity === 'number' && typeof p.lowStockThreshold === 'number' && Array.isArray(p.priceOptions); },
    orders: function (o) { return isObj(o) && typeof o.id === 'string' && Array.isArray(o.items) && typeof o.totalAmount === 'number' && ORDER_STATUSES.indexOf(o.status) > -1 && FULFILLMENT.indexOf(o.fulfillment) > -1 && DATE_RE.test(o.orderDate); },
    schedules: function (s) { return isObj(s) && typeof s.orderId === 'string' && DATE_RE.test(s.scheduledDate) && /^\d{2}:\d{2}$/.test(s.scheduledTime); },
    movements: function (m) { return isObj(m) && typeof m.productId === 'string' && typeof m.change === 'number'; }
  };
  function validList(raw, check, allowEmpty) {
    return Array.isArray(raw) && (allowEmpty || raw.length > 0) && raw.every(check);
  }

  function writeSeed(which) {
    const products = seedProducts();
    if (which.products) AnnroeAdmin.writeStorage(KEYS.products, products);
    if (which.movements) AnnroeAdmin.writeStorage(KEYS.inventory, seedMovements());
    if (which.orders) {
      const os = seedOrdersAndSchedules(products);
      AnnroeAdmin.writeStorage(KEYS.orders, os.orders);
      AnnroeAdmin.writeStorage(KEYS.schedules, os.schedules);
    }
  }

  /* Runs once per page load: seeds missing data, repairs malformed data. */
  function ensureData() {
    const need = { products: false, movements: false, orders: false };
    if (!validList(AnnroeAdmin.readStorage(KEYS.products, null), validators.products, false)) need.products = true;
    if (!validList(AnnroeAdmin.readStorage(KEYS.inventory, null), validators.movements, true)) need.movements = true;
    // Orders and schedules must stay paired, so repair them together.
    if (!validList(AnnroeAdmin.readStorage(KEYS.orders, null), validators.orders, false) ||
        !validList(AnnroeAdmin.readStorage(KEYS.schedules, null), validators.schedules, false)) need.orders = true;
    if (need.products || need.movements || need.orders) writeSeed(need);
  }

  function resetDemoData() {
    writeSeed({ products: true, movements: true, orders: true });
  }

  /* ---------- Repositories ---------- */
  function get(key) { return AnnroeAdmin.readStorage(key, []); }
  function save(key, list) { return AnnroeAdmin.writeStorage(key, list); }

  /* ---------- Domain helpers (shared business rules) ---------- */
  function getStockStatus(product) {
    if (product.stockQuantity <= 0) return 'Out of Stock';
    if (product.stockQuantity <= product.lowStockThreshold) return 'Low Stock';
    return 'In Stock';
  }
  function isOpenOrder(order) { return CLOSED_STATUSES.indexOf(order.status) === -1; }
  function getScheduleForOrder(orderId, schedules) {
    return (schedules || get(KEYS.schedules)).filter(function (s) { return s.orderId === orderId; })[0] || null;
  }
  function nextId(prefix, list, start) {
    let max = start || 0;
    list.forEach(function (x) {
      const n = parseInt(String(x.id).replace(/\D/g, ''), 10);
      if (n > max) max = n;
    });
    return prefix + String(max + 1).padStart(prefix === 'ORD-' ? 4 : 3, '0');
  }


  /* ---------- Schedule conflict rule (mock data only) ----------
     "Possible conflict" = two OPEN orders of the same type (pickup or delivery) on the same date
     whose times are less than CONFLICT_WINDOW_MINUTES apart. It only compares the data stored in this
     browser. It does not check opening hours, driver availability, or any real calendar or database. */
  const CONFLICT_WINDOW_MINUTES = 60;
  function toMinutes(hhmm) {
    const p = String(hhmm).split(':').map(Number);
    return p[0] * 60 + p[1];
  }
  function openScheduleEntries() {
    const schedules = get(KEYS.schedules);
    return get(KEYS.orders).filter(isOpenOrder).map(function (o) {
      return { order: o, schedule: getScheduleForOrder(o.id, schedules) };
    }).filter(function (e) { return e.schedule; });
  }
  /* candidate: { orderId, type, date, time } -> array of other order ids it may clash with */
  function getScheduleConflicts(candidate) {
    return openScheduleEntries().filter(function (e) {
      return e.order.id !== candidate.orderId &&
        e.schedule.type === candidate.type &&
        e.schedule.scheduledDate === candidate.date &&
        Math.abs(toMinutes(e.schedule.scheduledTime) - toMinutes(candidate.time)) < CONFLICT_WINDOW_MINUTES;
    }).map(function (e) { return e.order.id; });
  }
  /* -> { orderId: [otherOrderIds] } for every open order that has at least one possible conflict */
  function getAllConflicts() {
    const map = {};
    openScheduleEntries().forEach(function (e) {
      const others = getScheduleConflicts({ orderId: e.order.id, type: e.schedule.type, date: e.schedule.scheduledDate, time: e.schedule.scheduledTime });
      if (others.length) map[e.order.id] = others;
    });
    return map;
  }

  ensureData();

  global.AnnroeData = {
    ORDER_STATUSES: ORDER_STATUSES, CLOSED_STATUSES: CLOSED_STATUSES,
    PAYMENT_STATUSES: PAYMENT_STATUSES, PAYMENT_METHODS: PAYMENT_METHODS, FULFILLMENT: FULFILLMENT,
    todayISO: todayISO, addDays: addDays, toISODate: toISODate,
    getProducts: function () { return get(KEYS.products); },
    saveProducts: function (l) { return save(KEYS.products, l); },
    getOrders: function () { return get(KEYS.orders); },
    saveOrders: function (l) { return save(KEYS.orders, l); },
    getSchedules: function () { return get(KEYS.schedules); },
    saveSchedules: function (l) { return save(KEYS.schedules, l); },
    getMovements: function () { return get(KEYS.inventory); },
    saveMovements: function (l) { return save(KEYS.inventory, l); },
    getStockStatus: getStockStatus, isOpenOrder: isOpenOrder,
    getScheduleForOrder: getScheduleForOrder, nextId: nextId,
    resetDemoData: resetDemoData,
    CONFLICT_WINDOW_MINUTES: CONFLICT_WINDOW_MINUTES,
    getScheduleConflicts: getScheduleConflicts, getAllConflicts: getAllConflicts
  };
})(window);
