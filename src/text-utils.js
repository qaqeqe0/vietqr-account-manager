// Small text helpers shared by the popup: Vietnamese diacritics, money parsing, escaping.

export function removeDiacritics(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeSearch(text) {
  return removeDiacritics(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// True when every word of the query appears somewhere in the haystack (accent-insensitive).
export function matchesQuery(haystack, query) {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const target = normalizeSearch(haystack);
  return words.every((word) => target.includes(word));
}

// Bank transfer content: ASCII only, no special characters, max 50 chars.
export const CONTENT_SOFT_LIMIT = 25;
export const CONTENT_HARD_LIMIT = 50;
export function sanitizeTransferContent(text) {
  return removeDiacritics(text)
    .replace(/[^A-Za-z0-9 .,\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CONTENT_HARD_LIMIT);
}

// Account holder names are shown upper-case without accents, like banking apps do.
export function normalizeAccountName(text) {
  return removeDiacritics(text).toUpperCase().replace(/\s+/g, ' ').trim();
}

export function formatVnd(amount) {
  if (!amount) return '';
  return Math.round(amount).toLocaleString('vi-VN');
}

// Largest amount accepted (11 digits); field 54 of the QR allows at most 13 characters.
export const MAX_AMOUNT = 99_999_999_999;
const UNIT_MULTIPLIERS = { k: 1e3, nghin: 1e3, ngan: 1e3, tr: 1e6, trieu: 1e6, m: 1e6, ty: 1e9, b: 1e9 };

/**
 * Parses what people type for money: "500000", "500.000", "1,000,000", "500k", "1,5tr",
 * "1tr5" (1.5 million), "2k5", "2 triệu", "1ty".
 * Returns an integer number of VND, or 0 when the text is not a clear amount
 * (e.g. "1.5" without a unit, or more than MAX_AMOUNT).
 */
export function parseAmount(input) {
  const text = normalizeSearch(input).replace(/\s+/g, '');
  if (!text) return 0;
  let value = 0;
  const unitMatch = text.match(/^(\d+)(?:[.,](\d+))?(k|nghin|ngan|tr|trieu|m|ty|b)(\d+)?$/);
  if (unitMatch) {
    const [, whole, decimals, unit, trailing] = unitMatch;
    if (decimals && trailing) return 0; // "1,5tr5" is not a number
    value = Number(`${whole}.${decimals || trailing || 0}`) * UNIT_MULTIPLIERS[unit];
  } else if (/^\d+$/.test(text) || /^\d{1,3}([.,])\d{3}(\1\d{3})*$/.test(text)) {
    value = Number(text.replace(/\D/g, '')); // 500000, 500.000, 1,000,000
  } else {
    // Thousands separators plus a 1–2 digit fraction: "1,000,000.50" or "1.000.000,50".
    const withFraction = text.match(/^(\d{1,3}(?:([.,])\d{3})+)[.,]\d{1,2}$/);
    if (!withFraction || text[withFraction[1].length] === withFraction[2]) return 0;
    value = Number(withFraction[1].replace(/\D/g, ''));
  }
  value = Math.round(value);
  return value > 0 && value <= MAX_AMOUNT ? value : 0;
}

export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
