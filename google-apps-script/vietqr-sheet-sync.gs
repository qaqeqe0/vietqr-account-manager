/**
 * Sổ tài khoản QR chuyển khoản — đồng bộ với Google Sheet.
 *
 * Cách dùng: Extensions → Apps Script trong Google Sheet của bạn, dán toàn bộ file này
 * (tiện ích đã điền sẵn SECRET), bấm Deploy → New deployment → Web app,
 * Execute as: Me, Who has access: Anyone → Deploy, rồi dán link /exec vào tiện ích.
 *
 * Dữ liệu được ghi vào đâu (theo thứ tự ưu tiên):
 *  1. Google Sheet bạn dán link trong tiện ích (Cài đặt → "Google Sheet lưu dữ liệu");
 *  2. Google Sheet chứa script này (nếu tạo từ Extensions → Apps Script);
 *  3. nếu script tạo riêng ở script.google.com: file mới "Sổ tài khoản QR chuyển khoản (dữ liệu)".
 * Tên file và link luôn hiện trong tiện ích sau mỗi lần đồng bộ.
 *
 * Tab "TaiKhoan": mỗi dòng một tài khoản, xem và sửa trực tiếp được (cột "capNhatLuc"
 * tự cập nhật khi sửa để tiện ích biết bản nào mới hơn). Nếu file chỉ có một tab trống,
 * tab đó được dùng luôn thay vì tạo tab mới.
 * Tab "_DongBo" (ẩn): cài đặt và danh sách tài khoản đã xoá, dạng JSON.
 */
const SECRET = '__VIETQR_SECRET__';

const SHEET_ACCOUNTS = 'TaiKhoan';
const SHEET_META = '_DongBo';
// [column header, field in the extension, kind]
const COLUMNS = [
  ['id', 'id', 'text'],
  ['bin', 'bin', 'text'],
  ['nganHang', 'bankName', 'text'],
  ['soTaiKhoan', 'accountNumber', 'text'],
  ['chuTaiKhoan', 'accountName', 'text'],
  ['tenGoiNho', 'nickname', 'text'],
  ['nhom', 'group', 'text'],
  ['ghiChu', 'note', 'text'],
  ['yeuThich', 'favorite', 'bool'],
  ['soTienMacDinh', 'defaultAmount', 'number'],
  ['noiDungMacDinh', 'defaultContent', 'text'],
  ['capNhatLuc', 'updatedAt', 'date'],
  ['taoLuc', 'createdAt', 'date'],
  ['soLanDung', 'useCount', 'number'],
  ['dungLanCuoi', 'lastUsedAt', 'date'],
  ['lichSuSoTien', 'amountHistory', 'json'],
  ['lichSuNoiDung', 'contentHistory', 'json'],
];
const UPDATED_COL = COLUMNS.findIndex((c) => c[1] === 'updatedAt') + 1;
const BIN_INDEX = COLUMNS.findIndex((c) => c[1] === 'bin');
const NUMBER_INDEX = COLUMNS.findIndex((c) => c[1] === 'accountNumber');

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function authorized(key) {
  return SECRET && SECRET !== '__VIETQR_SECRET__' && key === SECRET;
}

// Spreadsheet link chosen in the extension for the current request ('' = not chosen).
let targetUrl = '';
let cachedBook = null;

/**
 * Where the data lives: the spreadsheet chosen in the extension; else the one this script
 * is attached to; else (standalone script) one it created on first use, id kept in the
 * script properties.
 */
function getBook() {
  if (cachedBook) return cachedBook;
  cachedBook = resolveBook();
  return cachedBook;
}

function resolveBook() {
  if (targetUrl) {
    try {
      return SpreadsheetApp.openByUrl(targetUrl);
    } catch (err) {
      throw new Error('Không mở được Google Sheet đã chọn (link sai hoặc tài khoản chạy script không có quyền sửa file đó)');
    }
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (err) { /* deleted: create a new one */ }
  }
  const book = SpreadsheetApp.create('Sổ tài khoản QR chuyển khoản (dữ liệu)');
  book.getSheets()[0].setName(SHEET_ACCOUNTS); // reuse the default empty sheet
  props.setProperty('SPREADSHEET_ID', book.getId());
  return book;
}

function getSheet(name) {
  const book = getBook();
  const existing = book.getSheetByName(name);
  if (existing) return existing;
  // A file with only one empty tab (e.g. a fresh "Sheet1"): use that tab for the accounts.
  const tabs = book.getSheets();
  if (name === SHEET_ACCOUNTS && tabs.length === 1 && tabs[0].getLastRow() === 0) return tabs[0].setName(SHEET_ACCOUNTS);
  return book.insertSheet(name);
}

/** Where the data was written, for the extension to show. */
function dataLocation() {
  const book = getBook();
  return { sheetUrl: book.getUrl(), sheetName: book.getName(), tabName: SHEET_ACCOUNTS };
}

function withLocation(data) {
  const where = dataLocation();
  return json(Object.assign(data, where));
}

// Every reply is JSON, errors included, so the extension can show the exact problem.
function doGet(e) {
  try {
    if (!authorized(e && e.parameter && e.parameter.key)) return json({ ok: false, error: 'Sai mã bí mật' });
    targetUrl = (e.parameter.sheet || '').trim();
    return withLocation({ ok: true, snapshot: readSnapshot() });
  } catch (err) {
    return json({ ok: false, error: 'Apps Script lỗi: ' + err.message });
  }
}

