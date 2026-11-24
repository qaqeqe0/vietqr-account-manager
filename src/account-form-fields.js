// Building blocks of the add / edit account dialog: labelled field wrapper, searchable
// bank picker, group picker with "new group", and the holder-name input with lookup.
import { BANKS, findBankByBin } from './bank-list.js';
import { matchesQuery, normalizeAccountName } from './text-utils.js';
import { el, toast } from './ui-helpers.js';
import { loadSyncConfig, isLookupReady } from './sync-config.js';
import { lookupAccountName } from './vietqr-name-lookup.js';

const NEW_GROUP = '__new_group__';

export function field(label, control, hint) {
  return el('label', { class: 'form-field' }, el('span', { class: 'form-label' }, label), control, hint ? el('span', { class: 'field-hint' }, hint) : null);
}

/**
 * Search box + select of banks. A BIN not in our list (e.g. from a scanned QR) stays
 * selectable as "BIN xxxxxx".
 * @returns {{node, search, select, value: () => string, setBin: (bin: string) => void}}
 */
export function createBankPicker(initialBin) {
  const search = el('input', { type: 'search', class: 'field-input', placeholder: 'Tìm ngân hàng: vcb, mb, vietin…' });
  const select = el('select', { class: 'field-input', required: true });
  let fallbackBin = initialBin;

  function render(query = '') {
    const selected = select.value || fallbackBin;
    const matches = BANKS.filter((b) => b.bin === selected || matchesQuery(`${b.short} ${b.code} ${b.name} ${b.bin}`, query));
    const unknown = selected && !findBankByBin(selected) ? [el('option', { value: selected, selected: true }, `BIN ${selected} (chưa có trong danh sách)`)] : [];
    select.replaceChildren(
      el('option', { value: '' }, '— Chọn ngân hàng —'),
      ...unknown,
      ...matches.map((b) => el('option', { value: b.bin, selected: b.bin === selected }, `${b.short} (${b.code})`)),
    );
    if (query && matches.length && !matches.some((b) => b.bin === selected)) select.value = matches[0].bin;
  }
  search.addEventListener('input', () => render(search.value));
  render();

  return {
    node: el('div', { class: 'bank-picker' }, search, select),
    search,
    select,
    value: () => select.value,
    setBin(bin) {
      search.value = '';
      select.value = '';
      fallbackBin = bin;
      render();
      select.value = bin;
    },
  };
}

/**
 * Group select with a "+ Nhóm mới…" option that reveals a text input.
 * @returns {{node, select, newInput, value: () => string}} value is '' when a new group is chosen but not named
 */
export function createGroupPicker(groups, current) {
  const all = groups.includes(current) ? groups : [...groups, current];
  const select = el('select', { class: 'field-input' },
    ...all.map((g) => el('option', { value: g, selected: g === current }, g)),
    el('option', { value: NEW_GROUP }, '+ Nhóm mới…'));
  const newInput = el('input', { class: 'field-input', placeholder: 'Tên nhóm mới', hidden: true });
  select.addEventListener('change', () => {
    newInput.hidden = select.value !== NEW_GROUP;
    if (!newInput.hidden) newInput.focus();
  });
  return {
    node: el('div', { class: 'stack' }, select, newInput),
    select,
    newInput,
    value: () => (select.value === NEW_GROUP ? newInput.value.trim() : select.value),
  };
}

/**
 * Holder-name input (capitals, no accents) with a "Tra tên" button using VietQR.io.
 * @param {{value: string, getBin: () => string, getAccountNumber: () => string}} options
 * @returns {{node, input}}
 */
export function createHolderNameField({ value, getBin, getAccountNumber }) {
  const input = el('input', { class: 'field-input upper', placeholder: 'VD: NGUYEN VAN A', value });
  input.addEventListener('blur', () => { input.value = normalizeAccountName(input.value); });
  const lookupButton = el('button', {
    type: 'button', class: 'btn btn-ghost', title: 'Tra tên chủ tài khoản qua VietQR.io',
    onclick: async () => {
      const config = await loadSyncConfig();
      if (!isLookupReady(config)) { toast('Nhập Client ID / API Key VietQR.io trong Cài đặt để tra tên', 'err'); return; }
      if (!getBin() || !getAccountNumber()) { toast('Chọn ngân hàng và nhập số tài khoản trước', 'err'); return; }
      lookupButton.disabled = true;
      try {
        input.value = await lookupAccountName(config.lookup, { bin: getBin(), accountNumber: getAccountNumber() });
        toast('Đã tra được tên chủ tài khoản');
      } catch (error) {
        toast(error.message, 'err');
      }
      lookupButton.disabled = false;
    },
  }, 'Tra tên');
  return { node: el('div', { class: 'name-row' }, input, lookupButton), input };
}
