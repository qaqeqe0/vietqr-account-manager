// Renders the group filter chips and the searchable account list.
import { bankColor, findBankByBin, bankLabel } from './bank-list.js';
import { matchesQuery } from './text-utils.js';
import { el, iconButton, ICONS, bankLogo } from './ui-helpers.js';
import { firstRunHints } from './empty-state-hints.js';

export const FILTER_ALL = '__all__';
export const FILTER_FAVORITE = '__favorite__';

function searchableText(account) {
  const bank = findBankByBin(account.bin);
  return [
    account.accountName, account.nickname, account.accountNumber, account.group, account.note,
    bank?.short, bank?.code, bank?.name,
  ].join(' ');
}

export function filterAccounts(accounts, { query, filter }) {
  return accounts
    .filter((account) => {
      if (filter === FILTER_FAVORITE && !account.favorite) return false;
      if (filter !== FILTER_ALL && filter !== FILTER_FAVORITE && account.group !== filter) return false;
      return matchesQuery(searchableText(account), query);
    })
    .sort((a, b) => (Number(b.favorite) - Number(a.favorite))
      || (b.lastUsedAt - a.lastUsedAt)
      || (b.createdAt - a.createdAt));
}

// Groups from Settings first, then any group only found on imported accounts.
export function allGroups(accounts, settingsGroups) {
  const extra = accounts.map((a) => a.group).filter((g) => g && !settingsGroups.includes(g));
  return [...settingsGroups, ...new Set(extra)];
}

export function renderGroupChips(container, { accounts, groups, active, onSelect }) {
  const count = (predicate) => accounts.filter(predicate).length;
  const chips = [
    { id: FILTER_ALL, label: 'Tất cả', n: accounts.length },
    { id: FILTER_FAVORITE, label: '★ Yêu thích', n: count((a) => a.favorite) },
    ...groups.map((group) => ({ id: group, label: group, n: count((a) => a.group === group) })),
  ].filter((chip) => chip.id === FILTER_ALL || chip.n > 0 || chip.id === active);

  container.replaceChildren(...chips.map((chip) => el('button', {
    type: 'button',
    class: `chip${chip.id === active ? ' active' : ''}`,
    'aria-pressed': String(chip.id === active),
    onclick: () => onSelect(chip.id),
  }, chip.label, el('span', { class: 'chip-count' }, chip.n))));
}

function accountCard(account, handlers, settings) {
  const title = account.nickname || account.accountName || 'Chưa đặt tên';
  const initial = (title.trim()[0] || '?').toUpperCase();
  const subtitle = account.nickname && account.accountName ? account.accountName : '';
  return el('article', { class: 'card', 'data-id': account.id },
    el('button', { type: 'button', class: 'card-main', title: 'Mở mã QR', onclick: () => handlers.onOpenQr(account) },
      el('span', { class: 'avatar', style: `background:${bankColor(account.bin)}` }, initial),
      el('span', { class: 'card-text' },
        el('span', { class: 'card-title' }, title, account.favorite ? el('span', { class: 'fav-dot', title: 'Yêu thích' }, '★') : null),
        subtitle ? el('span', { class: 'card-sub' }, subtitle) : null,
        el('span', { class: 'card-meta' },
          bankLogo(account.bin, settings), el('b', {}, bankLabel(account.bin)), ' · ', el('span', { class: 'mono' }, account.accountNumber)),
        el('span', { class: 'card-tags' },
          el('span', { class: 'tag' }, account.group),
          account.note ? el('span', { class: 'note' }, account.note) : null),
      ),
    ),
    el('div', { class: 'card-actions' },
      el('button', { type: 'button', class: 'qr-btn', title: 'Tạo mã QR', html: ICONS.qr, onclick: () => handlers.onOpenQr(account) }),
      iconButton('copy', 'Sao chép số tài khoản', () => handlers.onCopy(account)),
      iconButton('star', account.favorite ? 'Bỏ yêu thích' : 'Yêu thích', () => handlers.onToggleFavorite(account), `secondary${account.favorite ? ' is-fav' : ''}`),
      iconButton('edit', 'Sửa', () => handlers.onEdit(account), 'secondary'),
      iconButton('trash', 'Xoá', () => handlers.onDelete(account), 'danger secondary'),
    ),
  );
}

export function renderAccountList(container, accounts, handlers, { hasAny, query, settings }) {
  if (!accounts.length) {
    const message = hasAny
      ? `Không tìm thấy tài khoản${query ? ` cho “${query}”` : ' trong nhóm này'}.`
      : 'Chưa có tài khoản nào. Thêm số tài khoản đầu tiên để tạo mã VietQR.';
    container.replaceChildren(el('div', { class: 'empty' },
      el('div', { class: 'empty-icon', html: ICONS.qr }),
      el('p', {}, message),
      hasAny ? null : el('button', { type: 'button', class: 'btn btn-primary', onclick: () => handlers.onAdd() }, '+ Thêm tài khoản'),
      hasAny ? null : firstRunHints(settings, handlers),
    ));
    return;
  }
  container.replaceChildren(...accounts.map((account) => accountCard(account, handlers, settings)));
}
