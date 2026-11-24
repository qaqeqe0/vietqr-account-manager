// Reads the account holder name printed next to a QR code (bank apps print it under
// or above the code) with Tesseract.js running locally: lib/tesseract holds the
// script, worker, non-SIMD LSTM core and the Vietnamese model. Nothing leaves the device.
import { normalizeAccountName, normalizeSearch } from './text-utils.js';
import { BANKS } from './bank-list.js';

let workerPromise = null;

function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Không tải được bộ đọc chữ'));
    document.head.append(script);
  });
}

function getWorker() {
  workerPromise ??= (async () => {
    if (!globalThis.Tesseract) await loadScript('lib/tesseract/tesseract.min.js');
    return globalThis.Tesseract.createWorker('vie', 1, {
      workerPath: assetUrl('lib/tesseract/worker.min.js'),
      corePath: assetUrl('lib/tesseract/core/tesseract-core-lstm.wasm.js'),
      langPath: assetUrl('lib/tesseract/lang'),
      workerBlobURL: false,
      cacheMethod: 'none',
      gzip: true,
    });
  })().catch((error) => { workerPromise = null; throw error; });
  return workerPromise;
}

// Words that appear around QR codes but are never part of a holder's name.
const NOISE = /\b(vietqr|napas|qr|quet ma|scan|ma qr|ngan hang|bank|chuyen khoan|so tai khoan|stk|so tien|noi dung|tai anh|chia se|luu anh|thanh toan|tai khoan|account|transfer)\b/;
const BANK_WORDS = new Set(BANKS.flatMap((b) => [normalizeSearch(b.short), b.code.toLowerCase()]));

function cleanLine(line) {
  // Drop a leading label such as "Chủ tài khoản:" / "Tên:" and stray symbols.
  return line.replace(/^[^:]{0,20}:\s*/, '').replace(/[|_~•·*"“”]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isNameLike(line) {
  const norm = normalizeSearch(line);
  if (!norm || /\d/.test(norm) || NOISE.test(norm) || BANK_WORDS.has(norm)) return false;
  const words = norm.split(' ');
  if (words.length < 2 || words.length > 10 || norm.length < 5 || norm.length > 60) return false;
  const letters = norm.replace(/[^a-z]/g, '').length;
  return letters / norm.replace(/\s/g, '').length >= 0.9 && words.every((w) => w.length >= 1);
}

/** Chooses the most likely holder name from OCR lines (top-to-bottom order). */
export function pickNameFromLines(lines, accountNumber = '') {
  const cleaned = lines.map(cleanLine);
  const numberIndex = accountNumber
    ? cleaned.findIndex((line) => line.replace(/\D/g, '').includes(accountNumber.replace(/\D/g, '')))
    : -1;
  const candidates = cleaned.map((text, index) => ({ text, index })).filter((c) => isNameLike(c.text));
  if (!candidates.length) return '';
  const score = (c) => {
    let s = 0;
    if (c.text === c.text.toUpperCase()) s += 3; // banks print names in capitals
    if (numberIndex >= 0) s += Math.max(0, 3 - Math.abs(numberIndex - c.index)); // name sits next to the number
    return s;
  };
  const best = candidates.reduce((a, b) => (score(b) > score(a) ? b : a));
  return normalizeAccountName(best.text);
}

function cropRegions(image, box) {
  const width = image.width || image.videoWidth;
  const height = image.height || image.videoHeight;
  const clamp = (r) => {
    const x = Math.max(0, r.x);
    const y = Math.max(0, r.y);
    return { x, y, w: Math.min(width - x, r.w - (x - r.x)), h: Math.min(height - y, r.h - (y - r.y)) };
  };
  if (!box) return [{ x: 0, y: 0, w: width, h: height }];
  const side = Math.max(box.width, box.height);
  const left = box.x + box.width / 2 - side * 1.4;
  return [
    clamp({ x: left, y: box.y + box.height, w: side * 2.8, h: side * 0.9 }), // under the code
    clamp({ x: left, y: box.y - side * 0.8, w: side * 2.8, h: side * 0.8 }), // above the code
  ].filter((r) => r.w > 20 && r.h > 12);
}

function regionCanvas(image, region) {
  // Upscale small text; Tesseract reads best with glyphs around 20–40 px tall.
  const scale = Math.min(3, Math.max(1, 1400 / region.w));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(region.w * scale);
  canvas.height = Math.round(region.h * scale);
  const ctx = canvas.getContext('2d');
  ctx.filter = 'grayscale(1) contrast(1.4)';
  ctx.drawImage(image, region.x, region.y, region.w, region.h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * @param {ImageBitmap|HTMLCanvasElement} image  the picture the QR was decoded from
 * @param {{x, y, width, height}|undefined} box  QR position in that picture
 * @returns {Promise<string>} holder name in upper case without accents, or ''
 */
export async function readHolderNameFromImage(image, box, accountNumber) {
  const worker = await getWorker();
  for (const region of cropRegions(image, box)) {
    const { data } = await worker.recognize(regionCanvas(image, region));
    const lines = (data.lines || []).map((line) => line.text.trim()).filter(Boolean);
    const name = pickNameFromLines(lines.length ? lines : String(data.text || '').split('\n'), accountNumber);
    if (name) return name;
  }
  return '';
}
