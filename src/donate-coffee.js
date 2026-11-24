// "Mời tác giả một ly cà phê": the author's MoMo wallet, opened in the usual QR dialog from
// the coffee button in the top bar. It is not stored in the user's account book, so it never
// shows in their list, search or Google sync, and using it records no recent amounts.
import { openQrCardModal } from './qr-card-modal.js';

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

// Always the card layout, with a line that says what this QR is for.
export function openDonateDialog(settings) {
  return openQrCardModal({ ...DONATE_ACCOUNT }, settings, () => {}, {
    title: 'Mời tác giả một ly cà phê',
    intro: '☕ Cảm ơn bạn đã dùng tiện ích! Nếu thấy hữu ích, bạn có thể mời tác giả một ly cà phê qua ví MoMo. Hoàn toàn tự nguyện.',
  });
}
