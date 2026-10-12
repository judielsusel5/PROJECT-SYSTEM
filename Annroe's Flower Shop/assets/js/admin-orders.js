/* admin-orders.js — order management (mock data in LocalStorage). No real payment processing. */
(function () {
  'use strict';

  const A = AnnroeAdmin;
  const D = AnnroeData;
  const esc = A.escapeHtml;
  const $ = function (id) { return document.getElementById(id); };

  const STEP_LABEL = {
    'Confirmed': 'Confirm', 'Preparing': 'Start preparing', 'Ready for Pickup': 'Mark ready',
    'Out for Delivery': 'Send out', 'Completed': 'Complete'
  };

  let detailModal;
  let openOrderId = null;

  /* ============ Business rules ============ */
  function nextStatus(o) {
    switch (o.status) {
      case 'Pending': return 'Confirmed';
      case 'Confirmed': return 'Preparing';
      case 'Preparing': return o.fulfillment === 'Delivery' ? 'Out for Delivery' : 'Ready for Pickup';
      case 'Ready for Pickup':
      case 'Out for Delivery': return 'Completed';
      default: return null;
    }
  }
  function allowedStatuses(o) {
    if (!D.isOpenOrder(o)) return [];
    const list = [nextStatus(o)];
    list.push('Cancelled');
    return list;
  }
  function allowedPayments(o) {
    if (o.paymentStatus === 'Unpaid') return o.status === 'Cancelled' ? [] : ['Paid'];
    if (o.paymentStatus === 'Paid') return (o.status === 'Completed' || o.status === 'Cancelled') ? ['Refunded'] : ['Refunded', 'Unpaid'];
    return [];   // Refunded is final
  }

  /* ============ Data helpers ============ */
  function orders() { return D.getOrders(); }
  function findOrder(id) { return orders().filter(function (o) { return o.id === id; })[0]; }
  function scheduleOf(o, schedules) { return D.getScheduleForOrder(o.id, schedules); }
  function itemsSummary(o) {
    const first = o.items[0];
    if (!first) return '—';
    const text = first.name + ' (' + first.option + ') ×' + first.qty;
    return o.items.length > 1 ? text + ' +' + (o.items.length - 1) + ' more' : text;
  }

  /* ============ Filtering + table ============ */
  function visibleOrders() {
    const schedules = D.getSchedules();
    const q = $('ordSearch').value.trim().toLowerCase();
    const status = $('ordStatus').value, type = $('ordType').value;
    const date = $('ordDate').value, mode = $('ordDateMode').value, sort = $('ordSort').value;

    const list = orders().filter(function (o) {
      if (status && o.status !== status) return false;
      if (type && o.fulfillment !== type) return false;
      if (q && (o.id + ' ' + o.customerName).toLowerCase().indexOf(q) === -1) return false;
      if (date) {
        const s = scheduleOf(o, schedules);
        const target = mode === 'scheduled' ? (s && s.scheduledDate) : o.orderDate;
        if (target !== date) return false;
      }
      return true;
    });

    const key = function (o) { const s = scheduleOf(o, schedules); return s ? s.scheduledDate + s.scheduledTime : '9999'; };
    list.sort(function (a, b) {
      if (sort === 'oldest') return a.orderDate < b.orderDate ? -1 : a.orderDate > b.orderDate ? 1 : (a.id < b.id ? -1 : 1);
      if (sort === 'scheduled') return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
      if (sort === 'total-desc') return b.totalAmount - a.totalAmount;
      return a.orderDate < b.orderDate ? 1 : a.orderDate > b.orderDate ? -1 : (a.id < b.id ? 1 : -1);
    });
    return list;
  }

  function renderTable() {
    const list = visibleOrders();
    const total = orders().length;
    const schedules = D.getSchedules();
    $('orderCount').textContent = 'Showing ' + list.length + ' of ' + total + (total === 1 ? ' order' : ' orders');
    const host = $('orderTable');

    if (!list.length) {
      host.innerHTML = total
        ? '<div class="ar-empty"><i class="bi bi-search" aria-hidden="true"></i><h3>No matching orders</h3><p class="mb-3">Try a different search or clear the filters.</p><button type="button" class="btn btn-outline-primary btn-sm" data-action="clear">Clear filters</button></div>'
        : '<div class="ar-empty"><i class="bi bi-bag" aria-hidden="true"></i><h3>No orders yet</h3><p class="mb-0">Orders will appear here once customers place them.</p></div>';
      return;
    }

    host.innerHTML =
      '<table class="table table-hover ar-table ar-orders-table"><caption class="visually-hidden">Order list</caption><thead><tr>' +
      '<th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Order date</th><th scope="col">Items</th>' +
      '<th scope="col" class="text-end">Total</th><th scope="col">Type</th><th scope="col">Scheduled date</th><th scope="col">Time</th>' +
      '<th scope="col">Payment method</th><th scope="col">Payment</th><th scope="col">Status</th><th scope="col" class="text-end">Actions</th></tr></thead><tbody>' +
      list.map(function (o) {
        const s = scheduleOf(o, schedules);
        const next = nextStatus(o);
        const open = D.isOpenOrder(o);
        const summary = itemsSummary(o);
        return '<tr>' +
          '<th scope="row"><button type="button" class="btn btn-link p-0 fw-semibold" data-action="view" data-id="' + esc(o.id) + '">' + esc(o.id) + '</button></th>' +
          '<td>' + esc(o.customerName) + '</td>' +
          '<td class="text-nowrap">' + esc(A.formatDate(o.orderDate)) + '</td>' +
          '<td class="ar-items-cell" title="' + esc(summary) + '">' + esc(summary) + '</td>' +
          '<td class="text-end text-nowrap fw-semibold">' + esc(A.formatPeso(o.totalAmount)) + '</td>' +
          '<td class="text-nowrap"><i class="bi ' + (o.fulfillment === 'Delivery' ? 'bi-truck' : 'bi-shop') + ' me-1" aria-hidden="true"></i>' + esc(o.fulfillment) + '</td>' +
          '<td class="text-nowrap">' + (s ? esc(A.formatDate(s.scheduledDate)) : '—') + '</td>' +
          '<td class="text-nowrap">' + (s ? esc(A.formatTime(s.scheduledTime)) : '—') + '</td>' +
          '<td class="text-nowrap">' + esc(o.paymentMethod) + '</td>' +
          '<td>' + A.paymentBadge(o.paymentStatus) + '</td>' +
          '<td>' + A.statusBadge(o.status) + '</td>' +
          '<td class="text-end text-nowrap">' +
            '<button type="button" class="btn btn-sm btn-rose me-1" data-action="view" data-id="' + esc(o.id) + '" aria-label="View details: ' + esc(o.id) + '"><i class="bi bi-eye" aria-hidden="true"></i></button>' +
            (next ? '<button type="button" class="btn btn-sm btn-primary me-1" data-action="advance" data-id="' + esc(o.id) + '">' + esc(STEP_LABEL[next]) + '<span class="visually-hidden"> ' + esc(o.id) + '</span></button>' : '') +
            (open ? '<button type="button" class="btn btn-sm btn-outline-danger me-1" data-action="cancel" data-id="' + esc(o.id) + '" aria-label="Cancel order ' + esc(o.id) + '"><i class="bi bi-x-lg" aria-hidden="true"></i></button>' : '') +
            '<button type="button" class="btn btn-sm btn-rose" data-action="print" data-id="' + esc(o.id) + '" aria-label="Print summary: ' + esc(o.id) + '"><i class="bi bi-printer" aria-hidden="true"></i></button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ============ Details modal ============ */
  function renderDetails(o) {
    const s = scheduleOf(o);
    const statuses = allowedStatuses(o);
    const payments = allowedPayments(o);
    $('orderModalTitle').textContent = 'Order ' + o.id;

    const items = '<div class="ar-table-wrap"><table class="table ar-table mb-0" style="min-width:0"><thead><tr>' +
      '<th scope="col">Item</th><th scope="col" class="text-end">Qty</th><th scope="col" class="text-end">Unit price</th><th scope="col" class="text-end">Amount</th></tr></thead><tbody>' +
      o.items.map(function (i) {
        return '<tr><td>' + esc(i.name) + '<div class="small text-muted">' + esc(i.option) + '</div></td><td class="text-end">' + i.qty + '</td>' +
          '<td class="text-end">' + esc(A.formatPeso(i.unitPrice)) + '</td><td class="text-end">' + esc(A.formatPeso(i.qty * i.unitPrice)) + '</td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><th scope="row" colspan="3" class="text-end">Total</th><td class="text-end fw-bold">' + esc(A.formatPeso(o.totalAmount)) + '</td></tr></tfoot></table></div>';

    const statusControl = statuses.length
      ? '<div class="ar-control"><label class="form-label" for="newStatus">Update order status</label><div class="input-group">' +
        '<select class="form-select" id="newStatus">' + statuses.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="btn btn-primary" data-action="apply-status">Update</button></div></div>'
      : '<p class="small text-muted mb-0"><i class="bi bi-lock me-1" aria-hidden="true"></i>This order is ' + esc(o.status.toLowerCase()) + ' and its status is locked.</p>';
    const payControl = payments.length
      ? '<div class="ar-control"><label class="form-label" for="newPayment">Update payment status (simulation)</label><div class="input-group">' +
        '<select class="form-select" id="newPayment">' + payments.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="btn btn-primary" data-action="apply-payment">Update</button></div></div>'
      : '<p class="small text-muted mb-0"><i class="bi bi-lock me-1" aria-hidden="true"></i>Payment status cannot be changed for this order.</p>';

    $('orderBody').innerHTML =
      '<div class="d-flex flex-wrap gap-2 mb-3">' + A.statusBadge(o.status) + A.paymentBadge(o.paymentStatus) +
        '<span class="ar-badge ar-badge--delivery">' + esc(o.fulfillment) + '</span></div>' +
      '<div class="row g-4">' +
        '<div class="col-md-6"><h3 class="h5 ar-display">Customer</h3><dl class="ar-detail-list">' +
          '<div><dt>Name</dt><dd>' + esc(o.customerName) + '</dd></div>' +
          '<div><dt>Phone</dt><dd>' + esc(o.customerPhone || '—') + '</dd></div>' +
          '<div><dt>Order date</dt><dd>' + esc(A.formatDate(o.orderDate)) + '</dd></div>' +
          (o.updatedAt ? '<div><dt>Last updated</dt><dd>' + esc(A.formatDateTime(o.updatedAt)) + '</dd></div>' : '') +
        '</dl></div>' +
        '<div class="col-md-6"><h3 class="h5 ar-display">' + esc(o.fulfillment) + '</h3><dl class="ar-detail-list">' +
          '<div><dt>Scheduled date</dt><dd>' + (s ? esc(A.formatDate(s.scheduledDate)) : '—') + '</dd></div>' +
          '<div><dt>Scheduled time</dt><dd>' + (s ? esc(A.formatTime(s.scheduledTime)) : '—') + '</dd></div>' +
          (o.fulfillment === 'Delivery' ? '<div><dt>Address</dt><dd>' + esc(s && s.address ? s.address : '—') + '</dd></div>' : '') +
          '<div><dt>Notes</dt><dd>' + esc(s && s.notes ? s.notes : '—') + '</dd></div>' +
        '</dl></div>' +
        '<div class="col-12"><h3 class="h5 ar-display">Items</h3>' + items + '</div>' +
        '<div class="col-12"><h3 class="h5 ar-display">Payment</h3><p class="mb-0">' + esc(o.paymentMethod) + ' · ' + esc(o.paymentStatus) +
          '<span class="small text-muted d-block">Manual status only; no real payment is processed.</span></p></div>' +
        '<div class="col-md-6">' + statusControl + '</div><div class="col-md-6">' + payControl + '</div>' +
      '</div>';
  }

  function openDetails(id) {
    const o = findOrder(id);
    if (!o) { A.showToast('That order could not be found.', 'danger'); return; }
    openOrderId = id;
    renderDetails(o);
    detailModal.show();
  }

  /* Hide the details modal (if open) so a confirmation never stacks on top of it. */
  function hideDetailsIfOpen() { return A.hideModal($('orderModal')); }

  /* ============ Status + payment changes ============ */
  function changeStatus(id, newStatus) {
    const o = findOrder(id);
    if (!o) return;
    if (allowedStatuses(o).indexOf(newStatus) === -1) { A.showToast('That status change is not allowed for this order.', 'warning'); return; }
    if (newStatus === 'Completed' && o.paymentStatus !== 'Paid') {
      A.showToast('Mark ' + o.id + ' as Paid before completing it.', 'warning');
      if ($('orderModal').classList.contains('show')) renderDetails(o); else openDetails(id);
      return;
    }
    let message = 'Change ' + o.id + ' (' + o.customerName + ') from "' + o.status + '" to "' + newStatus + '"?';
    if (newStatus === 'Cancelled') {
      message = 'Cancel ' + o.id + ' for ' + o.customerName + '? A cancelled order is locked and cannot be reopened.' +
        (o.paymentStatus === 'Paid' ? ' Its payment will be marked Refunded (simulation only; no real refund happens).' : '');
    } else if (newStatus === 'Completed') {
      message = 'Mark ' + o.id + ' as completed? A completed order is locked.';
    } else if (newStatus === 'Confirmed') {
      message = 'Confirm order ' + o.id + ' for ' + o.customerName + '?';
    }

    hideDetailsIfOpen().then(function (wasOpen) {
      A.confirmAction({
        title: newStatus === 'Cancelled' ? 'Cancel order?' : 'Update order status?',
        message: message, confirmLabel: newStatus === 'Cancelled' ? 'Cancel order' : 'Yes, update', danger: newStatus === 'Cancelled'
      }).then(function (ok) {
        if (ok) {
          const list = orders();
          const t = list.filter(function (x) { return x.id === id; })[0];
          const prevPay = t.paymentStatus;
          t.status = newStatus;
          t.updatedAt = new Date().toISOString();
          if (newStatus === 'Cancelled' && t.paymentStatus === 'Paid') t.paymentStatus = 'Refunded';
          if (!D.saveOrders(list)) { A.showToast('Could not save. Browser storage may be full or blocked.', 'danger'); return; }
          renderTable();
          A.refreshNotifications();
          A.showToast(newStatus === 'Cancelled' ? 'Order ' + id + ' cancelled.' : newStatus === 'Confirmed' ? 'Order ' + id + ' confirmed.' : 'Order ' + id + ' updated: ' + newStatus + '.', 'success');
          if (newStatus === 'Cancelled' && prevPay === 'Paid') A.showToast('Payment for ' + id + ' marked Refunded (simulation).', 'info');
        }
        if (wasOpen) openDetails(id);
      });
    });
  }

  function changePayment(id, newPayment) {
    const o = findOrder(id);
    if (!o) return;
    if (allowedPayments(o).indexOf(newPayment) === -1) { A.showToast('That payment change is not allowed for this order.', 'warning'); return; }
    const message = 'Mark payment for ' + o.id + ' as "' + newPayment + '"? This only changes the status shown here. No real payment or refund is processed.';
    hideDetailsIfOpen().then(function (wasOpen) {
      A.confirmAction({ title: 'Update payment status?', message: message, confirmLabel: 'Yes, update' }).then(function (ok) {
        if (ok) {
          const list = orders();
          const t = list.filter(function (x) { return x.id === id; })[0];
          t.paymentStatus = newPayment;
          t.updatedAt = new Date().toISOString();
          if (!D.saveOrders(list)) { A.showToast('Could not save. Browser storage may be full or blocked.', 'danger'); return; }
          renderTable();
          A.showToast('Payment for ' + id + ' marked ' + newPayment + '.', 'success');
        }
        if (wasOpen) openDetails(id);
      });
    });
  }

  /* ============ Print summary (browser print dialog) ============ */
  function buildPrint(o) {
    const s = scheduleOf(o);
    return '<div class="ar-print">' +
      '<div class="ar-print-head"><img src="../assets/images/branding/logo.jpg" alt="" width="64" height="64"><div><h1>Annroe\'s Flower Shop</h1><p>Always passionate since 1992</p></div></div>' +
      '<h2>Order summary: ' + esc(o.id) + '</h2>' +
      '<table class="ar-print-meta"><tbody>' +
        '<tr><th scope="row">Customer</th><td>' + esc(o.customerName) + (o.customerPhone ? ' · ' + esc(o.customerPhone) : '') + '</td></tr>' +
        '<tr><th scope="row">Order date</th><td>' + esc(A.formatDate(o.orderDate)) + '</td></tr>' +
        '<tr><th scope="row">' + esc(o.fulfillment) + '</th><td>' + (s ? esc(A.formatDate(s.scheduledDate)) + ', ' + esc(A.formatTime(s.scheduledTime)) : '—') + '</td></tr>' +
        (o.fulfillment === 'Delivery' ? '<tr><th scope="row">Address</th><td>' + esc(s && s.address ? s.address : '—') + '</td></tr>' : '') +
        '<tr><th scope="row">Order status</th><td>' + esc(o.status) + '</td></tr>' +
        '<tr><th scope="row">Payment</th><td>' + esc(o.paymentMethod) + ' · ' + esc(o.paymentStatus) + '</td></tr>' +
        (s && s.notes ? '<tr><th scope="row">Notes</th><td>' + esc(s.notes) + '</td></tr>' : '') +
      '</tbody></table>' +
      '<table class="ar-print-items"><thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Amount</th></tr></thead><tbody>' +
      o.items.map(function (i) {
        return '<tr><td>' + esc(i.name) + ' (' + esc(i.option) + ')</td><td>' + i.qty + '</td><td>' + esc(A.formatPeso(i.unitPrice)) + '</td><td>' + esc(A.formatPeso(i.qty * i.unitPrice)) + '</td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><th scope="row" colspan="3">Total</th><td>' + esc(A.formatPeso(o.totalAmount)) + '</td></tr></tfoot></table>' +
      '<p class="ar-print-foot">Sample order; not an official receipt.</p></div>';
  }

  function printOrder(id) {
    const o = findOrder(id);
    if (!o) return;
    $('printArea').innerHTML = buildPrint(o);
    document.body.classList.add('print-order');
    window.print();
  }

  /* ============ Wiring ============ */
  function clearFilters() {
    $('ordSearch').value = ''; $('ordStatus').value = ''; $('ordType').value = '';
    $('ordDate').value = ''; $('ordDateMode').value = 'order'; $('ordSort').value = 'newest';
    renderTable();
  }

  function init() {
    detailModal = new bootstrap.Modal($('orderModal'));
    $('ordStatus').insertAdjacentHTML('beforeend', D.ORDER_STATUSES.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join(''));

    // Links from the dashboard: ?status=Pending, ?order=ORD-1001
    const params = new URLSearchParams(window.location.search);
    const wantedStatus = params.get('status');
    if (wantedStatus && D.ORDER_STATUSES.indexOf(wantedStatus) > -1) $('ordStatus').value = wantedStatus;

    renderTable();

    ['ordSearch'].forEach(function (id) { $(id).addEventListener('input', renderTable); });
    ['ordStatus', 'ordType', 'ordDateMode', 'ordDate', 'ordSort'].forEach(function (id) { $(id).addEventListener('change', renderTable); });
    $('ordClear').addEventListener('click', clearFilters);

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const a = btn.dataset.action, id = btn.dataset.id;
      if (a === 'view') openDetails(id);
      else if (a === 'advance') { const o = findOrder(id); if (o && nextStatus(o)) changeStatus(id, nextStatus(o)); }
      else if (a === 'cancel') changeStatus(id, 'Cancelled');
      else if (a === 'print') printOrder(id);
      else if (a === 'clear') clearFilters();
      else if (a === 'apply-status') changeStatus(openOrderId, $('newStatus').value);
      else if (a === 'apply-payment') changePayment(openOrderId, $('newPayment').value);
    });
    $('orderPrintBtn').addEventListener('click', function () { if (openOrderId) printOrder(openOrderId); });
    window.addEventListener('afterprint', function () { document.body.classList.remove('print-order'); });

    const wantedOrder = params.get('order');
    if (wantedOrder && findOrder(wantedOrder)) openDetails(wantedOrder);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
