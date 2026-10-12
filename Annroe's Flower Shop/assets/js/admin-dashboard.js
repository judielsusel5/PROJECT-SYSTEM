/* admin-dashboard.js — dashboard logic. Every number is calculated from the shared mock data. */
(function () {
  'use strict';

  const A = AnnroeAdmin;
  const D = AnnroeData;
  const esc = A.escapeHtml;

  /* ---------- Calculations (no rendering here) ---------- */
  function computeDashboard() {
    const products = D.getProducts();
    const orders = D.getOrders();
    const schedules = D.getSchedules();
    const today = D.todayISO();
    const weekEnd = D.addDays(today, 7);

    const counted = orders.filter(function (o) { return o.status !== 'Cancelled'; });
    const scheduleOf = function (o) { return D.getScheduleForOrder(o.id, schedules); };

    // "Today's sales" = value of non-cancelled orders placed today (booked sales, paid or not).
    const todays = counted.filter(function (o) { return o.orderDate === today; });

    const upcoming = orders.filter(function (o) {
      const s = scheduleOf(o);
      return D.isOpenOrder(o) && s && s.scheduledDate >= today && s.scheduledDate <= weekEnd;
    });
    const overdue = orders.filter(function (o) {
      const s = scheduleOf(o);
      return D.isOpenOrder(o) && s && s.scheduledDate < today;
    });

    const lowStock = products.filter(function (p) { return D.getStockStatus(p) !== 'In Stock'; });
    const outCount = lowStock.filter(function (p) { return D.getStockStatus(p) === 'Out of Stock'; }).length;

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = D.addDays(today, -i);
      const dayOrders = counted.filter(function (o) { return o.orderDate === date; });
      days.push({ date: date, total: dayOrders.reduce(function (s, o) { return s + o.totalAmount; }, 0), count: dayOrders.length });
    }
    const weekOrders = counted.filter(function (o) { return o.orderDate >= days[0].date && o.orderDate <= today; });
    const weekTotal = weekOrders.reduce(function (s, o) { return s + o.totalAmount; }, 0);
    const collected = weekOrders.filter(function (o) { return o.paymentStatus === 'Paid'; })
      .reduce(function (s, o) { return s + o.totalAmount; }, 0);

    const byProduct = {};
    counted.forEach(function (o) {
      o.items.forEach(function (it) {
        const row = byProduct[it.productId] || (byProduct[it.productId] = { productId: it.productId, name: it.name, qty: 0, revenue: 0 });
        row.qty += it.qty;
        row.revenue += it.qty * it.unitPrice;
      });
    });
    const popular = Object.keys(byProduct).map(function (k) { return byProduct[k]; })
      .sort(function (a, b) { return b.qty - a.qty || b.revenue - a.revenue; }).slice(0, 5);

    return {
      products: products, orders: orders, schedules: schedules, today: today,
      totalOrders: orders.length,
      pending: orders.filter(function (o) { return o.status === 'Pending'; }).length,
      completed: orders.filter(function (o) { return o.status === 'Completed'; }).length,
      todaysSales: todays.reduce(function (s, o) { return s + o.totalAmount; }, 0),
      todaysCount: todays.length,
      lowStock: lowStock, outCount: outCount,
      upcoming: upcoming, overdue: overdue,
      days: days, weekTotal: weekTotal, weekCount: weekOrders.length, collected: collected,
      popular: popular
    };
  }

  /* ---------- Rendering ---------- */
  function statCard(href, icon, tone, value, label, hint) {
    return '<div class="col-12 col-sm-6 col-xl-4"><a class="ar-card ar-stat ar-stat-link" href="' + href + '">' +
      '<span class="ar-stat-icon ' + tone + '"><i class="bi ' + icon + '" aria-hidden="true"></i></span>' +
      '<div class="min-w-0"><div class="ar-stat-value">' + esc(value) + '</div>' +
      '<div class="ar-stat-label">' + esc(label) + '</div>' +
      '<div class="ar-stat-hint">' + esc(hint) + '</div></div></a></div>';
  }

  function renderStats(d) {
    const upcomingPickups = d.upcoming.filter(function (o) { return o.fulfillment === 'Pickup'; }).length;
    const upcomingDeliveries = d.upcoming.length - upcomingPickups;
    document.getElementById('dashStats').innerHTML = [
      statCard('orders.html', 'bi-bag-heart', '', d.totalOrders, 'Total orders', 'All orders on record'),
      statCard('orders.html?status=Pending', 'bi-hourglass-split', 'amber', d.pending, 'Pending orders', 'Waiting to be confirmed'),
      statCard('orders.html?status=Completed', 'bi-check2-circle', 'sage', d.completed, 'Completed orders', 'Picked up or delivered'),
      statCard('reports.html', 'bi-cash-coin', '', A.formatPeso(d.todaysSales), "Today's sales", d.todaysCount + (d.todaysCount === 1 ? ' order' : ' orders') + ' placed today'),
      statCard('inventory.html', 'bi-exclamation-triangle', 'amber', d.lowStock.length, 'Low stock products', d.outCount ? 'Includes ' + d.outCount + ' out of stock' : 'At or below threshold'),
      statCard('schedules.html?view=upcoming', 'bi-calendar-check', 'sage', d.upcoming.length, 'Upcoming pickups and deliveries',
        'Next 7 days: ' + upcomingPickups + ' pickup, ' + upcomingDeliveries + ' delivery')
    ].join('');
  }

  function renderSales(d) {
    const max = Math.max.apply(null, d.days.map(function (x) { return x.total; }).concat([1]));
    const bars = d.days.map(function (x) {
      const pct = Math.round((x.total / max) * 100);
      const isToday = x.date === d.today;
      return '<li class="ar-bar-col' + (isToday ? ' is-today' : '') + '">' +
        '<span class="ar-bar-value">' + (x.total ? esc(A.formatPeso(x.total)) : '—') + '</span>' +
        '<span class="ar-bar-track"><span class="ar-bar" style="height:' + Math.max(pct, x.total ? 4 : 0) + '%"></span></span>' +
        '<span class="ar-bar-label">' + esc(isToday ? 'Today' : A.weekdayShort(x.date)) + '</span>' +
        '<span class="visually-hidden">' + esc(A.formatDate(x.date)) + ': ' + x.count + ' orders, ' + esc(A.formatPeso(x.total)) + '</span></li>';
    }).join('');
    const avg = d.weekCount ? d.weekTotal / d.weekCount : 0;
    document.getElementById('dashSales').innerHTML =
      '<ol class="ar-bars" aria-label="Daily sales for the last 7 days">' + bars + '</ol>' +
      '<dl class="ar-summary-grid mb-0">' +
        '<div><dt>7-day sales</dt><dd>' + esc(A.formatPeso(d.weekTotal)) + '</dd></div>' +
        '<div><dt>Orders</dt><dd>' + d.weekCount + '</dd></div>' +
        '<div><dt>Average order</dt><dd>' + esc(A.formatPeso(Math.round(avg))) + '</dd></div>' +
        '<div><dt>Paid so far</dt><dd>' + esc(A.formatPeso(d.collected)) + '</dd></div>' +
      '</dl>';
  }

  function renderRecent(d) {
    const rows = d.orders.slice().sort(function (a, b) {
      return a.orderDate < b.orderDate ? 1 : a.orderDate > b.orderDate ? -1 : (a.id < b.id ? 1 : -1);
    }).slice(0, 6);
    const host = document.getElementById('dashRecent');
    if (!rows.length) { host.innerHTML = emptyState('bi-bag', 'No orders yet', 'New orders will appear here.'); return; }
    host.innerHTML =
      '<table class="table table-hover ar-table"><thead><tr>' +
      '<th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Date</th><th scope="col" class="text-end">Total</th><th scope="col">Type</th><th scope="col">Status</th></tr></thead><tbody>' +
      rows.map(function (o) {
        return '<tr><th scope="row" class="fw-semibold text-nowrap"><a href="orders.html?order=' + esc(o.id) + '">' + esc(o.id) + '</a></th>' +
          '<td class="text-nowrap">' + esc(o.customerName) + '</td><td class="text-nowrap">' + esc(A.formatDateShort(o.orderDate)) + '</td>' +
          '<td class="text-end text-nowrap">' + esc(A.formatPeso(o.totalAmount)) + '</td>' +
          '<td class="text-nowrap"><i class="bi ' + (o.fulfillment === 'Delivery' ? 'bi-truck' : 'bi-shop') + ' me-1" aria-hidden="true"></i>' + esc(o.fulfillment) + '</td>' +
          '<td>' + A.statusBadge(o.status) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function renderUpcoming(d) {
    const entries = d.overdue.concat(d.upcoming).map(function (o) {
      return { order: o, schedule: D.getScheduleForOrder(o.id, d.schedules) };
    }).sort(function (a, b) {
      const ka = a.schedule.scheduledDate + a.schedule.scheduledTime;
      const kb = b.schedule.scheduledDate + b.schedule.scheduledTime;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    }).slice(0, 6);
    const host = document.getElementById('dashUpcoming');
    if (!entries.length) { host.innerHTML = emptyState('bi-calendar-x', 'Nothing scheduled', 'No open pickups or deliveries in the next 7 days.'); return; }
    host.innerHTML = '<ul class="ar-list">' + entries.map(function (e) {
      const s = e.schedule, o = e.order;
      const isOverdue = s.scheduledDate < d.today;
      const isToday = s.scheduledDate === d.today;
      const when = (isToday ? 'Today' : A.formatDateShort(s.scheduledDate)) + ', ' + A.formatTime(s.scheduledTime);
      return '<li class="ar-list-item">' +
        '<span class="ar-list-icon"><i class="bi ' + (o.fulfillment === 'Delivery' ? 'bi-truck' : 'bi-shop') + '" aria-hidden="true"></i></span>' +
        '<div class="flex-grow-1 min-w-0"><div class="fw-semibold text-truncate">' + esc(o.id) + ' · ' + esc(o.customerName) + '</div>' +
        '<div class="small text-muted">' + esc(o.fulfillment) + ' · ' + esc(when) + '</div>' +
        '<div class="mt-1 d-flex flex-wrap gap-1">' + A.statusBadge(o.status) +
        (isOverdue ? ' <span class="ar-badge ar-badge--cancelled">Overdue</span>' : '') +
        (isToday ? ' <span class="ar-badge ar-badge--pending">Today</span>' : '') + '</div></div></li>';
    }).join('') + '</ul>';
  }

  function renderLowStock(d) {
    const host = document.getElementById('dashLowStock');
    if (!d.lowStock.length) { host.innerHTML = emptyState('bi-check2-circle', 'Stock looks healthy', 'No products are at or below their low-stock threshold.'); return; }
    const sorted = d.lowStock.slice().sort(function (a, b) { return a.stockQuantity / a.lowStockThreshold - b.stockQuantity / b.lowStockThreshold; });
    host.innerHTML = '<ul class="ar-list">' + sorted.map(function (p) {
      const status = D.getStockStatus(p);
      const pct = Math.min(100, Math.round((p.stockQuantity / p.lowStockThreshold) * 100));
      return '<li class="ar-list-item">' +
        '<img class="ar-thumb" src="' + esc(A.productImageSrc(p.image)) + '" alt="' + esc(p.name) + '" width="44" height="44">' +
        '<div class="flex-grow-1 min-w-0"><div class="d-flex justify-content-between gap-2"><span class="fw-semibold text-truncate">' + esc(p.name) + '</span>' + A.stockBadge(status) + '</div>' +
        '<div class="small text-muted">' + p.stockQuantity + ' ' + esc(p.unit || 'units') + ' left · alert at ' + p.lowStockThreshold + '</div>' +
        '<div class="progress ar-progress mt-1" role="progressbar" aria-label="Stock level for ' + esc(p.name) + '" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ar-progress-bar ' + (status === 'Out of Stock' ? 'is-out' : 'is-low') + '" style="width:' + pct + '%"></div></div></div></li>';
    }).join('') + '</ul>';
  }

  function renderPopular(d) {
    const host = document.getElementById('dashPopular');
    if (!d.popular.length) { host.innerHTML = emptyState('bi-flower3', 'No sales yet', 'Popular products appear once orders are placed.'); return; }
    const max = d.popular[0].qty;
    host.innerHTML = '<ol class="ar-list">' + d.popular.map(function (p, i) {
      const product = d.products.filter(function (x) { return x.id === p.productId; })[0];
      return '<li class="ar-list-item">' +
        '<img class="ar-thumb" src="' + esc(A.productImageSrc(product && product.image)) + '" alt="' + esc(p.name) + '" width="44" height="44">' +
        '<div class="flex-grow-1 min-w-0"><div class="d-flex justify-content-between gap-2"><span class="fw-semibold text-truncate">' + esc(p.name) + '</span>' +
        '<span class="text-muted small flex-none">' + esc(A.formatPeso(p.revenue)) + '</span></div>' +
        '<div class="small text-muted">' + p.qty + (p.qty === 1 ? ' bouquet ordered' : ' bouquets ordered') + '</div>' +
        '<div class="progress ar-progress mt-1" role="progressbar" aria-label="Share of top seller for ' + esc(p.name) + '" aria-valuenow="' + Math.round(p.qty / max * 100) + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ar-progress-bar" style="width:' + Math.round(p.qty / max * 100) + '%"></div></div></div></li>';
    }).join('') + '</ol>';
  }

  function emptyState(icon, title, text) {
    return '<div class="ar-empty"><i class="bi ' + icon + '" aria-hidden="true"></i><h3>' + esc(title) + '</h3><p class="mb-0">' + esc(text) + '</p></div>';
  }

  function renderAll() {
    const d = computeDashboard();
    renderStats(d); renderSales(d); renderRecent(d); renderUpcoming(d); renderLowStock(d); renderPopular(d);
  }

  /* ---------- Page action: reset demo data ---------- */
  function addPageActions() {
    const host = document.getElementById('pageActions');
    if (!host) return;
    host.innerHTML =
      '<span class="text-muted align-self-center me-2">' + esc(new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })) + '</span>' +
      '<button type="button" class="btn btn-outline-primary" id="resetDemoBtn"><i class="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>Reset sample data</button>';
    document.getElementById('resetDemoBtn').addEventListener('click', function () {
      A.confirmAction({
        title: 'Reset sample data?',
        message: 'Replace products, stock history, orders, and schedules with fresh samples dated today? Theme and settings will stay unchanged.',
        confirmLabel: 'Reset sample data', danger: true
      }).then(function (ok) {
        if (!ok) return;
        D.resetDemoData();
        try { sessionStorage.setItem('annerore_admin_flash', 'Sample data was reset.'); } catch (e) { /* ignore */ }
        window.location.reload();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    addPageActions();
    renderAll();
    try {
      const flash = sessionStorage.getItem('annerore_admin_flash');
      if (flash) { sessionStorage.removeItem('annerore_admin_flash'); A.showToast(flash, 'success'); }
    } catch (e) { /* ignore */ }
  });
})();
