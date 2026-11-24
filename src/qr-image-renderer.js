// Draws QR codes on canvas (via the vendored qrcode-generator in lib/qrcode.js)
// and composes the downloadable "share card" PNG.
import { bankLabel } from './bank-list.js';
import { formatVnd } from './text-utils.js';

export const QUIET_ZONE = 2; // modules of white border around the code

export function drawQr(canvas, payload, size = 240) {
  const qr = globalThis.qrcode(0, 'M');
  qr.addData(payload);
  qr.make();
  const count = qr.getModuleCount();
  const totalModules = count + QUIET_ZONE * 2;
  const scale = window.devicePixelRatio || 1;
  canvas.width = size * scale;
  canvas.height = size * scale;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawModules(ctx, qr, 0, 0, size / totalModules);
}

export function drawModules(ctx, qr, x, y, cell) {
  const count = qr.getModuleCount();
  const total = (count + QUIET_ZONE * 2) * cell;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, total, total);
  ctx.fillStyle = '#111111';
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!qr.isDark(row, col)) continue;
      // Slight overlap avoids hairline gaps between modules on fractional sizes.
      ctx.fillRect(x + (col + QUIET_ZONE) * cell, y + (row + QUIET_ZONE) * cell, cell + 0.3, cell + 0.3);
    }
  }
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

/** Returns a PNG data URL: QR plus recipient, bank, amount and content for sharing. */
export function composeShareImage({ account, payload, amount, content }) {
  const width = 640;
  const qrSize = 440;
  const font = '-apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `700 30px ${font}`;
  const nameLines = wrapLines(ctx, account.accountName || account.nickname, width - 80);
  const extraRows = (amount ? 1 : 0) + (content ? 1 : 0);
  const height = 110 + qrSize + 40 + nameLines.length * 40 + 44 + extraRows * 40 + 50;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#3b2a8f';
  ctx.fillRect(0, 0, width, 8);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3b2a8f';
  ctx.font = `800 34px ${font}`;
  ctx.fillText('VietQR', width / 2, 66);
  ctx.fillStyle = '#6b7280';
  ctx.font = `500 18px ${font}`;
  ctx.fillText('Quét mã bằng ứng dụng ngân hàng để chuyển khoản', width / 2, 96);

  const qr = globalThis.qrcode(0, 'M');
  qr.addData(payload);
  qr.make();
  const cell = qrSize / (qr.getModuleCount() + QUIET_ZONE * 2);
  drawModules(ctx, qr, (width - qrSize) / 2, 110, cell);

  let y = 110 + qrSize + 50;
  ctx.fillStyle = '#111827';
  ctx.font = `700 30px ${font}`;
  nameLines.forEach((line) => { ctx.fillText(line, width / 2, y); y += 40; });
  ctx.fillStyle = '#4b5563';
  ctx.font = `500 24px ${font}`;
  ctx.fillText(`${bankLabel(account.bin)} · ${account.accountNumber}`, width / 2, y);
  y += 44;
  if (amount) {
    ctx.fillStyle = '#3b2a8f';
    ctx.font = `800 28px ${font}`;
    ctx.fillText(`${formatVnd(amount)} đ`, width / 2, y);
    y += 40;
  }
  if (content) {
    ctx.fillStyle = '#374151';
    ctx.font = `500 22px ${font}`;
    ctx.fillText(`Nội dung: ${content}`, width / 2, y);
  }
  return canvas.toDataURL('image/png');
}

// The clipboard write starts synchronously inside the click (the blob is passed as a
// promise), so the browser does not drop the user-activation it requires.
// `dataUrl` may itself be a promise (e.g. an image still being downloaded).
export function copyImageToClipboard(dataUrl) {
  const blob = Promise.resolve(dataUrl).then((url) => {
    if (!url) throw new Error('Không có ảnh');
    return fetch(url).then((response) => response.blob());
  });
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
