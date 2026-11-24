// Entry of the options page (options.html): the settings form split into tabs (sidebar on
// wide screens, a scrolling row on narrow ones) with a Save bar, backup export/import, and
// live refresh when another page or cloud sync changes the settings. The open tab is kept
// in the URL hash (#general, #book, #sync, #data) so it survives reloads and can be linked.
import { loadState, updateState, mergeState, STORAGE_KEY } from './storage.js';
import { applySettings, mergeBackup } from './account-book-changes.js';
import { downloadBackup } from './popup-side-features.js';
import { createSettingsForm } from './settings-form.js';
import { ICONS, el, toast } from './ui-helpers.js';

const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
const root = document.getElementById('settingsRoot');
const saveButton = document.getElementById('btnSaveSettings');
const resetButton = document.getElementById('btnResetSettings');
const dirtyNote = document.getElementById('settingsDirty');

let state = await loadState();
let form;
let dirty = false;
let activeTab = location.hash.slice(1);

function setDirty(value) {
  dirty = value;
  saveButton.disabled = !value;
  resetButton.disabled = !value;
  dirtyNote.hidden = !value;
  if (!value) root.querySelectorAll('.settings-tab.has-changes').forEach((tab) => tab.classList.remove('has-changes'));
}

function selectTab(id, { focus = false } = {}) {
  const tabs = [...root.querySelectorAll('.settings-tab')];
  const target = tabs.find((tab) => tab.dataset.tab === id) || tabs[0];
  activeTab = target.dataset.tab;
  tabs.forEach((tab) => {
    const selected = tab === target;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) target.focus();
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  history.replaceState(null, '', `#${activeTab}`);
}

/** Arrow keys / Home / End move between tabs (WAI-ARIA tabs pattern, automatic activation). */
function onTabKey(event) {
  const tabs = [...root.querySelectorAll('.settings-tab')];
  const index = tabs.indexOf(event.target);
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
  let next = null;
  if (step) next = tabs[(index + step + tabs.length) % tabs.length];
  else if (event.key === 'Home') next = tabs[0];
  else if (event.key === 'End') next = tabs[tabs.length - 1];
  if (!next) return;
  event.preventDefault();
  selectTab(next.dataset.tab, { focus: true });
}

function renderForm() {
  form = createSettingsForm(state.settings, {
    onExport: () => { downloadBackup(state); toast('Đã xuất file sao lưu'); },
    onImport: importBackup,
  });
  const tabList = el('div', { class: 'settings-tabs', role: 'tablist', 'aria-label': 'Danh mục cài đặt', onkeydown: onTabKey },
    form.sections.map((section) => el('button', {
      type: 'button', class: 'settings-tab', role: 'tab', id: `tab-${section.id}`, 'data-tab': section.id,
      'aria-controls': `panel-${section.id}`, onclick: () => selectTab(section.id),
    }, el('span', { class: 'settings-tab-icon', html: ICONS[section.icon] }), el('span', { class: 'settings-tab-label' }, section.label))));
  const panels = form.sections.map((section) => {
    const panel = el('section', { class: 'settings-panel', role: 'tabpanel', id: `panel-${section.id}`, 'aria-labelledby': `tab-${section.id}`, tabindex: '0' },
      el('h2', { class: 'settings-panel-title' }, section.label), section.node);
    // Only the book settings count as unsaved edits; the sync panel saves on its own.
    const markDirty = (event) => {
      if (event.target.closest('.sync-slot') || event.target.type === 'file') return;
      setDirty(true);
      document.getElementById(`tab-${section.id}`).classList.add('has-changes');
    };
    panel.addEventListener('input', markDirty);
    panel.addEventListener('change', markDirty);
    return panel;
  });
  root.replaceChildren(el('div', { class: 'settings-layout' },
    el('aside', { class: 'settings-side' }, tabList, form.about),
    el('div', { class: 'settings-panels' }, panels)));
  root.removeAttribute('aria-busy');
  setDirty(false);
  selectTab(activeTab);
}

async function save() {
  const result = form.collectChanges();
  if (result.error) { selectTab('book'); toast(result.error, 'err'); return; }
  // Re-read storage and apply only the edited fields, like every change in the popup.
  state = await updateState((current) => applySettings(current, result.changes));
  renderForm();
  toast('Đã lưu cài đặt');
}

async function importBackup(file) {
  try {
    const parsed = JSON.parse(await file.text());
    let result;
    state = await updateState((current) => {
      result = mergeBackup(current, parsed);
      return result.next;
    });
    if (!dirty) renderForm(); // keep edits the user has not saved yet
    toast(`Đã nhập: ${result.added} tài khoản mới, giữ bản mới hơn cho ${result.total - result.added} tài khoản trùng`);
  } catch {
    toast('File không hợp lệ', 'err');
  }
}

saveButton.addEventListener('click', save);
resetButton.addEventListener('click', renderForm);
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (dirty) save();
  }
});
// A link or the back button changing only #tab switches the tab without reloading.
window.addEventListener('hashchange', () => { if (location.hash.slice(1) !== activeTab) selectTab(location.hash.slice(1)); });
window.addEventListener('beforeunload', (event) => { if (dirty) event.preventDefault(); });

// Settings changed elsewhere (popup, another device via sync): show them unless the user
// is in the middle of editing here.
if (isExtension) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    const next = mergeState(changes[STORAGE_KEY].newValue);
    const settingsChanged = JSON.stringify(next.settings) !== JSON.stringify(state.settings);
    state = next;
    if (settingsChanged && !dirty) renderForm();
  });
}

renderForm();
