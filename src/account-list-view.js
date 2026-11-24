// Restyled replacement for the shared account-list-view.js (same exports): group chips as
// pills and, in the full-tab view, account cards in a grid with an offline mini QR and a
// "Nhận tiền" bar. The toolbar popup uses the compact rows from account-row-compact.js.
// Filtering and grouping logic is reused from the shared module unchanged.
import { FILTER_ALL, FILTER_FAVORITE, filterAccounts, allGroups } from '@shared/account-list-view.js';
import { bankLabel, allowsVietqrImages } from '@shared/bank-list.js';
import { buildVietQrPayload } from '@shared/vietqr-payload.js';
import { drawQr } from '@shared/qr-image-renderer.js';
import { el, ICONS, bankLogo } from './ui-helpers.js';
import { vietqrImageUrl } from '@shared/qr-print-card.js';
import { compactAccountRow } from './account-row-compact.js';

export { FILTER_ALL, FILTER_FAVORITE, filterAccounts, allGroups };

export function renderGroupChips(container, { accounts, groups, active, onSelect }) {
  const count = (predicate) => accounts.filter(predicate).length;
  const chips = [
    { id: FILTER_ALL, label: 'Tất cả', n: accounts.length },
    { id: FILTER_FAVORITE, label: 'Yêu thích', icon: 'star', n: count((a) => a.favorite) },
    ...groups.map((group) => ({ id: group, label: group, n: count((a) => a.group === group) })),
  ].filter((chip) => chip.id === FILTER_ALL || chip.n > 0 || chip.id === active);

  container.replaceChildren(...chips.map((chip) => el('button', {
    type: 'button',
    class: `chip${chip.id === active ? ' active' : ''}`,
    'aria-pressed': String(chip.id === active),
    onclick: () => onSelect(chip.id),
  }, chip.icon ? el('span', { html: ICONS[chip.icon] }) : null, chip.label, el('span', { class: 'chip-count' }, chip.n))));
}

// Mini QRs depend only on bank + account number, so each is drawn once and the same canvas
// is reused on every re-render (search keystrokes, filter changes, background sync). A new
// canvas is only drawn when its card scrolls into view, so long lists open quickly.
const miniQrCache = new Map();
const drawWhenVisible = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
  entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
    drawWhenVisible.unobserve(entry.target);
    paintMiniQr(entry.target);
  });
}, { rootMargin: '200px' });

function paintMiniQr(canvas) {
  try {
    drawQr(canvas, buildVietQrPayload({ bin: canvas.dataset.bin, accountNumber: canvas.dataset.number }), 56);
  } catch {
    canvas.replaceWith(el('span', { class: 'text-slate-300 text-2xl', html: ICONS.qr }));
  }
}

/**
 * Left picture of a full-tab card: the official VietQR card from img.vietqr.io (faded and
 * slightly blurred until the card is hovered), or the offline mini QR when images from
 * VietQR.io are off or fail to load.
 */
const cardThumbCache = new Map(); // reused across re-renders so search does not reload images

function cardThumb(account, settings) {
  if (!allowsVietqrImages(settings)) return miniQr(account);
  const key = `${account.bin}:${account.accountNumber}:${account.accountName}`;
  if (cardThumbCache.has(key)) return cardThumbCache.get(key);
  const image = el('img', {
    class: 'card-thumb-image', alt: '', loading: 'lazy', referrerpolicy: 'no-referrer',
    src: vietqrImageUrl({ account, amount: 0, content: '' }),
  });
  image.addEventListener('error', () => {
    const fallback = miniQr(account);
    cardThumbCache.set(key, fallback);
    image.replaceWith(fallback);
  }, { once: true });
  cardThumbCache.set(key, image);
  return image;
}

/** Small offline QR (no amount/content) shown on the card; falls back to an icon. */
function miniQr(account) {
  const key = `${account.bin}:${account.accountNumber}`;
  let canvas = miniQrCache.get(key);
  if (!canvas) {
    canvas = el('canvas', { class: 'w-full h-full', width: 56, height: 56, 'data-bin': account.bin, 'data-number': account.accountNumber });
    miniQrCache.set(key, canvas);
    if (drawWhenVisible) drawWhenVisible.observe(canvas); else paintMiniQr(canvas);
  }
  return canvas;
}

