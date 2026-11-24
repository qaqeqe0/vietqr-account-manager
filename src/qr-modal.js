// The "Mã VietQR" dialog. Two layouts chosen in Settings: classic (QR, amount and content
// fields with quick chips, footer actions) and "thẻ VietQR" (qr-card-modal.js). Both share
// their inputs and actions through qr-dialog-core.js.
import { bankLabel } from './bank-list.js';
import { drawQr, composeShareImage } from './qr-image-renderer.js';
import { createQrDialogCore } from './qr-dialog-core.js';
import { openQrCardModal } from './qr-card-modal.js';
import { el, ICONS, openModal } from './ui-helpers.js';

/**
 * @param {object} account
 * @param {object} settings
 * @param {(usage: {amount: number, content: string}) => void} onUsed  called after copy/download
 */
export function openQrModal(account, settings, onUsed) {
  // The VietQR card is the default; only an explicit 'classic' choice shows the classic layout.
  if (settings.qrLayout !== 'classic') return openQrCardModal(account, settings, onUsed);

  const canvas = el('canvas', { class: 'qr-canvas', width: 240, height: 240 });
  const qrError = el('p', { class: 'qr-error', hidden: true });
  const core = createQrDialogCore(account, settings, {
    onUsed,
    render: ({ payload, error }) => {
      qrError.hidden = !error;
      canvas.hidden = !!error;
      if (error) qrError.textContent = error.message;
      else drawQr(canvas, payload, 200);
    },
    composeImage: ({ payload, amount, content }) => composeShareImage({ account, payload, amount, content }),
  });
  const { actions } = core;

  const title = `Mã VietQR · ${bankLabel(account.bin)} · ${account.nickname || account.accountName}`;
  const content = el('div', { class: 'qr-sheet' },
    el('div', { class: 'qr-box' }, canvas, qrError),
    el('div', { class: 'qr-owner' }, account.accountName || account.nickname),
    el('div', { class: 'qr-bankline' }, `${bankLabel(account.bin)} · `, el('span', { class: 'mono' }, account.accountNumber),
      el('button', { type: 'button', class: 'mini-copy', title: 'Sao chép số tài khoản', html: ICONS.copy, onclick: actions.copyNumber })),
    el('div', { class: 'field' },
      el('div', { class: 'amount-wrap' }, core.amountInput, el('span', { class: 'suffix' }, 'đ')),
      core.amountHint, core.amountChips),
    el('div', { class: 'field' },
      core.contentInput,
      core.contentHint, core.contentChips),
  );
  const footer = [
    el('div', { class: 'foot-left' },
      el('button', { type: 'button', class: 'btn btn-ghost', title: 'Sao chép số TK, chủ TK, số tiền, nội dung', onclick: actions.copyInfo }, el('span', { html: ICONS.copy }), 'Thông tin'),
      el('button', { type: 'button', class: 'btn btn-ghost', title: 'Sao chép ảnh QR để dán vào chat', onclick: actions.copyImage }, el('span', { html: ICONS.qr }), 'Ảnh'),
    ),
    el('div', { class: 'foot-right' },
      el('button', { type: 'button', class: 'btn btn-text', autofocus: true, onclick: actions.download }, el('span', { html: ICONS.download }), 'Tải ảnh QR'),
      el('button', { type: 'button', class: 'btn btn-text', onclick: () => modal.close() }, 'Đóng'),
    ),
  ];
  const modal = openModal({ title, content, footer });
  core.start();
  return modal;
}
