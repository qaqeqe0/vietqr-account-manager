// Suggestion logic for the amount and transfer-content fields of the QR modal.
import { matchesQuery, normalizeSearch, parseAmount, formatVnd, normalizeAccountName } from './text-utils.js';

const AMOUNT_PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];

function uniqueNumbers(values) {
  return [...new Set(values.filter((n) => Number.isFinite(n) && n > 0))];
}

/**
 * Empty input -> recent amounts for this account, then common presets.
 * Short digits (e.g. "5") -> 5.000 / 50.000 / 500.000 / 5.000.000 like banking apps.
 * Shorthand ("500k", "1,5tr") -> the parsed value first.
 */
export function suggestAmounts(input, history = [], limit = 6) {
  const text = String(input || '').trim();
  const digits = text.replace(/\D/g, '');
  if (!digits) return uniqueNumbers([...history, ...AMOUNT_PRESETS]).slice(0, limit);

  const out = [];
  const parsed = parseAmount(text);
  if ((/[a-z]/i.test(text) || /[.,]/.test(text)) && parsed) out.push(parsed);
  history.filter((value) => String(value).startsWith(digits)).forEach((value) => out.push(value));
  const base = Number(digits);
  // "5" → 5.000 / 50.000 / …; "5.000" or "5k" already says the scale, so no multiplying.
  if (base > 0 && base < 10_000 && !/[.,a-z]/i.test(text)) {
    [1_000, 10_000, 100_000, 1_000_000].forEach((multiplier) => {
      const value = base * multiplier;
      if (value >= 1_000 && value <= 5_000_000_000) out.push(value);
    });
  }
  return uniqueNumbers(out).slice(0, limit);
}

export function amountLabel(value) {
  return `${formatVnd(value)} đ`;
}

// Compact chip label: 50000 -> "50k", 1500000 -> "1,5tr", 2e9 -> "2 tỷ".
export function shortAmount(value) {
  const fmt = (n) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  if (value >= 1e9) return `${fmt(value / 1e9)} tỷ`;
  if (value >= 1e6) return `${fmt(value / 1e6)}tr`;
  if (value >= 1e3) return `${fmt(value / 1e3)}k`;
  return fmt(value);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function fillTemplate(template, { myName = '', recipient = '' } = {}) {
  const now = new Date();
  return String(template)
    .replace(/\{toi\}/gi, myName)
    .replace(/\{nguoinhan\}/gi, recipient)
    .replace(/\{thang\}/gi, `${pad(now.getMonth() + 1)}/${now.getFullYear()}`)
    .replace(/\{ngay\}/gi, `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Default transfer content: the sender's own account holder name (Settings → "Tên chủ
 * tài khoản của bạn") in capitals + "chuyen tien". Empty until that name is set.
 */
export function defaultTransferContent(settings) {
  const name = normalizeAccountName(settings.myName || '');
  return name ? `${name} chuyen tien` : '';
}

/**
 * Returns [{text, source}] where source is "Gần đây", "Mặc định" or "Mẫu",
 * filtered by what the user typed (accent-insensitive) and de-duplicated.
 */
export function suggestContents(input, { account, settings }, limit = 8) {
  const recipient = account.nickname || account.accountName;
  const context = { myName: settings.myName, recipient };
  const candidates = [
    { text: account.defaultContent ? fillTemplate(account.defaultContent, context) : defaultTransferContent(settings), source: 'Mặc định' },
    ...account.contentHistory.map((text) => ({ text, source: 'Gần đây' })),
    ...settings.templates.map((t) => ({ text: fillTemplate(t, context), source: 'Mẫu' })),
  ];
  const seen = new Set();
  const query = String(input || '');
  const exact = normalizeSearch(query);
  return candidates
    .filter((item) => {
      const key = normalizeSearch(item.text);
      if (!key || seen.has(key) || key === exact) return false;
      seen.add(key);
      return matchesQuery(item.text, query);
    })
    .slice(0, limit);
}
