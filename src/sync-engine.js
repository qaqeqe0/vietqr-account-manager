// One sync round for every enabled target: pull each cloud copy, merge it into the local
// book (newer edit wins, deletions kept), save locally, then push the merged book back.
// Rounds are queued so two triggers never interleave.
import { loadState, updateState } from './storage.js';
import { mergeSnapshots, stateFingerprint } from './sync-merge.js';
import { loadSyncConfig, updateSyncConfig, isSheetsReady, isDriveReady } from './sync-config.js';
import { pullFromSheets, pushToSheets, SHEETS_LABEL } from './google-sheets-provider.js';
import { pullFromDrive, pushToDrive, trashDriveFiles, DRIVE_LABEL } from './google-drive-provider.js';
import { bankLabel } from './bank-list.js';

let queue = Promise.resolve();
// Fingerprint of the last book this engine wrote, so the background listener can
// ignore the storage change caused by its own save.
export let lastSavedFingerprint = '';

/** Data sent to the cloud. bankName is only for people reading the sheet or file. */
function toSnapshot(state) {
  return {
    app: 'so-tai-khoan-vietqr',
    exportedAt: new Date().toISOString(),
    accounts: state.accounts.map((a) => ({ ...a, bankName: bankLabel(a.bin) })),
    settings: state.settings,
    settingsUpdatedAt: state.settingsUpdatedAt,
    settingsStamps: state.settingsStamps,
    deleted: state.deleted,
  };
}

function targets(config, links) {
  const list = [];
  if (isSheetsReady(config)) {
    list.push({
      label: SHEETS_LABEL,
      pull: async () => {
        const result = await pullFromSheets(config.sheets);
        if (result.sheetUrl) Object.assign(links, result);
        return result.snapshot;
      },
      push: async (snapshot) => {
        const where = await pushToSheets(config.sheets, snapshot);
        if (where.sheetUrl) Object.assign(links, where);
      },
    });
  }
  if (isDriveReady(config)) {
    let fileId = config.drive.fileId;
    let duplicates = [];
    list.push({
      label: DRIVE_LABEL,
      pull: async (interactive) => {
        const result = await pullFromDrive(config.drive, { interactive });
        fileId = result.fileId;
        duplicates = result.duplicates;
        return result.snapshot;
      },
      push: async (snapshot) => {
        fileId = await pushToDrive(config.drive, snapshot, fileId);
        // The shared file now holds everything merged from the extra copies.
        await trashDriveFiles(config.drive, duplicates);
        if (fileId !== config.drive.fileId) await updateSyncConfig((c) => ({ ...c, drive: { ...c.drive, fileId } }));
      },
    });
  }
  return list;
}

async function runRound({ interactive = false } = {}) {
  const config = await loadSyncConfig();
  const links = { sheetUrl: config.sheets.sheetUrl || '', sheetName: config.sheets.sheetName || '', tabName: config.sheets.tabName || '' };
  const list = targets(config, links);
  if (!list.length) return { at: Date.now(), ok: false, message: 'Chưa bật đồng bộ Google Sheet hoặc Drive' };

  const local = await loadState();
  let merged = local;
  const errors = [];
  const reachable = [];
  for (const target of list) {
    try {
      const remote = await target.pull(interactive);
      if (remote) merged = mergeSnapshots(merged, remote);
      reachable.push(target);
    } catch (error) {
      errors.push(`${target.label}: ${error.message}`);
    }
  }

  if (stateFingerprint(merged) !== stateFingerprint(local)) {
    // Merge into the latest stored copy under the book lock: edits made while we were
    // waiting on the network (or saved at this very moment) are kept, not overwritten.
    const pulled = merged;
    merged = await updateState((latest) => {
      const next = mergeSnapshots(latest, pulled);
      lastSavedFingerprint = stateFingerprint(next);
      return next;
    });
  }

  const snapshot = toSnapshot(merged);
  for (const target of reachable) {
    try {
      await target.push(snapshot);
    } catch (error) {
      errors.push(`${target.label}: ${error.message}`);
    }
  }

  const done = reachable.filter((t) => !errors.some((e) => e.startsWith(t.label))).map((t) => t.label);
  const status = {
    at: Date.now(),
    ok: errors.length === 0,
    message: errors.length ? errors.join(' · ') : `Đã đồng bộ ${done.map((label) => (
      label === SHEETS_LABEL && links.sheetName ? `${label} “${links.sheetName}” › tab ${links.tabName || 'TaiKhoan'}` : label
    )).join(' + ')} (${merged.accounts.length} tài khoản)`,
  };
  // Remember which spreadsheet holds the data so Settings can link to it.
  await updateSyncConfig((c) => ({
    ...c,
    lastSync: status,
    sheets: { ...c.sheets, sheetUrl: links.sheetUrl, sheetName: links.sheetName, tabName: links.tabName },
  }));
  return status;
}

/** Queues a sync round and resolves with its status ({at, ok, message}). */
export function syncNow(options) {
  const round = queue.then(() => runRound(options));
  queue = round.catch(() => {});
  return round.catch((error) => ({ at: Date.now(), ok: false, message: error.message }));
}
