// Reads a scanned VietQR (NAPAS EMVCo) string back into account fields.
// Counterpart of vietqr-payload.js: tag 38 holds GUID A000000727 + {00 BIN, 01 account},
// 54 amount, 59 optional holder name, 62/08 transfer content, 63 CRC.
import { crc16 } from './vietqr-payload.js';
import { normalizeAccountName } from './text-utils.js';

const NAPAS_GUID = 'A000000727';
const SERVICE_TO_CARD = 'QRIBFTTC';

/** Splits an EMVCo TLV string into {tag: value}. Throws on malformed or truncated data. */
export function parseTlv(text) {
  const fields = {};
  let i = 0;
  while (i < text.length) {
    const id = text.slice(i, i + 2);
    const lengthText = text.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lengthText)) throw new Error('Malformed TLV');
    const length = Number(lengthText);
    const value = text.slice(i + 4, i + 4 + length);
    if (value.length !== length) throw new Error('Truncated TLV');
    fields[id] = value;
    i += 4 + length;
  }
  return fields;
}

function fail(error) {
  return { ok: false, error };
}

/**
 * @returns {{ok: true, bin, accountNumber, accountName, amount, content, crcOk} | {ok: false, error}}
 */
export function parseVietQr(raw) {
  const text = String(raw || '').trim();
  let top;
  try {
    top = parseTlv(text);
  } catch {
    return fail('Mã QR này không phải mã chuyển khoản VietQR.');
  }
  if (!top['38']) return fail('Mã QR không chứa thông tin tài khoản ngân hàng (không phải VietQR).');

  let merchant;
  let beneficiary;
  try {
    merchant = parseTlv(top['38']);
    beneficiary = parseTlv(merchant['01'] || '');
  } catch {
    return fail('Thông tin tài khoản trong mã QR bị lỗi.');
  }
  if (merchant['00'] !== NAPAS_GUID) return fail('Mã QR không thuộc chuẩn NAPAS VietQR.');
  if (merchant['02'] === SERVICE_TO_CARD) return fail('Đây là mã QR theo số thẻ, chưa hỗ trợ lưu. Hãy dùng mã QR theo số tài khoản.');

  const bin = beneficiary['00'] || '';
  const accountNumber = (beneficiary['01'] || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(bin) || !/^[A-Za-z0-9]{1,19}$/.test(accountNumber)) {
    return fail('Mã QR thiếu mã ngân hàng hoặc số tài khoản.');
  }

  let content = '';
  if (top['62']) {
    try { content = parseTlv(top['62'])['08'] || ''; } catch { content = ''; }
  }
  // CRC covers everything up to and including "6304"; it must be the final field.
  const crcOk = !!top['63'] && text.endsWith(top['63']) && crc16(text.slice(0, -4)) === top['63'].toUpperCase();

  return {
    ok: true,
    bin,
    accountNumber,
    accountName: normalizeAccountName(top['59'] || ''),
    amount: Number(top['54']) > 0 ? Math.round(Number(top['54'])) : 0,
    content: content.trim(),
    crcOk,
  };
}
