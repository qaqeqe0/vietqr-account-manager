// Settings section for Google Sheet / Google Drive sync and VietQR.io name lookup.
// Changes save immediately (device-only config). Permission prompts and Google sign-in
// close the extension popup, so in the popup only status + "sync now" are shown.
import { loadSyncConfig, updateSyncConfig, newSecret, hasAnySyncTarget, syncSetupProblem, SYNC_CONFIG_KEY } from './sync-config.js';
import { SHEETS_ORIGINS, isValidWebAppUrl, isGoogleSheetUrl } from './google-sheets-provider.js';
import { DRIVE_ORIGINS, driveRedirectUrl, getDriveToken, signOutDrive, isDriveSignedIn } from './google-drive-provider.js';
import { LOOKUP_ORIGINS } from './vietqr-name-lookup.js';
import { copyText } from './text-utils.js';
import { el, toast } from './ui-helpers.js';

const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

/** Must be called synchronously from a click so Chrome shows the permission prompt. */
function requestOrigins(origins) {
  if (!isExtension || !chrome.permissions) return Promise.resolve(true);
  return chrome.permissions.request({ origins });
}

export async function requestSync() {
  if (isExtension) return chrome.runtime.sendMessage({ type: 'sync-now' });
  return (await import('./sync-engine.js')).syncNow();
}

function formatStatus(lastSync) {
  if (!lastSync) return 'Chưa đồng bộ lần nào.';
  const time = new Date(lastSync.at || Date.now()).toLocaleString('vi-VN');
  return `${lastSync.ok ? '✓' : '⚠'} ${time}: ${lastSync.message}`;
}

const steps = (...items) => el('ol', { class: 'steps' }, ...items.map((t) => el('li', { html: t })));
const input = (attrs) => el('input', { class: 'field-input', ...attrs });
const row = (...children) => el('div', { class: 'inline-row' }, ...children);
const button = (label, onclick, cls = 'btn btn-ghost') => el('button', { type: 'button', class: cls, onclick }, label);

