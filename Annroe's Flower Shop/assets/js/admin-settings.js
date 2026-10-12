/* admin-settings.js — frontend display preferences saved to LocalStorage (annerore_admin_settings).
   Not account security and not server configuration. */
(function () {
  'use strict';

  const A = AnnroeAdmin;
  const esc = A.escapeHtml;
  const $ = function (id) { return document.getElementById(id); };
  const DAY_COUNT = 7;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

  let saved = A.getSettings();   // last saved state, used for "dirty" checks and Undo

  /* ============ Form <-> settings ============ */
  function fill(s) {
    $('stShopName').value = s.shopName; $('stTagline').value = s.tagline;
    $('stPhone').value = s.phone; $('stEmail').value = s.email; $('stAddress').value = s.address; $('stWebsite').value = s.website;
    $('stLowStock').value = s.lowStockDefault;
    $('stAdminName').value = s.adminName; $('stAdminTitle').value = s.adminTitle;
    s.hours.forEach(function (h, i) {
      $('hrOpen' + i).checked = h.open; $('hrFrom' + i).value = h.from; $('hrTo' + i).value = h.to;
    });
    syncHoursUi();
    updatePreviews();
    updateDirty();
  }

  function read() {
    const hours = [];
    for (let i = 0; i < DAY_COUNT; i++) {
      hours.push({ day: A.defaultSettings().hours[i].day, open: $('hrOpen' + i).checked, from: $('hrFrom' + i).value, to: $('hrTo' + i).value });
    }
    const low = $('stLowStock').value.trim();
    return {
      shopName: $('stShopName').value.trim(), tagline: $('stTagline').value.trim(),
      phone: $('stPhone').value.trim(), email: $('stEmail').value.trim(), address: $('stAddress').value.trim(), website: $('stWebsite').value.trim(),
      hours: hours, lowStockDefault: low === '' ? NaN : Number(low),
      adminName: $('stAdminName').value.trim(), adminTitle: $('stAdminTitle').value.trim()
    };
  }

  function same(a, b) {
    return JSON.stringify(a, function (k, v) { return typeof v === 'number' && isNaN(v) ? 'NaN' : v; }) ===
           JSON.stringify(b, function (k, v) { return typeof v === 'number' && isNaN(v) ? 'NaN' : v; });
  }
  function updateDirty() {
    const dirty = !same(read(), saved);
    $('dirtyMsg').innerHTML = dirty ? '<i class="bi bi-circle-fill text-warning me-1" aria-hidden="true"></i>You have unsaved changes.' : '';
    $('undoChanges').disabled = !dirty;
  }

  /* ============ Previews + hours UI ============ */
  function updatePreviews() {
    const name = $('stShopName').value.trim() || A.defaultSettings().shopName;
    $('prevName').textContent = name;
    $('prevTag').textContent = $('stTagline').value.trim();
    const admin = $('stAdminName').value.trim() || 'Shop Admin';
    $('prevAdmin').textContent = admin;
    $('prevAvatar').textContent = admin.charAt(0).toUpperCase();
    $('prevTitleText').textContent = $('stAdminTitle').value.trim();
  }

  function syncHoursUi() {
    for (let i = 0; i < DAY_COUNT; i++) {
      const open = $('hrOpen' + i).checked;
      $('hrFrom' + i).disabled = !open; $('hrTo' + i).disabled = !open;
      $('hrClosed' + i).hidden = open;
      $('hrFrom' + i).parentElement.hidden = !open;
    }
  }

  /* ============ Validation ============ */
  function validate(s) {
    A.clearFieldErrors($('settingsForm'));
    let first = null;
    const bad = function (id, msg) { A.setFieldError($(id), msg); if (!first) first = $(id); };

    if (!s.shopName) bad('stShopName', 'Enter the shop name.');
    else if (s.shopName.length < 2) bad('stShopName', 'The shop name needs at least 2 characters.');
    if (s.phone && !PHONE_RE.test(s.phone)) bad('stPhone', 'Use 7 to 20 digits, spaces, + or dashes.');
    if (s.email && !EMAIL_RE.test(s.email)) bad('stEmail', 'Enter a valid email like name@example.com.');

    s.hours.forEach(function (h, i) {
      if (!h.open) return;
      if (!h.from) bad('hrFrom' + i, h.day + ': choose an opening time.');
      else if (!h.to) bad('hrTo' + i, h.day + ': choose a closing time.');
      else if (h.from >= h.to) bad('hrTo' + i, h.day + ': closing time must be after opening time.');
    });

    if (!isFinite(s.lowStockDefault)) bad('stLowStock', 'Enter a number, for example 10.');
    else if (!Number.isInteger(s.lowStockDefault)) bad('stLowStock', 'Use a whole number.');
    else if (s.lowStockDefault < 0) bad('stLowStock', 'The threshold cannot be negative.');
    else if (s.lowStockDefault > 1000) bad('stLowStock', 'The threshold can be at most 1,000.');

    if (!s.adminName) bad('stAdminName', 'Enter a display name.');
    else if (s.adminName.length < 2) bad('stAdminName', 'The name needs at least 2 characters.');

    if (first) { first.focus(); return false; }
    return true;
  }

  /* ============ Actions ============ */
  function save(event) {
    event.preventDefault();
    const s = read();
    if (!validate(s)) { A.showToast('Please fix the highlighted fields.', 'danger'); return; }
    if (!A.saveSettings(s)) { A.showToast('Could not save. Browser storage may be full or blocked.', 'danger'); return; }
    saved = A.getSettings();
    A.refreshShell();
    updateDirty();
    A.showToast('Settings saved.', 'success');
  }

  function undo() {
    A.clearFieldErrors($('settingsForm'));
    fill(saved);
    A.showToast('Unsaved changes were discarded.', 'info');
  }

  function resetDefaults() {
    A.confirmAction({
      title: 'Reset settings to defaults?',
      message: 'This replaces your shop name, contact details, business hours, low-stock default and admin profile with the original defaults. Your theme and your products, orders and stock are not changed.',
      confirmLabel: 'Reset settings', danger: true
    }).then(function (ok) {
      if (!ok) return;
      const defaults = A.defaultSettings();
      if (!A.saveSettings(defaults)) { A.showToast('Could not save. Browser storage may be full or blocked.', 'danger'); return; }
      saved = A.getSettings();
      A.clearFieldErrors($('settingsForm'));
      fill(saved);
      A.refreshShell();
      A.showToast('Settings were reset to defaults.', 'success');
    });
  }

  function copyMonday() {
    for (let i = 1; i < DAY_COUNT; i++) {
      $('hrOpen' + i).checked = $('hrOpen0').checked;
      $('hrFrom' + i).value = $('hrFrom0').value;
      $('hrTo' + i).value = $('hrTo0').value;
    }
    syncHoursUi(); updateDirty();
    A.showToast('Monday\'s hours were copied to every day. Save to keep them.', 'info');
  }

  /* ============ Theme ============ */
  function syncThemeRadios() {
    const t = A.getTheme();
    $('themeLight').checked = t === 'light';
    $('themeDark').checked = t === 'dark';
  }

  function init() {
    fill(saved);
    syncThemeRadios();

    document.querySelectorAll('input[name="theme"]').forEach(function (r) {
      r.addEventListener('change', function () {
        A.setTheme(r.value);
        A.showToast((r.value === 'dark' ? 'Dark' : 'Light') + ' theme on.', 'success');
      });
    });
    // Keep the radios correct when the top-bar toggle is used.
    document.addEventListener('click', function (e) {
      if (e.target.closest('#themeToggle')) window.setTimeout(syncThemeRadios, 0);
    });

    $('settingsForm').addEventListener('submit', save);
    $('settingsForm').addEventListener('input', function (e) {
      if (e.target.classList.contains('is-invalid')) { e.target.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); }
      if (e.target.matches('[data-hours-open]')) syncHoursUi();
      updatePreviews(); updateDirty();
    });
    $('settingsForm').addEventListener('change', function (e) {
      if (e.target.matches('[data-hours-open]')) syncHoursUi();
      updateDirty();
    });
    $('undoChanges').addEventListener('click', undo);
    $('resetDefaults').addEventListener('click', resetDefaults);
    $('copyMonday').addEventListener('click', copyMonday);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
