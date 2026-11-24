// First-run hints under the "no accounts yet" message, shared by both list views:
// how to add an account from a QR code, and (until it is set) a prompt to enter the
// sender name that fills the default transfer content.
import { el } from './ui-helpers.js';

/**
 * @param {object} settings
 * @param {{onOpenSettings?: () => void}} handlers
 * @returns {HTMLElement}
 */
export function firstRunHints(settings, handlers) {
  const nameHint = !settings?.myName && handlers.onOpenSettings
    ? el('li', { class: 'empty-hint' },
      'Nhập tên của bạn để nội dung chuyển khoản tự điền “TÊN BẠN chuyen tien”. ',
      el('button', { type: 'button', class: 'link-btn', onclick: () => handlers.onOpenSettings() }, 'Mở Cài đặt'))
    : null;
  return el('ul', { class: 'empty-hints' },
    el('li', { class: 'empty-hint' },
      'Có sẵn mã QR? Dán (⌘/Ctrl + V) hoặc kéo thả ảnh mã QR vào form thêm tài khoản, hoặc bấm chuột phải trên trang web → “Quét mã VietQR trên trang này”.'),
    nameHint);
}
