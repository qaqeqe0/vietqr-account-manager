// Scan-related helpers of the add-account dialog: the status sentence shown after a QR
// is read, and paste / drag-and-drop of QR images onto the form.
import { bankLabel } from './bank-list.js';
import { imageFromDataTransfer } from './qr-scan-sources.js';

const NAME_SOURCE_HINTS = {
  qr: ' Tên lấy từ mã QR.',
  ocr: ' Tên đọc từ chữ trên ảnh, hãy kiểm tra lại.',
  api: ' Tên tra từ VietQR.io.',
};

/** @returns {{text: string, type: 'ok'|'err'}} message for a successfully read VietQR */
export function scanResultMessage(result) {
  const label = `${bankLabel(result.bin)} · ${result.accountNumber}`;
  const warn = result.crcOk ? '' : ' Mã kiểm tra (CRC) không khớp, hãy đối chiếu lại số tài khoản.';
  const nameHint = NAME_SOURCE_HINTS[result.nameSource]
    || ` Không tìm được tên chủ tài khoản, hãy nhập tên.${result.nameNote ? ` (${result.nameNote})` : ''}`;
  return { text: `Đã đọc mã QR: ${label}.${nameHint}${warn}`, type: result.crcOk ? 'ok' : 'err' };
}

export function duplicateMessage(result, existing) {
  return `Tài khoản ${bankLabel(result.bin)} · ${result.accountNumber} đã có trong sổ: ${existing.nickname || existing.accountName}.`;
}

/** Calls onImage(file) for an image pasted or dropped on `form`; plain text paste is untouched. */
export function acceptImagePasteAndDrop(form, onImage) {
  form.addEventListener('paste', (event) => {
    const image = imageFromDataTransfer(event.clipboardData);
    if (!image) return;
    event.preventDefault();
    onImage(image);
  });
  form.addEventListener('dragover', (event) => { event.preventDefault(); form.classList.add('drop-target'); });
  form.addEventListener('dragleave', (event) => { if (!form.contains(event.relatedTarget)) form.classList.remove('drop-target'); });
  form.addEventListener('drop', (event) => {
    form.classList.remove('drop-target');
    const image = imageFromDataTransfer(event.dataTransfer);
    if (!image) return;
    event.preventDefault();
    onImage(image);
  });
}
