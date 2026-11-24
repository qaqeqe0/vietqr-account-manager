// "Mời tác giả một ly cà phê": the author's MoMo wallet, opened in the usual QR dialog from
// the coffee button in the top bar. It is not stored in the user's account book, so it never
// shows in their list, search or Google sync, and using it records no recent amounts.
import { openQrModal } from './qr-modal.js';

// Decoded from the author's MoMo VietQR (BIN 971025 = MoMo on NAPAS 247).
export const DONATE_ACCOUNT = Object.freeze({
  id: 'donate-author',
  bin: '971025',
  accountNumber: 'PSP2621518400000111',
  accountName: 'NGUYEN NGOC TRAN TU',
  nickname: 'Mời tác giả một ly cà phê',
  defaultContent: 'Moi ca phe VietQR',
  // Coffee-sized amounts shown first as quick picks; no content history of its own.
  amountHistory: [25000, 50000, 100000],
  contentHistory: [],
});

export function openDonateDialog(settings) {
  return openQrModal({ ...DONATE_ACCOUNT }, settings, () => {});
}
