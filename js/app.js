const SHEET_ID = 'YOUR_SHEET_ID_HERE';

function doGet(e) {
  const action = e.parameter.action || 'read';
  const tab = e.parameter.tab;
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let result;

  if (action === 'settings') {
    const settingsSheet = spreadsheet.getSheetByName('Settings');
    const data = settingsSheet.getDataRange().getValues();
    const settings = {};
    data.slice(1).forEach(row => {
      if (row[0]) settings[String(row[0])] = row[1];
    });
    result = settings;

  } else if (action === 'read') {
    const sheet = spreadsheet.getSheetByName(tab);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) { result = []; }
    else {
      const headers = data[0];
      result = data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      }).filter(r => r.id);
    }

  } else if (action === 'append') {
    const sheet = spreadsheet.getSheetByName(tab);
    const data = JSON.parse(e.parameter.data);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(h => data[h] || '');
    sheet.appendRow(row);
    result = { status: 'ok' };

  } else if (action === 'update') {
    const sheet = spreadsheet.getSheetByName(tab);
    const data = JSON.parse(e.parameter.data);
    const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat();
    const rowIndex = ids.indexOf(data.id);
    if (rowIndex < 0) { result = { status: 'error', message: 'Row not found' }; }
    else {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const row = headers.map(h => data[h] || '');
      sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
      result = { status: 'ok' };
    }

  } else if (action === 'delete') {
    const sheet = spreadsheet.getSheetByName(tab);
    const data = JSON.parse(e.parameter.data);
    const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat();
    const rowIndex = ids.indexOf(data.id);
    if (rowIndex < 0) { result = { status: 'error', message: 'Row not found' }; }
    else { sheet.deleteRow(rowIndex + 1); result = { status: 'ok' }; }

  } else if (action === 'ensureHeaders') {
    const sheet = spreadsheet.getSheetByName(tab);
    const firstCell = sheet.getRange(1, 1).getValue();
    if (!firstCell) {
      sheet.getRange(1, 1, 1, 16).setValues([['id','brand','type','colorname','color','qty','weight','fullweight','nozzle','bed','speed','location','date','cost','trans','notes']]);
    }
    result = { status: 'ok' };

  // ---- FAIR ITEMS ----
  // Columns A-F (Model, Photo, License, Printed, # to sell, Price) are the
  // user's original sheet — never overwritten here so existing embedded
  // photos and formatting are preserved. New columns G-M hold app-managed
  // fields (id, license_status, sold, photo_data / app thumbnail, variant, colors, sort_order).

  } else if (action === 'fairEnsure') {
    const sheet = spreadsheet.getSheetByName(tab);
    const newHeaders = ['id', 'license_status', 'sold', 'photo_data', 'variant', 'colors', 'sort_order', 'photo_full_url', 'public_credit', 'public_hide', 'public_name', 'photo_gallery'];
    newHeaders.forEach((h, i) => {
      const col = 7 + i; // G=7, H=8, I=9, J=10, K=11, L=12, M=13, N=14, O=15, P=16, Q=17, R=18
      if (!sheet.getRange(1, col).getValue()) sheet.getRange(1, col).setValue(h);
    });
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const ids = sheet.getRange(2, 7, lastRow - 1, 1).getValues();
      const orders = sheet.getRange(2, 13, lastRow - 1, 1).getValues();
      ids.forEach((row, i) => {
        if (!row[0]) {
          const newId = 'fair' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + i;
          sheet.getRange(2 + i, 7).setValue(newId);
        }
        if (orders[i][0] === '') {
          sheet.getRange(2 + i, 13).setValue(i);
        }
      });
    }
    result = { status: 'ok' };

  } else if (action === 'fairRead') {
    const sheet = spreadsheet.getSheetByName(tab);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) { result = []; }
    else {
      const data = sheet.getRange(2, 1, lastRow - 1, 18).getValues();
      result = data.map(row => ({
        id: String(row[6] || ''),
        model: String(row[0] || ''),
        license: String(row[2] || ''),
        licenseStatus: String(row[7] || 'need'),
        printed: row[3] === '' ? '' : row[3],
        toSell: row[4] === '' ? '' : row[4],
        price: row[5] === '' ? '' : row[5],
        sold: row[8] || 0,
        photo: String(row[9] || ''),
        variant: String(row[10] || ''),
        colors: String(row[11] || ''),
        sortOrder: row[12] === '' ? 0 : row[12],
        photoFullUrl: String(row[13] || ''),
        publicCredit: row[14] === true || row[14] === 'yes',
        hideFromCatalog: row[15] === true || row[15] === 'yes',
        publicName: String(row[16] || ''),
        photoGallery: String(row[17] || '')
      })).filter(r => r.id);
    }

  } else if (action === 'fairAppend') {
    const sheet = spreadsheet.getSheetByName(tab);
    const data = JSON.parse(e.parameter.data);
    const id = 'fair' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1).setValue(data.model || '');
    sheet.getRange(newRow, 3).setValue(data.license || '');
    sheet.getRange(newRow, 4).setValue(data.printed === '' || data.printed === undefined ? '' : Number(data.printed) || 0);
    sheet.getRange(newRow, 5).setValue(data.toSell === '' || data.toSell === undefined ? '' : Number(data.toSell) || 0);
    sheet.getRange(newRow, 6).setValue(data.price === '' || data.price === undefined ? '' : Number(data.price) || 0);
    sheet.getRange(newRow, 7).setValue(id);
    sheet.getRange(newRow, 8).setValue(data.licenseStatus || 'need');
    sheet.getRange(newRow, 9).setValue(0);
    sheet.getRange(newRow, 10).setValue(data.photo || '');
    sheet.getRange(newRow, 11).setValue(data.variant || '');
    sheet.getRange(newRow, 12).setValue(data.colors || '');
    sheet.getRange(newRow, 13).setValue(newRow);
    sheet.getRange(newRow, 14).setValue(data.photoFullUrl || '');
    sheet.getRange(newRow, 15).setValue(data.publicCredit ? 'yes' : '');
    sheet.getRange(newRow, 16).setValue(data.hideFromCatalog ? 'yes' : '');
    sheet.getRange(newRow, 17).setValue(data.publicName || '');
    sheet.getRange(newRow, 18).setValue(data.photoGallery || '');
    result = { status: 'ok', id };

  } else if (action === 'fairUpdate') {
    const sheet = spreadsheet.getSheetByName(tab);
    const data = JSON.parse(e.parameter.data);
    const lastRow = sheet.getLastRow();
    const ids = lastRow >= 2 ? sheet.getRange(2, 7, lastRow - 1, 1).getValues().flat() : [];
    const idx = ids.indexOf(data.id);
    if (idx < 0) { result = { status: 'error', message: 'Row not found' }; }
    else {
      const row = idx + 2;
      if (data.model !== undefined) sheet.getRange(row, 1).setValue(data.model);
      if (data.license !== undefined) sheet.getRange(row, 3).setValue(data.license);
      if (data.printed !== undefined) sheet.getRange(row, 4).setValue(data.printed === '' ? '' : Number(data.printed) || 0);
      if (data.toSell !== undefined) sheet.getRange(row, 5).setValue(data.toSell === '' ? '' : Number(data.toSell) || 0);
      if (data.price !== undefined) sheet.getRange(row, 6).setValue(data.price === '' ? '' : Number(data.price) || 0);
      if (data.licenseStatus !== undefined) sheet.getRange(row, 8).setValue(data.licenseStatus);
      if (data.sold !== undefined) sheet.getRange(row, 9).setValue(Number(data.sold) || 0);
      if (data.photo !== undefined) sheet.getRange(row, 10).setValue(data.photo);
      if (data.variant !== undefined) sheet.getRange(row, 11).setValue(data.variant);
      if (data.colors !== undefined) sheet.getRange(row, 12).setValue(data.colors);
      if (data.sortOrder !== undefined) sheet.getRange(row, 13).setValue(Number(data.sortOrder) || 0);
      if (data.photoFullUrl !== undefined) sheet.getRange(row, 14).setValue(data.photoFullUrl);
      if (data.publicCredit !== undefined) sheet.getRange(row, 15).setValue(data.publicCredit ? 'yes' : '');
      if (data.hideFromCatalog !== undefined) sheet.getRange(row, 16).setValue(data.hideFromCatalog ? 'yes' : '');
      if (data.publicName !== undefined) sheet.getRange(row, 17).setValue(data.publicName);
      if (data.photoGallery !== undefined) sheet.getRange(row, 18).setValue(data.photoGallery);
      result = { status: 'ok' };
    }

  } else if (action === 'fairDelete') {
    const sheet = spreadsheet.getSheetByName(tab);
    const data = JSON.parse(e.parameter.data);
    const lastRow = sheet.getLastRow();
    const ids = lastRow >= 2 ? sheet.getRange(2, 7, lastRow - 1, 1).getValues().flat() : [];
    const idx = ids.indexOf(data.id);
    if (idx < 0) { result = { status: 'error', message: 'Row not found' }; }
    else { sheet.deleteRow(idx + 2); result = { status: 'ok' }; }

  // Renames a model across every row sharing the old name, so a group is
  // renamed as a whole and never split apart.
  } else if (action === 'fairRenameModel') {
    const sheet = spreadsheet.getSheetByName(tab);
    const data = JSON.parse(e.parameter.data);
    const from = String(data.from || '').trim();
    const to = String(data.to || '').trim();
    let updated = 0;
    const lastRow = sheet.getLastRow();
    if (from && to && lastRow >= 2) {
      const names = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      names.forEach((r, i) => {
        if (String(r[0] || '').trim() === from) {
          sheet.getRange(2 + i, 1).setValue(to);
          updated++;
        }
      });
    }
    result = { status: 'ok', updated };

  // ---- PUBLIC CATALOG ----
  // Read-only, deliberately restricted: never returns price, stock, sold,
  // or event-tagging data. License/credit text is only included when the
  // row's own public_credit flag is set, so internal notes stay internal
  // by default.

  } else if (action === 'publicModels') {
    const sheet = spreadsheet.getSheetByName(tab);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) { result = []; }
    else {
      const data = sheet.getRange(2, 1, lastRow - 1, 18).getValues();
      result = data.map(row => {
        const id = String(row[6] || '');
        const showCredit = row[14] === true || row[14] === 'yes';
        const hidden = row[15] === true || row[15] === 'yes';
        const publicName = String(row[16] || '');
        const model = String(row[0] || '');
        const variant = String(row[10] || '');
        return {
          id,
          hidden,
          model, // raw internal name — grouping key, kept stable even if displayName is overridden per-variant
          displayName: publicName || model,
          variant: publicName ? '' : variant,
          photo: String(row[9] || ''),
          photoFullUrl: String(row[13] || ''),
          photoGallery: String(row[17] || ''),
          license: showCredit ? String(row[2] || '') : '',
          sortOrder: row[12] === '' ? 0 : row[12]
        };
      }).filter(r => r.id && !r.hidden).map(r => { delete r.hidden; return r; });
    }

  // ---- EVENTS ----
  // Two app-owned sheets, created automatically (not the user's own sheet):
  // "Fair Events" [id, name, date, location, notes] and "Fair Event Items"
  // [id, event_id, model_id, toSell, sold] — a model gets a row per event
  // it's tagged into, so history persists across events instead of one
  // running total.

  } else if (action === 'eventsEnsure') {
    const modelsSheet = spreadsheet.getSheetByName(tab);
    let eventsSheet = spreadsheet.getSheetByName('Fair Events');
    let itemsSheet = spreadsheet.getSheetByName('Fair Event Items');
    const isNew = !eventsSheet;
    if (!eventsSheet) {
      eventsSheet = spreadsheet.insertSheet('Fair Events');
      eventsSheet.getRange(1, 1, 1, 5).setValues([['id', 'name', 'date', 'location', 'notes']]);
    }
    if (!itemsSheet) {
      itemsSheet = spreadsheet.insertSheet('Fair Event Items');
      itemsSheet.getRange(1, 1, 1, 5).setValues([['id', 'event_id', 'model_id', 'toSell', 'sold']]);
    }
    if (isNew && modelsSheet) {
      // One-time migration: models that already had a to-sell target or sold
      // count become the historical record of a first event, "Fair 1".
      const firstEventId = 'evt' + Date.now().toString(36);
      eventsSheet.getRange(2, 1, 1, 5).setValues([[firstEventId, 'Fair 1', '', '', '']]);
      const lastRow = modelsSheet.getLastRow();
      if (lastRow >= 2) {
        const data = modelsSheet.getRange(2, 1, lastRow - 1, 13).getValues();
        const itemRows = [];
        data.forEach((row, i) => {
          const modelId = row[6];
          const toSell = row[4];
          const sold = row[8];
          if (modelId && ((toSell && Number(toSell) > 0) || (sold && Number(sold) > 0))) {
            itemRows.push(['evtitem' + Date.now().toString(36) + i, firstEventId, modelId, Number(toSell) || 0, Number(sold) || 0]);
          }
        });
        if (itemRows.length) itemsSheet.getRange(2, 1, itemRows.length, 5).setValues(itemRows);
      }
    }
    result = { status: 'ok' };

  } else if (action === 'eventsRead') {
    const sheet = spreadsheet.getSheetByName('Fair Events');
    if (!sheet) { result = []; }
    else {
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) { result = []; }
      else {
        result = sheet.getRange(2, 1, lastRow - 1, 5).getValues()
          .map(r => ({ id: String(r[0] || ''), name: String(r[1] || ''), date: String(r[2] || ''), location: String(r[3] || ''), notes: String(r[4] || '') }))
          .filter(r => r.id);
      }
    }

  } else if (action === 'eventsCreate') {
    const data = JSON.parse(e.parameter.data);
    const sheet = spreadsheet.getSheetByName('Fair Events') || spreadsheet.insertSheet('Fair Events');
    const id = 'evt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    sheet.appendRow([id, data.name || 'New Event', data.date || '', data.location || '', data.notes || '']);
    result = { status: 'ok', id };

  } else if (action === 'eventsUpdate') {
    const data = JSON.parse(e.parameter.data);
    const sheet = spreadsheet.getSheetByName('Fair Events');
    if (sheet) {
      const lastRow = sheet.getLastRow();
      const ids = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
      const idx = ids.indexOf(data.id);
      if (idx >= 0) {
        const row = idx + 2;
        if (data.name !== undefined) sheet.getRange(row, 2).setValue(data.name);
        if (data.date !== undefined) sheet.getRange(row, 3).setValue(data.date);
        if (data.location !== undefined) sheet.getRange(row, 4).setValue(data.location);
        if (data.notes !== undefined) sheet.getRange(row, 5).setValue(data.notes);
      }
    }
    result = { status: 'ok' };

  } else if (action === 'eventsDelete') {
    const data = JSON.parse(e.parameter.data);
    const eventsSheet = spreadsheet.getSheetByName('Fair Events');
    if (eventsSheet) {
      const lastRow = eventsSheet.getLastRow();
      const ids = lastRow >= 2 ? eventsSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
      const idx = ids.indexOf(data.id);
      if (idx >= 0) eventsSheet.deleteRow(idx + 2);
    }
    // Cascade: also remove every item tagged into this event.
    const itemsSheet = spreadsheet.getSheetByName('Fair Event Items');
    if (itemsSheet) {
      const lastRow = itemsSheet.getLastRow();
      if (lastRow >= 2) {
        const eventIds = itemsSheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
        for (let i = eventIds.length - 1; i >= 0; i--) {
          if (eventIds[i] === data.id) itemsSheet.deleteRow(i + 2);
        }
      }
    }
    result = { status: 'ok' };

  } else if (action === 'eventItemsRead') {
    const sheet = spreadsheet.getSheetByName('Fair Event Items');
    if (!sheet) { result = []; }
    else {
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) { result = []; }
      else {
        result = sheet.getRange(2, 1, lastRow - 1, 5).getValues()
          .map(r => ({ id: String(r[0] || ''), eventId: String(r[1] || ''), modelId: String(r[2] || ''), toSell: r[3] === '' ? 0 : r[3], sold: r[4] === '' ? 0 : r[4] }))
          .filter(r => r.id);
      }
    }

  } else if (action === 'eventItemUpsert') {
    const data = JSON.parse(e.parameter.data);
    let sheet = spreadsheet.getSheetByName('Fair Event Items');
    if (!sheet) {
      sheet = spreadsheet.insertSheet('Fair Event Items');
      sheet.getRange(1, 1, 1, 5).setValues([['id', 'event_id', 'model_id', 'toSell', 'sold']]);
    }
    const lastRow = sheet.getLastRow();
    let rowIndex = -1;
    if (data.id) {
      const ids = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
      rowIndex = ids.indexOf(data.id);
    }
    if (rowIndex >= 0) {
      const row = rowIndex + 2;
      if (data.toSell !== undefined) sheet.getRange(row, 4).setValue(Number(data.toSell) || 0);
      if (data.sold !== undefined) sheet.getRange(row, 5).setValue(Number(data.sold) || 0);
      result = { status: 'ok', id: data.id };
    } else {
      const id = 'evtitem' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      sheet.appendRow([id, data.eventId, data.modelId, Number(data.toSell) || 0, Number(data.sold) || 0]);
      result = { status: 'ok', id };
    }

  } else if (action === 'eventItemDelete') {
    const data = JSON.parse(e.parameter.data);
    const sheet = spreadsheet.getSheetByName('Fair Event Items');
    if (sheet) {
      const lastRow = sheet.getLastRow();
      const ids = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
      const idx = ids.indexOf(data.id);
      if (idx >= 0) sheet.deleteRow(idx + 2);
    }
    result = { status: 'ok' };

  } else {
    result = { status: 'error', message: 'Unknown action' };
  }

  const callback = e.parameter.callback;
  const json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
