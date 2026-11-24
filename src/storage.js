// Persists accounts and settings in chrome.storage.local (falls back to localStorage
// when the page is opened outside the extension, e.g. for local preview).
import { createId, normalizeAccountName } from './text-utils.js';

export const STORAGE_KEY = 'vietqrAccountManager';
const HISTORY_LIMIT = 8;
const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;

export const DEFAULT_GROUPS = ['Khách hàng', 'Bạn bè', 'Người thân', 'Đối tác', 'Nhà cung cấp', 'Của tôi', 'Khác'];

// Placeholders: {toi} = your name (Settings), {nguoinhan} = recipient nickname/name,
// {thang} = current month/year, {ngay} = today's date.
export const DEFAULT_TEMPLATES = [
  '{toi} chuyển tiền',
  '{toi} thanh toán',
  'Thanh toán đơn hàng',
  'Trả tiền hàng tháng {thang}',
  'Chuyển tiền ngày {ngay}',
  'Tiền ăn',
  'Hoàn tiền',
  'Gửi {nguoinhan}',
];

export const SETTINGS_FIELDS = ['myName', 'groups', 'templates', 'qrLayout', 'qrImageSource'];

/** Marks the given settings fields as changed now (per-field stamps + overall stamp). */
export function stampSettings(state, fields, at = Date.now()) {
  const settingsStamps = { ...state.settingsStamps };
  fields.filter((field) => SETTINGS_FIELDS.includes(field)).forEach((field) => { settingsStamps[field] = at; });
  return { ...state, settingsUpdatedAt: at, settingsStamps };
}

export function defaultState() {
  return {
    version: 1,
    accounts: [],
    // qrLayout: 'card' (thẻ VietQR, default) | 'classic'; qrImageSource for the card: 'vietqr'
    // (official image from img.vietqr.io, offline fallback) | 'offline'.
    settings: { myName: '', groups: [...DEFAULT_GROUPS], templates: [...DEFAULT_TEMPLATES], qrLayout: 'card', qrImageSource: 'vietqr' },
    settingsUpdatedAt: 0,
    // When each settings field was last changed, so devices merge settings field by field.
    settingsStamps: { myName: 0, groups: 0, templates: 0, qrLayout: 0, qrImageSource: 0 },
    // Tombstones for deleted accounts ({key: "bin:accountNumber", at}), so cloud sync
    // does not bring a deleted account back from another device.
    deleted: [],
  };
}

export function normalizeAccount(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const bin = String(raw.bin || raw.bankBin || '').trim();
  const accountNumber = String(raw.accountNumber || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(bin) || !accountNumber) return null;
  const list = (value) => (Array.isArray(value) ? value : []);
  return {
    id: raw.id || createId(),
    bin,
    accountNumber,
    accountName: normalizeAccountName(raw.accountName || ''),
    nickname: String(raw.nickname || '').trim(),
    group: String(raw.group || 'Khác').trim(),
    note: String(raw.note || '').trim(),
    favorite: !!raw.favorite,
    defaultAmount: Number(raw.defaultAmount) || 0,
    defaultContent: String(raw.defaultContent || '').trim(),
    amountHistory: list(raw.amountHistory).map(Number).filter((n) => n > 0).slice(0, HISTORY_LIMIT),
    contentHistory: list(raw.contentHistory).map(String).filter(Boolean).slice(0, HISTORY_LIMIT),
    useCount: Number(raw.useCount) || 0,
    lastUsedAt: Number(raw.lastUsedAt) || 0,
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Number(raw.createdAt) || 0,
  };
}

/** Identity of an account across devices: bank + account number. */
export function accountKey(account) {
  return `${account.bin}:${account.accountNumber}`;
}

export function mergeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const settings = { ...base.settings, ...(raw.settings || {}) };
  if (!Array.isArray(settings.groups) || !settings.groups.length) settings.groups = [...DEFAULT_GROUPS];
  if (!Array.isArray(settings.templates)) settings.templates = [...DEFAULT_TEMPLATES];
  const accounts = Array.isArray(raw.accounts) ? raw.accounts.map(normalizeAccount).filter(Boolean) : [];
  const deleted = Array.isArray(raw.deleted)
    ? raw.deleted.filter((t) => t && typeof t.key === 'string').map((t) => ({ key: t.key, at: Number(t.at) || 0 }))
    : [];
  const stamps = raw.settingsStamps && typeof raw.settingsStamps === 'object' ? raw.settingsStamps : {};
  const settingsStamps = Object.fromEntries(SETTINGS_FIELDS.map((field) => [field, Number(stamps[field]) || 0]));
  return { version: 1, accounts, settings, settingsUpdatedAt: Number(raw.settingsUpdatedAt) || 0, settingsStamps, deleted };
}

export async function loadState() {
  let raw = null;
  if (hasChromeStorage) {
    raw = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  } else {
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { raw = null; }
  }
  return mergeState(raw);
}

export async function saveState(state) {
  if (hasChromeStorage) await chrome.storage.local.set({ [STORAGE_KEY]: state });
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Runs `task` while holding a named lock shared by the popup, full-tab pages and the
 * service worker (Web Locks API), so two read-modify-write cycles never interleave.
 */
export function withLock(name, task) {
  const locks = globalThis.navigator?.locks;
  return locks ? locks.request(name, task) : task();
}

const BOOK_LOCK = 'vietqr-account-book';

/**
 * Atomically applies `change(current)` to the stored book and saves it.
 * @returns {Promise<object>} the saved state
 */
export function updateState(change) {
  return withLock(BOOK_LOCK, async () => {
    const next = change(await loadState());
    await saveState(next);
    return next;
  });
}

// Pushes a value to the front of a most-recent-first history list without duplicates.
export function pushHistory(list, value, same = (a, b) => a === b) {
  if (!value) return list;
  return [value, ...list.filter((item) => !same(item, value))].slice(0, HISTORY_LIMIT);
}
