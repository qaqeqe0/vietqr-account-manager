// Entry point: loads the account book, wires search / group filter / list actions and the
// dialogs. State changes are in account-book-changes.js; backup download, the sync status
// line and right-click scan pickup are in popup-side-features.js.
import { loadState, updateState, mergeState, STORAGE_KEY } from './storage.js';
import { stateFingerprint } from './sync-merge.js';
import { loadSyncConfig, hasAnySyncTarget, SYNC_CONFIG_KEY } from './sync-config.js';
import { FILTER_ALL, FILTER_FAVORITE, filterAccounts, allGroups, renderGroupChips, renderAccountList } from './account-list-view.js';
import { openQrModal } from './qr-modal.js';
import { openAccountForm } from './account-form.js';
import { openSettingsModal } from './settings-modal.js';
import { openDonateDialog } from './donate-coffee.js';
import { bankLabel } from './bank-list.js';
import { copyText } from './text-utils.js';
import { ICONS, confirmDialog, toast } from './ui-helpers.js';
import { imageFromDataTransfer } from './qr-scan-sources.js';
import {
  addAccount, replaceAccount, removeAccount, patchAccount, usagePatch, applySettings, mergeBackup,
} from './account-book-changes.js';
import { downloadBackup, renderSyncStatus, takePendingScan } from './popup-side-features.js';

const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
const isTabView = new URLSearchParams(location.search).get('view') === 'tab' || !isExtension;
document.body.classList.toggle('tab-view', isTabView);

const dom = {
  search: document.getElementById('searchInput'),
  chips: document.getElementById('groupChips'),
  list: document.getElementById('accountList'),
  count: document.getElementById('accountCount'),
  syncBadge: document.getElementById('syncStatus'),
};

let state = await loadState();
const view = { query: '', filter: FILTER_ALL };

// Every change re-reads storage first and applies `change` to that fresh copy, so this
// page never overwrites edits saved meanwhile by another open page or by cloud sync.
async function commit(change) {
  state = await updateState(change);
  render();
}

const handlers = {
  onOpenSettings: () => openSettings(),
  onAdd: (scanOptions = {}) => openAccountForm(null, {
    groups: state.settings.groups,
    accounts: state.accounts,
    settings: state.settings,
    defaultGroup: [FILTER_ALL, FILTER_FAVORITE].includes(view.filter) ? undefined : view.filter,
    isPopup: !isTabView,
    onOpenTab: (hash) => openFullTab(hash),
    onOpenExisting: (account) => handlers.onOpenQr(account),
    ...scanOptions,
    onSave: async (account) => {
      await commit((current) => addAccount(current, account));
      toast('Đã thêm tài khoản');
    },
  }),
  onEdit: (account) => openAccountForm(account, {
    groups: state.settings.groups,
    accounts: state.accounts,
    settings: state.settings,
    onSave: async (updated) => {
      await commit((current) => replaceAccount(current, account, updated));
      toast('Đã lưu');
    },
  }),
  onDelete: async (account) => {
    const label = `${account.nickname || account.accountName} · ${bankLabel(account.bin)} ${account.accountNumber}`;
    if (!(await confirmDialog(`Xoá tài khoản “${label}”? Không thể hoàn tác (trừ khi bạn có file sao lưu).`))) return;
    await commit((current) => removeAccount(current, account));
    toast('Đã xoá');
  },
  onCopy: async (account) => {
    await copyText(account.accountNumber);
    toast(`Đã sao chép ${account.accountNumber}`);
  },
  onToggleFavorite: (account) => commit((current) => patchAccount(current, account.id, (a) => ({ favorite: !a.favorite }))),
  onOpenQr: (account) => openQrModal(account, state.settings,
    (usage) => commit((current) => patchAccount(current, account.id, usagePatch(usage)))),
};

function currentResults() {
  return filterAccounts(state.accounts, view);
}

function render() {
  const groups = allGroups(state.accounts, state.settings.groups);
  if (![FILTER_ALL, FILTER_FAVORITE, ...groups].includes(view.filter)) view.filter = FILTER_ALL;
  renderGroupChips(dom.chips, {
    accounts: state.accounts, groups, active: view.filter,
    onSelect: (filter) => { view.filter = filter; render(); },
  });
  const results = currentResults();
  renderAccountList(dom.list, results, handlers, { hasAny: state.accounts.length > 0, query: view.query, settings: state.settings });
  dom.count.textContent = state.accounts.length
    ? `${results.length}/${state.accounts.length} tài khoản`
    : 'Chưa có tài khoản';
}

