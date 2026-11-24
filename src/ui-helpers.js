// Shared UI building blocks: inline SVG icons, element factory, modal dialog and toast.
import { bankLogoUrl, allowsVietqrImages, bankLabel } from './bank-list.js';

const svg = (path) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const ICONS = {
  qr: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  star: svg('<path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  expand: svg('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  chevron: svg('<path d="m6 9 6 6 6-6"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  scan: svg('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
  camera: svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>'),
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
 * Esc and backdrop click close it; onClose runs once.
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
    if (event.target?.getAttribute?.('aria-expanded') === 'true') return; // Esc closes an open dropdown first
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
        el('button', { type: 'button', class: 'btn btn-danger', onclick: () => done(true) }, confirmLabel),
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

let toastTimer;
export function toast(message, type = 'ok') {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.className = 'toast'; }, 1800);
}
