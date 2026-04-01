/* ============================================================
   CANTON FAIR TRACKER — script.js
   ============================================================ */

'use strict';

/* ── STORAGE KEYS ─────────────────────────────────────────── */
const KEYS = {
  products:  'cf_products',
  suppliers: 'cf_suppliers',
};

/* ── STATE ────────────────────────────────────────────────── */
const state = {
  view:       'home',   // home | add-product | edit-product | product-detail | summary | suppliers | add-supplier | edit-supplier | supplier-detail
  productId:  null,
  supplierId: null,
  history:    [],
  filters: {
    search:   '',
    category: '',
    status:   '',
    sort:     'score',
    minScore: 0,
  },
};

/* ── DB LAYER ─────────────────────────────────────────────── */
const DB = {
  getProducts()  { return JSON.parse(localStorage.getItem(KEYS.products)  || '[]'); },
  getSuppliers() { return JSON.parse(localStorage.getItem(KEYS.suppliers) || '[]'); },

  saveProducts(data)  { localStorage.setItem(KEYS.products,  JSON.stringify(data)); },
  saveSuppliers(data) { localStorage.setItem(KEYS.suppliers, JSON.stringify(data)); },

  getProduct(id)  { return this.getProducts().find(p => p.id === id) || null; },
  getSupplier(id) { return this.getSuppliers().find(s => s.id === id) || null; },

  addProduct(product) {
    const list = this.getProducts();
    list.push(product);
    this.saveProducts(list);
  },

  updateProduct(updated) {
    const list = this.getProducts().map(p => p.id === updated.id ? updated : p);
    this.saveProducts(list);
  },

  deleteProduct(id) {
    this.saveProducts(this.getProducts().filter(p => p.id !== id));
  },

  addSupplier(supplier) {
    const list = this.getSuppliers();
    list.push(supplier);
    this.saveSuppliers(list);
  },

  updateSupplier(updated) {
    const list = this.getSuppliers().map(s => s.id === updated.id ? updated : s);
    this.saveSuppliers(list);
  },

  deleteSupplier(id) {
    this.saveSuppliers(this.getSuppliers().filter(s => s.id !== id));
  },

  getProductsBySupplier(supplierId) {
    return this.getProducts().filter(p => p.supplierId === supplierId);
  },
};

/* ── UTILITIES ────────────────────────────────────────────── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function calcScore(scores) {
  const s = scores || {};
  const d  = parseFloat(s.differentiation  || 0);
  const m  = parseFloat(s.marginPotential  || 0);
  const b  = parseFloat(s.businessFit      || 0);
  const i  = parseFloat(s.importEase       || 0);
  const t  = parseFloat(s.supplierTrust    || 0);
  return ((d * 0.30) + (m * 0.25) + (b * 0.20) + (i * 0.15) + (t * 0.10));
}

function scoreColor(score) {
  if (score >= 7) return 'high';
  if (score >= 4) return 'mid';
  return 'low';
}

function scoreColorHex(score) {
  if (score >= 7) return '#3ecf6e';
  if (score >= 4) return '#f5a623';
  return '#e05252';
}

function statusClass(status) {
  const map = {
    'Discovered':    'badge-status-discovered',
    'Interesting':   'badge-status-interesting',
    'Review Later':  'badge-status-review',
    'Request Sample':'badge-status-sample',
    'Negotiating':   'badge-status-negotiating',
    'Priority':      'badge-status-priority',
    'Discarded':     'badge-status-discarded',
  };
  return map[status] || 'badge-status-discovered';
}

function urgencyLabel(u) {
  const map = { low: 'Baixa', medium: 'Média', high: 'Alta' };
  return map[u] || u;
}

function val(v, fallback = '—') {
  if (v === null || v === undefined || v === '') return fallback;
  if (Array.isArray(v)) return v.length ? v.join(', ') : fallback;
  return v;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;');
}

function showToast(msg, duration = 2200) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

/* ── NAVIGATION ───────────────────────────────────────────── */
function navigate(view, params = {}, pushHistory = true) {
  if (pushHistory && state.view !== view) {
    state.history.push({ view: state.view, productId: state.productId, supplierId: state.supplierId });
  }
  state.view       = view;
  state.productId  = params.productId  || null;
  state.supplierId = params.supplierId || null;
  render();
}

function goBack() {
  if (state.history.length > 0) {
    const prev = state.history.pop();
    state.view       = prev.view;
    state.productId  = prev.productId;
    state.supplierId = prev.supplierId;
    render();
  } else {
    navigate('home', {}, false);
  }
}

