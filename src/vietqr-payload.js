// Builds a NAPAS VietQR payload (EMVCo merchant-presented QR) fully offline.
// Spec summary:
//   00 payload format "01" | 01 "11" static or "12" with amount
//   38 merchant info: 00 GUID A000000727, 01 {00 bank BIN, 01 account}, 02 "QRIBFTTA" (to account)
//   53 currency 704 (VND) | 54 amount | 58 country VN | 62 additional data, 08 = content
//   63 CRC-16/CCITT-FALSE over everything including "6304"
import { sanitizeTransferContent } from './text-utils.js';

const NAPAS_GUID = 'A000000727';
const SERVICE_TO_ACCOUNT = 'QRIBFTTA';

function tlv(id, value) {
  const text = String(value);
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

export function crc16(input) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * @param {{bin: string, accountNumber: string, amount?: number, content?: string}} input
 * @returns {string} the text to encode into the QR image
 */
export function buildVietQrPayload({ bin, accountNumber, amount, content }) {
  const account = String(accountNumber || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(String(bin))) throw new Error('BIN ngân hàng không hợp lệ');
  if (!/^[A-Za-z0-9]{1,19}$/.test(account)) throw new Error('Số tài khoản không hợp lệ');

  const amountValue = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
  const message = sanitizeTransferContent(content || '');

  const beneficiary = tlv('00', bin) + tlv('01', account);
  const merchantInfo = tlv('00', NAPAS_GUID) + tlv('01', beneficiary) + tlv('02', SERVICE_TO_ACCOUNT);

  let payload = tlv('00', '01') + tlv('01', amountValue ? '12' : '11') + tlv('38', merchantInfo) + tlv('53', '704');
  if (amountValue) payload += tlv('54', amountValue);
  payload += tlv('58', 'VN');
  if (message) payload += tlv('62', tlv('08', message));
  payload += '6304';
  return payload + crc16(payload);
}
