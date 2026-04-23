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
  activeUser = null; allFilaments = []; currentView = 'mine'; currentDisplay = 'table';
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('user-select-screen').classList.remove('hidden');
  document.getElementById('search').value = '';
  document.getElementById('filter-type').value = '';
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
  const isEstimator = view === 'estimator';
  addBtn.style.display = (view === 'mine') ? '' : 'none';
  document.getElementById('table-view').classList.add('hidden');
  document.getElementById('gallery-view').classList.add('hidden');
  document.getElementById('estimator-view').classList.add('hidden');
  document.getElementById('filter-type').style.display = isEstimator ? 'none' : '';
  document.getElementById('filter-brand').style.display = isEstimator ? 'none' : '';
  document.getElementById('search').style.display = isEstimator ? 'none' : '';
  if (isEstimator) {
    document.getElementById('estimator-view').classList.remove('hidden');
    renderEstimator();
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
  const qty = parseInt(document.getElementById('est-qty').value) || 1;
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
  const subtotal = (filamentCost + laborCost + machineCost + electricityCost) * qty;
  const profit = subtotal * (profitMargin / 100);
  const beforeTax = subtotal + profit;
  const tax = beforeTax * (taxRate / 100);
  const discount = parseFloat(document.getElementById('est-discount').value) || 0;
  const discountAmount = (beforeTax + tax) * (discount / 100);
  const total = beforeTax + tax - discountAmount;

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
    <div class="est-section-label">Time (${hours.toFixed(1)} hrs × ${qty} print${qty !== 1 ? 's' : ''})</div>
    <div class="est-breakdown-row"><span>Labor @ ${fmt(laborRate)}/hr</span><span>${fmt(laborCost)}</span></div>
    <div class="est-breakdown-row"><span>Machine @ ${fmt(machineRate)}/hr</span><span>${fmt(machineCost)}</span></div>
    <div class="est-breakdown-row"><span>Electricity @ ${fmt(electricityRate)}/hr</span><span>${fmt(electricityCost)}</span></div>
    <div class="est-divider"></div>
    <div class="est-breakdown-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div class="est-breakdown-row"><span>Profit (${profitMargin}%)</span><span>${fmt(profit)}</span></div>
    <div class="est-breakdown-row"><span>Tax (${taxRate}%)</span><span>${fmt(tax)}</span></div>
    <div class="est-divider"></div>
    ${discount > 0 ? `<div class="est-breakdown-row" style="color:#1D9E75"><span>Discount (${discount}%)</span><span>-${fmt(discountAmount)}</span></div>` : ''}
    <div class="est-total-row"><span>Total price</span><span>${fmt(total)}</span></div>
  `;
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
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}
