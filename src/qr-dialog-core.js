// Shared behaviour of both QR dialog layouts (classic and "thẻ VietQR"): amount and
// content inputs with hints and quick chips, the payload built from them, and the copy /
// download actions. Each layout supplies how to show the QR and how to make the share image.
import { bankLabel } from './bank-list.js';
import { buildVietQrPayload } from './vietqr-payload.js';
import { copyImageToClipboard } from './qr-image-renderer.js';
import {
  suggestAmounts, amountLabel, shortAmount, suggestContents, fillTemplate, defaultTransferContent,
} from './suggestion-engine.js';
import {
  parseAmount, formatVnd, sanitizeTransferContent, copyText, debounce, CONTENT_SOFT_LIMIT, CONTENT_HARD_LIMIT,
} from './text-utils.js';
import { el, toast } from './ui-helpers.js';

/**
 * @param {object} account
 * @param {object} settings
 * @param {{onUsed: (usage) => void,
 *          render: (state: {payload?: string, error?: Error, amount: number, content: string}) => void,
 *          composeImage: (state: {payload: string, amount: number, content: string}) => string|Promise<string>}} options
 */
export function createQrDialogCore(account, settings, { onUsed, render, composeImage }) {
  const amountInput = el('input', {
    type: 'text', inputmode: 'decimal', class: 'field-input', placeholder: 'Số tiền (tuỳ chọn)',
    value: account.defaultAmount ? formatVnd(account.defaultAmount) : '',
  });
  const amountHint = el('p', { class: 'field-hint' });
  const amountChips = el('div', { class: 'quick-chips' });
  const contentInput = el('input', {
    type: 'text', class: 'field-input', placeholder: 'Nội dung chuyển khoản (tuỳ chọn)', maxlength: String(CONTENT_HARD_LIMIT + 20),
    value: account.defaultContent
      ? fillTemplate(account.defaultContent, { myName: settings.myName, recipient: account.nickname || account.accountName })
      : defaultTransferContent(settings),
  });
  const contentHint = el('p', { class: 'field-hint' });
  const contentChips = el('div', { class: 'quick-chips' });

  const currentAmount = () => parseAmount(amountInput.value);
  const currentContent = () => sanitizeTransferContent(contentInput.value);
  // Built from the current fields every time it is needed, so a downloaded or copied image
  // always matches what is typed, even within the preview's debounce delay.
  const buildPayload = () => buildVietQrPayload({
    bin: account.bin, accountNumber: account.accountNumber, amount: currentAmount(), content: currentContent(),
  });

  function renderNow() {
    const amount = currentAmount();
    const content = currentContent();
    try {
      render({ payload: buildPayload(), amount, content });
    } catch (error) {
      render({ error, amount, content });
    }
  }
  const renderSoon = debounce(renderNow, 150);

  function updateHints() {
    const amount = currentAmount();
    const typed = amountInput.value.trim();
    amountHint.textContent = !typed ? 'Để trống: người chuyển tự nhập số tiền'
      : amount ? `= ${amountLabel(amount)}` : 'Số tiền không hợp lệ';
    amountHint.classList.toggle('warn', !!typed && !amount);

    const clean = currentContent();
    const parts = [];
    if (clean && clean !== contentInput.value.trim()) parts.push(`Trong QR: “${clean}”`);
    if (clean) parts.push(`${clean.length}/${CONTENT_SOFT_LIMIT} ký tự`);
    if (clean.length > CONTENT_SOFT_LIMIT) parts.push('một số ngân hàng có thể cắt bớt');
    contentHint.textContent = parts.join(' · ')
      || (settings.myName ? 'Không dấu, không ký tự đặc biệt.' : 'Nhập tên chủ tài khoản của bạn trong Cài đặt để tự điền “TÊN BẠN chuyen tien”.');
    contentHint.classList.toggle('warn', clean.length > CONTENT_SOFT_LIMIT);
  }

  function renderChips() {
    amountChips.replaceChildren(...suggestAmounts('', account.amountHistory, 6).map((value) => el('button', {
      type: 'button', class: `qchip${value === currentAmount() ? ' on' : ''}`,
      onclick: () => { amountInput.value = formatVnd(value); onChange(); },
    }, shortAmount(value))));
    contentChips.replaceChildren(...suggestContents('', { account, settings }, 4).map((item) => el('button', {
      type: 'button', class: 'qchip', title: item.source,
      onclick: () => { contentInput.value = item.text; onChange(); },
    }, item.text)));
  }

  function onChange() {
    updateHints();
    renderChips();
    renderSoon();
  }
  amountInput.addEventListener('input', onChange);
  amountInput.addEventListener('blur', () => {
    const amount = currentAmount();
    if (amount) amountInput.value = formatVnd(amount);
    updateHints();
  });
  contentInput.addEventListener('input', onChange);

  const recordUse = () => onUsed({ amount: currentAmount(), content: contentInput.value.trim() });
  const infoText = () => [
    `Ngân hàng: ${bankLabel(account.bin)}`,
    `Số tài khoản: ${account.accountNumber}`,
    `Chủ tài khoản: ${account.accountName}`,
    currentAmount() ? `Số tiền: ${amountLabel(currentAmount())}` : '',
    currentContent() ? `Nội dung: ${currentContent()}` : '',
  ].filter(Boolean).join('\n');
  /** PNG data URL of the share image; null (with a message) when the QR cannot be built. */
  const shareImage = async () => {
    try {
      return await composeImage({ payload: buildPayload(), amount: currentAmount(), content: currentContent() });
    } catch (error) {
      toast(error.message, 'err');
      return null;
    }
  };

  const actions = {
    copyNumber: async () => { await copyText(account.accountNumber); toast('Đã sao chép số tài khoản'); },
    copyInfo: async () => { await copyText(infoText()); recordUse(); toast('Đã sao chép thông tin chuyển khoản'); },
    copyImage: async () => {
      // Started synchronously with the image still pending, to keep the click's activation.
      try { await copyImageToClipboard(shareImage()); recordUse(); toast('Đã sao chép ảnh QR'); } catch { toast('Không sao chép được ảnh', 'err'); }
    },
    download: async () => {
      const image = await shareImage();
      if (!image) return;
      const link = el('a', { href: image, download: `VietQR-${bankLabel(account.bin)}-${account.accountNumber}.png` });
      document.body.append(link);
      link.click();
      link.remove();
      recordUse();
      toast('Đã tải ảnh QR');
    },
  };

  /** Call once the dialog is in the document: fills hints and chips and draws the QR. */
  function start() {
    updateHints();
    renderChips();
    renderNow();
  }

  return { amountInput, amountHint, amountChips, contentInput, contentHint, contentChips, actions, start };
}
