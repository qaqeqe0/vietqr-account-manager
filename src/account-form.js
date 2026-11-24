// Add / edit account dialog: scan a VietQR (page, image, camera, paste/drop), a "paste to
// auto-fill" text box, and the account fields. Field widgets live in account-form-fields.js,
// scan messages and image paste/drop in account-form-scan.js.
import { createScanStrip } from './qr-scan-strip.js';
import { parsePastedAccount } from './paste-account-parser.js';
import { normalizeAccountName, parseAmount, formatVnd, createId } from './text-utils.js';
import { el, openModal, toast } from './ui-helpers.js';
import { field, createBankPicker, createGroupPicker, createHolderNameField } from './account-form-fields.js';
import { scanResultMessage, duplicateMessage, acceptImagePasteAndDrop } from './account-form-scan.js';

/**
 * @param {object|null} account  existing account to edit, or null to add
 * @param {{groups: string[], accounts: object[], defaultGroup?: string, onSave: (account) => void,
 *          isPopup?: boolean, onOpenTab?: (hash: string) => void, onOpenExisting?: (account) => void,
 *          autoScan?: 'file'|'camera', initialImage?: Blob, initialImages?: Blob[]}} options
 */
export function openAccountForm(account, {
  groups, accounts, defaultGroup, onSave, isPopup = false, onOpenTab, onOpenExisting, autoScan, initialImage, initialImages,
}) {
  const editing = !!account;
  const data = account || { bin: '', accountNumber: '', accountName: '', nickname: '', group: defaultGroup || groups[0], note: '', favorite: false, defaultAmount: 0, defaultContent: '' };

  const bank = createBankPicker(data.bin);
  const numberInput = el('input', { class: 'field-input mono', required: true, inputmode: 'numeric', placeholder: 'VD: 0123456789', value: data.accountNumber });
  numberInput.addEventListener('input', () => { numberInput.value = numberInput.value.replace(/[^A-Za-z0-9]/g, ''); });
  const holder = createHolderNameField({ value: data.accountName, getBin: bank.value, getAccountNumber: () => numberInput.value.trim() });
  const nicknameInput = el('input', { class: 'field-input', placeholder: 'VD: Anh Tuấn (shop vải)', value: data.nickname });
  const group = createGroupPicker(groups, data.group);
  const noteInput = el('input', { class: 'field-input', placeholder: 'Ghi chú: công nợ, địa chỉ, SĐT…', value: data.note });
  const amountInput = el('input', { class: 'field-input', inputmode: 'decimal', placeholder: 'VD: 500k, 1,5tr', value: data.defaultAmount ? formatVnd(data.defaultAmount) : '' });
  const contentInput = el('input', { class: 'field-input', placeholder: 'VD: {toi} chuyển tiền hàng', value: data.defaultContent });
  const favoriteInput = el('input', { type: 'checkbox', checked: data.favorite });

  const pasteBox = el('textarea', { class: 'field-input paste-box', rows: '2', placeholder: 'Dán thông tin tài khoản (VD: “Vietcombank 0123456789 NGUYEN VAN A”) để tự điền' });
  pasteBox.addEventListener('input', () => {
    const parsed = parsePastedAccount(pasteBox.value);
    if (parsed.bin) bank.setBin(parsed.bin);
    if (parsed.accountNumber) numberInput.value = parsed.accountNumber;
    if (parsed.accountName) holder.input.value = parsed.accountName;
  });

  const moreOptions = el('details', { class: 'more-options', open: !!(data.defaultAmount || data.defaultContent) },
    el('summary', {}, 'Mặc định khi mở mã QR'),
    el('div', { class: 'form-grid' },
      field('Số tiền mặc định', amountInput),
      field('Nội dung mặc định', contentInput, 'Có thể dùng {toi}, {nguoinhan}, {thang}, {ngay}'),
    ));

  // Fills the form from a scanned VietQR, or points to the existing entry for that account.
  function applyScan(result) {
    const existing = accounts.find((a) => a.bin === result.bin && a.accountNumber === result.accountNumber && a.id !== data.id);
    if (existing) {
      scan.setStatus(duplicateMessage(result, existing), 'err');
      if (onOpenExisting) {
        scan.node.querySelector('.scan-status').append(' ', el('button', {
          type: 'button', class: 'link-btn', onclick: () => { modal.close(); onOpenExisting(existing); },
        }, 'Mở mã QR của tài khoản này'));
      }
      return;
    }
    bank.setBin(result.bin);
    numberInput.value = result.accountNumber;
    if (result.accountName) holder.input.value = result.accountName;
    if (result.amount) amountInput.value = formatVnd(result.amount);
    if (result.content) contentInput.value = result.content;
    if (result.amount || result.content) moreOptions.open = true;
    const message = scanResultMessage(result);
    scan.setStatus(message.text, message.type);
    (result.accountName ? nicknameInput : holder.input).focus();
  }
  const scan = createScanStrip({ isPopup, onResult: applyScan, onOpenTab: (hash) => onOpenTab?.(hash) });

  const form = el('form', { class: 'account-form', novalidate: true },
    editing ? null : scan.node,
    editing ? null : pasteBox,
    el('div', { class: 'form-grid' },
      field('Ngân hàng *', bank.node),
      field('Số tài khoản *', numberInput),
      field('Tên chủ tài khoản', holder.node, 'Tự chuyển sang chữ in hoa không dấu'),
      field('Tên gợi nhớ', nicknameInput),
      field('Nhóm', group.node),
      field('Ghi chú', noteInput),
    ),
    moreOptions,
    el('label', { class: 'check-row' }, favoriteInput, ' Đánh dấu yêu thích (luôn hiện đầu danh sách)'),
  );

  function submit(event) {
    event?.preventDefault();
    const bin = bank.value();
    const accountNumber = numberInput.value.trim();
    if (!bin) { toast('Chọn ngân hàng', 'err'); bank.select.focus(); return; }
    if (!/^[A-Za-z0-9]{6,19}$/.test(accountNumber)) { toast('Số tài khoản gồm 6–19 chữ số', 'err'); numberInput.focus(); return; }
    const groupName = group.value();
    if (!groupName) { toast('Nhập tên nhóm mới', 'err'); group.newInput.focus(); return; }
    const duplicate = accounts.find((a) => a.bin === bin && a.accountNumber === accountNumber && a.id !== data.id);
    if (duplicate) { toast(`Đã có tài khoản này: ${duplicate.nickname || duplicate.accountName}`, 'err'); return; }

    onSave({
      ...data,
      id: data.id || createId(),
      bin,
      accountNumber,
      accountName: normalizeAccountName(holder.input.value),
      nickname: nicknameInput.value.trim(),
      group: groupName,
      note: noteInput.value.trim(),
      favorite: favoriteInput.checked,
      defaultAmount: parseAmount(amountInput.value),
      defaultContent: contentInput.value.trim(),
      amountHistory: data.amountHistory || [],
      contentHistory: data.contentHistory || [],
      useCount: data.useCount || 0,
      lastUsedAt: data.lastUsedAt || 0,
      createdAt: data.createdAt || Date.now(),
    });
    modal.close();
  }
  form.addEventListener('submit', submit);
  // The save button lives in the dialog footer, outside the form, so the browser never
  // submits on Enter by itself. Enter in a single-line field saves the form.
  form.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    const target = event.target;
    if (target.tagName !== 'INPUT' || ['checkbox', 'button', 'file'].includes(target.type)) return;
    event.preventDefault();
    if (target === bank.search) { numberInput.focus(); return; } // Enter confirms the bank match
    submit();
  });
  if (!editing) acceptImagePasteAndDrop(form, (image) => scan.scanBlob(image));

  // openModal focuses the [autofocus] element one frame later; a direct focus() here
  // would be overridden by it.
  (editing ? numberInput : pasteBox).setAttribute('autofocus', '');
  const modal = openModal({
    title: editing ? 'Sửa tài khoản' : 'Thêm tài khoản',
    content: form,
    footer: [
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: () => modal.close() }, 'Huỷ'),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: submit }, editing ? 'Lưu thay đổi' : 'Thêm tài khoản'),
    ],
  });
  if (initialImage) scan.scanBlob(initialImage);
  if (initialImages?.length) scan.scanBlobs(initialImages);
  if (autoScan === 'camera') scan.startCamera();
  if (autoScan === 'file') scan.setStatus('Bấm “Chọn ảnh” để chọn ảnh có mã QR.');
}
