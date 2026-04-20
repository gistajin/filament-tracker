// ============================================================
//  SHEETS.JS — Google Sheets read/write layer
// ============================================================

const COLUMNS = [
  'id', 'brand', 'type', 'colorname', 'color',
  'weight', 'fullweight', 'nozzle', 'bed', 'speed',
  'location', 'date', 'cost', 'trans', 'notes'
];

const Sheets = {

  _base() {
    return `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}`;
  },

  _headers() {
    return { 'Content-Type': 'application/json' };
  },

  // Read all rows from a sheet tab
  async read(sheetName) {
    const range = encodeURIComponent(`${sheetName}!A2:O`);
    const url = `${this._base()}/values/${range}?key=${CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to read sheet');
    }
    const data = await res.json();
    const rows = data.values || [];
    return rows.map(row => {
      const obj = {};
      COLUMNS.forEach((col, i) => { obj[col] = row[i] || ''; });
      return obj;
    }).filter(r => r.id);
  },

  // Read all rows from ALL user tabs combined
  async readAll(users) {
    const results = await Promise.all(
      users.map(async u => {
        const rows = await this.read(u.sheet);
        return rows.map(r => ({ ...r, _owner: u.name, _sheet: u.sheet }));
      })
    );
    return results.flat();
  },

  // Append a new row
  async append(sheetName, filament) {
    const range = encodeURIComponent(`${sheetName}!A:O`);
    const url = `${this._base()}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&key=${CONFIG.apiKey}`;
    const values = [COLUMNS.map(c => filament[c] || '')];
    const res = await fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ values })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to append row');
    }
    return res.json();
  },

  // Find the row number of a filament by ID and update it
  async update(sheetName, filament) {
    // First read to find row number
    const range = encodeURIComponent(`${sheetName}!A:A`);
    const url = `${this._base()}/values/${range}?key=${CONFIG.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    const ids = (data.values || []).map(r => r[0]);
    const rowIndex = ids.indexOf(filament.id);
    if (rowIndex < 0) throw new Error('Row not found for id: ' + filament.id);
    const rowNum = rowIndex + 1;

    const updateRange = encodeURIComponent(`${sheetName}!A${rowNum}:O${rowNum}`);
    const updateUrl = `${this._base()}/values/${updateRange}?valueInputOption=RAW&key=${CONFIG.apiKey}`;
    const values = [COLUMNS.map(c => filament[c] || '')];
    const updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify({ values })
    });
    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(err.error?.message || 'Failed to update row');
    }
    return updateRes.json();
  },

  // Delete a row by ID (clears the row)
  async delete(sheetName, id) {
    const range = encodeURIComponent(`${sheetName}!A:A`);
    const url = `${this._base()}/values/${range}?key=${CONFIG.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    const ids = (data.values || []).map(r => r[0]);
    const rowIndex = ids.indexOf(id);
    if (rowIndex < 0) throw new Error('Row not found for id: ' + id);
    const rowNum = rowIndex + 1;

    // Get sheet tab's sheetId (numeric) for batchUpdate
    const metaUrl = `${this._base()}?key=${CONFIG.apiKey}`;
    const metaRes = await fetch(metaUrl);
    const meta = await metaRes.json();
    const sheet = meta.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) throw new Error('Sheet tab not found: ' + sheetName);
    const numericId = sheet.properties.sheetId;

    const deleteUrl = `${this._base()}:batchUpdate?key=${CONFIG.apiKey}`;
    const deleteRes = await fetch(deleteUrl, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId: numericId,
              dimension: 'ROWS',
              startIndex: rowNum - 1,
              endIndex: rowNum
            }
          }
        }]
      })
    });
    if (!deleteRes.ok) {
      const err = await deleteRes.json();
      throw new Error(err.error?.message || 'Failed to delete row');
    }
    return deleteRes.json();
  },

  // Make sure header row exists, create it if not
  async ensureHeaders(sheetName) {
    const range = encodeURIComponent(`${sheetName}!A1:O1`);
    const url = `${this._base()}/values/${range}?key=${CONFIG.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.values || !data.values[0] || data.values[0][0] !== 'id') {
      const writeUrl = `${this._base()}/values/${range}?valueInputOption=RAW&key=${CONFIG.apiKey}`;
      await fetch(writeUrl, {
        method: 'PUT',
        headers: this._headers(),
        body: JSON.stringify({ values: [COLUMNS] })
      });
    }
  }
};
