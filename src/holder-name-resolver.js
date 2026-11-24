// Finds the account holder name for a scanned VietQR, in the order the user chose:
//  1. the name stored inside the QR (tag 59), when the bank included it;
//  2. the name printed next to the QR in the scanned picture (local OCR);
//  3. a lookup on api.vietqr.io, only when the user saved their own API keys.
import { readHolderNameFromImage } from './ocr-holder-name.js';
import { lookupAccountName } from './vietqr-name-lookup.js';
import { loadSyncConfig, isLookupReady } from './sync-config.js';

/**
 * @param {{bin, accountNumber, accountName?, image?, box?}} scan
 * @param {(message: string) => void} onProgress
 * @returns {Promise<{name: string, source: 'qr'|'ocr'|'api'|'', note?: string}>}
 */
export async function resolveHolderName(scan, onProgress = () => {}) {
  if (scan.accountName) return { name: scan.accountName, source: 'qr' };
  const notes = [];

  if (scan.image) {
    onProgress('Đang đọc tên chủ tài khoản trên ảnh…');
    try {
      const name = await readHolderNameFromImage(scan.image, scan.box, scan.accountNumber);
      if (name) return { name, source: 'ocr' };
    } catch (error) {
      notes.push(error.message);
    }
  }

  const config = await loadSyncConfig();
  if (isLookupReady(config)) {
    onProgress('Đang tra tên qua VietQR.io…');
    try {
      return { name: await lookupAccountName(config.lookup, scan), source: 'api' };
    } catch (error) {
      notes.push(error.message);
    }
  }
  return { name: '', source: '', note: notes.join(' · ') };
}
