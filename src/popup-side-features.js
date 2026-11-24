// Smaller pieces of the main page: backup download, the cloud-sync status line under the
// title, and picking up a right-click "scan QR" left by the service worker.
import { loadSyncConfig, syncSetupProblem, isSyncConfigured } from './sync-config.js';
import { PENDING_SCAN_KEY } from './background-context-menu-keys.js';
import { el } from './ui-helpers.js';

export function downloadBackup(state) {
  const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const link = el('a', { href: URL.createObjectURL(blob), download: `so-tai-khoan-vietqr-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Shows the last sync result, or what is missing in the setup; hidden until sync is set up. */
export async function renderSyncStatus(badge) {
  const config = await loadSyncConfig();
  if (!isSyncConfigured(config)) { badge.hidden = true; return; }
  const problem = syncSetupProblem(config);
  const last = config.lastSync;
  const time = last ? new Date(last.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  badge.textContent = problem ? `☁ ⚠ ${problem}`
    : !last ? '☁ Chưa đồng bộ lần nào'
      : last.ok ? `☁ ✓ ${last.message} · ${time}` : `☁ ⚠ ${last.message} · ${time}`;
  badge.className = `sync-badge ${problem || (last && !last.ok) ? 'err' : last ? 'ok' : ''}`;
  badge.title = badge.textContent;
  badge.hidden = false;
}

async function fetchImage(url) {
  try {
    const response = await fetch(url);
    const blob = response.ok ? await response.blob() : null;
    return blob?.type.startsWith('image/') ? blob : null;
  } catch {
    return null; // cross-site image without access: the screenshot is used instead
  }
}

/**
 * Takes the right-click scan stored in session storage (if fresh) and returns the images
 * to scan in order: the clicked image, then the page screenshot.
 * @returns {Promise<{images: Blob[]}|{error: string}|null>} null when there is nothing pending;
 *   images holds only the ones that could be loaded
 */
export async function takePendingScan() {
  if (typeof chrome === 'undefined' || !chrome.storage?.session) return null;
  const pending = (await chrome.storage.session.get(PENDING_SCAN_KEY))[PENDING_SCAN_KEY];
  if (!pending || Date.now() - pending.at > 2 * 60 * 1000) return null;
  await chrome.storage.session.remove(PENDING_SCAN_KEY);
  const images = [
    pending.imageUrl ? await fetchImage(pending.imageUrl) : null,
    pending.screenshot ? await fetchImage(pending.screenshot) : null,
  ].filter(Boolean);
  // Keep the real reason (e.g. the page could not be captured) when no image is usable.
  if (!images.length) return { error: pending.error || 'Không đọc được ảnh đã chọn. Hãy chụp màn hình mã QR rồi dán vào.' };
  return { images };
}
