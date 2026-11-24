// Google Drive sync: one JSON file ("so-tai-khoan-vietqr.json") in the user's Drive,
// using the narrow drive.file scope (the extension only sees files it created).
// Sign-in uses chrome.identity.launchWebAuthFlow with the user's own OAuth client
// ("Web application" type, redirect URI = chrome.identity.getRedirectURL()).
import { mergeSnapshots } from './sync-merge.js';

export const DRIVE_ORIGINS = ['https://www.googleapis.com/*'];
export const DRIVE_LABEL = 'Google Drive';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FILE_NAME = 'so-tai-khoan-vietqr.json';
const TOKEN_KEY = 'vietqrDriveToken';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export function driveRedirectUrl() {
  return chrome.identity?.getRedirectURL?.() || '';
}

async function cachedToken() {
  const saved = (await chrome.storage.session.get(TOKEN_KEY))[TOKEN_KEY];
  return saved && saved.expiresAt - 60_000 > Date.now() ? saved.token : null;
}

/** Returns an access token; interactive=true may show Google's sign-in window. */
export async function getDriveToken(clientId, { interactive = false } = {}) {
  const cached = await cachedToken();
  if (cached) return cached;
  if (!clientId) throw new Error('Thiếu OAuth Client ID');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId.trim(),
    response_type: 'token',
    redirect_uri: driveRedirectUrl(),
    scope: SCOPE,
    include_granted_scopes: 'true',
    prompt: interactive ? 'select_account' : 'none',
  });
  let redirect;
  try {
    redirect = await chrome.identity.launchWebAuthFlow({
      url: url.href, interactive, abortOnLoadForNonInteractive: false, timeoutMsForNonInteractive: 8000,
    });
  } catch (error) {
    throw new Error(interactive ? `Đăng nhập Google không thành công: ${error.message}` : 'Cần đăng nhập Google lại (Cài đặt → Google Drive)');
  }
  const params = new URLSearchParams(new URL(redirect).hash.slice(1));
  if (params.get('error') || !params.get('access_token')) {
    throw new Error(interactive ? `Google từ chối: ${params.get('error') || 'không có token'}` : 'Cần đăng nhập Google lại (Cài đặt → Google Drive)');
  }
  const token = params.get('access_token');
  const expiresAt = Date.now() + Number(params.get('expires_in') || 3600) * 1000;
  await chrome.storage.session.set({ [TOKEN_KEY]: { token, expiresAt } });
  return token;
}

export async function signOutDrive() {
  await chrome.storage.session.remove(TOKEN_KEY);
}

export async function isDriveSignedIn() {
  return !!(await cachedToken());
}

async function driveFetch(token, url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  if (response.status === 401) {
    await signOutDrive();
    throw new Error('Phiên Google đã hết hạn, hãy đăng nhập lại');
  }
  return response;
}

/**
 * Every copy of the book file in this Drive, oldest first. With one OAuth client shared by
 * all devices they all see the same files; two devices setting up at once can each create
 * one, so every copy is read and merged, and the oldest is kept as the shared file.
 */
async function listFileIds(token) {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const response = await driveFetch(token, `${API}?q=${q}&spaces=drive&orderBy=createdTime&fields=files(id)&pageSize=20`);
  if (!response.ok) throw new Error(`Drive lỗi ${response.status}`);
  return ((await response.json()).files || []).map((file) => file.id);
}

async function readFile(token, fileId) {
  const response = await driveFetch(token, `${API}/${fileId}?alt=media`, { cache: 'no-store' });
  if (response.status === 404) return null; // removed between listing and reading
  if (!response.ok) throw new Error(`Drive lỗi ${response.status}`);
  try { return await response.json(); } catch { return null; }
}

/**
 * @returns {Promise<{snapshot: object|null, fileId: string, duplicates: string[]}>}
 *   snapshot merges every copy; fileId is the shared file; duplicates are the extra copies
 */
export async function pullFromDrive(drive, { interactive = false } = {}) {
  const token = await getDriveToken(drive.clientId, { interactive });
  const ids = await listFileIds(token);
  if (!ids.length) return { snapshot: null, fileId: '', duplicates: [] };
  let snapshot = null;
  for (const id of ids) {
    const copy = await readFile(token, id);
    if (copy) snapshot = snapshot ? mergeSnapshots(snapshot, copy) : copy;
  }
  return { snapshot, fileId: ids[0], duplicates: ids.slice(1) };
}

/** Moves extra copies to the Drive trash (recoverable for 30 days). */
export async function trashDriveFiles(drive, ids) {
  if (!ids.length) return;
  const token = await getDriveToken(drive.clientId);
  for (const id of ids) {
    await driveFetch(token, `${API}/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }),
    });
  }
}

/** Creates or overwrites the backup file. @returns {Promise<string>} the file id */
export async function pushToDrive(drive, snapshot, fileId) {
  const token = await getDriveToken(drive.clientId);
  const body = JSON.stringify(snapshot, null, 2);
  if (fileId) {
    const response = await driveFetch(token, `${UPLOAD}/${fileId}?uploadType=media&fields=id`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
    });
    if (response.ok) return fileId;
    if (response.status !== 404) throw new Error(`Drive lỗi ${response.status}`);
  }
  const boundary = `vietqr${Date.now()}`;
  const multipart = [
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '',
    JSON.stringify({ name: FILE_NAME, mimeType: 'application/json', description: 'Sổ tài khoản QR chuyển khoản (tiện ích Chrome)' }),
    `--${boundary}`, 'Content-Type: application/json', '', body, `--${boundary}--`,
  ].join('\r\n');
  const response = await driveFetch(token, `${UPLOAD}?uploadType=multipart&fields=id`, {
    method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart,
  });
  if (!response.ok) throw new Error(`Drive lỗi ${response.status}`);
  return (await response.json()).id;
}