/* ── RENDER CONTROLLER ────────────────────────────────────── */
function render() {
  const main       = document.getElementById('main-content');
  const header     = document.getElementById('top-header');
  const btnBack    = document.getElementById('btn-back');
  const btnAction  = document.getElementById('btn-header-action');
  const title      = document.getElementById('header-title');
  const bottomNav  = document.getElementById('bottom-nav');
  const fab        = document.getElementById('fab-add');

  // Reset header state
  btnBack.classList.add('hidden');
  btnAction.classList.add('hidden');
  btnAction.onclick = null;
  btnAction.textContent = '';
  bottomNav.classList.remove('hidden');
  fab.classList.remove('hidden');

  // Clear active nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const v = state.view;

  // ── HOME ──────────────────────────────────────────────────
  if (v === 'home') {
    title.textContent = 'Canton Fair';
    document.querySelector('[data-view="home"]').classList.add('active');
    btnAction.classList.remove('hidden');
    btnAction.innerHTML = '&#128229;';
    btnAction.title = 'Exportar';
    btnAction.onclick = () => navigate('summary');
    main.innerHTML = '';
    main.appendChild(document.getElementById('tpl-home').content.cloneNode(true));
    initHomeView();
  }

  // ── ADD PRODUCT ───────────────────────────────────────────
  else if (v === 'add-product') {
    title.textContent = 'Novo Produto';
    btnBack.classList.remove('hidden');
    btnBack.onclick = goBack;
    bottomNav.classList.add('hidden');
    fab.classList.add('hidden');
    main.innerHTML = '';
    main.appendChild(document.getElementById('tpl-product-form').content.cloneNode(true));
    initProductForm(null);
  }

  // ── EDIT PRODUCT ──────────────────────────────────────────
  else if (v === 'edit-product') {
    const product = DB.getProduct(state.productId);
    title.textContent = 'Editar Produto';
    btnBack.classList.remove('hidden');
    btnBack.onclick = goBack;
    bottomNav.classList.add('hidden');
    fab.classList.add('hidden');
    main.innerHTML = '';
    main.appendChild(document.getElementById('tpl-product-form').content.cloneNode(true));
    initProductForm(product);
  }

  // ── PRODUCT DETAIL ────────────────────────────────────────
  else if (v === 'product-detail') {
    const product = DB.getProduct(state.productId);
    if (!product) { navigate('home', {}, false); return; }
    title.textContent = product.productName || 'Produto';
    btnBack.classList.remove('hidden');
    btnBack.onclick = goBack;
    btnAction.classList.remove('hidden');
    btnAction.innerHTML = '&#9998;';
    btnAction.title = 'Editar';
    btnAction.onclick = () => navigate('edit-product', { productId: state.productId });
    bottomNav.classList.add('hidden');
    fab.classList.add('hidden');
    main.innerHTML = '';
    main.appendChild(document.getElementById('tpl-product-detail').content.cloneNode(true));
    renderProductDetail(product);
  }

  // ── SUMMARY ───────────────────────────────────────────────
  else if (v === 'summary') {
    title.textContent = 'Resumo';
    document.querySelector('[data-view="summary"]').classList.add('active');
    fab.classList.add('hidden');
    main.innerHTML = '';
    main.appendChild(document.getElementById('tpl-summary').content.cloneNode(true));
    renderSummary();
  }

  // ── SUPPLIERS ─────────────────────────────────────────────
  else if (v === 'suppliers') {
    title.textContent = 'Fornecedores';
    document.querySelector('[data-view="suppliers"]').classList.add('active');
    main.innerHTML = '';
    main.appendChild(document.getElementById('tpl-suppliers').content.cloneNode(true));
    renderSuppliersList();
  }

  // ── ADD SUPPLIER ──────────────────────────────────────────
  else if (v === 'add-supplier') {
    title.textContent = 'Novo Fornecedor';
    btnBack.classList.remove('hidden');
    btnBack.onclick = goBack;
    bottomNav.classList.add('hidden');
    fab.classList.add('hidden');
    main.innerHTML = '';
    main.appendChild(document.getElementById('tpl-supplier-form').content.cloneNode(true));
    initSupplierForm(null);
  }

  // ── EDIT SUPPLIER ─────────────────────────────────────────
  else if (v === 'edit-supplier') {
    const supplier = DB.getSupplier(state.supplierId);
    title.textContent = 'Editar Fornecedor';
    btnBack.classList.remove('hidden');
    btnBack.onclick = goBack;
    bottomNav.classList.add('hidden');
    fab.classList.add('hidden');
    main.innerHTML = '';
    main.appendChild(document.getElementById('tpl-supplier-form').content.cloneNode(true));
    initSupplierForm(supplier);
  }

  // ── SUPPLIER DETAIL ───────────────────────────────────────
  else if (v === 'supplier-detail') {
    const supplier = DB.getSupplier(state.supplierId);
    if (!supplier) { navigate('suppliers', {}, false); return; }
    title.textContent = supplier.supplierName || 'Fornecedor';
    btnBack.classList.remove('hidden');
    btnBack.onclick = goBack;
    btnAction.classList.remove('hidden');
    btnAction.innerHTML = '&#9998;';
    btnAction.title = 'Editar';
    btnAction.onclick = () => navigate('edit-supplier', { supplierId: state.supplierId });
    bottomNav.classList.add('hidden');
    fab.classList.add('hidden');
    main.innerHTML = '';
    renderSupplierDetail(supplier);
  }
}

/* ── HOME VIEW ────────────────────────────────────────────── */
function initHomeView() {
  const searchInput   = document.getElementById('search-input');
  const filterCat     = document.getElementById('filter-category');
  const filterStatus  = document.getElementById('filter-status');
  const filterSort    = document.getElementById('filter-sort');
  const filterScore   = document.getElementById('filter-score');
  const scoreVal      = document.getElementById('score-filter-val');

  // Restore filter state
  searchInput.value        = state.filters.search;
  filterCat.value          = state.filters.category;
  filterStatus.value       = state.filters.status;
  filterSort.value         = state.filters.sort;
  filterScore.value        = state.filters.minScore;
  scoreVal.textContent     = state.filters.minScore;

  searchInput.addEventListener('input', e => {
    state.filters.search = e.target.value;
    renderProductList();
  });

  filterCat.addEventListener('change', e => {
    state.filters.category = e.target.value;
    renderProductList();
  });

  filterStatus.addEventListener('change', e => {
    state.filters.status = e.target.value;
    renderProductList();
  });

  filterSort.addEventListener('change', e => {
    state.filters.sort = e.target.value;
    renderProductList();
  });

  filterScore.addEventListener('input', e => {
    state.filters.minScore = parseFloat(e.target.value);
    scoreVal.textContent = e.target.value;
    renderProductList();
  });

  const btnEmptyAdd = document.getElementById('btn-empty-add');
  if (btnEmptyAdd) btnEmptyAdd.addEventListener('click', () => navigate('add-product'));

  renderProductList();
}

