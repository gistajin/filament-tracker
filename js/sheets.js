// ============================================================
//  SHEETS.JS — Google Apps Script backend layer
// ============================================================

const Sheets = {

  _url() {
    return CONFIG.scriptUrl;
  },

  async _post(payload) {
    const res = await fetch(this._url(), {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Network error: ' + res.status);
    const json = await res.json();
    if (json.status === 'error') throw new Error(json.message);
    return json;
  },

  async read(sheetName) {
    const url = this._url() + '?tab=' + encodeURIComponent(sheetName);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error: ' + res.status);
    const rows = await res.json();
    return rows.map(r => ({
      id: String(r.id || ''),
      brand: String(r.brand || ''),
      type: String(r.type || ''),
      colorname: String(r.colorname || ''),
      color: String(r.color || ''),
      weight: String(r.weight || ''),
      fullweight: String(r.fullweight || ''),
      nozzle: String(r.nozzle || ''),
      bed: String(r.bed || ''),
      speed: String(r.speed || ''),
      location: String(r.location || ''),
      date: String(r.date || ''),
      cost: String(r.cost || ''),
      trans: String(r.trans || ''),
      notes: String(r.notes || '')
    })).filter(r => r.id);
  },

  async readAll(users) {
    const results = await Promise.all(
      users.map(async u => {
        const rows = await this.read(u.sheet);
        return rows.map(r => ({ ...r, _owner: u.name, _sheet: u.sheet }));
      })
    );
    return results.flat();
  },

  async append(sheetName, filament) {
    return this._post({ action: 'append', tab: sheetName, data: filament });
  },

  async update(sheetName, filament) {
    return this._post({ action: 'update', tab: sheetName, data: filament });
  },

  async delete(sheetName, id) {
    return this._post({ action: 'delete', tab: sheetName, data: { id } });
  },

  async ensureHeaders(sheetName) {
    return this._post({ action: 'ensureHeaders', tab: sheetName, data: {} });
  }

};
