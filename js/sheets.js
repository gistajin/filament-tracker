// ============================================================
//  SHEETS.JS — Google Apps Script backend (JSONP/GET)
// ============================================================

const Sheets = {

  _call(params) {
    return new Promise((resolve, reject) => {
      const cbName = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const url = CONFIG.scriptUrl + '?' + Object.entries({ ...params, callback: cbName })
        .map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');

      const script = document.createElement('script');
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Request timed out'));
      }, 15000);

      window[cbName] = (data) => {
        cleanup();
        if (data && data.status === 'error') reject(new Error(data.message));
        else resolve(data);
      };

      function cleanup() {
        clearTimeout(timeout);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      script.onerror = () => { cleanup(); reject(new Error('Script load failed')); };
      script.src = url;
      document.head.appendChild(script);
    });
  },

  async read(sheetName) {
    const rows = await this._call({ action: 'read', tab: sheetName });
    return (Array.isArray(rows) ? rows : []).map(r => ({
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
    return this._call({ action: 'append', tab: sheetName, data: JSON.stringify(filament) });
  },

  async update(sheetName, filament) {
    return this._call({ action: 'update', tab: sheetName, data: JSON.stringify(filament) });
  },

  async delete(sheetName, id) {
    return this._call({ action: 'delete', tab: sheetName, data: JSON.stringify({ id }) });
  },

  async ensureHeaders(sheetName) {
    return this._call({ action: 'ensureHeaders', tab: sheetName, data: '{}' });
  }

};
