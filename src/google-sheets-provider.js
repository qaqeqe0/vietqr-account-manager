// Google Sheets sync through the user's own Apps Script web app
// (google-apps-script/vietqr-sheet-sync.gs). GET returns the book, POST replaces it.
// The script checks a shared secret; requests use text/plain to stay CORS-simple.
export const SHEETS_ORIGINS = ['https://script.google.com/*', 'https://script.googleusercontent.com/*'];
export const SHEETS_LABEL = 'Google Sheet';

// Personal accounts: /macros/s/<id>/exec; Google Workspace: /a/macros/<domain>/s/<id>/exec.
export function isValidWebAppUrl(url) {
  return /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/\s]+|macros)\/s\/[\w-]+\/exec$/.test(String(url).trim());
}

/** Turns a non-JSON answer from Google into the step the user has to fix. */
function explainHtml(status, html) {
  if (status === 404) return 'Không tìm thấy web app: link sai hoặc bản Deploy đã bị xoá/lưu trữ.';
  if (/accounts\.google\.com|ServiceLogin|signin/i.test(html)) {
    return 'Web app đòi đăng nhập Google: vào Deploy → Manage deployments → Edit, chọn “Who has access: Anyone”.';
  }
  if (/Script function not found:\s*do(Get|Post)/i.test(html)) {
    return 'Web app chưa có mã đồng bộ: dán lại mã Apps Script, bấm Lưu rồi Deploy bản mới.';
  }
  if (/authori[sz]|permission/i.test(html)) {
    return 'Script chưa được cấp quyền: mở Apps Script, chạy Deploy và bấm “Authorize access”.';
  }
  const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '').trim();
  return `Web app không trả về dữ liệu (HTTP ${status}${title ? `: ${title}` : ''}). Hãy Deploy lại bản mới.`;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(explainHtml(response.status, text));
  }
}

async function call(url, options) {
  try {
    return await fetch(url, { redirect: 'follow', cache: 'no-store', ...options });
  } catch {
    const granted = typeof chrome !== 'undefined' && chrome.permissions
      ? await chrome.permissions.contains({ origins: SHEETS_ORIGINS })
      : true;
    throw new Error(granted
      ? 'Không kết nối được Google Apps Script (kiểm tra mạng).'
      : 'Tiện ích chưa được cấp quyền truy cập script.google.com: bỏ tick rồi tick lại “Bật đồng bộ với Google Sheet” và bấm Allow.');
  }
}

function checkConfig({ url, secret }) {
  if (!isValidWebAppUrl(url)) throw new Error('Link web app phải có dạng https://script.google.com/macros/s/…/exec');
  if (!secret) throw new Error('Thiếu mã bí mật');
}

/** Where the script says it wrote: spreadsheet link, file name and tab name. */
function locationOf(data) {
  return { sheetUrl: data.sheetUrl || '', sheetName: data.sheetName || '', tabName: data.tabName || '' };
}

export function isGoogleSheetUrl(url) {
  return /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+/.test(String(url).trim());
}

/** @returns {Promise<{snapshot: object|null, sheetUrl, sheetName, tabName}>} */
export async function pullFromSheets(sheets) {
  checkConfig(sheets);
  const query = new URLSearchParams({ key: sheets.secret });
  if (sheets.targetUrl) query.set('sheet', sheets.targetUrl.trim());
  const data = await readJson(await call(`${sheets.url.trim()}?${query}`));
  if (!data.ok) throw new Error(data.error === 'Sai mã bí mật' ? 'Sai mã bí mật: bấm “Sao chép mã Apps Script”, dán đè vào Apps Script rồi Deploy bản mới.' : (data.error || 'Apps Script báo lỗi'));
  // Scripts deployed before the "choose a Sheet" option ignore it and write elsewhere.
  if (sheets.targetUrl && !data.sheetName) {
    throw new Error('Apps Script đang chạy bản cũ nên chưa ghi vào Google Sheet bạn chọn: bấm “Sao chép mã Apps Script”, dán đè rồi Deploy → Manage deployments → Edit → New version.');
  }
  const snapshot = data.snapshot && Array.isArray(data.snapshot.accounts) ? data.snapshot : null;
  return { snapshot, ...locationOf(data) };
}

/** @returns {Promise<{sheetUrl, sheetName, tabName}>} where the data was written */
export async function pushToSheets(sheets, snapshot) {
  checkConfig(sheets);
  const data = await readJson(await call(sheets.url.trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ key: sheets.secret, sheet: (sheets.targetUrl || '').trim(), snapshot }),
  }));
  if (!data.ok) throw new Error(data.error || 'Apps Script báo lỗi');
  return locationOf(data);
}