function accountCard(account, handlers, settings) {
  const title = account.nickname || account.accountName || 'Chưa đặt tên';
  const subtitle = account.nickname && account.accountName ? account.accountName : '';
  const named = (action) => `${action} ${title}`;
  const actionButton = (icon, label, onclick, tone) => el('button', {
    type: 'button', class: `card-icon ${tone}`, title: label, 'aria-label': label, html: ICONS[icon], onclick,
  });

  return el('article', { class: 'account-card group', 'data-id': account.id },
    el('div', { class: 'p-4 flex gap-4 border-b border-slate-100 flex-1' },
      // Full-height column: the QR picture sits at the bottom (level with the group label), the
      // bank logo at the top (level with the bank name).
      el('div', { class: 'relative shrink-0 flex flex-col justify-end' },
        el('button', { type: 'button', class: 'card-thumb', title: named('Mở mã QR của'), 'aria-label': named('Mở mã QR của'), onclick: () => handlers.onOpenQr(account) },
          cardThumb(account, settings)),
        bankLogo(account.bin, settings, 'bank-logo card-logo-badge')),
      el('div', { class: 'flex-1 min-w-0' },
        el('div', { class: 'flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1' },
          bankLabel(account.bin),
          account.favorite ? el('span', { class: 'text-amber-400 normal-case', title: 'Yêu thích', html: ICONS.star }) : null),
        el('h3', { class: 'font-bold text-slate-900 text-lg leading-snug truncate', title }, title),
        subtitle ? el('p', { class: 'text-xs text-slate-500 uppercase truncate' }, subtitle) : null,
        el('div', { class: 'text-slate-500 font-mono text-sm mt-0.5 flex items-center gap-2' },
          el('span', {}, account.accountNumber),
          el('button', {
            type: 'button', class: 'text-slate-400 hover:text-blue-600 transition-colors',
            title: named('Sao chép số tài khoản của'), 'aria-label': named('Sao chép số tài khoản của'),
            html: ICONS.copy, onclick: () => handlers.onCopy(account),
          })),
        el('div', { class: 'flex items-center gap-2 mt-2 min-w-0' },
          el('span', { class: 'tag' }, account.group),
          account.note ? el('span', { class: 'text-xs text-slate-400 truncate' }, account.note) : null),
      ),
    ),
    el('div', { class: 'bg-slate-50 px-4 py-2.5 flex justify-between items-center' },
      el('button', {
        type: 'button', class: 'text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5',
        onclick: () => handlers.onOpenQr(account),
      }, el('span', { html: ICONS.qr }), 'Nhận tiền'),
      el('div', { class: 'flex gap-3' },
        actionButton('star', account.favorite ? named('Bỏ yêu thích') : named('Yêu thích'), () => handlers.onToggleFavorite(account), account.favorite ? 'is-fav' : 'hover:text-amber-500'),
        actionButton('edit', named('Sửa'), () => handlers.onEdit(account), 'hover:text-amber-600'),
        actionButton('trash', named('Xoá'), () => handlers.onDelete(account), 'hover:text-red-600'),
      ),
    ),
  );
}

export function renderAccountList(container, accounts, handlers, { hasAny, query, settings }) {
  if (!accounts.length) {
    const searching = hasAny;
    container.replaceChildren(el('div', { class: 'empty-state' },
      el('div', { class: 'w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 text-4xl', html: '<i class="fa-solid fa-wallet"></i>' }),
      el('h3', { class: 'text-lg font-medium text-slate-900' }, searching ? 'Không tìm thấy kết quả' : 'Chưa có tài khoản nào'),
      el('p', { class: 'text-slate-500 mt-1 mb-6' }, searching
        ? `Không có tài khoản nào phù hợp${query ? ` với “${query}”` : ' trong nhóm này'}.`
        : 'Thêm số tài khoản ngân hàng đầu tiên để tạo mã VietQR.'),
      searching ? null : el('button', { type: 'button', class: 'btn btn-primary px-6', onclick: handlers.onAdd }, 'Thêm tài khoản ngay'),
    ));
    return;
  }
  // The 420px toolbar popup gets compact rows; the full-tab view gets the large cards.
  const compact = !document.body.classList.contains('tab-view');
  container.classList.toggle('compact', compact);
  container.replaceChildren(...accounts.map((account) => (compact ? compactAccountRow(account, handlers, settings) : accountCard(account, handlers, settings))));
}
