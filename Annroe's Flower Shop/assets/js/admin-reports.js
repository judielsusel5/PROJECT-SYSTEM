/* admin-reports.js — reports built from the shared MOCK data. Nothing here is real business data.
   Definitions: "sales" = non-cancelled orders (by order date), the same rule the dashboard uses. */
(function () {
  'use strict';

  const A = AnnroeAdmin;
  const D = AnnroeData;
  const esc = A.escapeHtml;
  const $ = function (id) { return document.getElementById(id); };

  /* ============ Date helpers ============ */
  function parse(iso) { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function dayDiff(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  function pct(part, whole) { return whole ? Math.round(part / whole * 100) : 0; }
  function sum(list, fn) { return list.reduce(function (s, x) { return s + fn(x); }, 0); }
  const peso = A.formatPeso;

  function presetRange(preset) {
    const today = D.todayISO();
    if (preset === '7') return [D.addDays(today, -6), today];
    if (preset === 'month') return [today.slice(0, 8) + '01', today];
    if (preset === 'all') {
      const dates = D.getOrders().map(function (o) { return o.orderDate; }).sort();
      return [dates.length ? dates[0] : today, today];
    }
    return [D.addDays(today, -29), today];
  }

  /* ============ Calculations (no rendering) ============ */
  function buckets(from, to, counted) {
    const days = dayDiff(from, to) + 1;
    const list = [];
    if (days <= 31) {
      for (let i = 0; i < days; i++) { const d = D.addDays(from, i); list.push({ label: A.formatDateShort(d), sub: A.weekdayShort(d), from: d, to: d }); }
    } else if (days <= 200) {
      for (let s = from; s <= to; s = D.addDays(s, 7)) {
        const e = D.addDays(s, 6) > to ? to : D.addDays(s, 6);
        list.push({ label: A.formatDateShort(s), sub: 'to ' + A.formatDateShort(e), from: s, to: e });
      }
    } else {
      let cur = from.slice(0, 7);
      const last = to.slice(0, 7);
      while (cur <= last) {
        const first = cur + '-01';
        const next = parse(first); next.setMonth(next.getMonth() + 1);
        const lastDay = D.toISODate(new Date(next.getFullYear(), next.getMonth(), 0));
        list.push({ label: A.formatDateShort(first).split(' ')[0], sub: cur.slice(0, 4), from: first < from ? from : first, to: lastDay > to ? to : lastDay });
        cur = D.toISODate(next).slice(0, 7);
      }
    }
    list.forEach(function (b) {
      const inB = counted.filter(function (o) { return o.orderDate >= b.from && o.orderDate <= b.to; });
      b.total = sum(inB, function (o) { return o.totalAmount; });
      b.count = inB.length;
    });
    return list;
  }

  function compute(from, to) {
    const all = D.getOrders().filter(function (o) { return o.orderDate >= from && o.orderDate <= to; });
    const counted = all.filter(function (o) { return o.status !== 'Cancelled'; });
    const products = D.getProducts();
    const sales = sum(counted, function (o) { return o.totalAmount; });

    const statusCounts = D.ORDER_STATUSES.map(function (s) {
      return { status: s, count: all.filter(function (o) { return o.status === s; }).length };
    });
    const typeRow = function (t) {
      const l = counted.filter(function (o) { return o.fulfillment === t; });
      return { type: t, orders: l.length, sales: sum(l, function (o) { return o.totalAmount; }) };
    };
    const methods = D.PAYMENT_METHODS.map(function (m) {
      const l = counted.filter(function (o) { return o.paymentMethod === m; });
      return { method: m, orders: l.length, sales: sum(l, function (o) { return o.totalAmount; }) };
    });

    const byProduct = {};
    counted.forEach(function (o) {
      o.items.forEach(function (it) {
        const r = byProduct[it.productId] || (byProduct[it.productId] = { productId: it.productId, name: it.name, qty: 0, stems: 0, revenue: 0 });
        r.qty += it.qty; r.stems += it.qty * (it.stems || 1); r.revenue += it.qty * it.unitPrice;
      });
    });
    const popular = Object.keys(byProduct).map(function (k) { return byProduct[k]; })
      .sort(function (a, b) { return b.qty - a.qty || b.revenue - a.revenue; });

    const moves = D.getMovements().filter(function (m) { const d = D.toISODate(new Date(m.date)); return d >= from && d <= to; });
    const mv = function (type) {
      const l = moves.filter(function (m) { return m.type === type; });
      return { entries: l.length, units: sum(l, function (m) { return m.change; }) };
    };

    return {
      from: from, to: to, all: all, counted: counted, products: products,
      sales: sales,
      paid: sum(counted.filter(function (o) { return o.paymentStatus === 'Paid'; }), function (o) { return o.totalAmount; }),
      unpaid: sum(counted.filter(function (o) { return o.paymentStatus === 'Unpaid'; }), function (o) { return o.totalAmount; }),
      refunded: sum(all.filter(function (o) { return o.paymentStatus === 'Refunded'; }), function (o) { return o.totalAmount; }),
      avg: counted.length ? Math.round(sales / counted.length) : 0,
      series: buckets(from, to, counted),
      statusCounts: statusCounts, pickup: typeRow('Pickup'), delivery: typeRow('Delivery'), methods: methods, popular: popular,
      inStock: products.filter(function (p) { return D.getStockStatus(p) === 'In Stock'; }).length,
      low: products.filter(function (p) { return D.getStockStatus(p) === 'Low Stock'; }).length,
      out: products.filter(function (p) { return D.getStockStatus(p) === 'Out of Stock'; }).length,
      stems: sum(products.filter(function (p) { return p.unit !== 'pcs'; }), function (p) { return p.stockQuantity; }),
      pieces: sum(products.filter(function (p) { return p.unit === 'pcs'; }), function (p) { return p.stockQuantity; }),
      attention: products.filter(function (p) { return D.getStockStatus(p) !== 'In Stock'; })
        .sort(function (a, b) { return a.stockQuantity / Math.max(a.lowStockThreshold, 1) - b.stockQuantity / Math.max(b.lowStockThreshold, 1); }),
      moves: { added: mv('Addition'), reduced: mv('Reduction'), spoiled: mv('Spoilage/Damaged'), adjusted: mv('Adjustment') }
    };
  }

  /* ============ Rendering pieces ============ */
  function kpi(label, value, hint) {
    return '<div class="ar-kpi"><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd>' + (hint ? '<span class="ar-kpi-hint">' + esc(hint) + '</span>' : '') + '</div>';
  }
  function hbar(label, valueText, percent, tone, labelHtml) {
    return '<div class="ar-hbar-row"><div class="d-flex justify-content-between align-items-center gap-2 mb-1"><span class="min-w-0">' + (labelHtml || esc(label)) + '</span><span class="small text-muted flex-none">' + esc(valueText) + '</span></div>' +
      '<div class="progress ar-progress ar-hbar" role="progressbar" aria-label="' + esc(label) + '" aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ar-progress-bar ' + (tone || '') + '" style="width:' + percent + '%"></div></div></div>';
  }
  function empty(icon, title, text) {
    return '<div class="ar-empty"><i class="bi ' + icon + '" aria-hidden="true"></i><h3>' + esc(title) + '</h3><p class="mb-0">' + esc(text) + '</p></div>';
  }

  function renderSales(r) {
    const max = Math.max.apply(null, r.series.map(function (b) { return b.total; }).concat([1]));
    const bars = r.series.map(function (b) {
      const h = Math.round(b.total / max * 100);
      return '<li class="ar-bar-col"><span class="ar-bar-value">' + (b.total ? esc(peso(b.total)) : '—') + '</span>' +
        '<span class="ar-bar-track"><span class="ar-bar" style="height:' + Math.max(h, b.total ? 4 : 0) + '%"></span></span>' +
        '<span class="ar-bar-label">' + esc(b.label) + '</span><span class="ar-bar-sub">' + esc(b.sub) + '</span>' +
        '<span class="visually-hidden">' + esc(b.label) + ': ' + b.count + ' orders, ' + esc(peso(b.total)) + '</span></li>';
    }).join('');
    $('rpSales').innerHTML =
      '<dl class="ar-kpis">' +
        kpi('Total sales', peso(r.sales), r.counted.length + ' orders, cancelled excluded') +
        kpi('Paid', peso(r.paid), pct(r.paid, r.sales) + '% of sales') +
        kpi('Awaiting payment', peso(r.unpaid), pct(r.unpaid, r.sales) + '% of sales') +
        kpi('Average order', peso(r.avg), 'per order') +
        kpi('Refunded (simulated)', peso(r.refunded), 'orders marked Refunded') +
      '</dl>' +
      (r.counted.length
        ? '<div class="ar-bars-scroll"><ol class="ar-bars ar-bars--wide" aria-label="Sales by period">' + bars + '</ol></div>'
        : empty('bi-bar-chart', 'No sales in this period', 'Try a longer date range.'));
  }

  function renderOrders(r) {
    const total = r.all.length;
    const get = function (s) { return r.statusCounts.filter(function (x) { return x.status === s; })[0].count; };
    const open = total - get('Completed') - get('Cancelled');
    const methodRows = r.methods.map(function (m) {
      return '<tr><th scope="row">' + esc(m.method) + '</th><td class="text-end">' + m.orders + '</td><td class="text-end">' + esc(peso(m.sales)) + '</td></tr>';
    }).join('');
    $('rpOrders').innerHTML =
      '<dl class="ar-kpis">' +
        kpi('Total orders', String(total), 'including cancelled') +
        kpi('Completed', String(get('Completed')), pct(get('Completed'), total) + '% of orders') +
        kpi('In progress', String(open), 'not yet completed') +
        kpi('Cancelled', String(get('Cancelled')), pct(get('Cancelled'), total) + '% cancellation rate') +
      '</dl>' +
      '<h3 class="h6 ar-display fs-5 mb-2">By payment method</h3>' +
      '<div class="ar-table-wrap"><table class="table ar-table mb-0" style="min-width:0"><thead><tr><th scope="col">Method</th><th scope="col" class="text-end">Orders</th><th scope="col" class="text-end">Sales</th></tr></thead><tbody>' + methodRows + '</tbody></table></div>';
  }

  function renderStatus(r) {
    const total = r.all.length;
    if (!total) { $('rpStatus').innerHTML = empty('bi-bag', 'No orders in this period', 'Try a longer date range.'); return; }
    $('rpStatus').innerHTML = r.statusCounts.map(function (s) {
      return hbar(s.status, s.count + ' (' + pct(s.count, total) + '%)', pct(s.count, total), '', A.statusBadge(s.status));
    }).join('');
  }

  function renderType(r) {
    const total = r.pickup.orders + r.delivery.orders;
    if (!total) { $('rpType').innerHTML = empty('bi-truck', 'No orders in this period', 'Try a longer date range.'); return; }
    const pp = pct(r.pickup.orders, total), dp = 100 - pp;
    const block = function (row, icon, share) {
      return '<div class="ar-type-block"><div class="ar-type-title"><i class="bi ' + icon + '" aria-hidden="true"></i> ' + esc(row.type) + '</div>' +
        '<dl class="ar-detail-list mb-0"><div><dt>Orders</dt><dd>' + row.orders + ' (' + share + '%)</dd></div>' +
        '<div><dt>Sales</dt><dd>' + esc(peso(row.sales)) + '</dd></div>' +
        '<div><dt>Average order</dt><dd>' + esc(peso(row.orders ? Math.round(row.sales / row.orders) : 0)) + '</dd></div></dl></div>';
    };
    $('rpType').innerHTML =
      '<div class="ar-stack" role="img" aria-label="Pickup ' + pp + ' percent, delivery ' + dp + ' percent of orders"><span class="ar-stack-a" style="width:' + pp + '%"></span><span class="ar-stack-b" style="width:' + dp + '%"></span></div>' +
      '<div class="ar-stack-legend"><span><i class="ar-dot ar-dot-a"></i> Pickup ' + pp + '%</span><span><i class="ar-dot ar-dot-b"></i> Delivery ' + dp + '%</span></div>' +
      '<div class="row g-3"><div class="col-sm-6">' + block(r.pickup, 'bi-shop', pp) + '</div><div class="col-sm-6">' + block(r.delivery, 'bi-truck', dp) + '</div></div>';
  }

  function renderPopular(r) {
    const host = $('rpPopular');
    if (!r.popular.length) { host.innerHTML = empty('bi-flower3', 'No sales in this period', 'Popular products appear once orders exist in the range.'); return; }
    const max = r.popular[0].qty;
    host.innerHTML = '<ol class="ar-list">' + r.popular.slice(0, 6).map(function (p, i) {
      const prod = r.products.filter(function (x) { return x.id === p.productId; })[0];
      return '<li class="ar-list-item"><span class="ar-rank" aria-hidden="true">' + (i + 1) + '</span>' +
        '<img class="ar-thumb" src="' + esc(A.productImageSrc(prod && prod.image)) + '" alt="" width="44" height="44">' +
        '<div class="flex-grow-1 min-w-0"><div class="d-flex justify-content-between gap-2"><span class="fw-semibold text-truncate">' + esc(p.name) + '</span><span class="small flex-none">' + esc(peso(p.revenue)) + '</span></div>' +
        '<div class="small text-muted">' + p.qty + (p.qty === 1 ? ' bouquet' : ' bouquets') + ' · ' + p.stems + ' stems · ' + pct(p.revenue, r.sales) + '% of sales</div>' +
        '<div class="progress ar-progress mt-1" role="progressbar" aria-label="Orders for ' + esc(p.name) + ' compared with the top seller" aria-valuenow="' + pct(p.qty, max) + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ar-progress-bar" style="width:' + pct(p.qty, max) + '%"></div></div></div></li>';
    }).join('') + '</ol>';
  }

  function renderInventory(r) {
    const m = r.moves;
    const att = r.attention.length
      ? '<div class="ar-table-wrap"><table class="table ar-table mb-0" style="min-width:0"><thead><tr><th scope="col">Product</th><th scope="col" class="text-end">Stock</th><th scope="col" class="text-end">Alert at</th><th scope="col">Status</th></tr></thead><tbody>' +
        r.attention.map(function (p) {
          return '<tr><th scope="row" class="fw-normal">' + esc(p.name) + '</th><td class="text-end">' + p.stockQuantity + ' ' + esc(p.unit || '') + '</td><td class="text-end">' + p.lowStockThreshold + '</td><td>' + A.stockBadge(D.getStockStatus(p)) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<p class="text-muted mb-0">No products are at or below their low-stock threshold.</p>';
    const mvRow = function (label, x, signedNet) {
      return '<tr><th scope="row" class="fw-normal">' + esc(label) + '</th><td class="text-end">' + x.entries + '</td><td class="text-end">' + (signedNet && x.units > 0 ? '+' : '') + x.units + '</td></tr>';
    };
    $('rpInventory').innerHTML =
      '<dl class="ar-kpis">' +
        kpi('In stock', String(r.inStock), 'products') + kpi('Low stock', String(r.low), 'products') + kpi('Out of stock', String(r.out), 'products') +
        kpi('Stems on hand', String(r.stems), 'flower stems, current') + kpi('Add-on pieces', String(r.pieces), 'current') +
      '</dl>' +
      '<div class="row g-4"><div class="col-lg-6"><h3 class="h6 ar-display fs-5 mb-2">Needs attention (current stock)</h3>' + att + '</div>' +
      '<div class="col-lg-6"><h3 class="h6 ar-display fs-5 mb-2">Stock movement in this period</h3>' +
        '<div class="ar-table-wrap"><table class="table ar-table mb-0" style="min-width:0"><thead><tr><th scope="col">Movement</th><th scope="col" class="text-end">Entries</th><th scope="col" class="text-end">Units</th></tr></thead><tbody>' +
        mvRow('Stock added', m.added, false) + mvRow('Stock reduced', m.reduced, false) + mvRow('Spoiled or damaged', m.spoiled, false) + mvRow('Count corrections (net)', m.adjusted, true) +
        '</tbody></table></div><p class="small text-muted mt-2 mb-0">Stock levels are the current snapshot. Only movements follow the date range.</p></div></div>';
  }

  /* ============ Controls ============ */
  function periodLabel(from, to) { return A.formatDate(from) + ' to ' + A.formatDate(to); }

  function showError(msg) {
    const box = $('rpError');
    box.textContent = msg; box.hidden = !msg;
    [$('rpFrom'), $('rpTo')].forEach(function (el) {
      el.classList.toggle('is-invalid', !!msg);
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    });
  }

  function refresh() {
    const from = $('rpFrom').value, to = $('rpTo').value;
    if (!from || !to) { showError('Choose both a start and an end date.'); return; }
    if (from > to) { showError('The start date must be on or before the end date.'); return; }
    showError('');
    const r = compute(from, to);
    renderSales(r); renderOrders(r); renderStatus(r); renderType(r); renderPopular(r); renderInventory(r);
    const label = periodLabel(from, to);
    $('rpPeriod').textContent = label;
    $('printPeriod').textContent = label;
  }

  function applyPreset() {
    const preset = $('rpPreset').value;
    if (preset !== 'custom') {
      const range = presetRange(preset);
      $('rpFrom').value = range[0]; $('rpTo').value = range[1];
    }
    refresh();
  }

  function init() {
    $('pageActions').innerHTML = '<button type="button" class="btn btn-primary" id="printReportBtn"><i class="bi bi-printer me-1" aria-hidden="true"></i>Print report</button>';
    $('printReportBtn').addEventListener('click', function () {
      $('printGenerated').textContent = A.formatDateTime(new Date().toISOString());
      window.print();
    });
    // Always print in the light theme so text stays readable on paper.
    window.addEventListener('beforeprint', function () {
      $('printGenerated').textContent = A.formatDateTime(new Date().toISOString());
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-bs-theme', 'light');
    });
    window.addEventListener('afterprint', function () { A.applyTheme(A.getTheme()); });

    $('rpPreset').addEventListener('change', applyPreset);
    ['rpFrom', 'rpTo'].forEach(function (id) {
      $(id).addEventListener('change', function () { $('rpPreset').value = 'custom'; refresh(); });
    });
    $('rpReset').addEventListener('click', function () { $('rpPreset').value = '30'; applyPreset(); });
    applyPreset();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
