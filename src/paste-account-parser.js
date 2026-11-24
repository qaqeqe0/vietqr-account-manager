// Best-effort parser for account details pasted from chat, e.g.
// "Vietcombank - 0123 4567 89 - Nguyen Van A" or
// "STK: 0123456789\nNgân hàng: MB\nChủ TK: NGUYỄN VĂN A".
import { BANKS } from './bank-list.js';
import { normalizeSearch, normalizeAccountName } from './text-utils.js';

const ALIASES = { vietinbank: '970415', 'viettinbank': '970415', 'cong thuong': '970415', 'ngoai thuong': '970436', 'quan doi': '970422', 'mbbank': '970422', 'lienviet': '970449', 'dong a': '970406', 'ban viet': '970454', 'tien phong': '970423', 'a chau': '970416' };

function detectBank(text) {
  const norm = ` ${normalizeSearch(text).replace(/[^a-z0-9]+/g, ' ')} `;
  const candidates = BANKS.flatMap((bank) => [
    { bin: bank.bin, key: normalizeSearch(bank.short).replace(/[^a-z0-9]+/g, ' ') },
    { bin: bank.bin, key: bank.code.toLowerCase() },
  ]).concat(Object.entries(ALIASES).map(([key, bin]) => ({ bin, key })));
  // Longest key first so "vietinbank" wins over "vib" and "mb".
  candidates.sort((a, b) => b.key.length - a.key.length);
  const hit = candidates.find((c) => norm.includes(` ${c.key} `));
  return hit ? { bin: hit.bin, key: hit.key } : null;
}

function detectAccountNumber(text) {
  const groups = String(text).match(/\d[\d .-]{4,24}\d/g) || [];
  const numbers = groups.map((g) => g.replace(/\D/g, '')).filter((n) => n.length >= 6 && n.length <= 19);
  return numbers.sort((a, b) => b.length - a.length)[0] || '';
}

// A label naming the holder, only at the start of a line or after a separator, so
// "Bank name: Vietcombank" is not mistaken for the holder's name.
const NAME_LABEL = /(?:^|[\n|;,–-])\s*(?:chủ\s*(?:tài\s*khoản|tk)|chu\s*(?:tai\s*khoan|tk)|ctk|tên\s*(?:chủ\s*)?(?:tk|tài\s*khoản)|ten\s*(?:chu\s*)?(?:tk|tai\s*khoan)|account\s*name|người\s*nhận|nguoi\s*nhan|tên|ten|name)\s*[:\-]\s*([^\n|;]+)/i;
// Words that describe the account rather than name the holder.
const LABEL_WORDS = new Set(['stk', 'so', 'tk', 'tai', 'khoan', 'ngan', 'hang', 'bank', 'chu', 'ctk', 'account', 'number', 'no', 'acc', 'cn', 'chi', 'nhanh']);

const plain = (token) => normalizeSearch(token).replace(/[^a-z0-9]/g, '');

/** Removes the first occurrence of the detected bank name (e.g. "Nam A Bank") from tokens. */
function withoutBankName(tokens, bankKey) {
  const words = (bankKey || '').split(' ').filter(Boolean);
  if (!words.length) return tokens;
  for (let i = 0; i + words.length <= tokens.length; i += 1) {
    if (words.every((w, j) => plain(tokens[i + j]) === w)) return [...tokens.slice(0, i), null, ...tokens.slice(i + words.length)];
  }
  return tokens;
}

/** Longest run of 2+ plain words left after removing the bank name, numbers and labels. */
function nameFromLine(line, bankKey) {
  const tokens = withoutBankName(line.split(/[\s:·•|,;–-]+/).filter(Boolean), bankKey);
  let best = [];
  let run = [];
  tokens.forEach((token) => {
    const isWord = token && /^[\p{L}.]+$/u.test(token) && !LABEL_WORDS.has(plain(token));
    if (isWord) run.push(token);
    else { if (run.length > best.length) best = run; run = []; }
  });
  if (run.length > best.length) best = run;
  return best.length >= 2 ? best.join(' ') : '';
}

function detectName(text, bankKey) {
  const labelled = String(text).match(NAME_LABEL);
  if (labelled) return normalizeAccountName(labelled[1]);
  for (const line of String(text).split('\n')) {
    const name = nameFromLine(line, bankKey);
    if (name) return normalizeAccountName(name);
  }
  return '';
}

/** @returns {{bin: string, accountNumber: string, accountName: string}} fields it could find */
export function parsePastedAccount(text) {
  const bank = detectBank(text);
  const accountNumber = detectAccountNumber(text);
  return { bin: bank?.bin || '', accountNumber, accountName: detectName(text, bank?.key) };
}