function renderProductList() {
  const list       = document.getElementById('product-list');
  const emptyState = document.getElementById('empty-state');
  if (!list) return;

  let products = DB.getProducts();
  const f = state.filters;

  // Filter
  if (f.search) {
    const q = f.search.toLowerCase();
    products = products.filter(p => {
      const supplier = DB.getSupplier(p.supplierId);
      const sName = supplier ? supplier.supplierName.toLowerCase() : '';
      return (p.productName || '').toLowerCase().includes(q) || sName.includes(q);
    });
  }
  if (f.category) products = products.filter(p => p.category === f.category);
  if (f.status)   products = products.filter(p => p.status === f.status);
  if (f.minScore > 0) products = products.filter(p => calcScore(p.scores) >= f.minScore);

  // Sort
  if (f.sort === 'score') {
    products.sort((a, b) => calcScore(b.scores) - calcScore(a.scores));
  } else if (f.sort === 'recent') {
    products.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } else if (f.sort === 'urgency') {
    const uOrder = { high: 0, medium: 1, low: 2 };
    products.sort((a, b) => (uOrder[a.urgency] || 1) - (uOrder[b.urgency] || 1));
  }

  if (products.length === 0) {
    list.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  list.innerHTML = products.map(p => {
    const supplier = DB.getSupplier(p.supplierId);
    const sName    = supplier ? supplier.supplierName : 'Sem fornecedor';
    const score    = calcScore(p.scores);
    const sc       = scoreColor(score);
    const fill     = (score / 10) * 100;
    const urg      = p.urgency || 'medium';

    return `
      <div class="product-card urgency-${urg}" data-id="${p.id}">
        <div class="card-top">
          <div>
            <div class="card-name">${escHtml(p.productName || 'Sem nome')}</div>
            <div class="card-supplier">${escHtml(sName)}</div>
          </div>
          <div class="card-score-wrap">
            <span class="card-score-num score-color-${sc}">${score.toFixed(1)}</span>
            <span class="card-score-label">score</span>
          </div>
        </div>
        <div class="card-score-bar">
          <div class="card-score-fill" style="width:${fill}%; background:${scoreColorHex(score)};"></div>
        </div>
        <div class="card-meta">
          ${p.category ? `<span class="badge badge-category">${escHtml(p.category)}</span>` : ''}
          <span class="badge ${statusClass(p.status)}">${escHtml(p.status || 'Discovered')}</span>
          ${p.urgency === 'high' ? `<span class="badge badge-urgency-high">&#128680; Alta</span>` : ''}
          ${p.nextAction ? `<span class="text-muted text-small" style="width:100%;margin-top:4px;">&#8594; ${escHtml(p.nextAction)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate('product-detail', { productId: card.dataset.id });
    });
  });
}

/* ── PRODUCT FORM ─────────────────────────────────────────── */
function initProductForm(product) {
  const form = document.getElementById('product-form');
  if (!form) return;

  // Populate supplier dropdown
  populateSupplierSelect(product ? product.supplierId : null);

  // If editing, fill form fields
  if (product) {
    fillFormField(form, 'productName',       product.productName);
    fillFormField(form, 'category',          product.category);
    fillFormField(form, 'application',       product.application);
    fillFormField(form, 'keyDifferential',   product.keyDifferential);
    fillFormField(form, 'brandType',         product.brandType);
    fillFormField(form, 'status',            product.status);
    fillFormField(form, 'nextAction',        product.nextAction);
    fillFormField(form, 'urgency',           product.urgency || 'medium');
    fillFormField(form, 'chemistry',         product.chemistry);
    fillFormField(form, 'format',            product.format);
    fillFormField(form, 'nominalVoltage',    product.nominalVoltage);
    fillFormField(form, 'capacity',          product.capacity);
    fillFormField(form, 'dischargeCurrent',  product.dischargeCurrent);
    fillFormField(form, 'peakCurrent',       product.peakCurrent);
    fillFormField(form, 'cycleLife',         product.cycleLife);
    fillFormField(form, 'temperatureRange',  product.temperatureRange);
    fillFormField(form, 'protectionsIncluded', product.protectionsIncluded);
    fillFormField(form, 'moq',               product.moq);
    fillFormField(form, 'unitPrice',         product.unitPrice);
    fillFormField(form, 'priceRange',        product.priceRange);
    fillFormField(form, 'leadTime',          product.leadTime);
    fillFormField(form, 'paymentTerms',      product.paymentTerms);
    fillFormField(form, 'sampleLeadTime',    product.sampleLeadTime);
    fillFormField(form, 'weight',            product.weight);
    fillFormField(form, 'dimensions',        product.dimensions);
    fillFormField(form, 'hsCode',            product.hsCode);
    fillFormField(form, 'importComplexity',  product.importComplexity);
    fillFormField(form, 'notes',             product.notes);

    // Toggles
    setToggle(form, 'hasDatasheet',       product.hasDatasheet);
    setToggle(form, 'hasTestReports',     product.hasTestReports);
    setToggle(form, 'doesOEM',            product.doesOEM);
    setToggle(form, 'customPackaging',    product.customPackaging);
    setToggle(form, 'exclusivityPossible',product.exclusivityPossible);
    setToggle(form, 'sampleAvailable',    product.sampleAvailable);
    setToggle(form, 'dangerousGoods',     product.dangerousGoods);

    // Checkboxes multi
    setCheckboxGroup(form, 'certifications', product.certifications || []);
    setCheckboxGroup(form, 'shippingType',   product.shippingType || []);

    // Scores
    const sc = product.scores || {};
    setSlider(form, 'differentiation', sc.differentiation ?? 5, 'val-differentiation');
    setSlider(form, 'marginPotential', sc.marginPotential  ?? 5, 'val-marginPotential');
    setSlider(form, 'businessFit',     sc.businessFit      ?? 5, 'val-businessFit');
    setSlider(form, 'importEase',      sc.importEase       ?? 5, 'val-importEase');
    setSlider(form, 'supplierTrust',   sc.supplierTrust    ?? 5, 'val-supplierTrust');

    // Photo
    if (product.photo) {
      const preview = document.getElementById('photo-preview');
      if (preview) {
        preview.innerHTML = `<img src="${product.photo}" alt="Foto do produto" />`;
        preview.classList.remove('hidden');
      }
    }
  }

  // Init collapsible sections
  initCollapsibleSections();

  // Live score update
  form.querySelectorAll('input[data-score]').forEach(slider => {
    slider.addEventListener('input', () => updateFormScore(form));
  });
  updateFormScore(form);

  // Photo upload
  const photoInput = document.getElementById('photo-input');
  if (photoInput) {
    photoInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        showToast('Foto muito grande. Máx 3MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        const preview = document.getElementById('photo-preview');
        if (preview) {
          preview.innerHTML = `<img src="${ev.target.result}" alt="Foto" />`;
          preview.classList.remove('hidden');
          preview.dataset.base64 = ev.target.result;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // New supplier inline
  const btnNewSupplier = document.getElementById('btn-new-supplier-inline');
  if (btnNewSupplier) {
    btnNewSupplier.addEventListener('click', () => {
      navigate('add-supplier');
    });
  }

  // Cancel
  const btnCancel = document.getElementById('btn-cancel-form');
  if (btnCancel) btnCancel.addEventListener('click', goBack);

  // Submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    saveProduct(form, product);
  });
}

function populateSupplierSelect(selectedId) {
  const select = document.getElementById('supplier-select');
  if (!select) return;
  const suppliers = DB.getSuppliers();
  select.innerHTML = '<option value="">Selecionar fornecedor...</option>';
  suppliers.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.supplierName;
    if (s.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

function fillFormField(form, name, value) {
  if (value === null || value === undefined) return;
  const el = form.querySelector(`[name="${name}"]`);
  if (!el) return;
  if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.type === 'text' || el.type === 'email' || el.type === 'url') {
    el.value = value;
  }
}

function setToggle(form, name, value) {
  const el = form.querySelector(`[name="${name}"]`);
  if (el) el.checked = !!value;
}

function setCheckboxGroup(form, name, values) {
  form.querySelectorAll(`[name="${name}"]`).forEach(cb => {
    cb.checked = values.includes(cb.value);
  });
}

function setSlider(form, name, value, valId) {
  const el = form.querySelector(`[name="${name}"]`);
  if (el) el.value = value;
  const display = document.getElementById(valId);
  if (display) display.textContent = value;
}

function updateFormScore(form) {
  const get = name => parseFloat(form.querySelector(`[name="${name}"]`)?.value || 0);
  const scores = {
    differentiation: get('differentiation'),
    marginPotential: get('marginPotential'),
    businessFit:     get('businessFit'),
    importEase:      get('importEase'),
    supplierTrust:   get('supplierTrust'),
  };

  // Update display values
  ['differentiation', 'marginPotential', 'businessFit', 'importEase', 'supplierTrust'].forEach(k => {
    const valEl = document.getElementById(`val-${k}`);
    if (valEl) valEl.textContent = scores[k];
  });

  const total = calcScore(scores);
  const circle = document.getElementById('score-circle-form');
  const valEl  = document.getElementById('score-value-form');
  if (circle && valEl) {
    valEl.textContent = total.toFixed(1);
    circle.className = `score-circle score-${scoreColor(total)}`;
  }
}

function saveProduct(form, existing) {
  const fd = new FormData(form);

  const productName = (fd.get('productName') || '').trim();
  if (!productName) {
    showToast('⚠️ Nome do produto é obrigatório.');
    return;
  }

  const supplierId = fd.get('supplierId') || '';

  // Get photo
  let photo = existing ? (existing.photo || null) : null;
  const photoPreview = document.getElementById('photo-preview');
  if (photoPreview && photoPreview.dataset.base64) {
    photo = photoPreview.dataset.base64;
  }

  // Build certifications array
  const certifications = Array.from(form.querySelectorAll('[name="certifications"]:checked')).map(c => c.value);
  const shippingType   = Array.from(form.querySelectorAll('[name="shippingType"]:checked')).map(c => c.value);

  const scores = {
    differentiation: parseFloat(fd.get('differentiation') || 5),
    marginPotential: parseFloat(fd.get('marginPotential') || 5),
    businessFit:     parseFloat(fd.get('businessFit')     || 5),
    importEase:      parseFloat(fd.get('importEase')      || 5),
    supplierTrust:   parseFloat(fd.get('supplierTrust')   || 5),
  };

  const product = {
    id:          existing ? existing.id : uid(),
    createdAt:   existing ? existing.createdAt : Date.now(),
    updatedAt:   Date.now(),
    supplierId,
    productName,
    category:          fd.get('category')          || '',
    application:       fd.get('application')        || '',
    keyDifferential:   fd.get('keyDifferential')    || '',
    brandType:         fd.get('brandType')          || '',
    status:            fd.get('status')             || 'Discovered',
    urgency:           fd.get('urgency')            || 'medium',
    nextAction:        fd.get('nextAction')         || '',
    photo,
    chemistry:         fd.get('chemistry')          || '',
    format:            fd.get('format')             || '',
    nominalVoltage:    fd.get('nominalVoltage')     || '',
    capacity:          fd.get('capacity')           || '',
    dischargeCurrent:  fd.get('dischargeCurrent')   || '',
    peakCurrent:       fd.get('peakCurrent')        || '',
    cycleLife:         fd.get('cycleLife')          || '',
    temperatureRange:  fd.get('temperatureRange')   || '',
    protectionsIncluded: fd.get('protectionsIncluded') || '',
    certifications,
    hasDatasheet:      form.querySelector('[name="hasDatasheet"]')?.checked        || false,
    hasTestReports:    form.querySelector('[name="hasTestReports"]')?.checked      || false,
    moq:               fd.get('moq')               || '',
    unitPrice:         fd.get('unitPrice')         || '',
    priceRange:        fd.get('priceRange')        || '',
    leadTime:          fd.get('leadTime')          || '',
    paymentTerms:      fd.get('paymentTerms')      || '',
    doesOEM:           form.querySelector('[name="doesOEM"]')?.checked            || false,
    customPackaging:   form.querySelector('[name="customPackaging"]')?.checked    || false,
    exclusivityPossible: form.querySelector('[name="exclusivityPossible"]')?.checked || false,
    sampleAvailable:   form.querySelector('[name="sampleAvailable"]')?.checked   || false,
    sampleLeadTime:    fd.get('sampleLeadTime')    || '',
    weight:            fd.get('weight')            || '',
    dimensions:        fd.get('dimensions')        || '',
    hsCode:            fd.get('hsCode')            || '',
    dangerousGoods:    form.querySelector('[name="dangerousGoods"]')?.checked     || false,
    shippingType,
    importComplexity:  fd.get('importComplexity')  || '',
    scores,
    notes:             fd.get('notes')             || '',
  };

  if (existing) {
    DB.updateProduct(product);
    showToast('✓ Produto atualizado!');
    navigate('product-detail', { productId: product.id });
  } else {
    DB.addProduct(product);
    showToast('✓ Produto salvo!');
    navigate('home');
  }
}

/* ── COLLAPSIBLE SECTIONS ─────────────────────────────────── */
function initCollapsibleSections() {
  document.querySelectorAll('.form-section-header').forEach(header => {
    const targetId = header.dataset.toggle;
    const body     = document.getElementById(targetId);
    if (!body) return;

    // First section is open by default
    if (!body.classList.contains('collapsed')) {
      header.classList.add('open');
    }

    header.addEventListener('click', () => {
      const isOpen = !body.classList.contains('collapsed');
      if (isOpen) {
        body.classList.add('collapsed');
        header.classList.remove('open');
      } else {
        body.classList.remove('collapsed');
        header.classList.add('open');
      }
    });
  });
}

/* ── PRODUCT DETAIL VIEW ──────────────────────────────────── */
function renderProductDetail(product) {
  const container = document.getElementById('product-detail-view');
  if (!container) return;

  const supplier = product.supplierId ? DB.getSupplier(product.supplierId) : null;
  const sName    = supplier ? supplier.supplierName : '—';
  const score    = calcScore(product.scores);
  const sc       = scoreColor(score);
  const fillPct  = (score / 10) * 100;
  const scores   = product.scores || {};
  const urg      = product.urgency || 'medium';

  container.innerHTML = `
    ${product.photo ? `<img class="detail-photo" src="${product.photo}" alt="Foto" />` : ''}

    <div class="detail-hero">
      <div class="detail-product-name">${escHtml(product.productName || 'Sem nome')}</div>
      <div class="detail-supplier-name">&#127970; ${escHtml(sName)}</div>

      <div class="detail-badges">
        ${product.category ? `<span class="badge badge-category">${escHtml(product.category)}</span>` : ''}
        <span class="badge ${statusClass(product.status)}">${escHtml(product.status)}</span>
        <span class="badge badge-urgency-${urg}">Urgência: ${urgencyLabel(urg)}</span>
        ${product.brandType ? `<span class="badge badge-category">${escHtml(product.brandType)}</span>` : ''}
      </div>

      <div class="detail-score-row">
        <span class="detail-score-big score-color-${sc}">${score.toFixed(1)}</span>
        <div class="detail-score-bar-wrap">
          <div class="detail-score-bar">
            <div class="detail-score-bar-fill score-bar-bg-${sc}" style="width:${fillPct}%"></div>
          </div>
          <div class="detail-score-sublabel">Score Final (0–10)</div>
        </div>
      </div>
    </div>

    ${product.nextAction ? `
    <div class="next-action-box">
      <div class="nab-label">&#9193; Próxima Ação</div>
      <div class="nab-value">${escHtml(product.nextAction)}</div>
    </div>` : ''}

    <!-- STATUS SELECTOR -->
    <div class="detail-section">
      <div class="detail-section-title">Pipeline de Status</div>
      <div class="status-selector" id="status-selector">
        ${['Discovered','Interesting','Review Later','Request Sample','Negotiating','Priority','Discarded'].map(s => `
          <button class="status-btn ${product.status === s ? 'active-status' : ''}" data-status="${s}">${s}</button>
        `).join('')}
      </div>
    </div>

    <!-- SCORE BREAKDOWN -->
    <div class="detail-section">
      <div class="detail-section-title">Breakdown do Score</div>
      <div class="score-breakdown">
        ${[
          ['Diferenciação',         'differentiation', 0.30],
          ['Potencial de Margem',   'marginPotential', 0.25],
          ['Fit com o Negócio',     'businessFit',     0.20],
          ['Facilidade de Importar','importEase',      0.15],
          ['Confiança no Fornecedor','supplierTrust',  0.10],
        ].map(([label, key, weight]) => `
          <div class="score-breakdown-item">
            <span class="sbi-label">${label} <small style="color:var(--text-muted)">(${(weight*100).toFixed(0)}%)</small></span>
            <div class="sbi-bar"><div class="sbi-fill" style="width:${(scores[key]||0)*10}%"></div></div>
            <span class="sbi-val">${scores[key] ?? 0}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- BASIC INFO -->
    <div class="detail-section">
      <div class="detail-section-title">Informações Básicas</div>
      <div class="detail-grid">
        ${detailItem('Aplicação',       product.application)}
        ${detailItem('Tipo de Marca',   product.brandType)}
        ${detailItemFull('Diferencial', product.keyDifferential)}
      </div>
    </div>

    <!-- TECHNICAL INFO -->
    <div class="detail-section">
      <div class="detail-section-title">Especificações Técnicas</div>
      <div class="detail-grid">
        ${detailItem('Química',          product.chemistry)}
        ${detailItem('Formato',          product.format)}
        ${detailItem('Tensão Nominal',   product.nominalVoltage)}
        ${detailItem('Capacidade',       product.capacity)}
        ${detailItem('Corrente Descarga',product.dischargeCurrent)}
        ${detailItem('Corrente de Pico', product.peakCurrent)}
        ${detailItem('Ciclos de Vida',   product.cycleLife)}
        ${detailItem('Temperatura',      product.temperatureRange)}
        ${detailItemFull('Proteções',    product.protectionsIncluded)}
        ${detailItemFull('Certificações',product.certifications && product.certifications.length ? product.certifications.join(', ') : '')}
        ${detailItem('Datasheet',        product.hasDatasheet  ? '✓ Sim' : '✗ Não')}
        ${detailItem('Test Reports',     product.hasTestReports ? '✓ Sim' : '✗ Não')}
      </div>
    </div>

    <!-- COMMERCIAL INFO -->
    <div class="detail-section">
      <div class="detail-section-title">Comercial</div>
      <div class="detail-grid">
        ${detailItem('MOQ',             product.moq)}
        ${detailItem('Preço Unitário',  product.unitPrice)}
        ${detailItemFull('Faixa de Preço', product.priceRange)}
        ${detailItem('Lead Time',       product.leadTime)}
        ${detailItem('Pagamento',       product.paymentTerms)}
        ${detailItem('OEM',             product.doesOEM           ? '✓ Sim' : '✗ Não')}
        ${detailItem('Embal. Custom',   product.customPackaging   ? '✓ Sim' : '✗ Não')}
        ${detailItem('Exclusividade',   product.exclusivityPossible ? '✓ Sim' : '✗ Não')}
        ${detailItem('Amostra Disp.',   product.sampleAvailable   ? '✓ Sim' : '✗ Não')}
        ${detailItem('Lead Amostra',    product.sampleLeadTime)}
      </div>
    </div>

    <!-- LOGISTICS -->
    <div class="detail-section">
      <div class="detail-section-title">Logística</div>
      <div class="detail-grid">
        ${detailItem('Peso',            product.weight)}
        ${detailItem('Dimensões',       product.dimensions)}
        ${detailItem('HS Code',         product.hsCode)}
        ${detailItem('Carga Perigosa',  product.dangerousGoods ? '⚠️ Sim' : 'Não')}
        ${detailItem('Envio',           product.shippingType && product.shippingType.length ? product.shippingType.join(', ') : '')}
        ${detailItem('Complexidade',    product.importComplexity)}
      </div>
    </div>

    <!-- SUPPLIER -->
    ${supplier ? `
    <div class="detail-section">
      <div class="detail-section-title">Fornecedor</div>
      <div class="detail-grid">
        ${detailItem('Empresa',   supplier.supplierName)}
        ${detailItem('Contato',   supplier.contactName)}
        ${detailItem('WeChat',    supplier.wechat)}
        ${detailItem('WhatsApp',  supplier.whatsapp)}
        ${detailItem('Booth',     supplier.booth)}
        ${detailItem('Cidade',    supplier.city)}
        ${detailItemFull('Email', supplier.email)}
        ${detailItemFull('Site',  supplier.website)}
      </div>
    </div>` : ''}

    <!-- NOTES -->
    ${product.notes ? `
    <div class="detail-section">
      <div class="detail-section-title">Notas</div>
      <div class="detail-grid">
        ${detailItemFull('', product.notes)}
      </div>
    </div>` : ''}

    <!-- ACTIONS -->
    <div class="detail-actions">
      <button class="btn-primary" id="btn-detail-edit">&#9998; Editar</button>
      <button class="btn-danger"  id="btn-detail-delete">&#128465; Excluir</button>
    </div>
  `;

  // Status buttons
  container.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newStatus = btn.dataset.status;
      const p = DB.getProduct(product.id);
      if (!p) return;
      p.status = newStatus;
      p.updatedAt = Date.now();
      DB.updateProduct(p);
      container.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active-status'));
      btn.classList.add('active-status');
      showToast(`Status: ${newStatus}`);
    });
  });

  // Edit button
  document.getElementById('btn-detail-edit').addEventListener('click', () => {
    navigate('edit-product', { productId: product.id });
  });

  // Delete button
  document.getElementById('btn-detail-delete').addEventListener('click', () => {
    if (confirm(`Excluir "${product.productName}"? Esta ação não pode ser desfeita.`)) {
      DB.deleteProduct(product.id);
      showToast('Produto excluído.');
      navigate('home');
    }
  });
}

function detailItem(label, value) {
  const isEmpty = !value || value === '';
  return `
    <div class="detail-item">
      ${label ? `<div class="detail-item-label">${escHtml(label)}</div>` : ''}
      <div class="detail-item-value ${isEmpty ? 'empty-val' : ''}">${isEmpty ? '—' : escHtml(String(value))}</div>
    </div>`;
}

function detailItemFull(label, value) {
  const isEmpty = !value || value === '';
  return `
    <div class="detail-item detail-item-full">
      ${label ? `<div class="detail-item-label">${escHtml(label)}</div>` : ''}
      <div class="detail-item-value ${isEmpty ? 'empty-val' : ''}">${isEmpty ? '—' : escHtml(String(value))}</div>
    </div>`;
}

/* ── SUMMARY VIEW ─────────────────────────────────────────── */
function renderSummary() {
  const products  = DB.getProducts();
  const suppliers = DB.getSuppliers();

  // Stats
  const statsEl = document.getElementById('summary-stats');
  if (statsEl) {
    const avgScore = products.length
      ? (products.reduce((acc, p) => acc + calcScore(p.scores), 0) / products.length).toFixed(1)
      : '0.0';
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-num">${products.length}</div><div class="stat-label">Produtos</div></div>
      <div class="stat-card"><div class="stat-num">${suppliers.length}</div><div class="stat-label">Fornecedores</div></div>
      <div class="stat-card"><div class="stat-num">${avgScore}</div><div class="stat-label">Score Médio</div></div>
    `;
  }

  // Top products
  const topEl = document.getElementById('summary-top-products');
  if (topEl) {
    const sorted = [...products].sort((a, b) => calcScore(b.scores) - calcScore(a.scores)).slice(0, 5);
    if (sorted.length === 0) {
      topEl.innerHTML = '<p class="text-muted text-small">Nenhum produto ainda.</p>';
    } else {
      topEl.innerHTML = sorted.map((p, i) => {
        const score = calcScore(p.scores);
        const sc    = scoreColor(score);
        const sup   = DB.getSupplier(p.supplierId);
        return `
          <div class="summary-top-card" data-id="${p.id}">
            <span class="summary-top-rank rank-${i+1}">#${i+1}</span>
            <div class="summary-top-info">
              <div class="summary-top-name">${escHtml(p.productName || 'Sem nome')}</div>
              <div class="summary-top-sub">${escHtml(sup ? sup.supplierName : '—')} · ${escHtml(p.category || '—')}</div>
            </div>
            <span class="summary-top-score score-color-${sc}">${score.toFixed(1)}</span>
          </div>`;
      }).join('');

      topEl.querySelectorAll('.summary-top-card').forEach(card => {
        card.addEventListener('click', () => navigate('product-detail', { productId: card.dataset.id }));
      });
    }
  }

  // By status
  const statusEl = document.getElementById('summary-by-status');
  if (statusEl) {
    const statuses = ['Priority','Negotiating','Request Sample','Interesting','Discovered','Review Later','Discarded'];
    const colors   = {
      'Priority':      '#ffb84d',
      'Negotiating':   '#3ecf6e',
      'Request Sample':'#9b7fe8',
      'Interesting':   '#4a9eff',
      'Discovered':    '#888',
      'Review Later':  '#f5a623',
      'Discarded':     '#e05252',
    };
    const counts = {};
    statuses.forEach(s => counts[s] = products.filter(p => p.status === s).length);
    const maxCount = Math.max(...Object.values(counts), 1);

    statusEl.innerHTML = statuses.map(s => `
      <div class="status-dist-item">
        <span class="status-dist-label">${s}</span>
        <div class="status-dist-bar">
          <div class="status-dist-fill" style="width:${(counts[s]/maxCount)*100}%; background:${colors[s]};"></div>
        </div>
        <span class="status-dist-count">${counts[s]}</span>
      </div>`).join('');
  }

  // By category
  const catEl = document.getElementById('summary-by-category');
  if (catEl) {
    const catCounts = {};
    products.forEach(p => {
      const cat = p.category || 'Other';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
      catEl.innerHTML = '<p class="text-muted text-small">Nenhum produto categorizado.</p>';
    } else {
      catEl.innerHTML = sorted.map(([cat, count]) => `
        <div class="category-dist-item">
          <span class="category-dist-name">${escHtml(cat)}</span>
          <span class="category-dist-count">${count}</span>
        </div>`).join('');
    }
  }

  // Priority list
  const prioEl = document.getElementById('summary-priority-list');
  if (prioEl) {
    const prio = products.filter(p =>
      p.status === 'Priority' || p.status === 'Negotiating' || p.urgency === 'high'
    ).sort((a, b) => calcScore(b.scores) - calcScore(a.scores));

    if (prio.length === 0) {
      prioEl.innerHTML = '<p class="text-muted text-small">Nenhum produto prioritário.</p>';
    } else {
      prioEl.innerHTML = prio.map(p => {
        const score = calcScore(p.scores);
        const sc    = scoreColor(score);
        return `
          <div class="summary-top-card" data-id="${p.id}">
            <div class="summary-top-info">
              <div class="summary-top-name">${escHtml(p.productName || 'Sem nome')}</div>
              <div class="summary-top-sub">${escHtml(p.status)} · ${p.nextAction ? escHtml(p.nextAction) : 'Sem próxima ação'}</div>
            </div>
            <span class="summary-top-score score-color-${sc}">${score.toFixed(1)}</span>
          </div>`;
      }).join('');

      prioEl.querySelectorAll('.summary-top-card').forEach(card => {
        card.addEventListener('click', () => navigate('product-detail', { productId: card.dataset.id }));
      });
    }
  }

  // Export buttons
  document.getElementById('btn-export-json')?.addEventListener('click', exportJSON);
  document.getElementById('btn-export-csv')?.addEventListener('click',  exportCSV);
}

/* ── SUPPLIERS VIEW ───────────────────────────────────────── */
function renderSuppliersList() {
  const list      = document.getElementById('suppliers-list');
  const emptyEl   = document.getElementById('suppliers-empty');
  const suppliers = DB.getSuppliers();

  if (suppliers.length === 0) {
    list.innerHTML = '';
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    list.innerHTML = suppliers.map(s => {
      const count = DB.getProductsBySupplier(s.id).length;
      return `
        <div class="supplier-card" data-id="${s.id}">
          <div class="supplier-card-name">${escHtml(s.supplierName)}</div>
          <div class="supplier-card-meta">
            ${s.contactName ? `<span>${escHtml(s.contactName)}</span>` : ''}
            ${s.booth ? `<span>&#127970; ${escHtml(s.booth)}</span>` : ''}
            ${s.city ? `<span>&#127757; ${escHtml(s.city)}</span>` : ''}
          </div>
          <div class="supplier-card-count">&#128230; ${count} produto${count !== 1 ? 's' : ''}</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.supplier-card').forEach(card => {
      card.addEventListener('click', () => navigate('supplier-detail', { supplierId: card.dataset.id }));
    });
  }
}

