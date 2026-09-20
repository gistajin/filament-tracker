// ============================================================
//  APP.JS — Main application logic
// ============================================================

let activeUser = null;
let currentView = 'mine';
let currentDisplay = 'table';
let allFilaments = [];
let appSettings = {};
let editingId = null;
let toastTimer = null;
let estimatorFilaments = [];
let fairItems = [];
let fairLoaded = false;
let fairDisplay = 'grid';
let fairGroupFilter = null;
let editingFairId = null;
let fairPhotoData = '';
let fairColorRows = [];
let fairColorsQtyMode = false;
let fairModalAddingVariant = false;
let fairSortable = null;
let events = [];
let eventItems = [];
let eventsDataLoaded = false;
let currentEventSelectId = null;
let eventGroupFilter = null;

// ---- Bootstrap ----

window.addEventListener('DOMContentLoaded', () => {
  if (!CONFIG.scriptUrl || CONFIG.scriptUrl === 'YOUR_SCRIPT_URL_HERE') {
    showSetupWarning();
    return;
  }
  buildUserButtons();
});

function showSetupWarning() {
  document.getElementById('user-select-screen').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem">
      <div style="background:white;border-radius:14px;border:0.5px solid rgba(0,0,0,0.1);padding:2.5rem 3rem;max-width:480px;width:100%;text-align:center">
        <div style="font-size:32px;margin-bottom:1rem">&#9881;</div>
        <h2 style="font-size:18px;font-weight:600;margin-bottom:.5rem">Setup needed</h2>
        <p style="color:#6b6b6b;font-size:14px">Open <code>js/config.js</code> and fill in your scriptUrl and user names.</p>
      </div>
    </div>`;
}

function buildUserButtons() {
  const container = document.getElementById('user-buttons');
  CONFIG.users.forEach(user => {
    const btn = document.createElement('button');
    btn.className = 'user-btn';
    const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    btn.innerHTML = `<div class="user-avatar" style="background:${user.color}">${initials}</div><span>${user.name}</span>`;
    btn.onclick = () => selectUser(user);
    container.appendChild(btn);
  });
}

async function selectUser(user) {
  activeUser = user;
  document.getElementById('user-select-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('active-user-badge').innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:6px">
      <span style="width:18px;height:18px;border-radius:50%;background:${user.color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:white">${initials}</span>
      ${user.name}
    </span>`;
  await loadData();
}

function switchUser() {
  activeUser = null; allFilaments = [];
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('user-select-screen').classList.remove('hidden');
  document.getElementById('search').value = '';
  document.getElementById('filter-type').value = '';
  currentDisplay = 'table';
  switchView('mine');
}

// ---- Data loading ----

async function loadData() {
  setTableLoading(true);
  try {
    await Sheets.ensureHeaders(activeUser.sheet);
    [allFilaments, appSettings] = await Promise.all([
      Sheets.readAll(CONFIG.users),
      Sheets.readSettings()
    ]);
    renderAll();
  } catch (e) {
    showToast('Error loading data: ' + e.message, 'error');
    setTableLoading(false);
  }
}

// ---- View & display switching ----

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const addBtn = document.getElementById('add-btn');
  const addFairBtn = document.getElementById('add-fair-btn');
  const eventSelect = document.getElementById('event-select');
  const newEventBtn = document.getElementById('new-event-btn');
  const renameEventBtn = document.getElementById('rename-event-btn');
  const deleteEventBtn = document.getElementById('delete-event-btn');
  const isEstimator = view === 'estimator';
  const isFair = view === 'fair';
  const isEvents = view === 'events';
  addBtn.style.display = (view === 'mine') ? '' : 'none';
  addFairBtn.classList.toggle('hidden', !isFair);
  eventSelect.classList.toggle('hidden', !isEvents);
  newEventBtn.classList.toggle('hidden', !isEvents);
  renameEventBtn.classList.toggle('hidden', !isEvents);
  deleteEventBtn.classList.toggle('hidden', !isEvents);
  document.querySelector('.display-toggle').style.display = (isEstimator || isFair || isEvents) ? 'none' : '';
  document.getElementById('table-view').classList.toggle('hidden', isEstimator || isFair || isEvents || currentDisplay !== 'table');
  document.getElementById('gallery-view').classList.toggle('hidden', isEstimator || isFair || isEvents || currentDisplay !== 'gallery');
  document.getElementById('fair-view').classList.toggle('hidden', !isFair);
  document.getElementById('events-view').classList.toggle('hidden', !isEvents);
  document.getElementById('estimator-view').classList.toggle('hidden', !isEstimator);
  document.getElementById('stats-row').classList.toggle('hidden', isFair || isEvents);
  document.getElementById('fair-display-toggle').classList.toggle('hidden', !isFair);
  document.getElementById('filter-type').style.display = (isEstimator || isFair || isEvents) ? 'none' : '';
  document.getElementById('filter-brand').style.display = (isEstimator || isFair || isEvents) ? 'none' : '';
  document.getElementById('search').style.display = (isEstimator || isEvents) ? 'none' : '';
  document.getElementById('search').placeholder = isFair ? 'Search models...' : 'Search color, type, location...';
  if (isEstimator) {
    renderEstimator();
  } else if (isFair) {
    fairGroupFilter = null;
    if (fairLoaded) renderFair(); else loadFairData();
  } else if (isEvents) {
    eventGroupFilter = null;
    loadEventsView();
  } else {
    renderAll();
  }
}

function switchDisplay(display) {
  currentDisplay = display;
  document.getElementById('btn-table').classList.toggle('active', display === 'table');
  document.getElementById('btn-gallery').classList.toggle('active', display === 'gallery');
  document.getElementById('table-view').classList.toggle('hidden', display !== 'table');
  document.getElementById('gallery-view').classList.toggle('hidden', display !== 'gallery');
  renderAll();
}

function renderAll() {
  populateBrandFilter();
  renderStats();
  if (currentDisplay === 'table') renderTable();
  else renderGallery();
}

function switchFairDisplay(display) {
  fairDisplay = display;
  document.getElementById('fair-btn-grid').classList.toggle('active', display === 'grid');
  document.getElementById('fair-btn-list').classList.toggle('active', display === 'list');
  document.getElementById('fair-grid').classList.toggle('hidden', display !== 'grid');
  document.getElementById('fair-list-view').classList.toggle('hidden', display !== 'list');
  renderFair();
}

// ---- Brand filter ----

