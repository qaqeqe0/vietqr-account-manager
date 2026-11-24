// Device-only settings: cloud sync targets and the VietQR.io name-lookup keys. Kept apart
// from the account book so secrets are never uploaded with the data.
// Stored in chrome.storage.local (localStorage in preview).
import { withLock } from './storage.js';

export const SYNC_CONFIG_KEY = 'vietqrSyncConfig';
const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;

export function defaultSyncConfig() {
  return {
    autoSync: true,
    // targetUrl: Google Sheet chosen to hold the data; sheetUrl/sheetName/tabName: where the
    // script reported writing on the last sync.
    sheets: { enabled: false, url: '', secret: '', targetUrl: '', sheetUrl: '', sheetName: '', tabName: '' },
    drive: { enabled: false, clientId: '', fileId: '' },
    lookup: { clientId: '', apiKey: '' }, // api.vietqr.io account-name lookup
    lastSync: null, // { at, ok, message }
  };
}

export async function loadSyncConfig() {
  let raw = null;
  if (hasChromeStorage) raw = (await chrome.storage.local.get(SYNC_CONFIG_KEY))[SYNC_CONFIG_KEY];
  else { try { raw = JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY)); } catch { raw = null; } }
  const base = defaultSyncConfig();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    sheets: { ...base.sheets, ...(raw.sheets || {}) },
    drive: { ...base.drive, ...(raw.drive || {}) },
    lookup: { ...base.lookup, ...(raw.lookup || {}) },
  };
}

/** Applies `change(current)` to the stored config and returns the saved result. */
export function updateSyncConfig(change) {
  // Same Web Lock across the settings page and the service worker, so a sync result and a
  // settings edit never overwrite each other.
  return withLock('vietqr-sync-config', async () => {
    const next = change(await loadSyncConfig());
    if (hasChromeStorage) await chrome.storage.local.set({ [SYNC_CONFIG_KEY]: next });
    else localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(next));
    return next;
  });
}

export function isSheetsReady(config) {
  return config.sheets.enabled && !!config.sheets.url && !!config.sheets.secret;
}

export function isDriveReady(config) {
  return config.drive.enabled && !!config.drive.clientId;
}

export function isLookupReady(config) {
  return !!config.lookup.clientId && !!config.lookup.apiKey;
}

export function hasAnySyncTarget(config) {
  return isSheetsReady(config) || isDriveReady(config);
}

/** What is still missing in the sync setup, as a sentence for the user ('' when complete). */
export function syncSetupProblem(config) {
  const { sheets, drive } = config;
  if (sheets.enabled || sheets.url) {
    if (!sheets.enabled) return 'Google Sheet: chưa tick “Bật đồng bộ với Google Sheet” trong Cài đặt';
    if (!sheets.url) return 'Google Sheet: chưa lưu link web app (dán link rồi bấm “Lưu & đồng bộ”)';
  }
  if (drive.enabled && !drive.clientId) return 'Google Drive: chưa nhập OAuth Client ID';
  return '';
}

/** True once the user has started setting up any cloud target. */
export function isSyncConfigured(config) {
  return !!(config.sheets.enabled || config.sheets.url || config.drive.enabled || config.drive.clientId);
}

/** Random shared secret for the Apps Script web app (24 hex characters). */
export function newSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