function renderSupplierDetail(supplier) {
  const main = document.getElementById('main-content');
  const products = DB.getProductsBySupplier(supplier.id);

  main.innerHTML = `
    <div class="view-detail">
      <div class="detail-hero">
        <div class="detail-product-name">${escHtml(supplier.supplierName)}</div>
        ${supplier.city ? `<div class="detail-supplier-name">&#127757; ${escHtml(supplier.city)}</div>` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Contato</div>
        <div class="detail-grid">
          ${detailItem('Nome do Contato', supplier.contactName)}
          ${detailItem('Booth',           supplier.booth)}
          ${detailItem('WeChat',          supplier.wechat)}
          ${detailItem('WhatsApp',        supplier.whatsapp)}
          ${detailItemFull('Email',       supplier.email)}
          ${detailItemFull('Website',     supplier.website)}
        </div>
      </div>

      ${supplier.notes ? `
      <div class="detail-section">
        <div class="detail-section-title">Notas</div>
        <div class="detail-grid">${detailItemFull('', supplier.notes)}</div>
      </div>` : ''}

      <div class="detail-section">
        <div class="detail-section-title">Produtos (${products.length})</div>
        <div style="padding: 8px 12px; display:flex; flex-direction:column; gap:8px;">
          ${products.length === 0
            ? `<p class="text-muted text-small" style="padding:8px 0">Nenhum produto vinculado.</p>`
            : products.map(p => {
                const score = calcScore(p.scores);
                const sc    = scoreColor(score);
                return `
                  <div class="summary-top-card" data-id="${p.id}">
                    <div class="summary-top-info">
                      <div class="summary-top-name">${escHtml(p.productName)}</div>
                      <div class="summary-top-sub">${escHtml(p.category || '—')} · ${escHtml(p.status)}</div>
                    </div>
                    <span class="summary-top-score score-color-${sc}">${score.toFixed(1)}</span>
                  </div>`;
              }).join('')}
        </div>
      </div>

      <div class="detail-actions">
        <button class="btn-primary" id="btn-supplier-edit">&#9998; Editar</button>
        <button class="btn-danger"  id="btn-supplier-delete">&#128465; Excluir</button>
      </div>
    </div>
  `;

  main.querySelectorAll('.summary-top-card[data-id]').forEach(card => {
    card.addEventListener('click', () => navigate('product-detail', { productId: card.dataset.id }));
  });

  document.getElementById('btn-supplier-edit').addEventListener('click', () => {
    navigate('edit-supplier', { supplierId: supplier.id });
  });

  document.getElementById('btn-supplier-delete').addEventListener('click', () => {
    const count = products.length;
    const warn  = count > 0 ? ` Este fornecedor tem ${count} produto(s) vinculado(s).` : '';
    if (confirm(`Excluir "${supplier.supplierName}"?${warn}`)) {
      DB.deleteSupplier(supplier.id);
      showToast('Fornecedor excluído.');
      navigate('suppliers');
    }
  });
}

/* ── SUPPLIER FORM ────────────────────────────────────────── */
function initSupplierForm(supplier) {
  const form = document.getElementById('supplier-form');
  if (!form) return;

  if (supplier) {
    const fields = ['supplierName','contactName','wechat','whatsapp','email','booth','city','website','notes'];
    fields.forEach(name => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el && supplier[name]) el.value = supplier[name];
    });
  }

  document.getElementById('btn-cancel-supplier')?.addEventListener('click', goBack);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const supplierName = (fd.get('supplierName') || '').trim();
    if (!supplierName) { showToast('⚠️ Nome da empresa é obrigatório.'); return; }

    const data = {
      id:           supplier ? supplier.id : uid(),
      createdAt:    supplier ? supplier.createdAt : Date.now(),
      supplierName,
      contactName:  fd.get('contactName') || '',
      wechat:       fd.get('wechat')      || '',
      whatsapp:     fd.get('whatsapp')    || '',
      email:        fd.get('email')       || '',
      booth:        fd.get('booth')       || '',
      city:         fd.get('city')        || '',
      website:      fd.get('website')     || '',
      notes:        fd.get('notes')       || '',
    };

    if (supplier) {
      DB.updateSupplier(data);
      showToast('✓ Fornecedor atualizado!');
      navigate('supplier-detail', { supplierId: data.id });
    } else {
      DB.addSupplier(data);
      showToast('✓ Fornecedor salvo!');
      // If came from product form, go back there
      const prev = state.history[state.history.length - 1];
      if (prev && (prev.view === 'add-product' || prev.view === 'edit-product')) {
        goBack();
        // Re-populate supplier select after returning
        setTimeout(() => populateSupplierSelect(data.id), 100);
      } else {
        navigate('suppliers');
      }
    }
  });
}

/* ── EXPORT ───────────────────────────────────────────────── */
function exportJSON() {
  const data = {
    exportedAt: new Date().toISOString(),
    products:   DB.getProducts(),
    suppliers:  DB.getSuppliers(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `canton-fair-${dateStamp()}.json`);
  showToast('✓ JSON exportado!');
}

function exportCSV() {
  const products  = DB.getProducts();
  const suppliers = DB.getSuppliers();
  const supMap    = {};
  suppliers.forEach(s => supMap[s.id] = s.supplierName);

  const headers = [
    'Nome do Produto','Fornecedor','Categoria','Status','Urgência',
    'Score Final','Diferenciação','Potencial Margem','Fit Negócio','Facilidade Importar','Confiança Fornecedor',
    'Aplicação','Diferencial','Tipo Marca',
    'Química','Formato','Tensão','Capacidade','Descarga','Pico','Ciclos','Temperatura','Proteções',
    'Certificações','Datasheet','Test Reports',
    'MOQ','Preço Unitário','Faixa Preço','Lead Time','Pagamento',
    'OEM','Emb. Custom','Exclusividade','Amostra','Lead Amostra',
    'Peso','Dimensões','HS Code','Carga Perigosa','Tipo Envio','Complexidade Importação',
    'Próxima Ação','Notas','Criado em',
  ];

  const rows = products.map(p => {
    const sc = p.scores || {};
    return [
      p.productName,
      supMap[p.supplierId] || '',
      p.category,
      p.status,
      p.urgency,
      calcScore(sc).toFixed(2),
      sc.differentiation ?? '',
      sc.marginPotential  ?? '',
      sc.businessFit      ?? '',
      sc.importEase       ?? '',
      sc.supplierTrust    ?? '',
      p.application,
      p.keyDifferential,
      p.brandType,
      p.chemistry,
      p.format,
      p.nominalVoltage,
      p.capacity,
      p.dischargeCurrent,
      p.peakCurrent,
      p.cycleLife,
      p.temperatureRange,
      p.protectionsIncluded,
      (p.certifications || []).join('; '),
      p.hasDatasheet  ? 'Sim' : 'Não',
      p.hasTestReports ? 'Sim' : 'Não',
      p.moq,
      p.unitPrice,
      p.priceRange,
      p.leadTime,
      p.paymentTerms,
            p.doesOEM            ? 'Sim' : 'Não',
      p.customPackaging    ? 'Sim' : 'Não',
      p.exclusivityPossible ? 'Sim' : 'Não',
      p.sampleAvailable    ? 'Sim' : 'Não',
      p.sampleLeadTime,
      p.weight,
      p.dimensions,
      p.hsCode,
      p.dangerousGoods     ? 'Sim' : 'Não',
      (p.shippingType || []).join('; '),
      p.importComplexity,
      p.nextAction,
      p.notes,
      p.createdAt ? new Date(p.createdAt).toLocaleString('pt-BR') : '',
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => {
      const str = String(cell === null || cell === undefined ? '' : cell);
      const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n');
      return needsQuotes ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `canton-fair-${dateStamp()}.csv`);
  showToast('✓ CSV exportado!');
}

function downloadBlob(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

/* ── GLOBAL EVENT LISTENERS ───────────────────────────────── */
function initGlobalListeners() {

  // Bottom nav
  document.getElementById('bottom-nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-item');
    if (!btn) return;
    const view = btn.dataset.view;
    if (view) {
      state.history = [];
      navigate(view, {}, false);
    }
  });

  // FAB — add product
  document.getElementById('fab-add').addEventListener('click', () => {
    navigate('add-product');
  });

  // Slider live feedback (delegated — for sliders outside forms too)
  document.addEventListener('input', e => {
    if (e.target.type !== 'range' || !e.target.dataset.score) return;
    const name   = e.target.name;
    const valEl  = document.getElementById(`val-${name}`);
    if (valEl) valEl.textContent = e.target.value;
  });
}

/* ── SEED DATA (first run helper) ────────────────────────── */
function maybeSeedDemo() {
  // Only seed if database is completely empty
  if (DB.getProducts().length > 0 || DB.getSuppliers().length > 0) return;

  const supplierId = uid();
  DB.addSupplier({
    id:           supplierId,
    createdAt:    Date.now(),
    supplierName: 'Shenzhen PowerCell Co.',
    contactName:  'David Li',
    wechat:       'davidli_batt',
    whatsapp:     '+86 138 0000 0000',
    email:        'david@powercell.cn',
    booth:        'Hall 9.2 — C15',
    city:         'Shenzhen',
    website:      'https://powercell.cn',
    notes:        'Empresa com 12 anos no mercado. Atendimento rápido. Inglês fluente.',
  });

  DB.addProduct({
    id:          uid(),
    createdAt:   Date.now(),
    updatedAt:   Date.now(),
    supplierId,
    productName:        'LFP 18650 3200mAh',
    category:           'Cells',
    application:        'E-bike, ferramentas elétricas, UPS',
    keyDifferential:    'Alta densidade energética com certificação UN38.3 incluída. Preço competitivo para volumes acima de 5000 pcs.',
    brandType:          'White Label',
    status:             'Interesting',
    urgency:            'high',
    nextAction:         'Solicitar datasheet completo e cotação para 10.000 pcs',
    photo:              null,
    chemistry:          'LFP (LiFePO4)',
    format:             '18650 Cilíndrico',
    nominalVoltage:     '3.2V',
    capacity:           '3200mAh',
    dischargeCurrent:   '1C contínuo / 2C pico',
    peakCurrent:        '6.4A',
    cycleLife:          '2000+ ciclos a 80% DOD',
    temperatureRange:   '-20°C ~ 60°C (descarga)',
    protectionsIncluded:'OVP, UVP, OTP, SCP',
    certifications:     ['UN38.3', 'MSDS', 'CE', 'RoHS'],
    hasDatasheet:       true,
    hasTestReports:     false,
    moq:                '5000 pcs',
    unitPrice:          'USD 2.80',
    priceRange:         'USD 2.50–3.20 dependendo da quantidade',
    leadTime:           '25–30 dias úteis',
    paymentTerms:       '30% T/T antecipado + 70% antes do embarque',
    doesOEM:            true,
    customPackaging:    true,
    exclusivityPossible: false,
    sampleAvailable:    true,
    sampleLeadTime:     '5–7 dias',
    weight:             '47g / unidade',
    dimensions:         '18.5 x 65.2 mm',
    hsCode:             '8507.60',
    dangerousGoods:     true,
    shippingType:       ['Sea', 'Courier'],
    importComplexity:   'Medium',
    scores: {
      differentiation: 7,
      marginPotential: 8,
      businessFit:     9,
      importEase:      6,
      supplierTrust:   7,
    },
    notes: 'Produto com grande potencial para o mercado de e-bikes brasileiro. Verificar compatibilidade com normas ABNT.',
  });
}

/* ── SERVICE WORKER (offline support) ───────────────────── */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Inline service worker via blob — no extra file needed
    const swCode = `
      const CACHE = 'canton-fair-v1';
      const ASSETS = ['/'];

      self.addEventListener('install', e => {
        e.waitUntil(
          caches.open(CACHE).then(cache => cache.addAll(ASSETS))
        );
        self.skipWaiting();
      });

      self.addEventListener('activate', e => {
        e.waitUntil(
          caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
          )
        );
        self.clients.claim();
      });

      self.addEventListener('fetch', e => {
        e.respondWith(
          caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
        );
      });
    `;

    const blob   = new Blob([swCode], { type: 'application/javascript' });
    const swUrl  = URL.createObjectURL(blob);

    navigator.serviceWorker.register(swUrl).catch(() => {
      // Blob-based SW may be blocked in some browsers — app still works offline
      // via localStorage, no action needed
    });
  }
}

/* ── KEYBOARD SHORTCUTS (desktop bonus) ─────────────────── */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Esc = go back
    if (e.key === 'Escape' && state.view !== 'home') {
      goBack();
    }
    // N = new product (only on home/summary/suppliers)
    if (e.key === 'n' && ['home','summary','suppliers'].includes(state.view)) {
      const tag = document.activeElement.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        navigate('add-product');
      }
    }
  });
}

/* ── PWA INSTALL PROMPT ──────────────────────────────────── */
let deferredInstallPrompt = null;

function initPWAInstall() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;

    // Show subtle install hint after 30s if not installed
    setTimeout(() => {
      if (deferredInstallPrompt) {
        showToast('💡 Dica: adicione este app à tela inicial para uso offline total.');
      }
    }, 30000);
  });
}

/* ── VISIBILITY CHANGE (refresh list on return) ─────────── */
function initVisibilityHandler() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.view === 'home') {
      renderProductList();
    }
  });
}

/* ── BOOT ────────────────────────────────────────────────── */
function boot() {
  maybeSeedDemo();
  initGlobalListeners();
  initKeyboardShortcuts();
  initPWAInstall();
  initVisibilityHandler();
  registerServiceWorker();
  render();
}

document.addEventListener('DOMContentLoaded', boot);

