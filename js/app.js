// ============================================================
//  APP.JS — Main application logic
// ============================================================

let activeUser = null;
let currentView = 'mine';
let allFilaments = [];
let editingId = null;
let toastTimer = null;

// ---- Bootstrap ----

window.addEventListener('DOMContentLoaded', () => {
  if (!CONFIG.sheetId || CONFIG.sheetId === 'YOUR_SHEET_ID_HERE') {
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
        <p style="color:#6b6b6b;margin-bottom:1.5rem;font-size:14px;line-height:1.6">
          Open <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px">js/config.js</code> and fill in your
          <strong>sheetId</strong>, <strong>apiKey</strong>, and user names.<br><br>
          Check the <strong>SETUP_GUIDE.md</strong> file for step-by-step instructions.
        </p>
        <div style="background:#f5f5f5;border-radius:8px;padding:1rem;text-align:left;font-size:12px;font-family:monospace;line-height:1.8">
          sheetId: "1BxiMVs0..."<br>
          apiKey: "AIzaSy..."<br>
          users: [{name:"Your Name", sheet:"User1"}]
        </div>
      </div>
    </div>
  `;
}

function buildUserButtons() {
  const container = document.getElementById('user-buttons');
  CONFIG.users.forEach(user => {
    const btn = document.createElement('button');
    btn.className = 'user-btn';
    const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    btn.innerHTML = `
      <div class="user-avatar" style="background:${user.color}">${initials}</div>
      <span>${user.name}</span>
    `;
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
    </span>
  `;

  await loadData();
}

function switchUser() {
  activeUser = null;
  allFilaments = [];
  currentView = 'mine';
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('user-select-screen').classList.remove('hidden');
  document.getElementById('search').value = '';
  document.getElementById('filter-type').value = '';
}

// ---- Data loading ----

async function loadData() {
  setTableLoading(true);
  try {
    // Ensure header rows exist on first use
    await Sheets.ensureHeaders(activeUser.sheet);
    // Load all users' data for "all" view, and active user's for "mine"
    allFilaments = await Sheets.readAll(CONFIG.users);
    renderStats();
    renderTable();
  } catch (e) {
    showToast('Error loading data: ' + e.message, 'error');
    setTableLoading(false);
  }
}

// ---- View switching ----

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  const addBtn = document.getElementById('add-btn');
  addBtn.style.display = view === 'mine' ? '' : 'none';
  renderStats();
  renderTable();
}

// ---- Rendering ----

function getVisibleFilaments() {
  const q = (document.getElementById('search').value || '').toLowerCase();
  const typeFilter = document.getElementById('filter-type').value;
  const base = currentView === 'mine'
    ? allFilaments.filter(f => f._sheet === activeUser.sheet)
    : allFilaments;
  return base.filter(f => {
    const txt = [f.brand, f.type, f.colorname, f.location, f.notes, f._owner].join(' ').toLowerCase();
    return txt.includes(q) && (!typeFilter || f.type === typeFilter);
  });
}

function renderStats() {
  const rows = getVisibleFilaments();
  const totalWeight = rows.reduce((a, f) => a + (parseFloat(f.weight) || 0), 0);
  const totalCost = rows.reduce((a, f) => a + (parseFloat(f.cost) || 0), 0);
  const types = new Set(rows.map(f => f.type)).size;

  document.getElementById('stats-row').innerHTML = `
    <div class="stat-card"><div class="stat-label">Spools</div><div class="stat-val">${rows.length}</div></div>
    <div class="stat-card"><div class="stat-label">Total weight</div><div class="stat-val">${totalWeight.toLocaleString()}g</div></div>
    <div class="stat-card"><div class="stat-label">Types</div><div class="stat-val">${types}</div></div>
    <div class="stat-card"><div class="stat-label">Total cost</div><div class="stat-val">$${totalCost.toFixed(2)}</div></div>
  `;
}

function renderTable() {
  renderStats();
  const rows = getVisibleFilaments();
  const tbody = document.getElementById('tbody');

  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">No filaments found — ${currentView === 'mine' ? 'add your first spool!' : 'try a different search.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(f => {
    const pct = f.fullweight && f.weight !== '' ? Math.round((parseFloat(f.weight) / parseFloat(f.fullweight)) * 100) : null;
    const nzbd = [f.nozzle ? f.nozzle + '°C' : '', f.bed ? f.bed + '°C bed' : ''].filter(Boolean).join(' / ');
    const isOwn = f._sheet === activeUser.sheet;
    const ownerUser = CONFIG.users.find(u => u.sheet === f._sheet);
    const ownerColor = ownerUser ? ownerUser.color : '#888';

    return `<tr>
      <td>
        <span style="font-weight:500">${esc(f.brand)}</span>
        <br><span class="type-badge">${esc(f.type)}</span>
      </td>
      <td><span class="color-dot" style="background:${f.color || '#ccc'}"></span></td>
      <td>${esc(f.colorname)}</td>
      <td>
        ${f.weight !== '' ? f.weight + 'g' : '—'}
        ${pct !== null ? `<span class="weight-bar"><span class="weight-fill" style="width:${Math.min(pct,100)}%"></span></span>` : ''}
      </td>
      <td style="color:#6b6b6b">${nzbd || '—'}</td>
      <td>${esc(f.location || '—')}</td>
      <td>${f.cost ? '$' + parseFloat(f.cost).toFixed(2) : '—'}</td>
      <td><span class="owner-chip" style="background:${ownerColor}">${esc(f._owner)}</span></td>
      <td>
        <div class="action-btns">
          ${isOwn ? `<button class="btn-edit" onclick="openEdit('${f.id}')">Edit</button>
          <button class="btn-delete" onclick="deleteSpool('${f.id}')">Delete</button>` : '<span style="font-size:11px;color:#aaa">View only</span>'}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function setTableLoading(loading) {
  if (loading) {
    document.getElementById('tbody').innerHTML = `<tr class="loading-row"><td colspan="9">Loading your filaments...</td></tr>`;
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
  const f = allFilaments.find(x => x.id === id);
  if (!f) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit spool';
  document.getElementById('save-label').textContent = 'Save changes';
  document.getElementById('f-brand').value = f.brand || '';
  document.getElementById('f-type').value = f.type || 'PLA Basic';
  document.getElementById('f-colorname').value = f.colorname || '';
  document.getElementById('f-color').value = f.color || '#cc0000';
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

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editingId = null;
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function clearForm() {
  ['brand','colorname','weight','fullweight','nozzle','bed','speed','location','date','cost','trans','notes'].forEach(k => {
    document.getElementById('f-' + k).value = '';
  });
  document.getElementById('f-type').value = 'PLA Basic';
  document.getElementById('f-color').value = '#cc0000';
  document.getElementById('form-error').classList.add('hidden');
}

// ---- Save / Delete ----

async function saveSpool() {
  const brand = document.getElementById('f-brand').value.trim();
  if (!brand) {
    const err = document.getElementById('form-error');
    err.textContent = 'Brand is required.';
    err.classList.remove('hidden');
    return;
  }

  const filament = {
    id: editingId || generateId(),
    brand,
    type: document.getElementById('f-type').value,
    colorname: document.getElementById('f-colorname').value.trim(),
    color: document.getElementById('f-color').value,
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
    closeModal();
    renderTable();
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
    renderTable();
    showToast('Spool deleted.', 'success');
  } catch (e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}

// ---- Helpers ----

function generateId() {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}
