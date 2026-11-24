// One-box bank picker for the account form: type to filter (vcb, mb, vietin…, accents
// optional), pick from a list with bank logos by mouse or keys (↑ ↓ Enter, Esc closes).
// While not being edited the box shows the chosen bank. A BIN not in our list (e.g. from a
// scanned QR) stays selectable as "BIN xxxxxx".
import { BANKS, findBankByBin } from './bank-list.js';
import { matchesQuery, normalizeSearch } from './text-utils.js';
import { el, bankLogo } from './ui-helpers.js';

let comboCount = 0;

/** Lower is better: exact code, code prefix, name prefix, word prefix, anything else. */
function rank(bank, query) {
  const q = normalizeSearch(query).trim();
  if (!q) return 0;
  const code = bank.code.toLowerCase();
  const short = normalizeSearch(bank.short);
  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (short.startsWith(q)) return 2;
  if (` ${short} ${normalizeSearch(bank.name)}`.includes(` ${q}`)) return 3;
  return 4;
}

const optionLabel = (bin) => {
  const bank = findBankByBin(bin);
  return bank ? `${bank.short} (${bank.code.toUpperCase()})` : `BIN ${bin} (chưa có trong danh sách)`;
};

/**
 * @param {string} initialBin
 * @param {object} [settings]  decides whether bank logos may load from VietQR.io
 * @returns {{node, input, value: () => string, setBin: (bin: string) => void}}
 */
export function createBankPicker(initialBin, settings) {
  const listId = `bank-combo-${++comboCount}`;
  let selectedBin = initialBin || '';
  let typed = false; // the user has typed since focusing, so the text is a query
  let active = -1; // index in `visible` of the highlighted option
  let visible = [];

  const input = el('input', {
    class: 'field-input bank-combo-input', type: 'text', autocomplete: 'off', spellcheck: 'false',
    role: 'combobox', 'aria-expanded': 'false', 'aria-controls': listId, 'aria-autocomplete': 'list',
    placeholder: 'Tìm và chọn ngân hàng: vcb, mb, vietin…',
  });
  const logoSlot = el('span', { class: 'bank-combo-logo', 'aria-hidden': 'true' });
  const list = el('ul', { class: 'bank-combo-list', id: listId, role: 'listbox', hidden: true });
  const empty = el('li', { class: 'bank-combo-empty' }, 'Không tìm thấy ngân hàng');

  // Option nodes are built once per bank and reused, so logos load only once.
  const options = new Map();
  const optionFor = (bin) => {
    if (!options.has(bin)) {
      const bank = findBankByBin(bin);
      const node = el('li', { class: 'bank-combo-option', role: 'option', id: `${listId}-${bin}`, 'data-bin': bin },
        el('span', { class: 'bank-combo-option-logo' }, bankLogo(bin, settings, 'bank-logo')),
        el('span', { class: 'bank-combo-option-text' },
          el('span', { class: 'bank-combo-option-name' }, optionLabel(bin)),
          bank ? el('span', { class: 'bank-combo-option-sub' }, bank.name) : null));
      node.addEventListener('mousedown', (event) => event.preventDefault()); // keep focus in the box
      node.addEventListener('click', () => pick(bin));
      options.set(bin, node);
    }
    return options.get(bin);
  };

  function showSelected() {
    input.value = selectedBin ? optionLabel(selectedBin) : '';
    const logo = selectedBin ? bankLogo(selectedBin, settings, 'bank-logo') : null;
    logoSlot.replaceChildren(...(logo ? [logo] : []));
    input.classList.toggle('has-logo', !!logo);
  }

  function setActive(index) {
    visible.forEach((bin, i) => optionFor(bin).classList.toggle('active', i === index));
    active = index;
    const bin = visible[index];
    if (bin) {
      input.setAttribute('aria-activedescendant', `${listId}-${bin}`);
      optionFor(bin).scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function renderList() {
    const query = typed ? input.value : '';
    const unknown = selectedBin && !findBankByBin(selectedBin) ? [selectedBin] : [];
    const matches = BANKS.filter((b) => matchesQuery(`${b.short} ${b.code} ${b.name} ${b.bin}`, query));
    // Stable sort keeps the list's usual order among equally good matches.
    matches.sort((a, b) => rank(a, query) - rank(b, query));
    visible = [...unknown, ...matches.map((b) => b.bin)];
    list.replaceChildren(...(visible.length ? visible.map((bin) => {
      const node = optionFor(bin);
      node.setAttribute('aria-selected', String(bin === selectedBin));
      return node;
    }) : [empty]));
    // While searching the best match is highlighted; otherwise the current bank.
    setActive(typed ? (visible.length ? 0 : -1) : visible.indexOf(selectedBin));
  }

  function open() {
    if (!list.hidden) return;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    renderList();
  }

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    typed = false;
  }

  function pick(bin) {
    selectedBin = bin;
    close();
    showSelected();
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  input.addEventListener('focus', () => { input.select(); open(); });
  input.addEventListener('click', open);
  input.addEventListener('input', () => { typed = true; list.hidden ? open() : renderList(); });
  input.addEventListener('blur', () => {
    // Leaving the box after typing takes the highlighted match, like the old search box did.
    if (typed && visible[active]) pick(visible[active]);
    else { close(); showSelected(); }
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.hidden) { open(); return; }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(Math.min(Math.max(active + step, 0), visible.length - 1));
    } else if (event.key === 'Enter' && !list.hidden && visible[active]) {
      pick(visible[active]); // the form then moves on to the account number
    } else if (event.key === 'Escape' && !list.hidden) {
      event.preventDefault();
      close();
      showSelected();
      input.select();
    }
  });

  showSelected();

  return {
    node: el('div', { class: 'bank-combo' }, logoSlot, input, list),
    input,
    value: () => selectedBin,
    setBin(bin) {
      selectedBin = bin || '';
      close();
      showSelected();
    },
  };
}
