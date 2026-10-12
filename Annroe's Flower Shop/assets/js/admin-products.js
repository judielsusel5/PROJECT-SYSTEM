/* admin-products.js — product management (mock data in LocalStorage; not a real database). */
(function () {
  'use strict';

  const A = AnnroeAdmin;
  const D = AnnroeData;
  const esc = A.escapeHtml;

  const CATEGORIES = ['Bouquets', 'Arrangements', 'Add-ons'];
  const TBC_NOTE = 'Price to be confirmed';
  const MAX_PRICE = 1000000;
  const MAX_STOCK = 100000;
  const PHOTO_CHOICES = [
    ['assets/images/products/rose-red.jpg', 'Red roses'],
    ['assets/images/products/carnation-pink.jpg', 'Pink carnations'],
    ['assets/images/products/tulip-pink.jpg', 'Pink tulips'],
    ['assets/images/products/tulip-blue.jpg', 'Blue tulips'],
    ['assets/images/products/lisianthus-pink-violet.jpg', 'Pink/violet lisianthus'],
    ['assets/images/products/gerbera-mixed.jpg', 'Gerbera (pink, yellow, white)'],
    ['assets/images/products/mixed-bouquet.jpg', 'Mixed pastel bouquet'],
    ['assets/images/products/addons.jpg', 'Gift add-ons']
  ];

  const $ = function (id) { return document.getElementById(id); };
  let editingId = null;      // null while adding
  let formImage = '';        // path or data URL of the image in the form
  let viewingId = null;
  let productModal, viewModal;

  /* ============ Data ============ */
  function allProducts() { return D.getProducts(); }
  function persist(list) {
    if (!D.saveProducts(list)) {
      A.showToast('Could not save. Browser storage may be full or blocked.', 'danger');
      return false;
    }
    return true;
  }
  function recordMovement(product, change, type, reason) {
    const movements = D.getMovements();
    movements.push({
      id: D.nextId('MOV-', movements), productId: product.id, type: type, change: change,
      balanceAfter: product.stockQuantity, reason: reason, date: new Date().toISOString(), recordedBy: 'Shop Admin'
    });
    D.saveMovements(movements);
  }
  function categoriesInUse(list) {
    const set = CATEGORIES.slice();
    list.forEach(function (p) { if (p.category && set.indexOf(p.category) === -1) set.push(p.category); });
    return set;
  }

  /* ============ List: filter, sort, render ============ */
  function visibleProducts() {
    const q = $('searchInput').value.trim().toLowerCase();
    const cat = $('categoryFilter').value;
    const avail = $('availabilityFilter').value;
    const sort = $('sortSelect').value;

    const list = allProducts().filter(function (p) {
      if (cat && p.category !== cat) return false;
      if (avail && p.availability !== avail) return false;
      if (!q) return true;
      return [p.name, p.id, p.flowerType, p.color, p.category].join(' ').toLowerCase().indexOf(q) > -1;
    });

    list.sort(function (a, b) {
      if (sort.indexOf('price') === 0) {
        const aNull = a.price == null, bNull = b.price == null;
        if (aNull || bNull) return aNull && bNull ? 0 : aNull ? 1 : -1;   // unconfirmed prices always last
        return sort === 'price-asc' ? a.price - b.price : b.price - a.price;
      }
      const cmp = a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
      return sort === 'name-desc' ? -cmp : cmp;
    });
    return list;
  }

  function thumb(p) {
    return p.image
      ? '<img class="ar-thumb" src="' + esc(A.productImageSrc(p.image)) + '" alt="' + esc(p.name) + '" width="44" height="44" loading="lazy">'
      : '<span class="ar-thumb ar-thumb-empty" role="img" aria-label="No photo"><i class="bi bi-flower1" aria-hidden="true"></i></span>';
  }
  function priceHtml(p) {
    if (p.price == null) return '<span class="text-muted fst-italic">' + TBC_NOTE + '</span>';
    const many = p.priceOptions.length > 1;
    return (many ? '<span class="small text-muted">From </span>' : '') + '<span class="fw-semibold">' + esc(A.formatPeso(p.price)) + '</span>' +
      (many ? '<div class="small text-muted">' + p.priceOptions.length + ' options</div>' : '');
  }

  function render() {
    const list = visibleProducts();
    const total = allProducts().length;
    const host = $('productTable');
    $('resultCount').textContent = 'Showing ' + list.length + ' of ' + total + (total === 1 ? ' product' : ' products');

    if (!list.length) {
      host.innerHTML = total
        ? '<div class="ar-empty"><i class="bi bi-search" aria-hidden="true"></i><h3>No matching products</h3><p class="mb-3">Try a different search or clear the filters.</p><button type="button" class="btn btn-outline-primary btn-sm" data-action="clear">Clear filters</button></div>'
        : '<div class="ar-empty"><i class="bi bi-flower3" aria-hidden="true"></i><h3>No products yet</h3><p class="mb-3">Add your first product to get started.</p><button type="button" class="btn btn-primary btn-sm" data-action="add">Add product</button></div>';
      return;
    }

    host.innerHTML =
      '<table class="table table-hover ar-table ar-products-table"><caption class="visually-hidden">Product list</caption><thead><tr>' +
      '<th scope="col">Product</th><th scope="col">Category</th><th scope="col">Flower and color</th><th scope="col">Price</th>' +
      '<th scope="col">Stock</th><th scope="col">Availability</th><th scope="col" class="text-end">Actions</th></tr></thead><tbody>' +
      list.map(function (p) {
        const status = D.getStockStatus(p);
        const on = p.availability === 'Available';
        return '<tr>' +
          '<th scope="row"><div class="d-flex align-items-center gap-2">' + thumb(p) +
            '<div class="min-w-0"><div class="fw-semibold">' + esc(p.name) + '</div><div class="small text-muted">' + esc(p.id) + '</div></div></div></th>' +
          '<td>' + esc(p.category) + '</td>' +
          '<td>' + esc(p.flowerType) + '<div class="small text-muted">' + esc(p.color) + '</div></td>' +
          '<td>' + priceHtml(p) + '</td>' +
          '<td>' + p.stockQuantity + ' <span class="small text-muted">' + esc(p.unit || '') + '</span><div class="mt-1">' + A.stockBadge(status) + '</div></td>' +
          '<td><div class="form-check form-switch mb-0">' +
            '<input class="form-check-input" type="checkbox" role="switch" id="sw-' + esc(p.id) + '" data-action="toggle" data-id="' + esc(p.id) + '"' + (on ? ' checked' : '') + ' aria-label="Available: ' + esc(p.name) + '">' +
            '<label class="form-check-label small" for="sw-' + esc(p.id) + '">' + (on ? 'Available' : 'Unavailable') + '</label></div></td>' +
          '<td class="text-end text-nowrap">' +
            '<button type="button" class="btn btn-sm btn-rose me-1" data-action="view" data-id="' + esc(p.id) + '" aria-label="View details: ' + esc(p.name) + '"><i class="bi bi-eye" aria-hidden="true"></i></button>' +
            '<button type="button" class="btn btn-sm btn-rose me-1" data-action="edit" data-id="' + esc(p.id) + '" aria-label="Edit: ' + esc(p.name) + '"><i class="bi bi-pencil" aria-hidden="true"></i></button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="' + esc(p.id) + '" aria-label="Delete: ' + esc(p.name) + '"><i class="bi bi-trash" aria-hidden="true"></i></button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function populateFilters() {
    const current = $('categoryFilter').value;
    const cats = categoriesInUse(allProducts());
    $('categoryFilter').innerHTML = '<option value="">All categories</option>' +
      cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    $('categoryFilter').value = cats.indexOf(current) > -1 ? current : '';
    $('pfCategory').innerHTML = cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    const types = [];
    allProducts().forEach(function (p) { if (p.flowerType && p.flowerType !== '—' && types.indexOf(p.flowerType) === -1) types.push(p.flowerType); });
    $('flowerTypeList').innerHTML = types.map(function (t) { return '<option value="' + esc(t) + '"></option>'; }).join('');
  }

  /* ============ Availability switch ============ */
  function toggleAvailability(id, wantAvailable) {
    const list = allProducts();
    const p = list.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    if (wantAvailable && p.price == null) {
      A.showToast('Add a confirmed price before marking "' + p.name + '" as Available.', 'warning');
      render();
      return;
    }
    p.availability = wantAvailable ? 'Available' : 'Unavailable';
    p.updatedAt = new Date().toISOString();
    if (persist(list)) A.showToast(p.name + ' is now ' + p.availability + '.', 'success');
    render();
  }

  /* ============ Form helpers ============ */
  function setError(input, message) { A.setFieldError(input, message); }
  function clearErrors() {
    A.clearFieldErrors($('productForm'));
    $('optionsError').hidden = true;
    $('photoError').textContent = '';
  }

  function updatePreview() {
    const box = $('imgPreview');
    box.innerHTML = formImage
      ? '<img src="' + esc(A.productImageSrc(formImage)) + '" alt="Selected product photo preview">'
      : '<i class="bi bi-image" aria-hidden="true"></i><span class="visually-hidden">No photo selected</span>';
    const known = PHOTO_CHOICES.some(function (c) { return c[0] === formImage; });
    $('pfPhotoChoice').value = !formImage ? '' : known ? formImage : '__custom';
  }

  function buildPhotoSelect() {
    $('pfPhotoChoice').innerHTML = '<option value="">No photo</option>' +
      PHOTO_CHOICES.map(function (c) { return '<option value="' + esc(c[0]) + '">' + esc(c[1]) + '</option>'; }).join('') +
      '<option value="__custom" disabled>Custom upload</option>';
  }

  /* ---- price options repeater ---- */
  function optionRowHtml(opt) {
    opt = opt || { label: '', stems: '', price: '' };
    return '<div class="ar-option-row">' +
      '<div class="ar-option-field"><label class="visually-hidden">Option label</label><input type="text" class="form-control opt-label" placeholder="Label (e.g. 6 stems)" maxlength="30" value="' + esc(opt.label) + '"></div>' +
      '<div class="ar-option-field ar-option-small"><label class="visually-hidden">Number of stems or pieces</label><input type="number" class="form-control opt-stems" placeholder="Stems" min="1" step="1" inputmode="numeric" value="' + esc(opt.stems) + '"></div>' +
      '<div class="ar-option-field ar-option-small"><label class="visually-hidden">Option price in pesos</label><input type="number" class="form-control opt-price" placeholder="Price ₱" min="0" step="0.01" inputmode="decimal" value="' + esc(opt.price) + '"></div>' +
      '<button type="button" class="btn btn-outline-danger btn-sm" data-remove-option aria-label="Remove this price option"><i class="bi bi-x-lg" aria-hidden="true"></i></button></div>';
  }
  function optionRows() { return Array.prototype.slice.call($('optionRows').querySelectorAll('.ar-option-row')); }
  function syncPricingState() {
    const tbc = $('pfPriceTbc').checked;
    const rows = optionRows();
    const priceInput = $('pfPrice');
    $('optionsSection').hidden = tbc;
    if (tbc) {
      priceInput.value = ''; priceInput.disabled = true; priceInput.readOnly = false;
      $('pfPriceHelp').textContent = 'Not set while the price is to be confirmed.';
      return;
    }
    priceInput.disabled = false;
    if (rows.length) {
      const prices = rows.map(function (r) { return Number(r.querySelector('.opt-price').value); })
        .filter(function (n) { return isFinite(n) && n > 0; });
      priceInput.readOnly = true;
      priceInput.value = prices.length ? Math.min.apply(null, prices) : '';
      $('pfPriceHelp').textContent = 'Set automatically to the lowest option price.';
    } else {
      priceInput.readOnly = false;
      $('pfPriceHelp').textContent = 'Starting or single-item price.';
    }
  }

  function openForm(product) {
    editingId = product ? product.id : null;
    clearErrors();
    $('productForm').reset();
    $('productModalTitle').textContent = product ? 'Edit product' : 'Add product';
    $('saveProductBtn').textContent = product ? 'Save changes' : 'Add product';
    $('pfId').value = product ? product.id : 'Auto-generated';
    $('pfName').value = product ? product.name : '';
    $('pfCategory').value = product ? product.category : CATEGORIES[0];
    $('pfFlower').value = product ? product.flowerType : '';
    $('pfColor').value = product ? product.color : '';
    $('pfAvailability').value = product ? product.availability : 'Available';
    $('pfDescription').value = product ? product.description : '';
    $('pfStock').value = product ? product.stockQuantity : '0';
    $('pfThreshold').value = product ? product.lowStockThreshold : String(A.getSettings().lowStockDefault);
    $('pfPriceTbc').checked = product ? product.price == null : false;
    $('optionRows').innerHTML = product ? product.priceOptions.map(optionRowHtml).join('') : '';
    $('pfPrice').value = product && product.price != null ? product.price : '';
    formImage = product ? product.image || '' : '';
    updatePreview();
    syncPricingState();
    if (product && product.price != null && !product.priceOptions.length) $('pfPrice').value = product.price;
    productModal.show();
  }

  /* ---- validation + read ---- */
  function parseNumber(value) {
    const t = String(value).trim();
    return t === '' ? NaN : Number(t);
  }
  function validateForm() {
    clearErrors();
    let firstBad = null;
    const bad = function (input, msg) { setError(input, msg); if (!firstBad) firstBad = input; };

    const name = $('pfName').value.trim();
    if (!name) bad($('pfName'), 'Enter the product name.');
    else if (name.length < 2) bad($('pfName'), 'The name needs at least 2 characters.');
    else if (allProducts().some(function (p) { return p.id !== editingId && p.name.toLowerCase() === name.toLowerCase(); }))
      bad($('pfName'), 'A product with this name already exists.');

    if (!$('pfCategory').value) bad($('pfCategory'), 'Choose a category.');
    if (!$('pfFlower').value.trim()) bad($('pfFlower'), 'Enter the flower type.');
    if (!$('pfColor').value.trim()) bad($('pfColor'), 'Enter the color.');

    const desc = $('pfDescription').value.trim();
    if (!desc) bad($('pfDescription'), 'Enter a short description.');
    else if (desc.length < 10) bad($('pfDescription'), 'Add a little more detail (at least 10 characters).');

    const tbc = $('pfPriceTbc').checked;
    if ($('pfAvailability').value === 'Available' && tbc)
      bad($('pfAvailability'), 'A product without a confirmed price cannot be set to Available.');

    if (!tbc) {
      const rows = optionRows();
      if (rows.length) {
        let optionProblem = '';
        const seen = {};
        rows.forEach(function (r) {
          const label = r.querySelector('.opt-label'), stems = r.querySelector('.opt-stems'), price = r.querySelector('.opt-price');
          [label, stems, price].forEach(function (i) { i.classList.remove('is-invalid'); });
          const sn = parseNumber(stems.value), pn = parseNumber(price.value);
          const key = label.value.trim().toLowerCase();
          if (!label.value.trim()) { label.classList.add('is-invalid'); optionProblem = optionProblem || 'Every option needs a label.'; }
          else if (seen[key]) { label.classList.add('is-invalid'); optionProblem = optionProblem || 'Option labels must be different from each other.'; }
          seen[key] = true;
          if (!Number.isInteger(sn) || sn < 1) { stems.classList.add('is-invalid'); optionProblem = optionProblem || 'Stems must be a whole number of 1 or more.'; }
          if (!isFinite(pn) || pn <= 0 || pn > MAX_PRICE) { price.classList.add('is-invalid'); optionProblem = optionProblem || 'Each option needs a price greater than 0.'; }
        });
        if (optionProblem) {
          $('optionsError').textContent = optionProblem; $('optionsError').hidden = false;
          if (!firstBad) firstBad = $('optionRows').querySelector('.is-invalid');
        }
      } else {
        const price = parseNumber($('pfPrice').value);
        if (!isFinite(price)) bad($('pfPrice'), 'Enter a price, or tick "Price to be confirmed".');
        else if (price <= 0) bad($('pfPrice'), 'The price must be greater than 0.');
        else if (price > MAX_PRICE) bad($('pfPrice'), 'The price is too high. Check the amount.');
        else if (Math.round(price * 100) !== price * 100 && Math.abs(Math.round(price * 100) - price * 100) > 1e-6) bad($('pfPrice'), 'Use at most 2 decimal places.');
      }
    }

    const stock = parseNumber($('pfStock').value);
    if (!isFinite(stock)) bad($('pfStock'), 'Enter the stock quantity.');
    else if (!Number.isInteger(stock)) bad($('pfStock'), 'Stock must be a whole number.');
    else if (stock < 0) bad($('pfStock'), 'Stock cannot be negative.');
    else if (stock > MAX_STOCK) bad($('pfStock'), 'That quantity is too large.');

    const thr = parseNumber($('pfThreshold').value);
    if (!isFinite(thr)) bad($('pfThreshold'), 'Enter the low stock threshold.');
    else if (!Number.isInteger(thr) || thr < 0) bad($('pfThreshold'), 'Use a whole number of 0 or more.');
    else if (thr > MAX_STOCK) bad($('pfThreshold'), 'That number is too large.');

    if (firstBad) { firstBad.focus(); return false; }
    return true;
  }

  function readForm() {
    const tbc = $('pfPriceTbc').checked;
    const options = tbc ? [] : optionRows().map(function (r) {
      return { label: r.querySelector('.opt-label').value.trim(), stems: Number(r.querySelector('.opt-stems').value), price: Number(r.querySelector('.opt-price').value) };
    });
    let price = null;
    if (!tbc) price = options.length ? Math.min.apply(null, options.map(function (o) { return o.price; })) : Number($('pfPrice').value);
    const category = $('pfCategory').value;
    return {
      name: $('pfName').value.trim(), category: category, flowerType: $('pfFlower').value.trim(), color: $('pfColor').value.trim(),
      description: $('pfDescription').value.trim(), price: price, priceOptions: options, priceNote: tbc ? TBC_NOTE : '',
      stockQuantity: Number($('pfStock').value), lowStockThreshold: Number($('pfThreshold').value),
      unit: category === 'Add-ons' ? 'pcs' : 'stems', image: formImage, availability: $('pfAvailability').value
    };
  }

  function saveProduct(event) {
    event.preventDefault();
    if (!validateForm()) return;
    const data = readForm();
    const list = allProducts();
    const now = new Date().toISOString();

    if (editingId) {
      const idx = list.findIndex(function (p) { return p.id === editingId; });
      if (idx === -1) { A.showToast('That product no longer exists.', 'danger'); A.hideModal($('productModal')); render(); return; }
      const before = list[idx];
      const updated = Object.assign({}, before, data, { id: before.id, updatedAt: now });
      list[idx] = updated;
      if (!persist(list)) return;
      const delta = updated.stockQuantity - before.stockQuantity;
      if (delta !== 0) recordMovement(updated, delta, 'Adjustment', 'Stock edited from the Products page');
      A.showToast('Product updated: ' + updated.name + '.', 'success');
    } else {
      const created = Object.assign({ id: D.nextId('PRD-', list), updatedAt: now }, data);
      list.push(created);
      if (!persist(list)) return;
      if (created.stockQuantity > 0) recordMovement(created, created.stockQuantity, 'Addition', 'Opening stock for new product');
      A.showToast('Product added: ' + created.name + '.', 'success');
    }
    A.hideModal($('productModal'));
    populateFilters();
    render();
  }

  /* ============ View + delete ============ */
  function viewProduct(id) {
    const p = allProducts().filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    viewingId = id;
    const status = D.getStockStatus(p);
    const options = p.priceOptions.length
      ? '<div class="ar-table-wrap"><table class="table ar-table mb-0" style="min-width:0"><thead><tr><th scope="col">Option</th><th scope="col">Stems</th><th scope="col" class="text-end">Price</th></tr></thead><tbody>' +
        p.priceOptions.map(function (o) { return '<tr><td>' + esc(o.label) + '</td><td>' + o.stems + '</td><td class="text-end">' + esc(A.formatPeso(o.price)) + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<p class="mb-0 text-muted">' + (p.price == null ? TBC_NOTE + '.' : 'Single price: ' + esc(A.formatPeso(p.price)) + '.') + '</p>';
    $('viewModalTitle').textContent = p.name;
    $('viewBody').innerHTML =
      '<div class="row g-4"><div class="col-md-5">' +
        (p.image ? '<img class="ar-detail-img" src="' + esc(A.productImageSrc(p.image)) + '" alt="' + esc(p.name) + '">' : '<div class="ar-detail-img ar-thumb-empty"><i class="bi bi-flower1" aria-hidden="true"></i></div>') +
      '</div><div class="col-md-7">' +
        '<div class="d-flex flex-wrap gap-2 mb-3">' + A.stockBadge(status) + (p.availability === 'Available' ? '<span class="ar-badge ar-badge--ready">Available</span>' : '<span class="ar-badge ar-badge--unpaid">Unavailable</span>') + '</div>' +
        '<dl class="ar-detail-list">' +
          '<div><dt>Product ID</dt><dd>' + esc(p.id) + '</dd></div>' +
          '<div><dt>Category</dt><dd>' + esc(p.category) + '</dd></div>' +
          '<div><dt>Flower type</dt><dd>' + esc(p.flowerType) + '</dd></div>' +
          '<div><dt>Color</dt><dd>' + esc(p.color) + '</dd></div>' +
          '<div><dt>Stock</dt><dd>' + p.stockQuantity + ' ' + esc(p.unit || '') + '</dd></div>' +
          '<div><dt>Low stock threshold</dt><dd>' + p.lowStockThreshold + '</dd></div>' +
          '<div><dt>Last updated</dt><dd>' + esc(A.formatDateTime(p.updatedAt)) + '</dd></div>' +
        '</dl></div>' +
        '<div class="col-12"><h3 class="h5 ar-display">Description</h3><p>' + esc(p.description) + '</p>' +
        '<h3 class="h5 ar-display">Prices</h3>' + options + '</div></div>';
    viewModal.show();
  }

  function deleteProduct(id) {
    const p = allProducts().filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    const used = D.getOrders().filter(function (o) { return o.items.some(function (i) { return i.productId === id; }); }).length;
    const msg = 'Delete "' + p.name + '"? This cannot be undone.' +
      (used ? ' It appears in ' + used + (used === 1 ? ' order' : ' orders') + '; those orders keep their saved item names.' : '');
    A.confirmAction({ title: 'Delete product?', message: msg, confirmLabel: 'Delete product', danger: true }).then(function (ok) {
      if (!ok) return;
      const list = allProducts().filter(function (x) { return x.id !== id; });
      if (!persist(list)) return;
      A.showToast('Product deleted: ' + p.name + '.', 'success');
      populateFilters();
      render();
    });
  }

  /* ============ Image upload (resized, stored as a data URL) ============ */
  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('read')); };
      reader.onload = function () {
        const img = new Image();
        img.onerror = function () { reject(new Error('decode')); };
        img.onload = function () {
          const max = 640, scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ============ Wiring ============ */
  function init() {
    productModal = new bootstrap.Modal($('productModal'));
    viewModal = new bootstrap.Modal($('viewModal'));
    buildPhotoSelect();
    populateFilters();
    render();

    $('pageActions').innerHTML = '<button type="button" class="btn btn-primary" data-action="add"><i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Add product</button>';

    ['searchInput', 'categoryFilter', 'availabilityFilter', 'sortSelect'].forEach(function (id) {
      $(id).addEventListener(id === 'searchInput' ? 'input' : 'change', render);
    });
    function clearFilters() {
      $('searchInput').value = ''; $('categoryFilter').value = ''; $('availabilityFilter').value = ''; $('sortSelect').value = 'name-asc';
      render();
    }
    $('clearFilters').addEventListener('click', clearFilters);

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.type === 'checkbox') return;
      const action = btn.dataset.action;
      if (action === 'add') openForm(null);
      else if (action === 'clear') clearFilters();
      else if (action === 'view') viewProduct(btn.dataset.id);
      else if (action === 'edit') openForm(allProducts().filter(function (p) { return p.id === btn.dataset.id; })[0]);
      else if (action === 'delete') deleteProduct(btn.dataset.id);
    });
    $('productTable').addEventListener('change', function (e) {
      if (e.target.matches('[data-action="toggle"]')) toggleAvailability(e.target.dataset.id, e.target.checked);
    });

    $('viewEditBtn').addEventListener('click', function () {
      const p = allProducts().filter(function (x) { return x.id === viewingId; })[0];
      A.hideModal($('viewModal')).then(function () { if (p) openForm(p); });
    });

    $('productForm').addEventListener('submit', saveProduct);
    $('productForm').addEventListener('input', function (e) {
      if (e.target.classList.contains('is-invalid')) { e.target.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); }
      if (e.target.matches('.opt-price')) syncPricingState();
    });
    $('pfPriceTbc').addEventListener('change', syncPricingState);
    $('addOptionBtn').addEventListener('click', function () {
      $('optionRows').insertAdjacentHTML('beforeend', optionRowHtml());
      syncPricingState();
      optionRows().pop().querySelector('.opt-label').focus();
    });
    $('optionRows').addEventListener('click', function (e) {
      const rm = e.target.closest('[data-remove-option]');
      if (!rm) return;
      rm.closest('.ar-option-row').remove();
      syncPricingState();
      $('addOptionBtn').focus();
    });

    $('pfPhotoChoice').addEventListener('change', function () {
      if ($('pfPhotoChoice').value === '__custom') return;
      formImage = $('pfPhotoChoice').value;
      $('pfPhotoUpload').value = '';
      updatePreview();
    });
    $('pfPhotoUpload').addEventListener('change', function () {
      const file = $('pfPhotoUpload').files[0];
      const err = $('photoError');
      $('pfPhotoUpload').classList.remove('is-invalid'); err.textContent = '';
      if (!file) return;
      const okType = ['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) > -1;
      if (!okType || file.size > 5 * 1024 * 1024) {
        $('pfPhotoUpload').classList.add('is-invalid');
        err.textContent = !okType ? 'Choose a JPG, PNG or WebP image.' : 'That image is larger than 5 MB.';
        $('pfPhotoUpload').value = '';
        return;
      }
      resizeImage(file).then(function (dataUrl) { formImage = dataUrl; updatePreview(); })
        .catch(function () { $('pfPhotoUpload').classList.add('is-invalid'); err.textContent = 'That image could not be read. Try another file.'; });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