function doPost(e) {
  try {
    let body;
    try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }); }
    if (!authorized(body.key)) return json({ ok: false, error: 'Sai mã bí mật' });
    if (!body.snapshot || !Array.isArray(body.snapshot.accounts)) return json({ ok: false, error: 'Thiếu dữ liệu' });
    targetUrl = String(body.sheet || '').trim();
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      writeSnapshot(body.snapshot);
    } finally {
      lock.releaseLock();
    }
    return withLocation({ ok: true, count: body.snapshot.accounts.length });
  } catch (err) {
    return json({ ok: false, error: 'Apps Script lỗi: ' + err.message });
  }
}

function toCell(value, kind) {
  if (kind === 'bool') return !!value;
  if (kind === 'number') return Number(value) || 0;
  if (kind === 'date') return value ? new Date(Number(value)) : '';
  if (kind === 'json') return JSON.stringify(value || []);
  return value == null ? '' : String(value);
}

function fromCell(value, kind) {
  if (kind === 'bool') return value === true || String(value).toUpperCase() === 'TRUE';
  if (kind === 'number') return Number(value) || 0;
  if (kind === 'date') {
    if (value instanceof Date) return value.getTime();
    const parsed = Date.parse(value);
    return isNaN(parsed) ? Number(value) || 0 : parsed;
  }
  if (kind === 'json') { try { return JSON.parse(value || '[]'); } catch (err) { return []; } }
  return value == null ? '' : String(value);
}

const rowKey = (row) => `${String(row[BIN_INDEX]).trim()}:${String(row[NUMBER_INDEX]).replace(/\s+/g, '')}`;

/**
 * Fingerprint of a row's content, everything except "capNhatLuc". Comparing it with the
 * fingerprint saved at the last write tells which rows were edited in the sheet — this
 * works for any spreadsheet, unlike onEdit, which only fires in the script's own sheet.
 */
function rowHash(row) {
  const text = COLUMNS.map(([, field, kind], i) => (field === 'updatedAt' ? '' : JSON.stringify(fromCell(row[i], kind)))).join('|');
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

function readMeta() {
  const metaText = getSheet(SHEET_META).getRange('A1').getValue();
  try { return metaText ? JSON.parse(metaText) : {}; } catch (err) { return {}; }
}

function readSnapshot() {
  const sheet = getSheet(SHEET_ACCOUNTS);
  const meta = readMeta();
  const savedHashes = meta.rowHashes || null; // null: written by an older script version
  const now = Date.now();
  const accounts = sheet.getDataRange().getValues().slice(1)
    .filter((row) => row[BIN_INDEX] && row[NUMBER_INDEX])
    .map((row) => {
      const account = {};
      COLUMNS.forEach(([, field, kind], i) => { account[field] = fromCell(row[i], kind); });
      // A row changed (or added) in the sheet since our last write is the newest copy.
      if (savedHashes && savedHashes[rowKey(row)] !== rowHash(row)) account.updatedAt = Math.max(account.updatedAt || 0, now);
      return account;
    });
  if (!accounts.length && !meta.settings) return null;
  return {
    accounts, settings: meta.settings, settingsUpdatedAt: meta.settingsUpdatedAt || 0,
    settingsStamps: meta.settingsStamps || {}, deleted: meta.deleted || [],
  };
}

function writeSnapshot(snapshot) {
  const sheet = getSheet(SHEET_ACCOUNTS);
  const rows = [COLUMNS.map((c) => c[0])].concat(snapshot.accounts.map((account) => COLUMNS.map(([, field, kind]) => toCell(account[field], kind))));
  sheet.clearContents();
  // Formats cover whole columns, including rows the user adds later: text columns stay
  // text so account numbers and BINs keep their leading zeros (0071… must not become 71…).
  const height = Math.max(sheet.getMaxRows(), rows.length);
  COLUMNS.forEach(([, , kind], i) => {
    const column = sheet.getRange(1, i + 1, height, 1);
    if (kind === 'date') column.setNumberFormat('yyyy-mm-dd hh:mm:ss');
    else if (kind === 'number' || kind === 'bool') column.setNumberFormat('General');
    else column.setNumberFormat('@');
  });
  sheet.getRange(1, 1, rows.length, COLUMNS.length).setValues(rows);
  sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  // Fingerprints of the rows exactly as the sheet now returns them (see rowHash).
  const rowHashes = {};
  sheet.getDataRange().getValues().slice(1).forEach((row) => { rowHashes[rowKey(row)] = rowHash(row); });

  const meta = getSheet(SHEET_META);
  meta.getRange('A1').setValue(JSON.stringify({
    settings: snapshot.settings, settingsUpdatedAt: snapshot.settingsUpdatedAt || 0,
    settingsStamps: snapshot.settingsStamps || {}, deleted: snapshot.deleted || [], rowHashes,
  }));
  meta.hideSheet();
}

/**
 * Simple trigger (only fires in the spreadsheet this script is attached to): stamps
 * "capNhatLuc" on edited rows for people reading the sheet. Edit detection for syncing
 * relies on rowHash, which also covers a chosen or auto-created spreadsheet.
 */
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_ACCOUNTS || e.range.getRow() < 2) return;
  if (e.range.getColumn() === UPDATED_COL && e.range.getNumColumns() === 1) return;
  for (let r = e.range.getRow(); r < e.range.getRow() + e.range.getNumRows(); r++) {
    sheet.getRange(r, UPDATED_COL).setValue(new Date());
  }
}
