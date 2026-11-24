// Merges two copies of the account book (this device and a cloud copy) without losing
// edits from either side. Rules:
//  - accounts match by bank + account number; the copy with the newer `updatedAt` wins;
//  - a deletion (tombstone) wins over any copy of that account that is not newer than it;
//  - each settings field (name, groups, templates) comes from the side that changed it
//    last; copies saved before per-field stamps existed fall back to settingsUpdatedAt;
//  - tombstones older than 180 days are dropped.
import { accountKey, mergeState, SETTINGS_FIELDS } from './storage.js';
import { createId } from './text-utils.js';

const TOMBSTONE_TTL = 180 * 24 * 60 * 60 * 1000;

function mergeTombstones(a, b, now) {
  const map = new Map();
  [...a, ...b].forEach((t) => {
    if (now - t.at > TOMBSTONE_TTL) return;
    if ((map.get(t.key) || 0) < t.at) map.set(t.key, t.at);
  });
  return [...map].map(([key, at]) => ({ key, at }));
}

/**
 * @param {object} local  state on this device (wins ties)
 * @param {object} remote state from the cloud (raw or normalized)
 * @returns {object} merged, normalized state
 */
export function mergeSnapshots(local, remote, now = Date.now()) {
  const mine = mergeState(local);
  const theirs = mergeState(remote);
  const deleted = mergeTombstones(mine.deleted, theirs.deleted, now);
  const deletedAt = new Map(deleted.map((t) => [t.key, t.at]));

  const byKey = new Map();
  mine.accounts.forEach((account) => byKey.set(accountKey(account), account));
  theirs.accounts.forEach((account) => {
    const key = accountKey(account);
    const current = byKey.get(key);
    if (!current || account.updatedAt > current.updatedAt) byKey.set(key, account);
  });

  // Keep local order first, then accounts that only exist remotely.
  const usedIds = new Set();
  const accounts = [];
  byKey.forEach((account, key) => {
    if (deletedAt.has(key) && deletedAt.get(key) >= account.updatedAt) return;
    const unique = usedIds.has(account.id) ? { ...account, id: createId() } : account;
    usedIds.add(unique.id);
    accounts.push(unique);
  });
  // An account re-added after its deletion no longer needs the tombstone.
  const liveKeys = new Set(accounts.map(accountKey));

  // A copy with per-field stamps is judged field by field (an unchanged field counts as 0);
  // only a copy saved before per-field stamps existed uses its overall settingsUpdatedAt.
  const hasFieldStamps = (side) => SETTINGS_FIELDS.some((field) => side.settingsStamps[field] > 0);
  const stampOf = (side, field) => (hasFieldStamps(side) ? side.settingsStamps[field] || 0 : side.settingsUpdatedAt || 0);
  const settings = { ...mine.settings };
  const settingsStamps = {};
  SETTINGS_FIELDS.forEach((field) => {
    const remoteNewer = stampOf(theirs, field) > stampOf(mine, field);
    settings[field] = remoteNewer ? theirs.settings[field] : mine.settings[field];
    settingsStamps[field] = Math.max(stampOf(mine, field), stampOf(theirs, field));
  });
  return {
    version: 1,
    accounts,
    settings,
    settingsUpdatedAt: Math.max(mine.settingsUpdatedAt, theirs.settingsUpdatedAt),
    settingsStamps,
    deleted: deleted.filter((t) => !liveKeys.has(t.key)),
  };
}

/** Comparable fingerprint of a state, ignoring key order differences in accounts. */
export function stateFingerprint(state) {
  const normalized = mergeState(state);
  const accounts = [...normalized.accounts].sort((a, b) => accountKey(a).localeCompare(accountKey(b)));
  const deleted = [...normalized.deleted].sort((a, b) => a.key.localeCompare(b.key));
  return JSON.stringify({ ...normalized, accounts, deleted });
}
