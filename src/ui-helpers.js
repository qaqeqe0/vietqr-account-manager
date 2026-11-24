// Restyled replacement for the shared ui-helpers.js (same exports and behaviour):
// Font Awesome icons, Tailwind modal with blurred backdrop, and an icon toast.
// vite.config.js routes every shared module's './ui-helpers.js' import here.

import { bankLogoUrl, allowsVietqrImages, bankLabel } from '@shared/bank-list.js';

const fa = (name, style = 'solid') => `<i class="fa-${style} fa-${name}" aria-hidden="true"></i>`;

export const ICONS = {
  qr: fa('qrcode'),
  copy: fa('copy', 'regular'),
  edit: fa('pen'),
  trash: fa('trash'),
  star: fa('star'),
  plus: fa('plus'),
  search: fa('magnifying-glass'),
  settings: fa('gear'),
  expand: fa('up-right-from-square'),
  download: fa('download'),
  chevron: fa('chevron-down'),
  close: fa('xmark'),
  scan: fa('expand'),
  image: fa('image', 'regular'),
  camera: fa('camera'),
};

/** Tiny element factory: el('div', {class: 'x', onclick}, 'text', childNode) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'class') node.className = value;
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

/**
 * Small bank logo from VietQR.io (bank name as tooltip), or `fallback` when images from
 * VietQR.io are turned off; a logo that fails to load (offline, unknown bank) is replaced
 * by `fallback` too, or simply removed when there is none.
 */
export function bankLogo(bin, settings, className = 'bank-logo', fallback = null) {
  const src = allowsVietqrImages(settings) ? bankLogoUrl(bin) : '';
  if (!src) return fallback;
  const name = bankLabel(bin);
  return el('img', {
    class: className, src, alt: name, title: name, loading: 'lazy', referrerpolicy: 'no-referrer',
    onerror: (e) => (fallback ? e.target.replaceWith(fallback) : e.target.remove()),
  });
}

export function iconButton(icon, title, onclick, extraClass = '') {
  return el('button', { type: 'button', class: `icon-btn ${extraClass}`, title, 'aria-label': title, html: ICONS[icon], onclick });
}

/**
 * Opens a modal dialog. `content` and `footer` are nodes. Returns { close, root }.
 * Esc (top-most dialog only) and backdrop click close it; onClose runs once.
 */
export function openModal({ title, content, footer, onClose, wide = false, variant = '' }) {
  const host = document.getElementById('modalRoot');
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    onClose?.();
  };
  const onKey = (event) => {
    if (event.key !== 'Escape') return;
    if (host.lastElementChild !== backdrop) return; // only the top-most dialog closes (e.g. camera over form)
    event.preventDefault();
    close();
  };
  const dialog = el('div', { class: `modal${wide ? ' modal-wide' : ''}${variant ? ` modal-${variant}` : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    el('div', { class: 'modal-head' }, el('h2', {}, title), iconButton('close', 'Đóng', () => close(), 'modal-x')),
    el('div', { class: 'modal-body' }, content),
    footer ? el('div', { class: 'modal-foot' }, footer) : null,
  );
  const backdrop = el('div', { class: 'backdrop', onmousedown: (e) => { if (e.target === backdrop) close(); } }, dialog);
  host.append(backdrop);
  document.addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => (dialog.querySelector('[autofocus]') || dialog.querySelector('input, select, textarea'))?.focus());
  return { close, root: dialog };
}

export function confirmDialog(message, confirmLabel = 'Xoá') {
  return new Promise((resolve) => {
    let answered = false;
    const done = (value) => { answered = true; modal.close(); resolve(value); };
    const modal = openModal({
      title: 'Xác nhận',
      content: el('p', { class: 'confirm-text' }, message),
      footer: [
        el('button', { type: 'button', class: 'btn btn-ghost', onclick: () => done(false) }, 'Huỷ'),
        el('button', { type: 'button', class: 'btn btn-danger', onclick: () => done(true) }, el('span', { html: ICONS.trash }), confirmLabel),
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

const TOAST_ICONS = {
  ok: '<i class="fa-solid fa-circle-check text-green-400"></i>',
  err: '<i class="fa-solid fa-circle-exclamation text-red-400"></i>',
  info: '<i class="fa-solid fa-circle-info text-blue-400"></i>',
};

let toastTimer;
export function toast(message, type = 'ok') {
  const node = document.getElementById('toast');
  node.replaceChildren(el('span', { html: TOAST_ICONS[type] || TOAST_ICONS.info }), el('span', { class: 'toast-text' }, message));
  node.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.className = 'toast'; }, 2400);
}
