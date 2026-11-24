// Finds QR codes in an image or video frame. Uses the browser's BarcodeDetector when it
// supports QR (Chrome on macOS / ChromeOS / Android) and falls back to the vendored
// jsQR (lib/jsqr.js, loaded on first use) everywhere else, e.g. Chrome on Windows.
import { parseVietQr } from './vietqr-payload-parser.js';

const MAX_SIDE = 2400; // jsQR cost grows with pixels; large screenshots are scaled down to this
let jsQrPromise = null;
let detectorPromise = null;

function loadJsQr() {
  if (globalThis.jsQR) return Promise.resolve(globalThis.jsQR);
  jsQrPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'lib/jsqr.js';
    script.onload = () => resolve(globalThis.jsQR);
    script.onerror = () => { jsQrPromise = null; reject(new Error('Không tải được bộ đọc mã QR')); };
    document.head.append(script);
  });
  return jsQrPromise;
}

function getNativeDetector() {
  detectorPromise ??= (async () => {
    if (!('BarcodeDetector' in globalThis)) return null;
    try {
      const formats = await globalThis.BarcodeDetector.getSupportedFormats();
      return formats.includes('qr_code') ? new globalThis.BarcodeDetector({ formats: ['qr_code'] }) : null;
    } catch {
      return null;
    }
  })();
  return detectorPromise;
}

function sourceSize(source) {
  return {
    width: source.videoWidth || source.naturalWidth || source.width,
    height: source.videoHeight || source.naturalHeight || source.height,
  };
}

async function decodeWithJsQr(source) {
  const jsQR = await loadJsQr();
  const { width, height } = sourceSize(source);
  if (!width || !height) return [];
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
  if (!code?.data) return [];
  const xs = [code.location.topLeftCorner.x, code.location.bottomRightCorner.x, code.location.topRightCorner.x, code.location.bottomLeftCorner.x];
  const ys = [code.location.topLeftCorner.y, code.location.bottomRightCorner.y, code.location.topRightCorner.y, code.location.bottomLeftCorner.y];
  const box = {
    x: Math.min(...xs) / scale,
    y: Math.min(...ys) / scale,
    width: (Math.max(...xs) - Math.min(...xs)) / scale,
    height: (Math.max(...ys) - Math.min(...ys)) / scale,
  };
  return [{ rawValue: code.data, box }];
}

/**
 * @param {ImageBitmap|HTMLVideoElement|HTMLCanvasElement} source
 * @returns {Promise<Array<{rawValue: string, box: {x, y, width, height}}>>} every QR code found,
 *   with its position in source pixels (used to read the printed holder name next to it)
 */
export async function decodeQrCodes(source) {
  const detector = await getNativeDetector();
  if (detector) {
    try {
      const found = await detector.detect(source);
      if (found.length) {
        return found.map((item) => ({
          rawValue: item.rawValue,
          box: { x: item.boundingBox.x, y: item.boundingBox.y, width: item.boundingBox.width, height: item.boundingBox.height },
        }));
      }
    } catch { /* fall through to jsQR */ }
  }
  return decodeWithJsQr(source);
}

export async function blobToBitmap(blob) {
  try {
    return await createImageBitmap(blob);
  } catch {
    throw new Error('Không mở được ảnh. Hãy dùng ảnh PNG hoặc JPG.');
  }
}

/**
 * Picks the first VietQR among decoded codes.
 * @returns {{ok: true, box, ...fields} | {ok: false, error: string}}
 */
export function pickVietQr(codes) {
  if (!codes.length) return { ok: false, error: 'Không tìm thấy mã QR. Hãy thử ảnh rõ hơn hoặc phóng to mã QR.' };
  const results = codes.map((code) => ({ ...parseVietQr(code.rawValue), box: code.box }));
  return results.find((result) => result.ok) || results[0];
}

/**
 * Decodes an image Blob/File. The result keeps the decoded `image` so the holder name
 * printed next to the QR can be read afterwards.
 */
export async function scanImageBlob(blob) {
  const bitmap = await blobToBitmap(blob);
  const result = pickVietQr(await decodeQrCodes(bitmap));
  if (!result.ok) bitmap.close?.();
  return result.ok ? { ...result, image: bitmap } : result;
}
