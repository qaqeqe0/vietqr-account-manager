// The "thẻ VietQR" picture used by the card-style QR dialog and its download.
// Two sources:
//  - VietQR.io Quick Link (img.vietqr.io, "print" template): the official card with the
//    VietQR / napas 247 / bank logos; needs internet and sends the account number, holder
//    name, amount and content to VietQR.io;
//  - an offline card drawn here, with text in place of the logos (fallback, or by choice).
import { findBankByBin, bankLabel } from './bank-list.js';
import { drawModules, QUIET_ZONE } from './qr-image-renderer.js';
import { formatVnd } from './text-utils.js';

export const VIETQR_IMAGE_ORIGINS = ['https://img.vietqr.io/*'];

/** Quick Link URL of the official printable card. */
export function vietqrImageUrl({ account, amount, content }) {
  const url = new URL(`https://img.vietqr.io/image/${account.bin}-${encodeURIComponent(account.accountNumber)}-print.png`);
  if (amount) url.searchParams.set('amount', String(amount));
  if (content) url.searchParams.set('addInfo', content);
  if (account.accountName) url.searchParams.set('accountName', account.accountName);
  return url.href;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không đọc được ảnh từ VietQR.io'));
    reader.readAsDataURL(blob);
  });
}

/** Draws any image blob (SVG included) onto a canvas and returns a real PNG data URL. */
async function rasterizeToPng(blob, scale = 2) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((image.naturalWidth || 600) * scale);
    canvas.height = Math.round((image.naturalHeight || 776) * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Style of the "Số TK" line in VietQR.io's print template, applied to "Số tiền" too.
const EMPHASIS_FILL = '#144583';

/** Makes the "Số tiền: …" line of a VietQR.io SVG card bold, like the "Số TK" line. */
export function emphasizeAmountLine(svgText) {
  return svgText.replace(/<text([^>]*)>(\s*Số tiền:)/, (match, attrs, label) => {
    const rest = attrs.replace(/\sfill="[^"]*"/, '').replace(/\sfont-weight="[^"]*"/, '');
    return `<text${rest} fill="${EMPHASIS_FILL}" font-weight="bold">${label}`;
  });
}

/**
 * The official card as an image Blob. img.vietqr.io allows cross-origin reads
 * (Access-Control-Allow-Origin: *), so no extra permission is needed. Its "...-print.png"
 * link redirects to an SVG document (fetched directly), whose amount line is made bold here.
 */
export async function fetchVietqrCardBlob(state) {
  // Ask for the .svg directly: the .png link answers with a redirect that carries no CORS
  // header, so a page or extension without host access cannot follow it.
  const url = vietqrImageUrl(state).replace('-print.png', '-print.svg');
  const response = await fetch(url, { cache: 'no-store' });
  const blob = response.ok ? await response.blob() : null;
  if (!blob || !blob.type.startsWith('image/')) throw new Error('VietQR.io không trả về ảnh');
  if (!blob.type.startsWith('image/svg')) return blob;
  return new Blob([emphasizeAmountLine(await blob.text())], { type: 'image/svg+xml' });
}

/**
 * The official card as a PNG data URL for download / copy. The SVG is redrawn as a real
 * PNG: saved as-is it would be an SVG named .png, which image viewers refuse to open.
 */
export async function fetchVietqrImage(state) {
  const blob = await fetchVietqrCardBlob(state);
  return blob.type === 'image/png' ? blobToDataUrl(blob) : rasterizeToPng(blob);
}

const FONT = '-apple-system, "Segoe UI", Roboto, Arial, sans-serif';

/** Offline card: "VietQR" wordmark, QR, "NAPAS 247 | bank", holder, number, bank name. */
export function composePrintCard({ account, payload, amount, content }) {
  const width = 600;
  const qrSize = 360;
  const bank = findBankByBin(account.bin);
  const lines = [
    { text: `Tên chủ TK: ${account.accountName || account.nickname || ''}`, font: `500 19px ${FONT}` },
    { text: `Số TK: ${account.accountNumber}`, font: `700 20px ${FONT}` },
    { text: bank?.name || bankLabel(account.bin), font: `400 17px ${FONT}` },
    amount ? { text: `Số tiền: ${formatVnd(amount)} đ`, font: `700 20px ${FONT}` } : null, // same style as "Số TK"
    content ? { text: `Nội dung: ${content}`, font: `500 17px ${FONT}` } : null,
  ].filter(Boolean);
  const height = 110 + qrSize + 70 + lines.length * 30 + 30;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Wordmark as plain text (no logo artwork): "Viet" red, "QR" blue.
  ctx.font = `800 48px ${FONT}`;
  const viet = ctx.measureText('Viet').width;
  const qr = ctx.measureText('QR').width;
  const startX = (width - viet - qr) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#da251c';
  ctx.fillText('Viet', startX, 78);
  ctx.fillStyle = '#0f4c9c';
  ctx.fillText('QR', startX + viet, 78);
  ctx.textAlign = 'center';

  const qrX = (width - qrSize) / 2;
  const qrY = 100;
  ctx.strokeStyle = '#0f4c9c';
  ctx.lineWidth = 3;
  ctx.strokeRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
  const code = globalThis.qrcode(0, 'M');
  code.addData(payload);
  code.make();
  drawModules(ctx, code, qrX, qrY, qrSize / (code.getModuleCount() + QUIET_ZONE * 2));

  let y = qrY + qrSize + 50;
  ctx.font = `italic 800 22px ${FONT}`;
  ctx.fillStyle = '#0f4c9c';
  const napas = 'napas 247';
  const bankShort = bankLabel(account.bin);
  const napasWidth = ctx.measureText(napas).width;
  ctx.font = `800 22px ${FONT}`;
  const bankWidth = ctx.measureText(bankShort).width;
  const rowStart = (width - napasWidth - bankWidth - 36) / 2;
  ctx.textAlign = 'left';
  ctx.font = `italic 800 22px ${FONT}`;
  ctx.fillText(napas, rowStart, y);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(rowStart + napasWidth + 17, y - 20, 2, 26);
  ctx.fillStyle = '#0f4c9c';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText(bankShort, rowStart + napasWidth + 36, y);
  ctx.textAlign = 'center';

  y += 40;
  lines.forEach((line) => {
    ctx.font = line.font;
    ctx.fillStyle = line.color || '#1e3a8a';
    ctx.fillText(line.text, width / 2, y, width - 40);
    y += 30;
  });
  return canvas.toDataURL('image/png');
}

