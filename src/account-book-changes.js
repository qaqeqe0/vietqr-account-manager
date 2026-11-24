// Pure changes to the account book: each takes the current state and returns the next one,
// stamping `updatedAt` and deletion tombstones so cloud sync can merge devices correctly.
import { accountKey, mergeState, pushHistory, stampSettings } from './storage.js';
import { mergeSnapshots } from './sync-merge.js';
import { normalizeSearch } from './text-utils.js';

const now = () => Date.now();
const tombstone = (account) => ({ key: accountKey(account), at: now() });

/** Adds `group` to the settings list when it is new. */
function withGroup(current, group) {
  if (current.settings.groups.includes(group)) return current;
  return stampSettings({ ...current, settings: { ...current.settings, groups: [...current.settings.groups, group] } }, ['groups']);
}

export function addAccount(current, account) {
  const added = { ...account, updatedAt: now() };
  return {
    ...withGroup(current, added.group),
    accounts: [...current.accounts, added],
    deleted: current.deleted.filter((t) => t.key !== accountKey(added)),
  };
}

export function replaceAccount(current, before, after) {
  const saved = { ...after, updatedAt: now() };
  const keyChanged = accountKey(before) !== accountKey(saved);
  return {
    ...withGroup(current, saved.group),
    accounts: current.accounts.map((a) => (a.id === saved.id ? saved : a)),
    // Changing bank or number makes it a different account for other devices.
    deleted: keyChanged ? [...current.deleted, tombstone(before)] : current.deleted,
  };
}

export function removeAccount(current, account) {
  return {
    ...current,
    accounts: current.accounts.filter((a) => a.id !== account.id),
    deleted: [...current.deleted, tombstone(account)],
  };
}

/** Applies `patch(account)` to the account with `id`. */
export function patchAccount(current, id, patch) {
  return {
    ...current,
    accounts: current.accounts.map((a) => (a.id === id ? { ...a, ...patch(a), updatedAt: now() } : a)),
  };
}

/** Patch recording a copied / downloaded QR: remembers amount and content as recent. */
export function usagePatch({ amount, content }) {
  return (a) => ({
    amountHistory: pushHistory(a.amountHistory, amount || 0),
    contentHistory: pushHistory(a.contentHistory, content, (x, y) => normalizeSearch(x) === normalizeSearch(y)),
    useCount: a.useCount + 1,
    lastUsedAt: now(),
  });
}

export function applySettings(current, settings) {
  // Only the fields actually sent are stamped, so other devices' changes to the rest win.
  return stampSettings({ ...current, settings: { ...current.settings, ...settings } }, Object.keys(settings));
}

/**
 * Merges a parsed backup file into the book.
 * @returns {{next: object, added: number, total: number}}
 */
export function mergeBackup(current, parsed) {
  const incoming = mergeState(Array.isArray(parsed) ? { accounts: parsed } : parsed);
  const importedKeys = new Set(incoming.accounts.map(accountKey));
  const before = new Set(current.accounts.map(accountKey));
  // Importing a backup restores accounts deleted here, so drop their tombstones first;
  // otherwise the same newer-copy-wins merge as cloud sync applies.
  const merged = mergeSnapshots(
    { ...current, deleted: current.deleted.filter((t) => !importedKeys.has(t.key)) },
    { accounts: incoming.accounts, settingsUpdatedAt: 0, settingsStamps: {} },
  );
  // Only add groups the backup really lists; mergeState fills defaults when it has none,
  // which would bring back default groups the user deleted.
  const backupGroups = Array.isArray(parsed?.settings?.groups) ? incoming.settings.groups : [];
  const groups = [...new Set([...merged.settings.groups, ...backupGroups])];
  const groupsChanged = groups.length !== merged.settings.groups.length;
  return {
    next: groupsChanged
      ? stampSettings({ ...merged, settings: { ...merged.settings, groups } }, ['groups'])
      : merged,
    added: merged.accounts.filter((a) => !before.has(accountKey(a))).length,
    total: incoming.accounts.length,
  };
}
