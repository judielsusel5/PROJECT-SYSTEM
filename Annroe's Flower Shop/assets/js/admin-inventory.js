/* admin-inventory.js — flower stock, adjustments and movement history.
   Rule: stock can never go negative. Every stock change updates the product AND writes a history entry. */
(function () {
  'use strict';

  const A = AnnroeAdmin;
  const D = AnnroeData;
  const esc = A.escapeHtml;
  const $ = function (id) { return document.getElementById(id); };

  const MAX_STOCK = 100000;
  const HISTORY_PAGE = 15;
  const TYPE_BADGE = { 'Addition': 'ready', 'Reduction': 'confirmed', 'Spoilage/Damaged': 'cancelled', 'Adjustment': 'pending' };
  const REASONS = {
    'Addition': ['Weekly flower delivery received', 'Supplier delivery received', 'Returned unused stock'],
    'Reduction': ['Used for orders', 'Used for a display arrangement', 'Sample or giveaway'],
    'Spoilage/Damaged': ['Wilted stems removed', 'Damaged in transport', 'Petals browning'],
    'Adjustment': ['Physical stock count correction', 'Data entry correction']
  };

  let historyLimit = HISTORY_PAGE;
  let adjustModal;

  /* ============ Data helpers ============ */
  function products() { return D.getProducts(); }
  function movements() { return D.getMovements(); }
  function findProduct(id) { return products().filter(function (p) { return p.id === id; })[0]; }
  function productName(id) {
    const p = findProduct(id);
    return p ? p.name : 'Deleted product (' + id + ')';
  }
  function lastUpdated(p, moves) {
    const mine = moves.filter(function (m) { return m.productId === p.id; })
      .map(function (m) { return m.date; }).sort();
    return mine.length ? mine[mine.length - 1] : p.updatedAt;
  }
  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }

  /* ============ Rendering ============ */
  function renderStats() {
    const list = products();
    const count = function (s) { return list.filter(function (p) { return D.getStockStatus(p) === s; }).length; };
    const card = function (icon, tone, value, label, status) {
      return '<div class="col-6 col-xl-3"><button type="button" class="ar-card ar-stat ar-stat-btn" data-action="filter-status" data-status="' + esc(status) + '">' +
        '<span class="ar-stat-icon ' + tone + '"><i class="bi ' + icon + '" aria-hidden="true"></i></span>' +
        '<span class="min-w-0"><span class="ar-stat-value d-block">' + value + '</span><span class="ar-stat-label d-block">' + esc(label) + '</span></span></button></div>';
    };
    $('invStats').innerHTML =
      card('bi-box-seam', '', list.length, 'Products tracked', '') +
      card('bi-check2-circle', 'sage', count('In Stock'), 'In stock', 'In Stock') +
      card('bi-exclamation-triangle', 'amber', count('Low Stock'), 'Low stock', 'Low Stock') +
      card('bi-x-octagon', '', count('Out of Stock'), 'Out of stock', 'Out of Stock');
  }

  function renderAlerts() {
    const low = products().filter(function (p) { return D.getStockStatus(p) !== 'In Stock'; })
      .sort(function (a, b) { return a.stockQuantity / Math.max(a.lowStockThreshold, 1) - b.stockQuantity / Math.max(b.lowStockThreshold, 1); });
    const host = $('invAlerts');
    if (!low.length) {
      host.innerHTML = '<div class="ar-empty"><i class="bi bi-check2-circle" aria-hidden="true"></i><h3>Stock looks healthy</h3><p class="mb-0">No products are at or below their low-stock threshold.</p></div>';
      return;
    }
    host.innerHTML = '<ul class="ar-list">' + low.map(function (p) {
      const status = D.getStockStatus(p);
      const pct = p.lowStockThreshold ? Math.min(100, Math.round(p.stockQuantity / p.lowStockThreshold * 100)) : 0;
      return '<li class="ar-list-item">' +
        '<img class="ar-thumb" src="' + esc(A.productImageSrc(p.image)) + '" alt="" width="44" height="44">' +
        '<div class="flex-grow-1 min-w-0"><div class="d-flex flex-wrap justify-content-between gap-2"><span class="fw-semibold">' + esc(p.name) + '</span>' + A.stockBadge(status) + '</div>' +
        '<div class="small text-muted">' + p.stockQuantity + ' ' + esc(p.unit || '') + ' left · alert at ' + p.lowStockThreshold + '</div>' +
        '<div class="progress ar-progress mt-1" role="progressbar" aria-label="Stock level for ' + esc(p.name) + '" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ar-progress-bar ' + (status === 'Out of Stock' ? 'is-out' : 'is-low') + '" style="width:' + pct + '%"></div></div></div>' +
        '<button type="button" class="btn btn-sm btn-primary flex-none" data-action="restock" data-id="' + esc(p.id) + '"><i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Restock<span class="visually-hidden"> ' + esc(p.name) + '</span></button></li>';
    }).join('') + '</ul>';
  }

  function visibleStock() {
    const q = $('invSearch').value.trim().toLowerCase();
    const status = $('invStatus').value;
    const sort = $('invSort').value;
    const rank = { 'Out of Stock': 0, 'Low Stock': 1, 'In Stock': 2 };
    const list = products().filter(function (p) {
      if (status && D.getStockStatus(p) !== status) return false;
      return !q || [p.name, p.id, p.flowerType, p.color].join(' ').toLowerCase().indexOf(q) > -1;
    });
    list.sort(function (a, b) {
      if (sort === 'stock-asc') return a.stockQuantity - b.stockQuantity;
      if (sort === 'stock-desc') return b.stockQuantity - a.stockQuantity;
      if (sort === 'attention') return rank[D.getStockStatus(a)] - rank[D.getStockStatus(b)] || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    });
    return list;
  }

  function renderStock() {
    const list = visibleStock();
    const moves = movements();
    const total = products().length;
    $('invCount').textContent = 'Showing ' + list.length + ' of ' + total + (total === 1 ? ' product' : ' products');
    const host = $('invTable');
    if (!list.length) {
      host.innerHTML = '<div class="ar-empty"><i class="bi bi-search" aria-hidden="true"></i><h3>No matching products</h3><p class="mb-3">Try a different search or clear the filters.</p><button type="button" class="btn btn-outline-primary btn-sm" data-action="clear-stock">Clear filters</button></div>';
      return;
    }
    host.innerHTML =
      '<table class="table table-hover ar-table ar-inv-table"><caption class="visually-hidden">Flower stock levels</caption><thead><tr>' +
      '<th scope="col">Product</th><th scope="col">Flower type</th><th scope="col">Color</th><th scope="col" class="text-end">Current stock</th>' +
      '<th scope="col" class="text-end">Low stock threshold</th><th scope="col">Status</th><th scope="col">Last updated</th><th scope="col" class="text-end">Actions</th></tr></thead><tbody>' +
      list.map(function (p) {
        return '<tr><th scope="row"><div class="d-flex align-items-center gap-2"><img class="ar-thumb" src="' + esc(A.productImageSrc(p.image)) + '" alt="" width="44" height="44" loading="lazy">' +
          '<div class="min-w-0"><div class="fw-semibold">' + esc(p.name) + '</div><div class="small text-muted">' + esc(p.id) + '</div></div></div></th>' +
          '<td>' + esc(p.flowerType) + '</td><td>' + esc(p.color) + '</td>' +
          '<td class="text-end fw-semibold">' + p.stockQuantity + ' <span class="small fw-normal text-muted">' + esc(p.unit || '') + '</span></td>' +
          '<td class="text-end">' + p.lowStockThreshold + '</td>' +
          '<td>' + A.stockBadge(D.getStockStatus(p)) + '</td>' +
          '<td class="small">' + esc(A.formatDateTime(lastUpdated(p, moves))) + '</td>' +
          '<td class="text-end text-nowrap">' +
            '<button type="button" class="btn btn-sm btn-primary me-1" data-action="adjust" data-id="' + esc(p.id) + '"><i class="bi bi-sliders2 me-1" aria-hidden="true"></i>Adjust<span class="visually-hidden"> ' + esc(p.name) + '</span></button>' +
            '<button type="button" class="btn btn-sm btn-rose" data-action="history" data-id="' + esc(p.id) + '" aria-label="View stock history: ' + esc(p.name) + '"><i class="bi bi-clock-history" aria-hidden="true"></i></button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function populateHistoryFilter() {
    const current = $('histProduct').value;
    const list = products();
    const ids = list.map(function (p) { return p.id; });
    const options = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
      .map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; });
    // History for deleted products stays visible, so list those ids too.
    const orphan = {};
    movements().forEach(function (m) { if (ids.indexOf(m.productId) === -1) orphan[m.productId] = true; });
    Object.keys(orphan).forEach(function (id) { options.push('<option value="' + esc(id) + '">Deleted product (' + esc(id) + ')</option>'); });
    $('histProduct').innerHTML = '<option value="">All products</option>' + options.join('');
    $('histProduct').value = current;
    if ($('histProduct').value !== current) $('histProduct').value = '';
  }

  function visibleHistory() {
    const pid = $('histProduct').value, type = $('histType').value;
    return movements().filter(function (m) { return (!pid || m.productId === pid) && (!type || m.type === type); })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1); });
  }

  function renderHistory() {
    const all = visibleHistory();
    const shown = all.slice(0, historyLimit);
    $('histCount').textContent = all.length ? 'Showing ' + shown.length + ' of ' + all.length : '';
    $('histMoreWrap').hidden = all.length <= shown.length;
    const host = $('histTable');
    if (!all.length) {
      host.innerHTML = '<div class="ar-empty"><i class="bi bi-clock-history" aria-hidden="true"></i><h3>No stock movements</h3><p class="mb-0">Adjustments you record will appear here.</p></div>';
      return;
    }
    host.innerHTML =
      '<table class="table table-hover ar-table ar-hist-table"><caption class="visually-hidden">Stock movement history, newest first</caption><thead><tr>' +
      '<th scope="col">Date and time</th><th scope="col">Product</th><th scope="col">Type</th><th scope="col" class="text-end">Change</th>' +
      '<th scope="col" class="text-end">Balance after</th><th scope="col">Reason</th><th scope="col">Recorded by</th></tr></thead><tbody>' +
      shown.map(function (m) {
        return '<tr><td class="small text-nowrap">' + esc(A.formatDateTime(m.date)) + '</td>' +
          '<td>' + esc(productName(m.productId)) + '<div class="small text-muted">' + esc(m.id) + '</div></td>' +
          '<td><span class="ar-badge ar-badge--' + (TYPE_BADGE[m.type] || 'unpaid') + '">' + esc(m.type) + '</span></td>' +
          '<td class="text-end fw-semibold ' + (m.change > 0 ? 'ar-change-up' : m.change < 0 ? 'ar-change-down' : '') + '">' + signed(m.change) + '</td>' +
          '<td class="text-end">' + m.balanceAfter + '</td>' +
          '<td>' + esc(m.reason) + '</td><td class="small">' + esc(m.recordedBy || '') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function renderAll() {
    renderStats(); renderAlerts(); renderStock(); populateHistoryFilter(); renderHistory();
  }

  /* ============ Adjust stock modal ============ */
  function currentType() { return $('adType').value; }
  function parseQty() {
    const t = $('adQty').value.trim();
    return t === '' ? NaN : Number(t);
  }
  function computeResult(p) {
    const qty = parseQty(), type = currentType();
    if (!p || !isFinite(qty) || !Number.isInteger(qty) || qty < 0) return null;
    const change = type === 'Addition' ? qty : type === 'Adjustment' ? qty - p.stockQuantity : -qty;
    return { change: change, newStock: p.stockQuantity + change };
  }

  function refreshAdjustUi() {
    const p = findProduct($('adProduct').value);
    const type = currentType();
    $('adQtyLabel').textContent = type === 'Adjustment' ? 'New stock count *' : 'Quantity *';
    $('reasonList').innerHTML = REASONS[type].map(function (r) { return '<option value="' + esc(r) + '"></option>'; }).join('');
    $('adCurrent').textContent = p
      ? 'Current stock: ' + p.stockQuantity + ' ' + (p.unit || '') + ' · low-stock alert at ' + p.lowStockThreshold + ' · ' + D.getStockStatus(p)
      : '';
    const r = computeResult(p);
    const box = $('adPreview');
    if (!p || !r) { box.innerHTML = ''; return; }
    if (r.newStock < 0) {
      box.innerHTML = '<i class="bi bi-exclamation-octagon" aria-hidden="true"></i> This would leave ' + r.newStock + ' in stock, which is not allowed.';
      box.className = 'ar-preview is-bad';
      return;
    }
    const after = D.getStockStatus(Object.assign({}, p, { stockQuantity: r.newStock }));
    box.className = 'ar-preview';
    box.innerHTML = '<span>' + p.stockQuantity + ' → <strong>' + r.newStock + '</strong> ' + esc(p.unit || '') + ' (' + signed(r.change) + ')</span> ' + A.stockBadge(after);
  }

  function openAdjust(productId, type) {
    A.clearFieldErrors($('adjustForm'));
    $('adjustForm').reset();
    $('adProduct').innerHTML = '<option value="">Choose a product</option>' +
      products().sort(function (a, b) { return a.name.localeCompare(b.name); })
        .map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('');
    $('adProduct').value = productId || '';
    $('adType').value = type || 'Addition';
    $('adQty').value = '';
    refreshAdjustUi();
    adjustModal.show();
  }

  function validateAdjust() {
    A.clearFieldErrors($('adjustForm'));
    let first = null;
    const bad = function (el, msg) { A.setFieldError(el, msg); if (!first) first = el; };
    const p = findProduct($('adProduct').value);
    const type = currentType();
    const qty = parseQty();

    if (!p) bad($('adProduct'), 'Choose a product.');
    if (!isFinite(qty)) bad($('adQty'), type === 'Adjustment' ? 'Enter the new stock count.' : 'Enter a quantity.');
    else if (!Number.isInteger(qty)) bad($('adQty'), 'Use a whole number.');
    else if (qty < 0) bad($('adQty'), 'The number cannot be negative.');
    else if (type !== 'Adjustment' && qty < 1) bad($('adQty'), 'Enter at least 1.');
    else if (qty > MAX_STOCK) bad($('adQty'), 'That number is too large.');
    else if (p) {
      const r = computeResult(p);
      if (r.newStock < 0) bad($('adQty'), 'You cannot remove more than the current stock (' + p.stockQuantity + ').');
      else if (r.newStock > MAX_STOCK) bad($('adQty'), 'The resulting stock would be too large.');
      else if (r.change === 0) bad($('adQty'), 'That is the same as the current stock. Nothing to change.');
    }
    const reason = $('adReason').value.trim();
    if (!reason) bad($('adReason'), 'Enter a reason for this change.');
    else if (reason.length < 3) bad($('adReason'), 'Add a little more detail (at least 3 characters).');

    if (first) { first.focus(); return null; }
    return { product: p, type: type, change: computeResult(p).change, reason: reason };
  }

  function saveAdjust(event) {
    event.preventDefault();
    const v = validateAdjust();
    if (!v) return;
    const list = products();
    const p = list.filter(function (x) { return x.id === v.product.id; })[0];
    const before = p.stockQuantity;
    p.stockQuantity = before + v.change;
    p.updatedAt = new Date().toISOString();
    if (!D.saveProducts(list)) { A.showToast('Could not save. Browser storage may be full or blocked.', 'danger'); return; }

    const moves = movements();
    moves.push({
      id: D.nextId('MOV-', moves), productId: p.id, type: v.type, change: v.change, balanceAfter: p.stockQuantity,
      reason: v.reason, date: p.updatedAt, recordedBy: 'Shop Admin'
    });
    if (!D.saveMovements(moves)) {
      p.stockQuantity = before;               // keep product and history consistent
      D.saveProducts(list);
      A.showToast('Could not save the history entry, so the change was cancelled.', 'danger');
      return;
    }

    A.hideModal($('adjustModal'));
    historyLimit = HISTORY_PAGE;
    renderAll();
    A.refreshNotifications();
    A.showToast('Stock adjusted: ' + p.name + ' ' + before + ' → ' + p.stockQuantity + '.', 'success');
    const status = D.getStockStatus(p);
    if (status !== 'In Stock') A.showToast(p.name + ' is now ' + status.toLowerCase() + '.', 'warning');
  }

  /* ============ Wiring ============ */
  function clearStockFilters() {
    $('invSearch').value = ''; $('invStatus').value = ''; $('invSort').value = 'name'; renderStock();
  }

  function init() {
    adjustModal = new bootstrap.Modal($('adjustModal'));
    renderAll();
    $('pageActions').innerHTML = '<button type="button" class="btn btn-primary" data-action="adjust"><i class="bi bi-sliders2 me-1" aria-hidden="true"></i>Adjust stock</button>';

    $('invSearch').addEventListener('input', renderStock);
    $('invStatus').addEventListener('change', renderStock);
    $('invSort').addEventListener('change', renderStock);
    $('invClear').addEventListener('click', clearStockFilters);
    $('histProduct').addEventListener('change', function () { historyLimit = HISTORY_PAGE; renderHistory(); });
    $('histType').addEventListener('change', function () { historyLimit = HISTORY_PAGE; renderHistory(); });
    $('histClear').addEventListener('click', function () { $('histProduct').value = ''; $('histType').value = ''; historyLimit = HISTORY_PAGE; renderHistory(); });
    $('histMore').addEventListener('click', function () { historyLimit += HISTORY_PAGE; renderHistory(); });

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      if (a === 'adjust') openAdjust(btn.dataset.id || '', 'Addition');
      else if (a === 'restock') openAdjust(btn.dataset.id, 'Addition');
      else if (a === 'clear-stock') clearStockFilters();
      else if (a === 'filter-status') { $('invStatus').value = btn.dataset.status; renderStock(); $('invTitle').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else if (a === 'history') {
        $('histProduct').value = btn.dataset.id; $('histType').value = ''; historyLimit = HISTORY_PAGE; renderHistory();
        $('historyCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('histTitle').focus({ preventScroll: true });
      }
    });

    $('adjustForm').addEventListener('submit', saveAdjust);
    ['adProduct', 'adType', 'adQty'].forEach(function (id) {
      $(id).addEventListener(id === 'adQty' ? 'input' : 'change', refreshAdjustUi);
    });
    $('adjustForm').addEventListener('input', function (e) {
      if (e.target.classList.contains('is-invalid')) { e.target.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
