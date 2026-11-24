// Compact account row for the 420px toolbar popup: initial-letter avatar (bank colour),
// bank + group label with a favorite star toggle, name, number (+ note), and always-visible actions — copy, QR, and a "⋯"
// menu with edit / delete. The full-tab view keeps the large grid cards.
import { bankLabel, bankColor } from '@shared/bank-list.js';
import { el, ICONS, bankLogo } from './ui-helpers.js';

let closeOpenMenu = null;

/** Small popover anchored to `button`; closes on outside click, Esc, or picking an item. */
function openRowMenu(button, items) {
  closeOpenMenu?.();
  const menu = el('div', { class: 'row-menu', role: 'menu' },
    ...items.map((item) => el('button', {
      type: 'button', role: 'menuitem', class: `row-menu-item ${item.tone || ''}`,
      onclick: () => { close(); item.onclick(); },
    }, el('span', { class: 'w-4 text-center', html: ICONS[item.icon] }), item.label)));
  const onDocument = (event) => {
    if (event.type === 'keydown' && event.key !== 'Escape') return;
    if (event.type === 'mousedown' && (menu.contains(event.target) || button.contains(event.target))) return;
    close();
  };
  function close() {
    menu.remove();
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onDocument, true);
    document.removeEventListener('keydown', onDocument, true);
    closeOpenMenu = null;
  }
  button.closest('.account-row').append(menu);
  button.setAttribute('aria-expanded', 'true');
  document.addEventListener('mousedown', onDocument, true);
  document.addEventListener('keydown', onDocument, true);
  menu.querySelector('button')?.focus();
  closeOpenMenu = close;
}

export function compactAccountRow(account, handlers, settings) {
  const title = account.nickname || account.accountName || 'Chưa đặt tên';
  const subtitle = account.nickname && account.accountName ? account.accountName : '';
  const named = (action) => `${action} ${title}`;
  const openQr = () => handlers.onOpenQr(account);

  const moreButton = el('button', {
    type: 'button', class: 'row-icon', title: named('Thao tác với'), 'aria-label': named('Thao tác với'),
    'aria-haspopup': 'menu', 'aria-expanded': 'false', html: '<i class="fa-solid fa-ellipsis-vertical"></i>',
    onclick: () => openRowMenu(moreButton, [
      { icon: 'edit', label: 'Sửa', onclick: () => handlers.onEdit(account) },
      { icon: 'trash', label: 'Xoá', tone: 'danger', onclick: () => handlers.onDelete(account) },
    ]),
  });
  const favoriteLabel = account.favorite ? named('Bỏ yêu thích') : named('Yêu thích');
  const starButton = el('button', {
    type: 'button', class: `row-star${account.favorite ? ' is-fav' : ''}`, title: favoriteLabel, 'aria-label': favoriteLabel,
    'aria-pressed': String(!!account.favorite),
    html: `<i class="fa-${account.favorite ? 'solid' : 'regular'} fa-star"></i>`,
    onclick: () => handlers.onToggleFavorite(account),
  });

  const initial = (title.trim()[0] || '?').toUpperCase();

  return el('article', { class: 'account-row', 'data-id': account.id },
    el('button', {
      type: 'button', class: 'row-avatar', style: `background:${bankColor(account.bin)}`,
      tabindex: '-1', 'aria-hidden': 'true', onclick: openQr,
    }, initial),
    el('div', { class: 'flex-1 min-w-0' },
      // Label line: bank, group and the favorite toggle (its own button, not part of the QR link).
      el('div', { class: 'flex items-center gap-1.5 min-w-0' },
        // Logo only (bank name shown as its tooltip); the name as text when there is no logo.
        bankLogo(account.bin, settings, 'bank-logo !h-4',
          el('span', { class: 'text-[11px] font-semibold text-blue-600 uppercase tracking-wider truncate' }, bankLabel(account.bin))),
        el('span', { class: 'tag !text-[10px] !px-1.5 !py-0' }, account.group),
        starButton),
      el('button', { type: 'button', class: 'row-main', title: named('Mở mã QR của'), onclick: openQr },
        // Long company names wrap to a second line instead of being cut off.
        el('span', { class: 'block font-semibold text-slate-900 text-[15px] leading-tight line-clamp-2 break-words', title }, title),
        el('span', { class: 'block text-xs text-slate-500 truncate' },
          el('span', { class: 'font-mono' }, account.accountNumber),
          subtitle ? ` · ${subtitle}` : '',
          account.note ? ` · ${account.note}` : ''))),
    el('div', { class: 'flex items-center gap-0.5 shrink-0' },
      el('button', { type: 'button', class: 'row-icon', title: named('Sao chép số tài khoản của'), 'aria-label': named('Sao chép số tài khoản của'), html: ICONS.copy, onclick: () => handlers.onCopy(account) }),
      el('button', { type: 'button', class: 'row-qr', title: named('Nhận tiền — mở mã QR của'), 'aria-label': named('Nhận tiền — mở mã QR của'), html: ICONS.qr, onclick: openQr }),
      moreButton),
  );
}
