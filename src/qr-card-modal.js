// "Thẻ VietQR" layout of the QR dialog: bank name and holder as the header, the printable
// VietQR card (official image from img.vietqr.io when enabled, else drawn offline), a grey
// panel with the account number (copy), amount and transfer content, and one big
// "Tải mã QR" button. Inputs and actions come from qr-dialog-core.js.
import { bankLabel } from './bank-list.js';
import { createQrDialogCore } from './qr-dialog-core.js';
import { composePrintCard, vietqrImageUrl, fetchVietqrImage, fetchVietqrCardBlob } from './qr-print-card.js';
import { el, ICONS, openModal } from './ui-helpers.js';

export function openQrCardModal(account, settings, onUsed) {
  const useVietqrImage = settings.qrImageSource === 'vietqr';
  const image = el('img', { class: 'qrc-image', alt: `Mã VietQR ${bankLabel(account.bin)} ${account.accountNumber}` });
  const loader = el('div', { class: 'qrc-loader', html: '<span class="qrc-spinner"></span>' });
  const note = el('p', { class: 'qrc-note', hidden: true });
  let localCard = '';
  let objectUrl = '';
  let renderToken = 0; // ignores answers to older requests when typing quickly
  const setObjectUrl = (url) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = url;
  };

  const showLocal = (reason) => {
    image.onerror = null;
    image.src = localCard;
    loader.hidden = true;
    note.hidden = !reason;
    note.textContent = reason || '';
  };

  const core = createQrDialogCore(account, settings, {
    onUsed,
    render: ({ payload, error, amount, content }) => {
      if (error) {
        loader.hidden = true;
        note.hidden = false;
        note.textContent = error.message;
        image.removeAttribute('src');
        return;
      }
      localCard = composePrintCard({ account, payload, amount, content });
      if (!useVietqrImage) { showLocal(''); return; }
      loader.hidden = false;
      note.hidden = true;
      image.onload = () => { loader.hidden = true; };
      image.onerror = () => showLocal('Không tải được thẻ từ VietQR.io, đang dùng thẻ tạo trên máy.');
      // Show the card with its amount line made bold; if it cannot be read, show it as is.
      const token = ++renderToken;
      fetchVietqrCardBlob({ account, amount, content })
        .then((blob) => {
          if (token !== renderToken) return;
          setObjectUrl(URL.createObjectURL(blob));
          image.src = objectUrl;
        })
        .catch(() => {
          if (token === renderToken) image.src = vietqrImageUrl({ account, amount, content });
        });
    },
    // The download is the card shown; the official image falls back to the offline card.
    composeImage: async ({ payload, amount, content }) => {
      const offline = () => composePrintCard({ account, payload, amount, content });
      if (!useVietqrImage) return offline();
      try {
        return await fetchVietqrImage({ account, amount, content });
      } catch {
        return offline();
      }
    },
  });
  const { actions } = core;

  const label = (text) => el('div', { class: 'qrc-label' }, text);
  const content = el('div', { class: 'qrc-sheet' },
    el('div', { class: 'qrc-head' },
      el('div', { class: 'qrc-bank' }, bankLabel(account.bin)),
      el('div', { class: 'qrc-holder' }, account.accountName || account.nickname)),
    el('div', { class: 'qrc-card' }, image, loader),
    note,
    el('div', { class: 'qrc-panel' },
      el('div', { class: 'qrc-row' },
        el('span', { class: 'qrc-label' }, 'Số tài khoản:'),
        el('span', { class: 'qrc-number' }, account.accountNumber,
          el('button', { type: 'button', class: 'qrc-copy', title: 'Sao chép số tài khoản', 'aria-label': 'Sao chép số tài khoản', html: ICONS.copy, onclick: actions.copyNumber }))),
      label('Số tiền (tuỳ chọn):'),
      el('div', { class: 'amount-wrap' }, core.amountInput, el('span', { class: 'suffix' }, 'đ')),
      core.amountHint, core.amountChips,
      label('Soạn tin nhắn (tuỳ chọn):'),
      core.contentInput, core.contentHint, core.contentChips),
  );
  const footer = [
    el('button', { type: 'button', class: 'btn btn-primary qrc-download', autofocus: true, onclick: actions.download },
      el('span', { html: ICONS.download }), 'Tải mã QR'),
    el('div', { class: 'qrc-secondary' },
      el('button', { type: 'button', class: 'link-btn', onclick: actions.copyInfo }, 'Sao chép thông tin'),
      el('button', { type: 'button', class: 'link-btn', onclick: actions.copyImage }, 'Sao chép ảnh')),
  ];
  const modal = openModal({
    title: `Mã VietQR · ${bankLabel(account.bin)}`, content, footer, variant: 'qrc',
    onClose: () => { renderToken += 1; setObjectUrl(''); },
  });
  core.start();
  return modal;
}