export async function createSyncSettingsPanel({ isPopup, onOpenTab }) {
  let config = await loadSyncConfig();
  const save = async (change) => { config = await updateSyncConfig(change); return config; };
  const status = el('p', { class: 'field-hint sync-status' }, formatStatus(config.lastSync));

  const syncButton = button('Đồng bộ ngay', async () => {
    config = await loadSyncConfig();
    if (!hasAnySyncTarget(config)) {
      status.textContent = `⚠ ${syncSetupProblem(config) || 'Hãy bật Google Sheet hoặc Drive trước.'}`;
      return;
    }
    syncButton.disabled = true;
    status.textContent = 'Đang đồng bộ…';
    try {
      status.textContent = formatStatus(await requestSync());
    } catch (error) {
      // e.g. the extension was reloaded while this page stayed open
      status.textContent = `⚠ Không chạy được đồng bộ: ${error.message}. Hãy tải lại trang.`;
    } finally {
      syncButton.disabled = false;
    }
  }, 'btn btn-primary');
  const autoBox = el('input', { type: 'checkbox', checked: config.autoSync, onchange: (e) => save((c) => ({ ...c, autoSync: e.target.checked })) });

  const header = el('div', { class: 'sync-head' },
    el('span', { class: 'form-label' }, 'Đồng bộ Google Sheet / Drive'),
    status,
    row(syncButton, el('label', { class: 'check-row' }, autoBox, ' Tự động đồng bộ sau mỗi thay đổi')));
  // Keep the status line and sheet link current while auto-sync runs in the background.
  if (isExtension) {
    const onChange = (changes, area) => {
      if (area !== 'local' || !changes[SYNC_CONFIG_KEY]) return;
      if (!status.isConnected) { chrome.storage.onChanged.removeListener(onChange); return; }
      const next = changes[SYNC_CONFIG_KEY].newValue || {};
      if (next.lastSync) status.textContent = formatStatus(next.lastSync);
      const link = header.parentElement?.querySelector('a.sheet-link');
      if (link && next.sheets?.sheetUrl) { link.href = next.sheets.sheetUrl; link.textContent = linkText(next); link.hidden = false; }
    };
    chrome.storage.onChanged.addListener(onChange);
  }
  if (isPopup) {
    return el('section', { class: 'sync-panel' }, header,
      button('Thiết lập Google Sheet, Drive, tra tên (mở tab)', onOpenTab, 'link-btn'));
  }

  // --- Google Sheet via Apps Script -------------------------------------------
  if (!config.sheets.secret) await save((c) => ({ ...c, sheets: { ...c.sheets, secret: newSecret() } }));
  const sheetOn = el('input', { type: 'checkbox', checked: config.sheets.enabled });
  sheetOn.addEventListener('change', async () => {
    if (sheetOn.checked && !(await requestOrigins(SHEETS_ORIGINS))) { sheetOn.checked = false; return; }
    await save((c) => ({ ...c, sheets: { ...c.sheets, enabled: sheetOn.checked } }));
  });
  const sheetUrl = input({ placeholder: 'https://script.google.com/macros/s/…/exec', value: config.sheets.url });
  const saveUrl = async () => {
    const url = sheetUrl.value.trim();
    if (url && !isValidWebAppUrl(url)) { toast('Link phải là Web app URL, kết thúc bằng /exec', 'err'); return false; }
    await save((c) => ({ ...c, sheets: { ...c.sheets, url } }));
    return true;
  };
  sheetUrl.addEventListener('change', saveUrl);
  const saveAndSync = button('Lưu & đồng bộ', async () => {
    // The permission prompt must be requested before any await, while the click still counts.
    const needsEnable = !sheetOn.checked;
    const permission = needsEnable ? requestOrigins(SHEETS_ORIGINS) : Promise.resolve(true);
    if (!(await saveUrl())) return;
    if (needsEnable) {
      if (!(await permission)) return;
      sheetOn.checked = true;
      await save((c) => ({ ...c, sheets: { ...c.sheets, enabled: true } }));
    }
    syncButton.click();
  }, 'btn btn-primary');
  const linkText = (c) => (c.sheets.sheetName ? `Dữ liệu đang ở: “${c.sheets.sheetName}” › tab ${c.sheets.tabName || 'TaiKhoan'} (mở)` : 'Mở Google Sheet chứa dữ liệu');
  const sheetLink = el('a', { class: 'link-btn sheet-link', target: '_blank', rel: 'noopener', hidden: !config.sheets.sheetUrl, href: config.sheets.sheetUrl || '#' }, linkText(config));

  // Optional: the user's own Google Sheet to write into (otherwise the script decides).
  const targetUrl = input({ placeholder: 'https://docs.google.com/spreadsheets/d/… (để trống = mặc định)', value: config.sheets.targetUrl || '' });
  const saveTarget = button('Lưu & đồng bộ', async () => {
    const url = targetUrl.value.trim();
    if (url && !isGoogleSheetUrl(url)) { toast('Hãy dán link Google Sheet (docs.google.com/spreadsheets/…)', 'err'); return; }
    await save((c) => ({ ...c, sheets: { ...c.sheets, targetUrl: url } }));
    syncButton.click();
  });
  const copyScript = button('Sao chép mã Apps Script', async () => {
    const code = await (await fetch('google-apps-script/vietqr-sheet-sync.gs')).text();
    // Only the constant is filled in; the unset-placeholder check in the script stays intact.
    await copyText(code.replace("const SECRET = '__VIETQR_SECRET__';", `const SECRET = '${config.sheets.secret}';`));
    toast('Đã sao chép mã Apps Script (đã có mã bí mật)');
  });
  const rotate = button('Đổi mã bí mật', async () => {
    await save((c) => ({ ...c, sheets: { ...c.sheets, secret: newSecret() } }));
    toast('Đã tạo mã mới: sao chép lại Apps Script và Deploy bản mới');
  }, 'link-btn');

  const sheetSection = el('details', { class: 'sync-card', open: config.sheets.enabled },
    el('summary', {}, 'Google Sheet'),
    el('label', { class: 'check-row' }, sheetOn, ' Bật đồng bộ với Google Sheet'),
    steps(
      'Tạo Google Sheet mới → <b>Extensions → Apps Script</b>.',
      'Bấm <b>Sao chép mã Apps Script</b> bên dưới, xoá code mẫu và dán vào, bấm Lưu.',
      '<b>Deploy → New deployment → Web app</b>: Execute as <b>Me</b>, Who has access <b>Anyone</b> → Deploy → cho phép quyền.',
      'Dán link <b>Web app URL</b> (kết thúc bằng /exec) vào ô dưới.',
    ),
    row(copyScript, rotate),
    el('label', { class: 'form-field' }, el('span', { class: 'form-label' }, 'Link web app (Web app URL)'), row(sheetUrl, saveAndSync)),
    el('label', { class: 'form-field' }, el('span', { class: 'form-label' }, 'Google Sheet lưu dữ liệu (tuỳ chọn)'), row(targetUrl, saveTarget),
      el('span', { class: 'field-hint' }, 'Dán link Google Sheet của bạn để ghi vào đó (tab “TaiKhoan”). Để trống: ghi vào Sheet chứa Apps Script, hoặc file “Sổ tài khoản QR chuyển khoản (dữ liệu)” nếu script tạo riêng.')),
    sheetLink,
    el('p', { class: 'field-hint' }, 'Mỗi tài khoản là một dòng trong sheet “TaiKhoan”; sửa trên sheet cũng được đồng bộ về. Xoá tài khoản hãy xoá trong tiện ích.'));

  // --- Google Drive via OAuth ----------------------------------------------------
  const driveOn = el('input', { type: 'checkbox', checked: config.drive.enabled });
  driveOn.addEventListener('change', async () => {
    if (driveOn.checked && !(await requestOrigins(DRIVE_ORIGINS))) { driveOn.checked = false; return; }
    await save((c) => ({ ...c, drive: { ...c.drive, enabled: driveOn.checked } }));
  });
  const clientId = input({ placeholder: 'xxxx.apps.googleusercontent.com', value: config.drive.clientId });
  clientId.addEventListener('change', () => save((c) => ({ ...c, drive: { ...c.drive, clientId: clientId.value.trim(), fileId: '' } })));
  const redirect = input({ readonly: true, value: isExtension ? driveRedirectUrl() : '(chỉ có khi chạy trong Chrome)' });
  const driveState = el('span', { class: 'field-hint' });
  const refreshDriveState = async () => { driveState.textContent = isExtension && await isDriveSignedIn() ? 'Đã đăng nhập Google.' : 'Chưa đăng nhập.'; };
  const login = button('Đăng nhập Google', async () => {
    if (!clientId.value.trim()) { toast('Nhập OAuth Client ID trước', 'err'); return; }
    try {
      await getDriveToken(clientId.value.trim(), { interactive: true });
      await refreshDriveState();
      toast('Đã đăng nhập Google Drive');
    } catch (error) { toast(error.message, 'err'); }
  }, 'btn btn-primary');
  const logout = button('Đăng xuất', async () => { await signOutDrive(); await refreshDriveState(); }, 'link-btn');
  if (isExtension) refreshDriveState();

  const driveSection = el('details', { class: 'sync-card', open: config.drive.enabled },
    el('summary', {}, 'Google Drive'),
    el('label', { class: 'check-row' }, driveOn, ' Bật sao lưu vào Google Drive (file so-tai-khoan-vietqr.json)'),
    steps(
      'Vào <b>console.cloud.google.com</b> → tạo project → bật <b>Google Drive API</b>.',
      '<b>OAuth consent screen</b>: External, thêm email của bạn vào Test users.',
      '<b>Credentials → Create OAuth client ID → Web application</b>, thêm <b>Authorized redirect URI</b> là link bên dưới.',
      'Dán <b>Client ID</b> vào ô dưới rồi bấm Đăng nhập Google.',
      'Dùng trên nhiều máy: dùng <b>chung một Client ID</b>, và thêm Redirect URI của <b>từng máy</b> (hiện ở dưới, mỗi máy một link) vào cùng client đó. Các máy sẽ dùng chung một file trên Drive.',
    ),
    el('label', { class: 'form-field' }, el('span', { class: 'form-label' }, 'Redirect URI (sao chép vào Google Cloud)'),
      row(redirect, button('Sao chép', () => copyText(redirect.value).then(() => toast('Đã sao chép'))))),
    el('label', { class: 'form-field' }, el('span', { class: 'form-label' }, 'OAuth Client ID'), clientId),
    row(login, logout, driveState));

  // --- VietQR.io lookup ------------------------------------------------------------
  const lookupId = input({ placeholder: 'Client ID', value: config.lookup.clientId });
  const lookupKey = input({ type: 'password', placeholder: 'API Key', value: config.lookup.apiKey });
  const saveLookup = button('Lưu', async () => {
    const granted = await requestOrigins(LOOKUP_ORIGINS);
    if (!granted) return;
    await save((c) => ({ ...c, lookup: { clientId: lookupId.value.trim(), apiKey: lookupKey.value.trim() } }));
    toast(lookupId.value.trim() ? 'Đã lưu khoá VietQR.io' : 'Đã tắt tra tên');
  }, 'btn btn-primary');
  const lookupSection = el('details', { class: 'sync-card', open: !!config.lookup.clientId },
    el('summary', {}, 'Tra tên chủ tài khoản (VietQR.io)'),
    el('p', { class: 'field-hint' }, 'Khi quét mã QR mà ảnh không có tên, tiện ích gửi mã ngân hàng và số tài khoản tới api.vietqr.io để tra tên. Đăng ký miễn phí tại my.vietqr.io để lấy Client ID và API Key. Để trống để tắt.'),
    row(lookupId, lookupKey), row(saveLookup));

  return el('section', { class: 'sync-panel' }, header, sheetSection, driveSection, lookupSection);
}