function openFullTab(hash = '') {
  const path = `popup.html?view=tab${hash}`;
  if (isExtension) {
    chrome.tabs.create({ url: chrome.runtime.getURL(path) });
    if (!isTabView) window.close(); // the popup would be hidden behind the new tab anyway
  } else window.open(path, '_blank');
}

async function importBackup(file) {
  try {
    const parsed = JSON.parse(await file.text());
    let result;
    await commit((current) => {
      result = mergeBackup(current, parsed);
      return result.next;
    });
    toast(`Đã nhập: ${result.added} tài khoản mới, giữ bản mới hơn cho ${result.total - result.added} tài khoản trùng`);
  } catch {
    toast('File không hợp lệ', 'err');
  }
}

function openSettings() {
  openSettingsModal(state.settings, {
    isPopup: !isTabView,
    onOpenTab: () => openFullTab('#settings'),
    onExport: () => { downloadBackup(state); toast('Đã xuất file sao lưu'); },
    onImport: importBackup,
    onSave: async (settings) => {
      await commit((current) => applySettings(current, settings));
      toast('Đã lưu cài đặt');
    },
  });
}

// --- static controls -------------------------------------------------------
document.getElementById('btnAdd').addEventListener('click', () => handlers.onAdd());
document.getElementById('btnSettings').addEventListener('click', openSettings);
const tabButton = document.getElementById('btnOpenTab');
tabButton.innerHTML = ICONS.expand;
tabButton.hidden = isTabView;
tabButton.addEventListener('click', () => openFullTab());
document.getElementById('btnSettings').innerHTML = ICONS.settings;
const donateButton = document.getElementById('btnDonate');
if (donateButton) {
  donateButton.innerHTML = ICONS.coffee;
  donateButton.addEventListener('click', () => openDonateDialog(state.settings));
}
document.getElementById('searchIcon').innerHTML = ICONS.search;
dom.syncBadge.addEventListener('click', openSettings);

dom.search.addEventListener('input', () => { view.query = dom.search.value; render(); });
dom.search.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const first = currentResults()[0];
    if (first) handlers.onOpenQr(first);
  } else if (event.key === 'Escape' && dom.search.value) {
    event.preventDefault();
    dom.search.value = '';
    view.query = '';
    render();
  }
});
document.addEventListener('keydown', (event) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if (event.key === '/' && !typing && !document.querySelector('.backdrop')) {
    event.preventDefault();
    dom.search.focus();
  }
});

// Pasting a QR screenshot on the main list opens "add account" and scans it.
document.addEventListener('paste', (event) => {
  if (document.querySelector('.backdrop')) return;
  const image = imageFromDataTransfer(event.clipboardData);
  if (!image) return;
  event.preventDefault();
  handlers.onAdd({ initialImage: image });
});

// Another page or the background sync changed the book or the sync status: show it.
if (isExtension) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[SYNC_CONFIG_KEY]) renderSyncStatus(dom.syncBadge);
    if (!changes[STORAGE_KEY]) return;
    const next = mergeState(changes[STORAGE_KEY].newValue);
    if (stateFingerprint(next) === stateFingerprint(state)) return;
    state = next;
    render();
  });
  // Pull edits made on other devices each time the popup opens (silent).
  loadSyncConfig().then((config) => {
    if (config.autoSync && hasAnySyncTarget(config)) chrome.runtime.sendMessage({ type: 'sync-now' }).catch(() => {});
  });
}

render();
renderSyncStatus(dom.syncBadge);
dom.search.focus();
takePendingScan().then((pending) => {
  if (pending?.error) toast(pending.error, 'err');
  else if (pending) handlers.onAdd({ initialImages: pending.images });
});
if (location.hash === '#settings') openSettings();
if (location.hash === '#scan-file') handlers.onAdd({ autoScan: 'file' });
if (location.hash === '#scan-camera') handlers.onAdd({ autoScan: 'camera' });
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
