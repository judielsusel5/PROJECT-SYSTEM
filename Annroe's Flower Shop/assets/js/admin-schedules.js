/* admin-schedules.js — pickup and delivery schedules (mock data in LocalStorage).
   Conflict detection is a simple comparison of the sample data in this browser; see AnnroeData.getAllConflicts. */
(function () {
  'use strict';

  const A = AnnroeAdmin;
  const D = AnnroeData;
  const esc = A.escapeHtml;
  const $ = function (id) { return document.getElementById(id); };

  const VIEWS = ['all', 'open', 'today', 'upcoming', 'overdue', 'conflicts'];
  let detailModal, editModal;
  let detailId = null;   // order id shown in the details modal
  let editId = null;     // order id being edited

  /* ============ Joined data + flags ============ */
  function entries() {
    const schedules = D.getSchedules();
    return D.getOrders().map(function (o) {
      return { order: o, schedule: D.getScheduleForOrder(o.id, schedules) };
    }).filter(function (e) { return e.schedule; });
  }
  function flagsFor(e, today, conflicts) {
    const open = D.isOpenOrder(e.order);
    const d = e.schedule.scheduledDate;
    const weekEnd = D.addDays(today, 7);
    return {
      open: open,
      overdue: open && d < today,
      today: open && d === today,
      upcoming: open && d > today && d <= weekEnd,
      conflict: open && !!conflicts[e.order.id]
    };
  }
  function rank(f) { return f.overdue ? 0 : f.today ? 1 : f.open ? 2 : 3; }
  function stamp(e) { return e.schedule.scheduledDate + ' ' + e.schedule.scheduledTime; }

  function tags(f) {
    return (f.overdue ? '<span class="ar-badge ar-badge--cancelled">Overdue</span>' : '') +
      (f.today ? '<span class="ar-badge ar-badge--preparing">Today</span>' : '') +
      (f.upcoming ? '<span class="ar-badge ar-badge--ready">Upcoming</span>' : '') +
      (f.conflict ? '<span class="ar-badge ar-badge--low-stock">Possible conflict</span>' : '');
  }

  /* ============ Summary cards ============ */
  function renderStats(all, today, conflicts) {
    const f = all.map(function (e) { return flagsFor(e, today, conflicts); });
    const count = function (key) { return f.filter(function (x) { return x[key]; }).length; };
    const upcomingAll = f.filter(function (x) { return x.today || x.upcoming; }).length;
    const card = function (icon, tone, value, label, view) {
      return '<div class="col-6 col-xl-3"><button type="button" class="ar-card ar-stat ar-stat-btn" data-action="view-filter" data-view="' + view + '">' +
        '<span class="ar-stat-icon ' + tone + '"><i class="bi ' + icon + '" aria-hidden="true"></i></span>' +
        '<span class="min-w-0"><span class="ar-stat-value d-block">' + value + '</span><span class="ar-stat-label d-block">' + esc(label) + '</span></span></button></div>';
    };
    $('schStats').innerHTML =
      card('bi-calendar-day', '', count('today'), 'Due today', 'today') +
      card('bi-calendar-week', 'sage', upcomingAll, 'Next 7 days', 'upcoming') +
      card('bi-clock-history', '', count('overdue'), 'Overdue', 'overdue') +
      card('bi-exclamation-triangle', 'amber', count('conflict'), 'Possible conflicts', 'conflicts');
  }

  /* ============ Filtering + table ============ */
  function visible(all, today, conflicts) {
    const q = $('schSearch').value.trim().toLowerCase();
    const view = $('schView').value, type = $('schType').value, status = $('schStatus').value;
    const date = $('schDate').value, sort = $('schSort').value;

    const list = all.filter(function (e) {
      const f = flagsFor(e, today, conflicts);
      if (view === 'open' && !f.open) return false;
      if (view === 'today' && !f.today) return false;
      if (view === 'upcoming' && !(f.today || f.upcoming)) return false;
      if (view === 'overdue' && !f.overdue) return false;
      if (view === 'conflicts' && !f.conflict) return false;
      if (type && e.order.fulfillment !== type) return false;
      if (status && e.order.status !== status) return false;
      if (date && e.schedule.scheduledDate !== date) return false;
      return !q || (e.order.id + ' ' + e.order.customerName).toLowerCase().indexOf(q) > -1;
    });

    list.sort(function (a, b) {
      if (sort === 'latest') return stamp(a) < stamp(b) ? 1 : stamp(a) > stamp(b) ? -1 : 0;
      if (sort === 'soonest') return stamp(a) < stamp(b) ? -1 : stamp(a) > stamp(b) ? 1 : 0;
      const ra = rank(flagsFor(a, today, conflicts)), rb = rank(flagsFor(b, today, conflicts));
      if (ra !== rb) return ra - rb;
      const cmp = stamp(a) < stamp(b) ? -1 : stamp(a) > stamp(b) ? 1 : 0;
      return ra === 3 ? -cmp : cmp;   // finished orders: most recent first
    });
    return list;
  }

  function render() {
    const today = D.todayISO();
    const conflicts = D.getAllConflicts();
    const all = entries();
    renderStats(all, today, conflicts);
    const list = visible(all, today, conflicts);
    $('schCount').textContent = 'Showing ' + list.length + ' of ' + all.length + ' schedules';
    const host = $('schTable');

    if (!list.length) {
      host.innerHTML = all.length
        ? '<div class="ar-empty"><i class="bi bi-calendar-x" aria-hidden="true"></i><h3>No matching schedules</h3><p class="mb-3">Try a different search or clear the filters.</p><button type="button" class="btn btn-outline-primary btn-sm" data-action="clear">Clear filters</button></div>'
        : '<div class="ar-empty"><i class="bi bi-calendar-x" aria-hidden="true"></i><h3>No schedules yet</h3><p class="mb-0">Pickup and delivery schedules appear here once orders are placed.</p></div>';
      return;
    }

    host.innerHTML =
      '<table class="table table-hover ar-table ar-sched-table"><caption class="visually-hidden">Pickup and delivery schedule</caption><thead><tr>' +
      '<th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Type</th><th scope="col">Scheduled date</th><th scope="col">Time</th>' +
      '<th scope="col">Address</th><th scope="col">Order status</th><th scope="col">Notes</th><th scope="col" class="text-end">Actions</th></tr></thead><tbody>' +
      list.map(function (e) {
        const o = e.order, s = e.schedule, f = flagsFor(e, today, conflicts);
        const cls = f.overdue ? 'is-overdue' : f.today ? 'is-today' : f.conflict ? 'is-conflict' : f.upcoming ? 'is-upcoming' : '';
        return '<tr class="' + cls + '">' +
          '<th scope="row"><button type="button" class="btn btn-link p-0 fw-semibold" data-action="view" data-id="' + esc(o.id) + '">' + esc(o.id) + '</button>' +
            '<div class="ar-flag-row">' + tags(f) + '</div></th>' +
          '<td>' + esc(o.customerName) + '</td>' +
          '<td class="text-nowrap"><i class="bi ' + (o.fulfillment === 'Delivery' ? 'bi-truck' : 'bi-shop') + ' me-1" aria-hidden="true"></i>' + esc(o.fulfillment) + '</td>' +
          '<td class="text-nowrap">' + esc(A.formatDate(s.scheduledDate)) + '<div class="small text-muted">' + esc(A.weekdayShort(s.scheduledDate)) + '</div></td>' +
          '<td class="text-nowrap">' + esc(A.formatTime(s.scheduledTime)) + '</td>' +
          '<td class="ar-addr-cell" title="' + esc(s.address || '') + '">' + (o.fulfillment === 'Delivery' ? esc(s.address || '—') : '<span class="text-muted">Pickup at shop</span>') + '</td>' +
          '<td>' + A.statusBadge(o.status) + '</td>' +
          '<td class="ar-notes-cell" title="' + esc(s.notes || '') + '">' + esc(s.notes || '—') + '</td>' +
          '<td class="text-end text-nowrap">' +
            '<button type="button" class="btn btn-sm btn-rose me-1" data-action="view" data-id="' + esc(o.id) + '" aria-label="View schedule: ' + esc(o.id) + '"><i class="bi bi-eye" aria-hidden="true"></i></button>' +
            (f.open ? '<button type="button" class="btn btn-sm btn-primary" data-action="edit" data-id="' + esc(o.id) + '"><i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit<span class="visually-hidden"> schedule ' + esc(o.id) + '</span></button>'
                    : '<span class="small text-muted"><i class="bi bi-lock me-1" aria-hidden="true"></i>Locked</span>') +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ============ Details ============ */
  function openDetails(id) {
    const e = entries().filter(function (x) { return x.order.id === id; })[0];
    if (!e) { A.showToast('That schedule could not be found.', 'danger'); return; }
    detailId = id;
    const today = D.todayISO(), conflicts = D.getAllConflicts();
    const f = flagsFor(e, today, conflicts), o = e.order, s = e.schedule;
    $('schDetailTitle').textContent = 'Schedule for ' + o.id;
    $('schOrderLink').href = 'orders.html?order=' + encodeURIComponent(o.id);
    $('schDetailEdit').hidden = !f.open;

    const others = conflicts[o.id] || [];
    const orderRows = D.getOrders();
    const conflictText = others.map(function (oid) {
      const other = orderRows.filter(function (x) { return x.id === oid; })[0];
      const os = other && D.getScheduleForOrder(oid);
      return esc(oid) + (other ? ' (' + esc(other.customerName) + (os ? ', ' + esc(A.formatTime(os.scheduledTime)) : '') + ')' : '');
    }).join(', ');

    $('schDetailBody').innerHTML =
      '<div class="d-flex flex-wrap gap-2 mb-3">' + A.statusBadge(o.status) + '<span class="ar-badge ar-badge--delivery">' + esc(o.fulfillment) + '</span>' + tags(f) + '</div>' +
      (others.length ? '<div class="ar-demo-note" role="note"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i><div>Possible conflict with ' + conflictText +
        '. Same type, same date, less than ' + D.CONFLICT_WINDOW_MINUTES + ' minutes apart. This only compares the sample data in this browser.</div></div>' : '') +
      '<div class="row g-4"><div class="col-md-6"><h3 class="h5 ar-display">Schedule</h3><dl class="ar-detail-list">' +
        '<div><dt>Date</dt><dd>' + esc(A.formatDate(s.scheduledDate)) + ' (' + esc(A.weekdayShort(s.scheduledDate)) + ')</dd></div>' +
        '<div><dt>Time</dt><dd>' + esc(A.formatTime(s.scheduledTime)) + '</dd></div>' +
        '<div><dt>' + (o.fulfillment === 'Delivery' ? 'Address' : 'Location') + '</dt><dd>' + (o.fulfillment === 'Delivery' ? esc(s.address || '—') : 'Pickup at shop') + '</dd></div>' +
        '<div><dt>Notes</dt><dd>' + esc(s.notes || '—') + '</dd></div>' +
        '<div><dt>Last updated</dt><dd>' + esc(A.formatDateTime(s.updatedAt)) + '</dd></div></dl></div>' +
      '<div class="col-md-6"><h3 class="h5 ar-display">Order</h3><dl class="ar-detail-list">' +
        '<div><dt>Customer</dt><dd>' + esc(o.customerName) + '</dd></div>' +
        '<div><dt>Phone</dt><dd>' + esc(o.customerPhone || '—') + '</dd></div>' +
        '<div><dt>Items</dt><dd>' + o.items.map(function (i) { return esc(i.name) + ' (' + esc(i.option) + ') ×' + i.qty; }).join('<br>') + '</dd></div>' +
        '<div><dt>Total</dt><dd>' + esc(A.formatPeso(o.totalAmount)) + '</dd></div>' +
        '<div><dt>Payment</dt><dd>' + esc(o.paymentMethod) + ' · ' + esc(o.paymentStatus) + '</dd></div></dl></div></div>';
    detailModal.show();
  }

  /* ============ Edit ============ */
  function parseTimeValid(v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(v); }

  function updateConflictPreview() {
    const box = $('seConflict');
    const e = entries().filter(function (x) { return x.order.id === editId; })[0];
    const date = $('seDate').value, time = $('seTime').value;
    if (!e || !date || !parseTimeValid(time)) { box.className = 'ar-preview'; box.innerHTML = ''; return; }
    const others = D.getScheduleConflicts({ orderId: editId, type: e.order.fulfillment, date: date, time: time });
    if (!others.length) {
      box.className = 'ar-preview';
      box.innerHTML = '<i class="bi bi-check2-circle" aria-hidden="true"></i> No possible conflicts found in the sample data for this slot.';
      return;
    }
    box.className = 'ar-preview is-bad';
    box.innerHTML = '<i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Possible conflict with ' + others.map(esc).join(', ') + ' (same type, within ' + D.CONFLICT_WINDOW_MINUTES + ' minutes). You can still save.';
  }

  function openEdit(id) {
    const e = entries().filter(function (x) { return x.order.id === id; })[0];
    if (!e) return;
    if (!D.isOpenOrder(e.order)) { A.showToast('Completed and cancelled orders cannot be rescheduled.', 'warning'); return; }
    editId = id;
    A.clearFieldErrors($('schEditForm'));
    $('seOrder').value = e.order.id + ' · ' + e.order.customerName;
    $('seType').value = e.order.fulfillment;
    $('seDate').value = e.schedule.scheduledDate;
    $('seDate').min = D.todayISO();
    $('seTime').value = e.schedule.scheduledTime;
    $('seAddress').value = e.schedule.address || '';
    $('seNotes').value = e.schedule.notes || '';
    const delivery = e.order.fulfillment === 'Delivery';
    $('seAddressWrap').hidden = !delivery;
    $('seAddress').required = delivery;
    updateConflictPreview();
    editModal.show();
  }

  function saveEdit(event) {
    event.preventDefault();
    A.clearFieldErrors($('schEditForm'));
    let first = null;
    const bad = function (el, msg) { A.setFieldError(el, msg); if (!first) first = el; };
    const e = entries().filter(function (x) { return x.order.id === editId; })[0];
    if (!e) { A.showToast('That schedule no longer exists.', 'danger'); A.hideModal($('schEditModal')); render(); return; }

    const date = $('seDate').value, time = $('seTime').value;
    const address = $('seAddress').value.trim(), notes = $('seNotes').value.trim();
    if (!date) bad($('seDate'), 'Choose a date.');
    else if (date < D.todayISO()) bad($('seDate'), 'Choose today or a later date. You cannot schedule into the past.');
    if (!time) bad($('seTime'), 'Choose a time.');
    else if (!parseTimeValid(time)) bad($('seTime'), 'Enter a valid time.');
    if (e.order.fulfillment === 'Delivery') {
      if (!address) bad($('seAddress'), 'Enter the delivery address.');
      else if (address.length < 8) bad($('seAddress'), 'Add more detail to the address (at least 8 characters).');
    }
    if (notes.length > 200) bad($('seNotes'), 'Notes can be at most 200 characters.');
    if (first) { first.focus(); return; }

    const list = D.getSchedules();
    const s = list.filter(function (x) { return x.orderId === editId; })[0];
    const hadConflict = D.getScheduleConflicts({ orderId: editId, type: e.order.fulfillment, date: date, time: time }).length > 0;
    s.scheduledDate = date; s.scheduledTime = time; s.notes = notes;
    if (e.order.fulfillment === 'Delivery') s.address = address;
    s.updatedAt = new Date().toISOString();
    if (!D.saveSchedules(list)) { A.showToast('Could not save. Browser storage may be full or blocked.', 'danger'); return; }

    A.hideModal($('schEditModal'));
    render();
    A.refreshNotifications();
    A.showToast('Schedule updated for ' + editId + '.', 'success');
    if (hadConflict) A.showToast(editId + ' now has a possible conflict with another order.', 'warning');
  }

  /* ============ Wiring ============ */
  function clearFilters() {
    $('schSearch').value = ''; $('schView').value = 'all'; $('schType').value = ''; $('schStatus').value = '';
    $('schDate').value = ''; $('schSort').value = 'attention';
    render();
  }

  function init() {
    detailModal = new bootstrap.Modal($('schDetailModal'));
    editModal = new bootstrap.Modal($('schEditModal'));
    $('schStatus').insertAdjacentHTML('beforeend', D.ORDER_STATUSES.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join(''));

    const params = new URLSearchParams(window.location.search);
    if (VIEWS.indexOf(params.get('view')) > -1) $('schView').value = params.get('view');
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '')) $('schDate').value = params.get('date');
    render();

    $('schSearch').addEventListener('input', render);
    ['schView', 'schType', 'schStatus', 'schDate', 'schSort'].forEach(function (id) { $(id).addEventListener('change', render); });
    $('schClear').addEventListener('click', clearFilters);

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      if (a === 'view') openDetails(btn.dataset.id);
      else if (a === 'edit') openEdit(btn.dataset.id);
      else if (a === 'clear') clearFilters();
      else if (a === 'view-filter') { $('schView').value = btn.dataset.view; render(); $('schTitle').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });

    $('schDetailEdit').addEventListener('click', function () {
      const id = detailId;
      A.hideModal($('schDetailModal')).then(function () { openEdit(id); });
    });
    $('schEditForm').addEventListener('submit', saveEdit);
    $('schEditForm').addEventListener('input', function (e) {
      if (e.target.classList.contains('is-invalid')) { e.target.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); }
      if (e.target.id === 'seDate' || e.target.id === 'seTime') updateConflictPreview();
    });

    const wanted = params.get('order');
    if (wanted && entries().some(function (x) { return x.order.id === wanted; })) openDetails(wanted);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
