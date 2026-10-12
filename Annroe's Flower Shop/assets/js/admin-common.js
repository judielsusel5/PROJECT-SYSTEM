/* admin-common.js — shared constants, helpers, and the admin shell
   (sidebar, offcanvas, topbar, page header, toasts, theme toggle).
   Prototype only: LocalStorage is NOT a database and is NOT secure. */
(function (global) {
  'use strict';

  const STORAGE_KEYS = Object.freeze({
    products:  'annerore_admin_products',
    inventory: 'annerore_admin_inventory',
    orders:    'annerore_admin_orders',
    schedules: 'annerore_admin_schedules',
    theme:     'annerore_admin_theme',
    settings:  'annerore_admin_settings',
    remembered: 'annerore_admin_remembered_user'
  });

  const NAV_ITEMS = [
    { page: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2',     href: 'dashboard.html' },
    { page: 'products',  label: 'Products',  icon: 'bi-flower1',      href: 'products.html' },
    { page: 'inventory', label: 'Inventory', icon: 'bi-box-seam',     href: 'inventory.html' },
    { page: 'orders',    label: 'Orders',    icon: 'bi-bag-heart',    href: 'orders.html' },
    { page: 'schedules', label: 'Schedules', icon: 'bi-calendar-check', href: 'schedules.html' },
    { page: 'reports',   label: 'Reports',   icon: 'bi-bar-chart-line', href: 'reports.html' },
    { page: 'settings',  label: 'Settings',  icon: 'bi-sliders',      href: 'settings.html' }
  ];

  /* ---------- Safe LocalStorage (JSON) ---------- */
  function readStorage(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
      console.warn('Could not read "' + key + '" — using fallback.', err);
      return fallback;
    }
  }
  function writeStorage(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('Could not save "' + key + '".', err);
      return false;
    }
  }


  /* ---------- Settings (key: annerore_admin_settings) ----------
     Frontend preferences only. Not account security, not server configuration. */
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DEFAULT_SETTINGS = {
    shopName: "Annroe's Flower Shop",
    tagline: 'Always passionate since 1992',
    phone: '', email: '', address: '', website: '',
    // SAMPLE hours only. The owner's real hours have not been provided.
    hours: DAYS.map(function (d) { return { day: d, open: d !== 'Sunday', from: '08:00', to: '18:00' }; }),
    lowStockDefault: 10,
    adminName: 'Shop Admin',
    adminTitle: 'Administrator'
  };
  function defaultSettings() { return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); }
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  function getSettings() {
    const out = defaultSettings();
    const s = readStorage(STORAGE_KEYS.settings, null);
    if (!s || typeof s !== 'object' || Array.isArray(s)) return out;
    ['shopName', 'tagline', 'phone', 'email', 'address', 'website', 'adminName', 'adminTitle'].forEach(function (k) {
      if (typeof s[k] === 'string') out[k] = s[k];
    });
    if (!out.shopName.trim()) out.shopName = DEFAULT_SETTINGS.shopName;
    if (!out.adminName.trim()) out.adminName = DEFAULT_SETTINGS.adminName;
    if (Number.isInteger(s.lowStockDefault) && s.lowStockDefault >= 0 && s.lowStockDefault <= 100000) out.lowStockDefault = s.lowStockDefault;
    if (Array.isArray(s.hours) && s.hours.length === 7 && s.hours.every(function (h, i) {
      return h && h.day === DAYS[i] && typeof h.open === 'boolean' && TIME_RE.test(h.from) && TIME_RE.test(h.to);
    })) out.hours = s.hours.map(function (h) { return { day: h.day, open: h.open, from: h.from, to: h.to }; });
    return out;
  }
  function saveSettings(settings) { return writeStorage(STORAGE_KEYS.settings, settings); }

  /* ---------- Small shared utilities ---------- */
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function formatPeso(amount) {
    const n = Number(amount);
    if (!isFinite(n)) return '—';
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  /* ---------- Theme (key: annerore_admin_theme, stored as plain 'light' | 'dark') ---------- */
  function getTheme() {
    try {
      const t = global.localStorage.getItem(STORAGE_KEYS.theme);
      return t === 'dark' ? 'dark' : 'light';
    } catch (e) { return 'light'; }
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      const toDark = theme === 'light';
      btn.setAttribute('aria-label', toDark ? 'Switch to dark theme' : 'Switch to light theme');
      btn.setAttribute('title', toDark ? 'Switch to dark theme' : 'Switch to light theme');
      btn.innerHTML = '<i class="bi ' + (toDark ? 'bi-moon-stars' : 'bi-sun') + '" aria-hidden="true"></i>';
    }
  }
  function setTheme(theme) {
    try { global.localStorage.setItem(STORAGE_KEYS.theme, theme); } catch (e) { /* ignore */ }
    applyTheme(theme);
  }
  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  /* ---------- Toast notifications ---------- */
  function showToast(message, type) {
    type = ['success', 'danger', 'info', 'warning'].indexOf(type) > -1 ? type : 'success';
    const icons = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill' };
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'ar-toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = 'toast ar-toast ar-toast--' + type;
    el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    el.innerHTML =
      '<i class="bi ' + icons[type] + '" aria-hidden="true"></i>' +
      '<div class="flex-grow-1">' + escapeHtml(message) + '</div>' +
      '<button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close notification"></button>';
    container.appendChild(el);
    const toast = new bootstrap.Toast(el, { delay: 4000 });
    el.addEventListener('hidden.bs.toast', function () { el.remove(); });
    toast.show();
  }


  /* ---------- Date / time formatting ---------- */
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function parseISODate(iso) {
    const p = String(iso || '').split('-').map(Number);
    return p.length === 3 && !p.some(isNaN) ? new Date(p[0], p[1] - 1, p[2]) : null;
  }
  function formatDate(iso) {
    const d = parseISODate(iso);
    return d ? MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() : '—';
  }
  function formatDateShort(iso) {
    const d = parseISODate(iso);
    return d ? MONTHS[d.getMonth()] + ' ' + d.getDate() : '—';
  }
  function weekdayShort(iso) {
    const d = parseISODate(iso);
    return d ? WEEKDAYS[d.getDay()] : '';
  }
  function formatTime(hhmm) {
    const m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
    if (!m) return '—';
    let h = Number(m[1]);
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m[2] + ' ' + suffix;
  }
  function formatDateTime(isoString) {
    const d = new Date(isoString);
    if (isNaN(d)) return '—';
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' · ' +
      formatTime(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
  }

  /* ---------- Status badges (consistent colors on every page) ---------- */
  const ORDER_BADGE = {
    'Pending': 'pending', 'Confirmed': 'confirmed', 'Preparing': 'preparing', 'Ready for Pickup': 'ready',
    'Out for Delivery': 'delivery', 'Completed': 'completed', 'Cancelled': 'cancelled'
  };
  const STOCK_BADGE = { 'In Stock': 'in-stock', 'Low Stock': 'low-stock', 'Out of Stock': 'out-stock' };
  const PAYMENT_BADGE = { 'Paid': 'paid', 'Unpaid': 'unpaid', 'Refunded': 'confirmed' };
  function badge(label, cls) {
    return '<span class="ar-badge ar-badge--' + cls + '">' + escapeHtml(label) + '</span>';
  }
  function statusBadge(status) { return badge(status, ORDER_BADGE[status] || 'unpaid'); }
  function stockBadge(status) { return badge(status, STOCK_BADGE[status] || 'unpaid'); }
  function paymentBadge(status) { return badge(status, PAYMENT_BADGE[status] || 'unpaid'); }
  function productImageSrc(path) {
    if (!path) return '../assets/images/branding/logo.jpg';
    return /^(data:|https?:|\.\.\/)/.test(path) ? path : '../' + path;
  }


  /* ---------- Modal helpers ----------
     Bootstrap ignores hide() while a modal is still animating in, which can swallow a fast click.
     hideModal waits until the modal has finished showing, then hides it. Resolves true when it was open. */
  document.addEventListener('shown.bs.modal', function (e) { e.target.dataset.ready = '1'; });
  document.addEventListener('hide.bs.modal', function (e) { delete e.target.dataset.ready; });
  function hideModal(el) {
    return new Promise(function (resolve) {
      const inst = global.bootstrap && bootstrap.Modal.getInstance(el);
      if (!inst || !el.classList.contains('show')) { resolve(false); return; }
      el.addEventListener('hidden.bs.modal', function done() { el.removeEventListener('hidden.bs.modal', done); resolve(true); });
      if (el.dataset.ready === '1') inst.hide();
      else el.addEventListener('shown.bs.modal', function once() { el.removeEventListener('shown.bs.modal', once); inst.hide(); });
    });
  }

  /* ---------- Confirmation modal (returns a Promise<boolean>) ---------- */
  function confirmAction(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      const el = document.createElement('div');
      el.className = 'modal fade';
      el.tabIndex = -1;
      el.setAttribute('aria-labelledby', 'confirmTitle');
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML =
        '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
        '<div class="modal-header"><h2 class="modal-title" id="confirmTitle">' + escapeHtml(opts.title || 'Please confirm') + '</h2>' +
        '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
        '<div class="modal-body"><p class="mb-0">' + escapeHtml(opts.message || 'Are you sure?') + '</p></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-outline-primary" data-bs-dismiss="modal">Cancel</button>' +
        '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-confirm>' + escapeHtml(opts.confirmLabel || 'Confirm') + '</button></div>' +
        '</div></div>';
      document.body.appendChild(el);
      const modal = new bootstrap.Modal(el);
      let result = false;
      el.querySelector('[data-confirm]').addEventListener('click', function () { result = true; hideModal(el); });
      el.addEventListener('hidden.bs.modal', function () { modal.dispose(); el.remove(); resolve(result); });
      modal.show();
    });
  }

  /* ---------- Notifications built from the shared mock data ---------- */
  function buildNotifications() {
    const D = global.AnnroeData;
    if (!D) return [];
    const items = [];
    const attention = D.getProducts().filter(function (p) { return D.getStockStatus(p) !== 'In Stock'; }).length;
    if (attention) items.push({ icon: 'bi-box-seam', text: attention + (attention === 1 ? ' product is' : ' products are') + ' low or out of stock', href: 'inventory.html' });
    const orders = D.getOrders();
    const pending = orders.filter(function (o) { return o.status === 'Pending'; }).length;
    if (pending) items.push({ icon: 'bi-bag-heart', text: pending + (pending === 1 ? ' order is' : ' orders are') + ' waiting to be confirmed', href: 'orders.html' });
    const today = D.todayISO();
    const schedules = D.getSchedules();
    const overdue = orders.filter(function (o) {
      const s = D.getScheduleForOrder(o.id, schedules);
      return D.isOpenOrder(o) && s && s.scheduledDate < today;
    }).length;
    if (overdue) items.push({ icon: 'bi-clock-history', text: overdue + (overdue === 1 ? ' order is' : ' orders are') + ' past the scheduled date', href: 'schedules.html?view=overdue' });
    const conflicts = Object.keys(D.getAllConflicts()).length;
    if (conflicts) items.push({ icon: 'bi-calendar2-x', text: conflicts + (conflicts === 1 ? ' order has' : ' orders have') + ' a possible schedule conflict', href: 'schedules.html?view=conflicts' });
    return items;
  }


  /* ---------- Shared form-validation helpers ---------- */
  function setFieldError(input, message) {
    const fb = input.parentElement.querySelector('.invalid-feedback');
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    if (fb) {
      fb.textContent = message;
      fb.id = fb.id || input.id + 'Error';
      const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== fb.id; });
      ids.push(fb.id);
      input.setAttribute('aria-describedby', ids.join(' '));
    }
  }
  function clearFieldErrors(form) {
    form.querySelectorAll('.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
      el.removeAttribute('aria-invalid');
    });
  }
  function refreshNotifications() { setNotifications(buildNotifications()); }

  /* ---------- Shell rendering ---------- */
  function buildNav(activePage) {
    return '<ul class="ar-nav" aria-label="Main navigation">' + NAV_ITEMS.map(function (item) {
      const active = item.page === activePage;
      return '<li><a class="ar-nav-link' + (active ? ' active' : '') + '" href="' + item.href + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<i class="bi ' + item.icon + '" aria-hidden="true"></i><span>' + item.label + '</span></a></li>';
    }).join('') + '</ul>';
  }
  function buildBrand() {
    const cfg = getSettings();
    return '<a class="ar-brand" href="dashboard.html">' +
      '<img src="../assets/images/branding/logo.jpg" alt="' + escapeHtml(cfg.shopName) + ' logo" width="48" height="48">' +
      '<span><span class="ar-brand-name">' + escapeHtml(cfg.shopName) + '</span>' +
      '<span class="ar-brand-tag">' + escapeHtml(cfg.tagline) + '</span></span></a>';
  }
  function buildSidebarFoot() {
    return '<div class="ar-sidebar-foot"><i class="bi bi-info-circle" aria-hidden="true"></i> ' +
      'Prototype; data stays in this browser, not a real database.</div>';
  }
  function getAdminName() { return getSettings().adminName.trim() || 'Shop Admin'; }

  function renderSidebar(page) {
    const aside = document.getElementById('adminSidebar');
    if (aside) aside.innerHTML = buildBrand() + buildNav(page) + buildSidebarFoot();

    const off = document.getElementById('sidebarOffcanvas');
    if (off) {
      off.className = 'offcanvas offcanvas-start ar-offcanvas';
      off.setAttribute('tabindex', '-1');
      off.setAttribute('aria-label', 'Navigation menu');
      off.innerHTML =
        '<div class="offcanvas-header pb-0 justify-content-end">' +
        '<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close menu"></button></div>' +
        '<div class="offcanvas-body">' + buildBrand() + buildNav(page) + buildSidebarFoot() + '</div>';
    }
  }

  function renderTopbar(title) {
    const bar = document.getElementById('adminTopbar');
    if (!bar) return;
    const name = getAdminName();
    bar.className = 'ar-topbar';
    bar.innerHTML =
      '<button type="button" class="ar-icon-btn ar-menu-btn" data-bs-toggle="offcanvas" data-bs-target="#sidebarOffcanvas" aria-controls="sidebarOffcanvas" aria-label="Open menu"><i class="bi bi-list" aria-hidden="true"></i></button>' +
      '<p class="ar-topbar-title d-lg-none flex-grow-1 text-truncate">' + escapeHtml(title) + '</p>' +
      '<div class="d-none d-lg-block flex-grow-1 text-muted small"><i class="bi bi-flower2" aria-hidden="true"></i> ' + escapeHtml(getSettings().shopName) + ' · Admin</div>' +
      '<button type="button" id="themeToggle" class="ar-icon-btn"></button>' +
      '<div class="dropdown">' +
        '<button type="button" class="ar-icon-btn" id="notifBtn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Notifications"><i class="bi bi-bell" aria-hidden="true"></i><span id="notifBadge" class="ar-notif-badge" hidden>0</span></button>' +
        '<div class="dropdown-menu dropdown-menu-end ar-notif-menu p-0" aria-labelledby="notifBtn">' +
          '<h2 class="dropdown-header fs-6 mt-1">Notifications</h2>' +
          '<div id="notifList"></div>' +
        '</div>' +
      '</div>' +
      '<div class="dropdown">' +
        '<button type="button" class="ar-profile-btn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Open profile menu">' +
          '<span class="ar-avatar" aria-hidden="true">' + escapeHtml(name.charAt(0).toUpperCase()) + '</span>' +
          '<span class="ar-profile-name d-none d-sm-inline">' + escapeHtml(name) + '</span>' +
          '<i class="bi bi-chevron-down small" aria-hidden="true"></i></button>' +
        '<ul class="dropdown-menu dropdown-menu-end">' +
          '<li><h2 class="dropdown-header fs-6">' + escapeHtml(name) + '</h2></li>' +
          '<li><a class="dropdown-item" href="settings.html"><i class="bi bi-person-gear me-2" aria-hidden="true"></i>Profile and settings</a></li>' +
          '<li><hr class="dropdown-divider"></li>' +
          '<li><a class="dropdown-item" href="login.html"><i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Sign out</a></li>' +
        '</ul>' +
      '</div>';
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    applyTheme(getTheme());
    setNotifications(buildNotifications());
  }

  /* Notifications: pages pass [{ icon, text, href }]. Empty list shows an empty state. */
  function setNotifications(items) {
    const list = document.getElementById('notifList');
    const badge = document.getElementById('notifBadge');
    if (!list || !badge) return;
    items = Array.isArray(items) ? items : [];
    if (!items.length) {
      list.innerHTML = '<div class="ar-empty py-4"><i class="bi bi-bell-slash" aria-hidden="true"></i><p class="mb-0 mt-2 small">You are all caught up.</p></div>';
      badge.hidden = true;
      return;
    }
    list.innerHTML = items.map(function (n) {
      return '<a class="ar-notif-item" href="' + escapeHtml(n.href || '#') + '"><i class="bi ' + escapeHtml(n.icon || 'bi-info-circle') + '" aria-hidden="true"></i><span>' + escapeHtml(n.text) + '</span></a>';
    }).join('');
    badge.textContent = String(items.length);
    badge.hidden = false;
    document.getElementById('notifBtn').setAttribute('aria-label', 'Notifications, ' + items.length + ' new');
  }

  function renderPageHeader(title, crumbs) {
    const host = document.getElementById('pageHeader');
    if (!host) return;
    host.className = 'ar-page-header';
    const trail = (crumbs && crumbs.length ? crumbs : [{ label: 'Dashboard', href: 'dashboard.html' }, { label: title }]);
    host.innerHTML =
      '<div><nav aria-label="Breadcrumb"><ol class="breadcrumb">' +
      trail.map(function (c, i) {
        const last = i === trail.length - 1;
        return last ? '<li class="breadcrumb-item active" aria-current="page">' + escapeHtml(c.label) + '</li>'
                    : '<li class="breadcrumb-item"><a href="' + escapeHtml(c.href) + '">' + escapeHtml(c.label) + '</a></li>';
      }).join('') + '</ol></nav>' +
      '<h1 class="ar-page-title">' + escapeHtml(title) + '</h1></div>' +
      '<div class="ar-page-actions" id="pageActions"></div>';
  }

  /* Re-draw sidebar and topbar after settings change (page header and page actions are left alone). */
  function refreshShell() {
    const page = document.body.dataset.page || '';
    const title = document.body.dataset.title || 'Admin';
    renderSidebar(page);
    renderTopbar(title);
  }

  function initLayout() {
    const page = document.body.dataset.page || '';
    const title = document.body.dataset.title || 'Admin';
    renderSidebar(page);
    renderTopbar(title);
    renderPageHeader(title);
  }

  document.addEventListener('DOMContentLoaded', initLayout);

  // Keep the theme in sync if it is changed in another tab.
  global.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEYS.theme) applyTheme(getTheme());
  });

  global.AnnroeAdmin = {
    STORAGE_KEYS, NAV_ITEMS,
    readStorage, writeStorage, getSettings, saveSettings, defaultSettings, refreshShell,
    escapeHtml, formatPeso,
    getTheme, setTheme, applyTheme, toggleTheme,
    showToast, setNotifications, refreshNotifications, confirmAction, hideModal, setFieldError, clearFieldErrors,
    formatDate, formatDateShort, weekdayShort, formatTime, formatDateTime,
    statusBadge, stockBadge, paymentBadge, productImageSrc
  };
})(window);
