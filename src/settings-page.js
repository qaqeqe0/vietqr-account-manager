// Entry of the options page (options.html): the settings form with a Save bar, backup
// export/import, and live refresh when another page or cloud sync changes the settings.
import { loadState, updateState, mergeState, STORAGE_KEY } from './storage.js';
import { applySettings, mergeBackup } from './account-book-changes.js';
import { downloadBackup } from './popup-side-features.js';
import { createSettingsForm } from './settings-form.js';
import { toast } from './ui-helpers.js';

const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
const root = document.getElementById('settingsRoot');
const saveButton = document.getElementById('btnSaveSettings');
const resetButton = document.getElementById('btnResetSettings');
const dirtyNote = document.getElementById('settingsDirty');

let state = await loadState();
let form;
let dirty = false;

function setDirty(value) {
  dirty = value;
  saveButton.disabled = !value;
  resetButton.disabled = !value;
  dirtyNote.hidden = !value;
}

function renderForm() {
  form = createSettingsForm(state.settings, {
    onExport: () => { downloadBackup(state); toast('Đã xuất file sao lưu'); },
    onImport: importBackup,
  });
  // Only the book settings count as unsaved edits; the sync panel saves on its own.
  form.content.addEventListener('input', (event) => { if (!event.target.closest('.sync-slot')) setDirty(true); });
  form.content.addEventListener('change', (event) => { if (!event.target.closest('.sync-slot') && event.target.type !== 'file') setDirty(true); });
  root.replaceChildren(form.content);
  setDirty(false);
}

async function save() {
  const result = form.collectChanges();
  if (result.error) { toast(result.error, 'err'); return; }
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