function populateBrandFilter() {
  const select = document.getElementById('filter-brand');
  const current = select.value;
  const brands = [...new Set(allFilaments.map(f => f.brand).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All brands</option>' +
    brands.map(b => `<option${b === current ? ' selected' : ''}>${b}</option>`).join('');
}

// ---- Filtering ----

function getVisibleFilaments() {
  const q = (document.getElementById('search').value || '').toLowerCase();
  const typeFilter = document.getElementById('filter-type').value;
  const brandFilter = document.getElementById('filter-brand').value;
  const base = currentView === 'mine'
    ? allFilaments.filter(f => f._sheet === activeUser.sheet)
    : allFilaments;
  return base.filter(f => {
    const txt = [f.brand, f.type, f.colorname, f.location, f.notes, f._owner].join(' ').toLowerCase();
    return txt.includes(q) && (!typeFilter || f.type === typeFilter) && (!brandFilter || f.brand === brandFilter);
  });
}

// ---- Stats ----

function renderStats() {
  const rows = getVisibleFilaments();
  const totalWeight = rows.reduce((a, f) => a + (parseFloat(f.weight) || 0), 0);
  const totalCost = rows.reduce((a, f) => a + (parseFloat(f.cost) || 0), 0);
  const totalQty = rows.reduce((a, f) => a + (parseInt(f.qty) || 0), 0);
  const types = new Set(rows.map(f => f.type)).size;
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-card"><div class="stat-label">Entries</div><div class="stat-val">${rows.length}</div></div>
    <div class="stat-card"><div class="stat-label">Total spools</div><div class="stat-val">${totalQty}</div></div>
    <div class="stat-card"><div class="stat-label">Total weight</div><div class="stat-val">${totalWeight.toLocaleString()}g</div></div>
    <div class="stat-card"><div class="stat-label">Types</div><div class="stat-val">${types}</div></div>
    <div class="stat-card"><div class="stat-label">Total cost</div><div class="stat-val">$${totalCost.toFixed(2)}</div></div>`;
}

// ---- Table view ----

function renderTable() {
  const rows = getVisibleFilaments();
  const tbody = document.getElementById('tbody');
  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="10">No filaments found — ${currentView === 'mine' ? 'add your first spool!' : 'try a different search.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(f => {
    const pct = f.fullweight && f.weight !== '' ? Math.round((parseFloat(f.weight) / parseFloat(f.fullweight)) * 100) : null;
    const nzbd = [f.nozzle ? f.nozzle + '°C' : '', f.bed ? f.bed + '°C bed' : ''].filter(Boolean).join(' / ');
    const isOwn = f._sheet === activeUser.sheet;
    const ownerUser = CONFIG.users.find(u => u.sheet === f._sheet);
    const ownerColor = ownerUser ? ownerUser.color : '#888';
    const qty = f.qty ? parseInt(f.qty) : null;
    return `<tr>
      <td><span style="font-weight:500;font-size:12px">${esc(f.brand)}</span><br><span class="type-badge">${esc(f.type)}</span></td>
      <td><span class="color-dot" style="background:${f.color || '#ccc'}"></span></td>
      <td>${esc(f.colorname)}</td>
      <td style="font-weight:500">${qty !== null ? qty + ' spool' + (qty !== 1 ? 's' : '') : '—'}</td>
      <td>${f.weight !== '' ? f.weight + 'g' : '—'}${pct !== null ? `<span class="weight-bar"><span class="weight-fill" style="width:${Math.min(pct,100)}%"></span></span>` : ''}</td>
      <td style="color:#6b6b6b">${nzbd || '—'}</td>
      <td>${esc(f.location || '—')}</td>
      <td>${f.cost ? '$' + parseFloat(f.cost).toFixed(2) : '—'}</td>
      <td><span class="owner-chip" style="background:${ownerColor}">${esc(f._owner)}</span></td>
      <td><div class="action-btns">
        ${isOwn ? `<button class="btn-edit" onclick="openEdit('${f.id}')">Edit</button>
        <button class="btn-delete" onclick="deleteSpool('${f.id}')">Delete</button>` : '<span style="font-size:11px;color:#aaa">View only</span>'}
      </div></td>
    </tr>`;
  }).join('');
}

// ---- Gallery view ----

function renderGallery() {
  const rows = getVisibleFilaments();
  const grid = document.getElementById('gallery-grid');
  if (!rows.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2.5rem;color:#6b6b6b;font-size:13px">No filaments found.</div>`;
    return;
  }
  grid.innerHTML = rows.map(f => {
    const pct = f.fullweight && f.weight !== '' ? Math.round((parseFloat(f.weight) / parseFloat(f.fullweight)) * 100) : null;
    const isOwn = f._sheet === activeUser.sheet;
    const ownerUser = CONFIG.users.find(u => u.sheet === f._sheet);
    const ownerColor = ownerUser ? ownerUser.color : '#888';
    const qty = f.qty ? parseInt(f.qty) : null;
    return `<div class="gallery-card" onclick="${isOwn ? `openEdit('${f.id}')` : ''}">
      <div class="gallery-swatch">
        <div class="gallery-swatch-inner" style="background:${f.color || '#ccc'}"></div>
        ${qty !== null ? `<span class="gallery-qty-badge">x${qty}</span>` : ''}
        <span class="gallery-owner-dot" style="background:${ownerColor}"></span>
      </div>
      <div class="gallery-info">
        <div class="gallery-colorname">${esc(f.colorname || '—')}</div>
        <div class="gallery-type">${esc(f.brand)} · ${esc(f.type)}</div>
        <div class="gallery-meta"><span class="gallery-weight">${f.weight !== '' ? f.weight + 'g' : ''}</span></div>
        ${pct !== null ? `<div class="gallery-wbar"><div class="gallery-wfill" style="width:${Math.min(pct,100)}%"></div></div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function setTableLoading(loading) {
  if (loading) document.getElementById('tbody').innerHTML = `<tr class="loading-row"><td colspan="10">Loading your filaments...</td></tr>`;
}

// ---- ESTIMATOR ----

function renderEstimator() {
  const s = appSettings;
  document.getElementById('est-labor-rate').textContent = '$' + (parseFloat(s.labor_rate) || 0).toFixed(2);
  document.getElementById('est-machine-rate').textContent = '$' + (parseFloat(s.machine_rate) || 0).toFixed(2);
  document.getElementById('est-electricity-rate').textContent = '$' + (parseFloat(s.electricity_rate) || 0).toFixed(2);
  document.getElementById('est-tax-rate').textContent = (parseFloat(s.tax_rate) || 0).toFixed(2) + '%';
  document.getElementById('est-profit-margin').textContent = (parseFloat(s.profit_margin) || 0).toFixed(0) + '%';
  renderEstimatorFilaments();
  calculateEstimate();
}

function renderEstimatorFilaments() {
  const container = document.getElementById('est-filaments-list');
  container.innerHTML = estimatorFilaments.map((ef, i) => {
    const options = allFilaments
      .filter((f, idx, arr) => arr.findIndex(x => x.brand === f.brand && x.type === f.type && x.colorname === f.colorname) === idx)
      .map(f => `<option value="${f.id}" ${ef.filamentId === f.id ? 'selected' : ''}>${f.brand} — ${f.type} — ${f.colorname}</option>`)
      .join('');
    return `<div class="est-filament-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <select style="flex:1;font-size:12px" onchange="updateEstFilament(${i},'filamentId',this.value);calculateEstimate()">
        <option value="">Select filament...</option>${options}
      </select>
      <input type="number" placeholder="Weight (g)" min="0" value="${ef.weight||''}" style="width:110px;font-size:12px"
        onchange="updateEstFilament(${i},'weight',this.value);calculateEstimate()"
        oninput="updateEstFilament(${i},'weight',this.value);calculateEstimate()">
      <button class="btn-delete" style="padding:4px 8px;font-size:11px" onclick="removeEstFilament(${i})">✕</button>
    </div>`;
  }).join('');
}

function addEstFilament() {
  estimatorFilaments.push({ filamentId: '', weight: '' });
  renderEstimatorFilaments();
}

function removeEstFilament(i) {
  estimatorFilaments.splice(i, 1);
  renderEstimatorFilaments();
  calculateEstimate();
}

function updateEstFilament(i, key, val) {
  estimatorFilaments[i][key] = val;
}

function calculateEstimate() {
  const hours = parseFloat(document.getElementById('est-hours').value) || 0;
  const s = appSettings;
  const laborRate = parseFloat(s.labor_rate) || 0;
  const machineRate = parseFloat(s.machine_rate) || 0;
  const electricityRate = parseFloat(s.electricity_rate) || 0;
  const taxRate = parseFloat(s.tax_rate) || 0;
  const profitMargin = parseFloat(s.profit_margin) || 0;

  let filamentCost = 0;
  let filamentDetails = [];
  estimatorFilaments.forEach(ef => {
    const fil = allFilaments.find(f => f.id === ef.filamentId);
    const grams = parseFloat(ef.weight) || 0;
    if (fil && grams > 0) {
      const costPerG = (parseFloat(fil.cost) || 0) / 1000;
      const cost = costPerG * grams;
      filamentCost += cost;
      filamentDetails.push({ name: `${fil.brand} ${fil.colorname}`, grams, cost });
    }
  });

  const laborCost = hours * laborRate;
  const machineCost = hours * machineRate;
  const electricityCost = hours * electricityRate;
  const subtotal = filamentCost + laborCost + machineCost + electricityCost;
  const profit = subtotal * (profitMargin / 100);
  const beforeTax = subtotal + profit;
  const tax = beforeTax * (taxRate / 100);
  const total = beforeTax + tax;

  const fmt = n => '$' + n.toFixed(2);

  let filamentRows = filamentDetails.map(d =>
    `<div class="est-breakdown-row"><span>${esc(d.name)} (${d.grams}g)</span><span>${fmt(d.cost)}</span></div>`
  ).join('');

  if (filamentDetails.length === 0) {
    filamentRows = `<div class="est-breakdown-row" style="color:#aaa"><span>No filaments selected</span><span>$0.00</span></div>`;
  }

  document.getElementById('est-breakdown').innerHTML = `
    <div class="est-section-label">Filament</div>
    ${filamentRows}
    <div class="est-section-label" style="margin-top:10px">Time (${hours.toFixed(1)} hrs)</div>
    <div class="est-breakdown-row"><span>Labor @ ${fmt(laborRate)}/hr</span><span>${fmt(laborCost)}</span></div>
    <div class="est-breakdown-row"><span>Machine @ ${fmt(machineRate)}/hr</span><span>${fmt(machineCost)}</span></div>
    <div class="est-breakdown-row"><span>Electricity @ ${fmt(electricityRate)}/hr</span><span>${fmt(electricityCost)}</span></div>
    <div class="est-divider"></div>
    <div class="est-breakdown-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div class="est-breakdown-row"><span>Profit (${profitMargin}%)</span><span>${fmt(profit)}</span></div>
    <div class="est-breakdown-row"><span>Tax (${taxRate}%)</span><span>${fmt(tax)}</span></div>
    <div class="est-divider"></div>
    <div class="est-total-row"><span>Total price</span><span>${fmt(total)}</span></div>
  `;
}

// ---- FAIR ITEMS ----
// Shared list, editable by anyone — no owner restriction.

async function loadFairData() {
  setFairLoading();
  try {
    await Promise.all([
      Sheets.fairEnsure(CONFIG.fairSheet).then(async () => { fairItems = await Sheets.fairRead(CONFIG.fairSheet); }),
      eventsDataLoaded ? Promise.resolve() : loadEventsData(CONFIG.fairSheet)
    ]);
    fairLoaded = true;
    renderFair();
  } catch (e) {
    document.getElementById('fair-grid').innerHTML = '';
    document.getElementById('fair-tbody').innerHTML = '';
    showToast('Error loading fair items: ' + e.message, 'error');
  }
}

function setFairLoading() {
  document.getElementById('fair-grid').innerHTML = `<div class="fair-empty">Loading models...</div>`;
  document.getElementById('fair-tbody').innerHTML = `<tr class="loading-row"><td colspan="7">Loading models...</td></tr>`;
}

function getVisibleFairItems() {
  const q = (document.getElementById('search').value || '').toLowerCase();
  let items = fairItems;
  if (fairGroupFilter !== null) {
    items = items.filter(f => (f.model || '').trim() === fairGroupFilter);
  }
  return items.filter(f => (f.model + ' ' + f.variant + ' ' + f.license).toLowerCase().includes(q));
}

// Groups items sharing the same (trimmed) model name — used to collapse
// multi-variant models (e.g. many keychain colors) into one card/row.
// Groups are sorted by the lowest sortOrder among their items, so drag
// reordering (which writes sortOrder) determines the display order.
function groupFairItems(items) {
  const map = new Map();
  items.forEach(f => {
    const key = (f.model || '').trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  });
  return [...map.entries()]
    .map(([model, groupItems]) => ({
      model, items: groupItems,
      order: Math.min(...groupItems.map(f => parseFloat(f.sortOrder) || 0))
    }))
    .sort((a, b) => a.order - b.order);
}

function openFairGroup(model) {
  fairGroupFilter = model;
  document.getElementById('search').value = '';
  renderFair();
}

function closeFairGroup() {
  fairGroupFilter = null;
  renderFair();
}

function renderFair() {
  renderFairBreadcrumb();
  if (fairGroupFilter === null) renderFairStats();
  if (fairDisplay === 'list') renderFairList();
  else renderFairGrid();
}

function renderFairBreadcrumb() {
  const bar = document.getElementById('fair-breadcrumb');
  const statsRow = document.getElementById('fair-stats-row');
  const addBtn = document.getElementById('add-fair-btn');
  if (fairGroupFilter === null) {
    bar.classList.add('hidden');
    statsRow.classList.remove('hidden');
    addBtn.textContent = '+ Add model';
    return;
  }
  statsRow.classList.add('hidden');
  bar.classList.remove('hidden');
  addBtn.textContent = '+ Add variant';
  const items = fairItems.filter(f => (f.model || '').trim() === fairGroupFilter);
  const totalPrinted = items.reduce((a, f) => a + (parseInt(f.printed) || 0), 0);
  document.getElementById('fair-breadcrumb-title').innerHTML =
    `<strong>${esc(fairGroupFilter)}</strong><span class="fair-breadcrumb-meta">${items.length} variant${items.length !== 1 ? 's' : ''} &middot; ${totalPrinted} in stock</span>`;
}

// Colors are stored as { mode: 'qty'|'info', items: [{name,hex,qty}] }.
// 'qty' means each row is a real stock count that sums into Stock (e.g. "5
// red, 3 blue keychains"); 'info' means the list is just which filaments
// went into this item (e.g. "this ghost lamp uses white + black PLA") and
// never touches Stock. Whether an item is a variant is unrelated to this —
// a variant can be multi-filament-but-single-stock just like a standalone
// model can. Older saved data was a bare array with no mode, so it's
// inferred from whether any row had a qty.
function parseFairColors(f) {
  if (!f.colors) return { mode: 'info', items: [] };
  try {
    const parsed = JSON.parse(f.colors);
    if (Array.isArray(parsed)) {
      const hasQty = parsed.some(c => c.qty !== undefined && c.qty !== '' && Number(c.qty) > 0);
      return { mode: hasQty ? 'qty' : 'info', items: parsed };
    }
    if (parsed && Array.isArray(parsed.items)) {
      return { mode: parsed.mode === 'qty' ? 'qty' : 'info', items: parsed.items };
    }
    return { mode: 'info', items: [] };
  } catch (e) { return { mode: 'info', items: [] }; }
}

function fairColorChipsHtml(colorData) {
  const items = colorData.items || [];
  if (!items.length) return '';
  const showQty = colorData.mode === 'qty';
  return `<div class="fair-color-chips">${items.map(c =>
    `<span class="fair-color-chip" title="${esc(c.name || '')}${showQty && c.qty ? ' — ' + c.qty : ''}"><span class="fair-color-dot" style="background:${c.hex || '#ccc'}"></span>${showQty && c.qty ? c.qty : ''}</span>`
  ).join('')}</div>`;
}

function openFairLightbox(src) {
  document.getElementById('fair-lightbox-img').src = src;
  document.getElementById('fair-lightbox').classList.remove('hidden');
}

function closeFairLightbox() {
  document.getElementById('fair-lightbox').classList.add('hidden');
  document.getElementById('fair-lightbox-img').src = '';
}

function fairPriceLabel(items) {
  const prices = [...new Set(items.map(f => parseFloat(f.price) || 0).filter(p => p > 0))];
  if (!prices.length) return '—';
  if (prices.length === 1) return '$' + prices[0].toFixed(2);
  return '$' + Math.min(...prices).toFixed(2) + '–$' + Math.max(...prices).toFixed(2);
}

// The model that's currently "active" for tagging — the most recently
// created event. Tagging happens from the Models tab; the Events tab lets
// you switch between this and any earlier event to review its history.
function getCurrentEvent() {
  return events.length ? events[events.length - 1] : null;
}

function isModelTagged(modelId, eventId) {
  return eventItems.some(ei => ei.modelId === modelId && ei.eventId === eventId);
}

async function toggleFairTag(modelId) {
  const curEvent = getCurrentEvent();
  if (!curEvent) { showToast('Create an event first (Events tab).', 'error'); return; }
  const existing = eventItems.find(ei => ei.modelId === modelId && ei.eventId === curEvent.id);
  try {
    if (existing) {
      await Sheets.eventItemDelete(existing.id);
      eventItems = eventItems.filter(ei => ei.id !== existing.id);
      showToast('Untagged from ' + curEvent.name, 'success');
    } else {
      const res = await Sheets.eventItemUpsert({ eventId: curEvent.id, modelId, toSell: '0', sold: '0' });
      eventItems.push({ id: res.id, eventId: curEvent.id, modelId, toSell: '0', sold: '0' });
      showToast('Tagged for ' + curEvent.name, 'success');
    }
    renderFair();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function tagAllVariantsForEvent(model) {
  const curEvent = getCurrentEvent();
  if (!curEvent) { showToast('Create an event first (Events tab).', 'error'); return; }
  const items = fairItems.filter(f => (f.model || '').trim() === model);
  const untagged = items.filter(f => !isModelTagged(f.id, curEvent.id));
  if (!untagged.length) return;
  try {
    const created = await Promise.all(untagged.map(f =>
      Sheets.eventItemUpsert({ eventId: curEvent.id, modelId: f.id, toSell: '0', sold: '0' })
        .then(res => ({ id: res.id, eventId: curEvent.id, modelId: f.id, toSell: '0', sold: '0' }))
    ));
    eventItems.push(...created);
    renderFair();
    showToast(`Tagged ${untagged.length} variant${untagged.length !== 1 ? 's' : ''} for ${curEvent.name}`, 'success');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

function fairCardHtml(f, isVariant) {
  const printed = parseInt(f.printed) || 0;
  const price = parseFloat(f.price) || 0;
  const hasLicense = f.licenseStatus === 'have';
  const title = isVariant ? (f.variant || f.model) : f.model;
  const colors = parseFairColors(f);
  const curEvent = getCurrentEvent();
  const tagged = curEvent ? isModelTagged(f.id, curEvent.id) : false;
  return `<div class="fair-card" data-model="${escAttr((f.model || '').trim())}">
      <div class="fair-card-photo">
        ${f.photo ? `<img src="${f.photo}" alt="" class="fair-photo-clickable" onclick="openFairLightbox(this.src)">` : `<div class="fair-card-noimg">No photo</div>`}
        <span class="fair-license-badge ${hasLicense ? 'has' : 'need'}">${hasLicense ? 'Licensed' : 'Need license'}</span>
        ${tagged ? `<span class="fair-tagged-badge">${esc(curEvent.name)}</span>` : ''}
      </div>
      <div class="fair-card-body">
        <div class="fair-card-title">${esc(title)}</div>
        ${f.license ? `<div class="fair-card-license" title="${esc(f.license)}">${esc(f.license)}</div>` : ''}
        <div class="fair-card-row"><span>Stock</span><span>${printed}</span></div>
        ${fairColorChipsHtml(colors)}
        <div class="fair-card-row"><span>Price</span><span>${price ? '$' + price.toFixed(2) : '—'}</span></div>
        <div class="action-btns" style="margin-top:8px">
          <button class="btn-edit" onclick="openFairEdit('${f.id}')">Edit</button>
          <button class="btn-delete" onclick="deleteFairItem('${f.id}')">Delete</button>
          ${!isVariant ? `<button class="btn-edit" title="Add a variant of this model" onclick="openFairModal('${esc((f.model || '').trim()).replace(/'/g, "\\'")}')">+ Variant</button>` : ''}
        </div>
        ${curEvent ? `<button class="btn-ghost fair-tag-btn${tagged ? ' tagged' : ''}" style="margin-top:6px;width:100%" onclick="toggleFairTag('${f.id}')">${tagged ? '&check; Tagged for ' + esc(curEvent.name) : '+ Tag for ' + esc(curEvent.name)}</button>` : ''}
      </div>
    </div>`;
}

function fairGroupCardHtml(g) {
  const items = g.items;
  const photoItem = items.find(f => f.photo);
  const totalPrinted = items.reduce((a, f) => a + (parseInt(f.printed) || 0), 0);
  const allHave = items.every(f => f.licenseStatus === 'have');
  const anyHave = items.some(f => f.licenseStatus === 'have');
  const badgeClass = allHave ? 'has' : (anyHave ? 'mixed' : 'need');
  const badgeText = allHave ? 'Licensed' : (anyHave ? 'Mixed' : 'Need license');
  const curEvent = getCurrentEvent();
  const taggedCount = curEvent ? items.filter(f => isModelTagged(f.id, curEvent.id)).length : 0;
  return `<div class="fair-card fair-group-card" data-model="${escAttr(g.model)}" onclick="openFairGroup('${esc(g.model).replace(/'/g, "\\'")}')">
      <div class="fair-card-photo">
        ${photoItem ? `<img src="${photoItem.photo}" alt="">` : `<div class="fair-card-noimg">No photo</div>`}
        <span class="fair-license-badge ${badgeClass}">${badgeText}</span>
        <span class="fair-variant-count">${items.length} variants</span>
      </div>
      <div class="fair-card-body">
        <div class="fair-card-title">${esc(g.model)}</div>
        <div class="fair-card-row"><span>Stock</span><span>${totalPrinted}</span></div>
        <div class="fair-card-row"><span>Price</span><span>${fairPriceLabel(items)}</span></div>
        ${curEvent ? `<div class="fair-card-row"><span>Tagged for ${esc(curEvent.name)}</span><span>${taggedCount} / ${items.length}</span></div>` : ''}
        <div class="fair-group-hint">Click to view variants &rarr;</div>
        ${curEvent ? `<button class="btn-ghost fair-tag-btn${taggedCount === items.length ? ' tagged' : ''}" style="margin-top:6px;width:100%" onclick="event.stopPropagation(); tagAllVariantsForEvent('${esc(g.model).replace(/'/g, "\\'")}')" ${taggedCount === items.length ? 'disabled' : ''}>${taggedCount === items.length ? '&check; All tagged for ' + esc(curEvent.name) : '+ Tag all for ' + esc(curEvent.name)}</button>` : ''}
      </div>
    </div>`;
}

function renderFairGrid() {
  destroyFairSortable();
  const rows = getVisibleFairItems();
  const grid = document.getElementById('fair-grid');
  if (!rows.length) {
    grid.innerHTML = `<div class="fair-empty">${fairGroupFilter !== null ? 'No variants yet — add the first one!' : 'No models yet — add your first one to sell at the fair!'}</div>`;
    return;
  }
  if (fairGroupFilter !== null) {
    grid.innerHTML = rows.map(f => fairCardHtml(f, true)).join('');
  } else {
    const groups = groupFairItems(rows);
    grid.innerHTML = groups.map(g => g.items.length > 1 ? fairGroupCardHtml(g) : fairCardHtml(g.items[0], false)).join('');
    initFairSortable(grid);
  }
}

function fairRowHtml(f, isVariant) {
  const printed = parseInt(f.printed) || 0;
  const price = parseFloat(f.price) || 0;
  const hasLicense = f.licenseStatus === 'have';
  const title = isVariant ? (f.variant || f.model) : f.model;
  const colors = parseFairColors(f);
  const curEvent = getCurrentEvent();
  const tagged = curEvent ? isModelTagged(f.id, curEvent.id) : false;
  return `<tr data-model="${escAttr((f.model || '').trim())}">
      <td>${f.photo ? `<img src="${f.photo}" class="fair-thumb fair-photo-clickable" alt="" onclick="openFairLightbox(this.src)">` : `<div class="fair-thumb fair-thumb-empty"></div>`}</td>
      <td><span style="font-weight:500">${esc(title)}</span>${f.license ? `<span class="fair-list-note" title="${esc(f.license)}">${esc(f.license)}</span>` : ''}${fairColorChipsHtml(colors)}</td>
      <td><span class="fair-license-badge inline ${hasLicense ? 'has' : 'need'}">${hasLicense ? 'Licensed' : 'Need'}</span></td>
      <td>${printed}</td>
      <td>${price ? '$' + price.toFixed(2) : '—'}</td>
      <td>${curEvent ? `<button class="btn-ghost fair-tag-btn${tagged ? ' tagged' : ''}" onclick="toggleFairTag('${f.id}')">${tagged ? '&check; Tagged' : '+ Tag'}</button>` : '—'}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="openFairEdit('${f.id}')">Edit</button>
        <button class="btn-delete" onclick="deleteFairItem('${f.id}')">Delete</button>
        ${!isVariant ? `<button class="btn-edit" title="Add a variant of this model" onclick="openFairModal('${esc((f.model || '').trim()).replace(/'/g, "\\'")}')">+ Variant</button>` : ''}
      </div></td>
    </tr>`;
}

function fairGroupRowHtml(g) {
  const items = g.items;
  const photoItem = items.find(f => f.photo);
  const totalPrinted = items.reduce((a, f) => a + (parseInt(f.printed) || 0), 0);
  const allHave = items.every(f => f.licenseStatus === 'have');
  const anyHave = items.some(f => f.licenseStatus === 'have');
  const badgeClass = allHave ? 'has' : (anyHave ? 'mixed' : 'need');
  const badgeText = allHave ? 'Licensed' : (anyHave ? 'Mixed' : 'Need');
  const curEvent = getCurrentEvent();
  const taggedCount = curEvent ? items.filter(f => isModelTagged(f.id, curEvent.id)).length : 0;
  return `<tr class="fair-group-row" data-model="${escAttr(g.model)}" onclick="openFairGroup('${esc(g.model).replace(/'/g, "\\'")}')">
      <td>${photoItem ? `<img src="${photoItem.photo}" class="fair-thumb" alt="">` : `<div class="fair-thumb fair-thumb-empty"></div>`}</td>
      <td><span style="font-weight:500">${esc(g.model)}</span><span class="fair-list-note">${items.length} variants</span></td>
      <td><span class="fair-license-badge inline ${badgeClass}">${badgeText}</span></td>
      <td>${totalPrinted}</td>
      <td>${fairPriceLabel(items)}</td>
      <td>${curEvent ? `<button class="btn-ghost fair-tag-btn${taggedCount === items.length ? ' tagged' : ''}" onclick="event.stopPropagation(); tagAllVariantsForEvent('${esc(g.model).replace(/'/g, "\\'")}')" ${taggedCount === items.length ? 'disabled' : ''}>${taggedCount === items.length ? '&check; ' : 'Tag all '}${taggedCount}/${items.length}</button>` : '—'}</td>
      <td><span style="font-size:11px;color:var(--text-muted)">View &rarr;</span></td>
    </tr>`;
}

function renderFairList() {
  destroyFairSortable();
  const rows = getVisibleFairItems();
  const tbody = document.getElementById('fair-tbody');
  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${fairGroupFilter !== null ? 'No variants yet — add the first one!' : 'No models yet — add your first one to sell at the fair!'}</td></tr>`;
    return;
  }
  if (fairGroupFilter !== null) {
    tbody.innerHTML = rows.map(f => fairRowHtml(f, true)).join('');
  } else {
    const groups = groupFairItems(rows);
    tbody.innerHTML = groups.map(g => g.items.length > 1 ? fairGroupRowHtml(g) : fairRowHtml(g.items[0], false)).join('');
    initFairSortable(tbody);
  }
}

// ---- Fair drag-to-reorder (top-level models/groups only) ----

function destroyFairSortable() {
  if (fairSortable) { fairSortable.destroy(); fairSortable = null; }
}

function initFairSortable(container) {
  if (typeof Sortable === 'undefined') return; // CDN failed to load — reordering just won't be available
  fairSortable = Sortable.create(container, {
    animation: 150,
    filter: '.btn-edit, .btn-delete, .fair-sold-btns, button',
    preventOnFilter: false,
    onEnd: handleFairReorder
  });
}

function handleFairReorder() {
  const container = fairDisplay === 'list' ? document.getElementById('fair-tbody') : document.getElementById('fair-grid');
  const seen = new Set();
  const ranked = [];
  [...container.children].forEach(el => {
    const key = el.dataset.model;
    if (key && !seen.has(key)) { seen.add(key); ranked.push(key); }
  });
  const rankMap = new Map(ranked.map((m, i) => [m, i]));
  const updates = [];
  fairItems.forEach(f => {
    const key = (f.model || '').trim();
    if (!rankMap.has(key)) return;
    const newOrder = String(rankMap.get(key));
    if (f.sortOrder !== newOrder) {
      f.sortOrder = newOrder;
      updates.push({ id: f.id, sortOrder: newOrder });
    }
  });
  if (!updates.length) return;
  Promise.all(updates.map(u => Sheets.fairUpdate(CONFIG.fairSheet, u).catch(() => null)));
}

function renderFairStats() {
  const rows = fairItems;
  const totalModels = groupFairItems(rows).length;
  const totalPrinted = rows.reduce((a, f) => a + (parseInt(f.printed) || 0), 0);
  const curEvent = getCurrentEvent();
  const taggedCount = curEvent ? new Set(eventItems.filter(ei => ei.eventId === curEvent.id).map(ei => ei.modelId)).size : 0;
  document.getElementById('fair-stats-row').innerHTML = `
    <div class="stat-card"><div class="stat-label">Models</div><div class="stat-val">${totalModels}</div></div>
    <div class="stat-card"><div class="stat-label">Total stock</div><div class="stat-val">${totalPrinted}</div></div>
    <div class="stat-card"><div class="stat-label">${curEvent ? 'Tagged for ' + esc(curEvent.name) : 'Tagged'}</div><div class="stat-val">${taggedCount}</div></div>`;
}

// ---- Fair modal ----

// presetModel: pass a model name to force "Add variant" mode for that model
// regardless of drill-down state (e.g. the "+ Variant" button on a
// standalone card). Omit it to fall back to the current drill-down, if any.
function openFairModal(presetModel) {
  editingFairId = null;
  fairPhotoData = '';
  const targetModel = presetModel !== undefined ? presetModel : fairGroupFilter;
  fairModalAddingVariant = targetModel !== null && targetModel !== undefined;
  clearFairForm();
  const modelInput = document.getElementById('ff-model');
  if (targetModel !== null && targetModel !== undefined) {
    document.getElementById('fair-modal-title').textContent = 'Add variant';
    document.getElementById('fair-save-label').textContent = 'Save variant';
    modelInput.value = targetModel;
    modelInput.readOnly = true;
  } else {
    document.getElementById('fair-modal-title').textContent = 'Add model';
    document.getElementById('fair-save-label').textContent = 'Save model';
    modelInput.readOnly = false;
  }
  document.getElementById('fair-modal-overlay').classList.remove('hidden');
}

function openFairEdit(id) {
  const f = fairItems.find(x => x.id === id); if (!f) return;
  editingFairId = id;
  fairModalAddingVariant = false;
  fairPhotoData = f.photo || '';
  document.getElementById('fair-modal-title').textContent = 'Edit model';
  document.getElementById('fair-save-label').textContent = 'Save changes';
  const modelInput = document.getElementById('ff-model');
  modelInput.value = f.model || '';
  modelInput.readOnly = false;
  document.getElementById('ff-variant').value = f.variant || '';
  document.getElementById('ff-license-status').value = f.licenseStatus || 'need';
  document.getElementById('ff-price').value = f.price || '';
  document.getElementById('ff-license').value = f.license || '';
  document.getElementById('ff-printed').value = f.printed || '';
  const savedColors = parseFairColors(f);
  fairColorRows = savedColors.items;
  fairColorsQtyMode = savedColors.items.length ? savedColors.mode === 'qty' : fairIsVariantContext();
  renderFairColorRows();
  updateFairPhotoPreview();
  document.getElementById('fair-form-error').classList.add('hidden');
  document.getElementById('fair-modal-overlay').classList.remove('hidden');
}

function closeFairModal() { document.getElementById('fair-modal-overlay').classList.add('hidden'); editingFairId = null; }
function handleFairOverlayClick(e) { if (e.target === document.getElementById('fair-modal-overlay')) closeFairModal(); }

function clearFairForm() {
  ['model', 'variant', 'license', 'printed', 'price'].forEach(k => { document.getElementById('ff-' + k).value = ''; });
  document.getElementById('ff-license-status').value = 'need';
  document.getElementById('fair-form-error').classList.add('hidden');
  fairColorRows = [];
  fairColorsQtyMode = fairIsVariantContext(); // sensible default; user can flip the toggle either way
  renderFairColorRows();
  updateFairPhotoPreview();
}

function updateFairPhotoPreview() {
  const img = document.getElementById('fair-photo-img');
  const placeholder = document.getElementById('fair-photo-placeholder');
  if (fairPhotoData) {
    img.src = fairPhotoData; img.classList.remove('hidden'); placeholder.classList.add('hidden');
  } else {
    img.classList.add('hidden'); placeholder.classList.remove('hidden');
  }
}

function removeFairPhoto() { fairPhotoData = ''; updateFairPhotoPreview(); }

// ---- Fair color breakdown (per-item colors & quantities) ----

function fairFilamentOptions() {
  const seen = new Set();
  const options = [];
  allFilaments.forEach(f => {
    const key = `${f.brand}|${f.type}|${f.colorname}`;
    if (seen.has(key)) return;
    seen.add(key);
    const label = [f.brand, f.type, f.colorname].filter(Boolean).join(' — ');
    options.push({ id: f.id, label, hex: f.color, name: [f.type, f.colorname].filter(Boolean).join(' ') });
  });
  return options;
}

function applyFairColorFilament(i, filamentId) {
  if (!filamentId) return; // "Custom color..." — leave fields as-is
  const opt = fairFilamentOptions().find(o => o.id === filamentId);
  if (!opt) return;
  fairColorRows[i].hex = opt.hex || fairColorRows[i].hex;
  fairColorRows[i].name = opt.name;
  renderFairColorRows();
}

// A model is treated as a "variant" (colors carry real, stock-driving
// quantities) when: you're adding it via "+ Add variant" inside a drilled-in
// group, or you've typed a Variant label, or (when editing) this model name
// already has other entries sharing it. Otherwise it's a standalone model,
// and the same colors list is just a "filaments used" reference note that
// never touches Stock.
// Only used to pick a sensible DEFAULT for the qty-tracking toggle when a
// modal opens — not authoritative. The user can flip it either way, and
// once saved, the item's own stored mode wins over this guess.
function fairIsVariantContext() {
  if (fairModalAddingVariant) return true;
  if (fairGroupFilter !== null) return true;
  const variantVal = (document.getElementById('ff-variant').value || '').trim();
  if (variantVal) return true;
  if (editingFairId) {
    const current = fairItems.find(f => f.id === editingFairId);
    if (current) {
      const key = (current.model || '').trim();
      if (fairItems.filter(f => (f.model || '').trim() === key).length > 1) return true;
    }
  }
  return false;
}

function toggleFairColorsQtyMode(checked) {
  fairColorsQtyMode = checked;
  renderFairColorRows();
}

function renderFairColorRows() {
  const qtyMode = fairColorsQtyMode;
  const container = document.getElementById('ff-colors-list');
  const label = document.getElementById('ff-colors-label');
  const addBtn = document.getElementById('ff-colors-addbtn');
  const qtyToggle = document.getElementById('ff-colors-qty-toggle');
  qtyToggle.checked = qtyMode;
  label.textContent = qtyMode ? 'Colors & quantities (optional)' : 'Filaments used (optional)';
  addBtn.textContent = qtyMode ? '+ Add color' : '+ Add filament';
  const filamentOptions = fairFilamentOptions();
  const optionsHtml = filamentOptions.map(o => `<option value="${o.id}">${esc(o.label)}</option>`).join('');
  container.innerHTML = fairColorRows.map((c, i) => `
    <div class="fair-color-row">
      <select class="fair-color-filament-select" onchange="applyFairColorFilament(${i},this.value)">
        <option value="">Custom color...</option>
        ${optionsHtml}
      </select>
      <input type="color" value="${c.hex || '#cc0000'}" onchange="updateFairColorRow(${i},'hex',this.value)">
      <input type="text" placeholder="Color name" value="${esc(c.name || '')}" oninput="updateFairColorRow(${i},'name',this.value)">
      ${qtyMode ? `<input type="number" placeholder="Qty" min="0" value="${c.qty || ''}" oninput="updateFairColorRow(${i},'qty',this.value)">` : ''}
      <button type="button" class="btn-delete" onclick="removeFairColorRow(${i})">&times;</button>
    </div>`).join('');
  updateFairStockFromColors(qtyMode);
}

function addFairColorRow() {
  fairColorRows.push({ name: '', hex: '#cc0000', qty: '' });
  renderFairColorRows();
}

function removeFairColorRow(i) {
  fairColorRows.splice(i, 1);
  renderFairColorRows();
}

function updateFairColorRow(i, key, val) {
  fairColorRows[i][key] = val;
  if (key === 'qty') updateFairStockFromColors();
}

function updateFairStockFromColors(qtyMode) {
  if (qtyMode === undefined) qtyMode = fairColorsQtyMode;
  const stockInput = document.getElementById('ff-printed');
  const hint = document.getElementById('ff-printed-hint');
  if (qtyMode && fairColorRows.length) {
    const total = fairColorRows.reduce((a, c) => a + (parseInt(c.qty) || 0), 0);
    stockInput.value = total;
    stockInput.readOnly = true;
    hint.classList.remove('hidden');
  } else {
    stockInput.readOnly = false;
    hint.classList.add('hidden');
  }
}

function handleFairPhotoSelect(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  compressImageToDataUrl(file).then(dataUrl => {
    fairPhotoData = dataUrl;
    updateFairPhotoPreview();
  }).catch(() => showToast('Could not read that image.', 'error'));
}

function compressImageToDataUrl(file) {
  const MAX_CHARS = 6000; // keeps the whole request URL short and reliable (JSONP/GET transport); leaves headroom for the colors breakdown sent alongside it
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        let maxDim = 220, quality = 0.7, dataUrl = '';
        for (let attempt = 0; attempt < 10; attempt++) {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          if (dataUrl.length <= MAX_CHARS) break;
          if (quality > 0.35) quality -= 0.15; else maxDim = Math.round(maxDim * 0.8);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function saveFairItem() {
  const model = document.getElementById('ff-model').value.trim();
  if (!model) {
    const err = document.getElementById('fair-form-error');
    err.textContent = 'Model name is required.'; err.classList.remove('hidden');
    return;
  }
  const cleanColors = fairColorRows.filter(c => c.name || c.qty);
  const payload = {
    model,
    variant: document.getElementById('ff-variant').value.trim(),
    license: document.getElementById('ff-license').value.trim(),
    licenseStatus: document.getElementById('ff-license-status').value,
    printed: document.getElementById('ff-printed').value,
    price: document.getElementById('ff-price').value,
    photo: fairPhotoData,
    colors: cleanColors.length ? JSON.stringify({ mode: fairColorsQtyMode ? 'qty' : 'info', items: cleanColors }) : ''
  };
  const btn = document.getElementById('fair-save-btn');
  btn.disabled = true;
  document.getElementById('fair-save-label').textContent = 'Saving...';
  try {
    if (editingFairId) {
      payload.id = editingFairId;
      await Sheets.fairUpdate(CONFIG.fairSheet, payload);
      const idx = fairItems.findIndex(f => f.id === editingFairId);
      if (idx >= 0) fairItems[idx] = { ...fairItems[idx], ...payload };
      showToast('Model updated!', 'success');
    } else {
      const res = await Sheets.fairAppend(CONFIG.fairSheet, payload);
      fairItems.push({ ...payload, id: res.id, toSell: '', sold: '0' });
      showToast('Model added!', 'success');
    }
    closeFairModal(); renderFair();
  } catch (e) {
    const err = document.getElementById('fair-form-error');
    err.textContent = 'Save failed: ' + e.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    document.getElementById('fair-save-label').textContent = editingFairId ? 'Save changes' : 'Save model';
  }
}

async function deleteFairItem(id) {
  if (!confirm('Delete this model? This cannot be undone.')) return;
  try {
    await Sheets.fairDelete(CONFIG.fairSheet, id);
    fairItems = fairItems.filter(f => f.id !== id);
    renderFair(); showToast('Model deleted.', 'success');
  } catch (e) { showToast('Delete failed: ' + e.message, 'error'); }
}

// ---- EVENTS ----
// A model tagged into an event gets its own to-sell/sold record (an "event
// item"), separate from the model's permanent catalog data. This is what
// lets history persist across multiple fairs instead of one running total.

async function loadEventsData(modelsSheetName) {
  await Sheets.eventsEnsure(modelsSheetName);
  const [evts, items] = await Promise.all([Sheets.eventsRead(), Sheets.eventItemsRead()]);
  events = evts;
  eventItems = items;
  eventsDataLoaded = true;
}

async function loadEventsView() {
  setEventsLoading();
  try {
    const tasks = [];
    if (!fairLoaded) {
      tasks.push(Sheets.fairEnsure(CONFIG.fairSheet).then(async () => {
        fairItems = await Sheets.fairRead(CONFIG.fairSheet);
        fairLoaded = true;
      }));
    }
    if (!eventsDataLoaded) tasks.push(loadEventsData(CONFIG.fairSheet));
    if (tasks.length) await Promise.all(tasks);
    if (!currentEventSelectId && events.length) currentEventSelectId = events[events.length - 1].id;
    renderEvents();
  } catch (e) {
    document.getElementById('events-grid').innerHTML = '';
    showToast('Error loading events: ' + e.message, 'error');
  }
}

function setEventsLoading() {
  document.getElementById('events-grid').innerHTML = `<div class="fair-empty">Loading events...</div>`;
}

function populateEventSelect() {
  const select = document.getElementById('event-select');
  select.innerHTML = events.map(e =>
    `<option value="${escAttr(e.id)}" ${e.id === currentEventSelectId ? 'selected' : ''}>${esc(e.name)}</option>`
  ).join('');
  document.getElementById('rename-event-btn').disabled = !currentEventSelectId;
  document.getElementById('delete-event-btn').disabled = !currentEventSelectId;
}

function selectEvent(id) {
  currentEventSelectId = id;
  renderEvents();
}

function renderEventsStats() {
  const items = eventItems.filter(ei => ei.eventId === currentEventSelectId);
  const totalToSell = items.reduce((a, ei) => a + (parseInt(ei.toSell) || 0), 0);
  const totalSold = items.reduce((a, ei) => a + (parseInt(ei.sold) || 0), 0);
  let revenueSold = 0, revenueProjected = 0;
  items.forEach(ei => {
    const model = fairItems.find(f => f.id === ei.modelId);
    const price = model ? parseFloat(model.price) || 0 : 0;
    revenueSold += price * (parseInt(ei.sold) || 0);
    revenueProjected += price * Math.max((parseInt(ei.toSell) || 0) - (parseInt(ei.sold) || 0), 0);
  });
  document.getElementById('events-stats-row').innerHTML = `
    <div class="stat-card"><div class="stat-label">Tagged models</div><div class="stat-val">${items.length}</div></div>
    <div class="stat-card"><div class="stat-label">Planned to sell</div><div class="stat-val">${totalToSell}</div></div>
    <div class="stat-card"><div class="stat-label">Sold</div><div class="stat-val">${totalSold}</div></div>
    <div class="stat-card"><div class="stat-label">Revenue so far</div><div class="stat-val">$${revenueSold.toFixed(2)}</div></div>
    <div class="stat-card"><div class="stat-label">Projected total</div><div class="stat-val">$${(revenueSold + revenueProjected).toFixed(2)}</div></div>`;
}

function eventCardHtml(f) {
  const printed = parseInt(f.printed) || 0;
  const toSell = parseInt(f.toSell) || 0;
  const sold = parseInt(f.sold) || 0;
  const remaining = Math.max(toSell - sold, 0);
  const price = parseFloat(f.price) || 0;
  const pct = toSell > 0 ? Math.min(Math.round((sold / toSell) * 100), 100) : 0;
  const hasLicense = f.licenseStatus === 'have';
  const title = f._isVariant ? (f.variant || f.model) : f.model;
  const colors = parseFairColors(f);
  const shortOnStock = toSell > 0 && printed < toSell;
  return `<div class="fair-card">
      <div class="fair-card-photo">
        ${f.photo ? `<img src="${f.photo}" alt="" class="fair-photo-clickable" onclick="openFairLightbox(this.src)">` : `<div class="fair-card-noimg">No photo</div>`}
        <span class="fair-license-badge ${hasLicense ? 'has' : 'need'}">${hasLicense ? 'Licensed' : 'Need license'}</span>
      </div>
      <div class="fair-card-body">
        <div class="fair-card-title">${esc(title)}</div>
        ${f.model !== title ? `<div class="fair-card-license">${esc(f.model)}</div>` : ''}
        ${fairColorChipsHtml(colors)}
        <div class="fair-card-row"><span>Stock</span><span class="${shortOnStock ? 'fair-stock-warning' : ''}">${printed}${shortOnStock ? ' (short)' : ''}</span></div>
        <div class="fair-card-row"><span>To sell</span><span><input type="number" min="0" class="fair-inline-tosell" value="${toSell}" onchange="updateEventItemToSell('${f._eventItemId}',this.value)"></span></div>
        <div class="fair-card-row"><span>Price</span><span>${price ? '$' + price.toFixed(2) : '—'}</span></div>
        <div class="fair-card-row"><span>Remaining</span><span>${remaining} / ${toSell}</span></div>
        <div class="fair-progress"><div class="fair-progress-fill" style="width:${pct}%"></div></div>
        <div class="fair-sold-row">
          <span>Sold: <strong>${sold}</strong></span>
          <div class="fair-sold-btns">
            <button class="btn-ghost" onclick="bumpEventSold('${f._eventItemId}',-1)" ${sold <= 0 ? 'disabled' : ''}>&minus;</button>
            <button class="btn-ghost" onclick="bumpEventSold('${f._eventItemId}',1)">+</button>
          </div>
        </div>
        <button class="btn-delete" style="margin-top:8px;width:100%" onclick="untagEventItem('${f._eventItemId}')">Remove from event</button>
      </div>
    </div>`;
}

function eventGroupCardHtml(g) {
  const items = g.items;
  const photoItem = items.find(f => f.photo);
  const totalPrinted = items.reduce((a, f) => a + (parseInt(f.printed) || 0), 0);
  const totalToSell = items.reduce((a, f) => a + (parseInt(f.toSell) || 0), 0);
  const totalSold = items.reduce((a, f) => a + (parseInt(f.sold) || 0), 0);
  const remaining = Math.max(totalToSell - totalSold, 0);
  const pct = totalToSell > 0 ? Math.min(Math.round((totalSold / totalToSell) * 100), 100) : 0;
  const allHave = items.every(f => f.licenseStatus === 'have');
  const anyHave = items.some(f => f.licenseStatus === 'have');
  const badgeClass = allHave ? 'has' : (anyHave ? 'mixed' : 'need');
  const badgeText = allHave ? 'Licensed' : (anyHave ? 'Mixed' : 'Need license');
  // Flag per-variant shortfalls, not just the total — a surplus in one
  // variant can otherwise mask a shortage in another.
  const anyShort = items.some(f => (parseInt(f.toSell) || 0) > 0 && (parseInt(f.printed) || 0) < (parseInt(f.toSell) || 0));
  return `<div class="fair-card fair-group-card" onclick="openEventGroup('${esc(g.model).replace(/'/g, "\\'")}')">
      <div class="fair-card-photo">
        ${photoItem ? `<img src="${photoItem.photo}" alt="">` : `<div class="fair-card-noimg">No photo</div>`}
        <span class="fair-license-badge ${badgeClass}">${badgeText}</span>
        <span class="fair-variant-count">${items.length} tagged</span>
      </div>
      <div class="fair-card-body">
        <div class="fair-card-title">${esc(g.model)}</div>
        <div class="fair-card-row"><span>Stock</span><span class="${anyShort ? 'fair-stock-warning' : ''}">${totalPrinted}${anyShort ? ' (a variant is short)' : ''}</span></div>
        <div class="fair-card-row"><span>To sell</span><span>${totalToSell}</span></div>
        <div class="fair-card-row"><span>Price</span><span>${fairPriceLabel(items)}</span></div>
        <div class="fair-card-row"><span>Remaining</span><span>${remaining} / ${totalToSell}</span></div>
        <div class="fair-progress"><div class="fair-progress-fill" style="width:${pct}%"></div></div>
        <div class="fair-group-hint">Click to view variants &rarr;</div>
      </div>
    </div>`;
}

function openEventGroup(model) {
  eventGroupFilter = model;
  renderEvents();
}

function closeEventGroup() {
  eventGroupFilter = null;
  renderEvents();
}

function renderEventsBreadcrumb() {
  const bar = document.getElementById('events-breadcrumb');
  const statsRow = document.getElementById('events-stats-row');
  if (eventGroupFilter === null) {
    bar.classList.add('hidden');
    statsRow.classList.remove('hidden');
    return;
  }
  statsRow.classList.add('hidden');
  bar.classList.remove('hidden');
  document.getElementById('events-breadcrumb-title').innerHTML = `<strong>${esc(eventGroupFilter)}</strong>`;
}

function renderEventsInfoLine() {
  const el = document.getElementById('events-info-line');
  const current = getSelectedEvent();
  if (!current || (!current.date && !current.location && !current.notes)) {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }
  const parts = [];
  if (current.date) parts.push('&#128197; ' + esc(formatEventDate(current.date)));
  if (current.location) parts.push('&#128205; ' + esc(current.location));
  el.innerHTML = parts.join(' &nbsp;&middot;&nbsp; ') + (current.notes ? `<div class="fair-events-notes">${esc(current.notes)}</div>` : '');
  el.classList.remove('hidden');
}

function renderEvents() {
  populateEventSelect();
  renderEventsInfoLine();
  renderEventsBreadcrumb();
  if (eventGroupFilter === null) renderEventsStats();
  const grid = document.getElementById('events-grid');
  if (!currentEventSelectId) {
    grid.innerHTML = `<div class="fair-empty">No events yet — click "+ New event" to create one.</div>`;
    return;
  }
  const items = eventItems.filter(ei => ei.eventId === currentEventSelectId);
  let merged = items.map(ei => {
    const model = fairItems.find(f => f.id === ei.modelId);
    if (!model) return null;
    return { ...model, toSell: ei.toSell, sold: ei.sold, _eventItemId: ei.id, _isVariant: !!(model.variant && model.variant.trim()) };
  }).filter(Boolean).sort((a, b) => (parseFloat(a.sortOrder) || 0) - (parseFloat(b.sortOrder) || 0));

  if (eventGroupFilter !== null) {
    merged = merged.filter(f => (f.model || '').trim() === eventGroupFilter);
    if (!merged.length) {
      grid.innerHTML = `<div class="fair-empty">No variants tagged from this model.</div>`;
      return;
    }
    grid.innerHTML = merged.map(f => eventCardHtml(f)).join('');
    return;
  }

  if (!merged.length) {
    grid.innerHTML = `<div class="fair-empty">No models tagged into this event yet — tag some from the Models tab.</div>`;
    return;
  }
  const groups = groupFairItems(merged);
  grid.innerHTML = groups.map(g => g.items.length > 1 ? eventGroupCardHtml(g) : eventCardHtml(g.items[0])).join('');
}

async function bumpEventSold(eventItemId, delta) {
  const item = eventItems.find(ei => ei.id === eventItemId); if (!item) return;
  const prev = item.sold;
  const newSold = Math.max((parseInt(item.sold) || 0) + delta, 0);
  item.sold = String(newSold);
  renderEvents();
  try {
    await Sheets.eventItemUpsert({ id: eventItemId, sold: newSold });
  } catch (e) {
    item.sold = prev;
    renderEvents();
    showToast('Failed to update sold count: ' + e.message, 'error');
  }
}

async function updateEventItemToSell(eventItemId, val) {
  const item = eventItems.find(ei => ei.id === eventItemId); if (!item) return;
  const prev = item.toSell;
  item.toSell = String(parseInt(val) || 0);
  renderEvents();
  try {
    await Sheets.eventItemUpsert({ id: eventItemId, toSell: item.toSell });
  } catch (e) {
    item.toSell = prev;
    renderEvents();
    showToast('Failed to update: ' + e.message, 'error');
  }
}

async function untagEventItem(eventItemId) {
  if (!confirm('Remove this model from the event? This cannot be undone.')) return;
  try {
    await Sheets.eventItemDelete(eventItemId);
    eventItems = eventItems.filter(ei => ei.id !== eventItemId);
    renderEvents();
    showToast('Removed from event.', 'success');
  } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

// ---- New / edit event modal ----
// The same modal serves both: renamingEventId is null when creating a new
// event, or set to the event's id when editing an existing one's details.

let renamingEventId = null;

function openNewEventModal() {
  renamingEventId = null;
  document.getElementById('event-modal-title').textContent = 'New event';
  document.getElementById('event-modal-save-label').textContent = 'Create event';
  document.getElementById('event-carryover-note').classList.remove('hidden');
  document.getElementById('ne-name').value = '';
  document.getElementById('ne-date').value = '';
  document.getElementById('ne-location').value = '';
  document.getElementById('ne-notes').value = '';
  document.getElementById('new-event-error').classList.add('hidden');
  document.getElementById('new-event-modal-overlay').classList.remove('hidden');
}

function openRenameEventModal() {
  const current = getSelectedEvent();
  if (!current) return;
  renamingEventId = current.id;
  document.getElementById('event-modal-title').textContent = 'Edit event';
  document.getElementById('event-modal-save-label').textContent = 'Save';
  document.getElementById('event-carryover-note').classList.add('hidden');
  document.getElementById('ne-name').value = current.name;
  document.getElementById('ne-date').value = current.date || '';
  document.getElementById('ne-location').value = current.location || '';
  document.getElementById('ne-notes').value = current.notes || '';
  document.getElementById('new-event-error').classList.add('hidden');
  document.getElementById('new-event-modal-overlay').classList.remove('hidden');
}

function closeNewEventModal() { document.getElementById('new-event-modal-overlay').classList.add('hidden'); }
function handleNewEventOverlayClick(e) { if (e.target === document.getElementById('new-event-modal-overlay')) closeNewEventModal(); }

function getSelectedEvent() {
  return events.find(e => e.id === currentEventSelectId) || null;
}

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function submitEventModal() {
  const name = document.getElementById('ne-name').value.trim();
  if (!name) {
    const err = document.getElementById('new-event-error');
    err.textContent = 'Event name is required.'; err.classList.remove('hidden');
    return;
  }
  const date = document.getElementById('ne-date').value;
  const location = document.getElementById('ne-location').value.trim();
  const notes = document.getElementById('ne-notes').value.trim();
  const btn = document.getElementById('new-event-save-btn');
  const label = document.getElementById('event-modal-save-label');
  btn.disabled = true;
  try {
    if (renamingEventId) {
      label.textContent = 'Saving...';
      await Sheets.eventsUpdate({ id: renamingEventId, name, date, location, notes });
      const ev = events.find(e => e.id === renamingEventId);
      if (ev) Object.assign(ev, { name, date, location, notes });
      closeNewEventModal();
      renderEvents();
      showToast('Event updated!', 'success');
    } else {
      label.textContent = 'Creating...';
      const prevEvent = getCurrentEvent();
      const res = await Sheets.eventsCreate({ name, date, location, notes });
      const newEventId = res.id;
      events.push({ id: newEventId, name, date, location, notes });
      if (prevEvent) {
        const prevItems = eventItems.filter(ei => ei.eventId === prevEvent.id);
        const created = await Promise.all(prevItems.map(item =>
          Sheets.eventItemUpsert({ eventId: newEventId, modelId: item.modelId, toSell: item.toSell, sold: '0' })
            .then(r => ({ id: r.id, eventId: newEventId, modelId: item.modelId, toSell: item.toSell, sold: '0' }))
        ));
        eventItems.push(...created);
      }
      currentEventSelectId = newEventId;
      closeNewEventModal();
      renderEvents();
      showToast('Event created!', 'success');
    }
  } catch (e) {
    const err = document.getElementById('new-event-error');
    err.textContent = 'Failed: ' + e.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    label.textContent = renamingEventId ? 'Save' : 'Create event';
  }
}

async function deleteCurrentEvent() {
  const current = getSelectedEvent();
  if (!current) return;
  if (!confirm(`Delete "${current.name}"? This also removes every model tagged into it and cannot be undone.`)) return;
  try {
    await Sheets.eventsDelete(current.id);
    events = events.filter(e => e.id !== current.id);
    eventItems = eventItems.filter(ei => ei.eventId !== current.id);
    currentEventSelectId = events.length ? events[events.length - 1].id : null;
    eventGroupFilter = null;
    renderEvents();
    showToast('Event deleted.', 'success');
  } catch (e) {
    showToast('Failed to delete event: ' + e.message, 'error');
  }
}

// ---- Modal ----

function openModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add spool';
  document.getElementById('save-label').textContent = 'Save spool';
  clearForm();
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function openEdit(id) {
  const f = allFilaments.find(x => x.id === id); if (!f) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit spool';
  document.getElementById('save-label').textContent = 'Save changes';
  document.getElementById('f-brand').value = f.brand || '';
  document.getElementById('f-type').value = f.type || 'PLA Basic';
  document.getElementById('f-colorname').value = f.colorname || '';
  document.getElementById('f-color').value = f.color || '#cc0000';
  document.getElementById('f-qty').value = f.qty || '';
  document.getElementById('f-weight').value = f.weight || '';
  document.getElementById('f-fullweight').value = f.fullweight || '';
  document.getElementById('f-nozzle').value = f.nozzle || '';
  document.getElementById('f-bed').value = f.bed || '';
  document.getElementById('f-speed').value = f.speed || '';
  document.getElementById('f-location').value = f.location || '';
  document.getElementById('f-date').value = f.date || '';
  document.getElementById('f-cost').value = f.cost || '';
  document.getElementById('f-trans').value = f.trans || '';
  document.getElementById('f-notes').value = f.notes || '';
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); editingId = null; }
function handleOverlayClick(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }

function clearForm() {
  ['brand','colorname','qty','weight','fullweight','nozzle','bed','speed','location','date','cost','trans','notes'].forEach(k => {
    document.getElementById('f-' + k).value = '';
  });
  document.getElementById('f-type').value = 'PLA Basic';
  document.getElementById('f-color').value = '#cc0000';
  document.getElementById('form-error').classList.add('hidden');
}

// ---- Save / Delete ----

async function saveSpool() {
  const brand = document.getElementById('f-brand').value.trim();
  if (!brand) { const err = document.getElementById('form-error'); err.textContent = 'Brand is required.'; err.classList.remove('hidden'); return; }
  const filament = {
    id: editingId || generateId(), brand,
    type: document.getElementById('f-type').value,
    colorname: document.getElementById('f-colorname').value.trim(),
    color: document.getElementById('f-color').value,
    qty: document.getElementById('f-qty').value,
    weight: document.getElementById('f-weight').value,
    fullweight: document.getElementById('f-fullweight').value || '1000',
    nozzle: document.getElementById('f-nozzle').value,
    bed: document.getElementById('f-bed').value,
    speed: document.getElementById('f-speed').value,
    location: document.getElementById('f-location').value.trim(),
    date: document.getElementById('f-date').value,
    cost: document.getElementById('f-cost').value,
    trans: document.getElementById('f-trans').value.trim(),
    notes: document.getElementById('f-notes').value.trim()
  };
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  document.getElementById('save-label').textContent = 'Saving...';
  try {
    if (editingId) {
      await Sheets.update(activeUser.sheet, filament);
      const idx = allFilaments.findIndex(f => f.id === editingId);
      if (idx >= 0) allFilaments[idx] = { ...filament, _owner: activeUser.name, _sheet: activeUser.sheet };
      showToast('Spool updated!', 'success');
    } else {
      await Sheets.append(activeUser.sheet, filament);
      allFilaments.push({ ...filament, _owner: activeUser.name, _sheet: activeUser.sheet });
      showToast('Spool added!', 'success');
    }
    closeModal(); renderAll();
  } catch (e) {
    const err = document.getElementById('form-error');
    err.textContent = 'Save failed: ' + e.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    document.getElementById('save-label').textContent = editingId ? 'Save changes' : 'Save spool';
  }
}

async function deleteSpool(id) {
  if (!confirm('Delete this spool? This cannot be undone.')) return;
  try {
    await Sheets.delete(activeUser.sheet, id);
    allFilaments = allFilaments.filter(f => f.id !== id);
    renderAll(); showToast('Spool deleted.', 'success');
  } catch (e) { showToast('Delete failed: ' + e.message, 'error'); }
}

// ---- Helpers ----

function generateId() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}
