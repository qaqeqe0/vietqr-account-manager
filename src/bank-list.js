// Vietnamese banks that support NAPAS 247 / VietQR, keyed by their 6-digit BIN.
// `code` is the short code used by VietQR, `short` is the friendly display name.
export const BANKS = [
  { bin: '970436', code: 'VCB', short: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { bin: '970415', code: 'ICB', short: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam' },
  { bin: '970418', code: 'BIDV', short: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { bin: '970405', code: 'VBA', short: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn' },
  { bin: '970422', code: 'MB', short: 'MB Bank', name: 'Ngân hàng TMCP Quân đội' },
  { bin: '970407', code: 'TCB', short: 'Techcombank', name: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { bin: '970416', code: 'ACB', short: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
  { bin: '970432', code: 'VPB', short: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { bin: '970423', code: 'TPB', short: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong' },
  { bin: '970403', code: 'STB', short: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { bin: '970437', code: 'HDB', short: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM' },
  { bin: '970441', code: 'VIB', short: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam' },
  { bin: '970443', code: 'SHB', short: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { bin: '970431', code: 'EIB', short: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam' },
  { bin: '970426', code: 'MSB', short: 'MSB', name: 'Ngân hàng TMCP Hàng Hải' },
  { bin: '970440', code: 'SEAB', short: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á' },
  { bin: '970448', code: 'OCB', short: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
  { bin: '970449', code: 'LPB', short: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam' },
  { bin: '970428', code: 'NAB', short: 'Nam A Bank', name: 'Ngân hàng TMCP Nam Á' },
  { bin: '970409', code: 'BAB', short: 'Bac A Bank', name: 'Ngân hàng TMCP Bắc Á' },
  { bin: '970412', code: 'PVCB', short: 'PVcomBank', name: 'Ngân hàng TMCP Đại Chúng Việt Nam' },
  { bin: '970425', code: 'ABB', short: 'ABBANK', name: 'Ngân hàng TMCP An Bình' },
  { bin: '970454', code: 'VCCB', short: 'BVBank', name: 'Ngân hàng TMCP Bản Việt' },
  { bin: '970452', code: 'KLB', short: 'KienlongBank', name: 'Ngân hàng TMCP Kiên Long' },
  { bin: '970419', code: 'NCB', short: 'NCB', name: 'Ngân hàng TMCP Quốc Dân' },
  { bin: '970429', code: 'SCB', short: 'SCB', name: 'Ngân hàng TMCP Sài Gòn' },
  { bin: '970400', code: 'SGICB', short: 'Saigonbank', name: 'Ngân hàng TMCP Sài Gòn Công Thương' },
  { bin: '970406', code: 'DOB', short: 'Vikki Bank', name: 'Ngân hàng TNHH MTV Số Vikki (DongA Bank)' },
  { bin: '970430', code: 'PGB', short: 'PGBank', name: 'Ngân hàng TMCP Thịnh vượng và Phát triển' },
  { bin: '970427', code: 'VAB', short: 'VietABank', name: 'Ngân hàng TMCP Việt Á' },
  { bin: '970433', code: 'VIETBANK', short: 'VietBank', name: 'Ngân hàng TMCP Việt Nam Thương Tín' },
  { bin: '970438', code: 'BVB', short: 'BaoViet Bank', name: 'Ngân hàng TMCP Bảo Việt' },
  { bin: '970408', code: 'GPB', short: 'GPBank', name: 'Ngân hàng TM TNHH MTV Dầu Khí Toàn Cầu' },
  { bin: '970414', code: 'OCEANBANK', short: 'MBV', name: 'Ngân hàng TNHH MTV Việt Nam Hiện Đại (OceanBank)' },
  { bin: '970446', code: 'COOPBANK', short: 'Co-opBank', name: 'Ngân hàng Hợp tác xã Việt Nam' },
  { bin: '546034', code: 'CAKE', short: 'Cake by VPBank', name: 'Ngân hàng số Cake by VPBank' },
  { bin: '546035', code: 'UBANK', short: 'Ubank', name: 'Ngân hàng số Ubank by VPBank' },
  { bin: '963388', code: 'TIMO', short: 'Timo', name: 'Ngân hàng số Timo by Bản Việt Bank' },
  { bin: '971005', code: 'VIETTELMONEY', short: 'Viettel Money', name: 'Tổng Công ty Dịch vụ số Viettel' },
  { bin: '971011', code: 'VNPTMONEY', short: 'VNPT Money', name: 'VNPT Money' },
  { bin: '970424', code: 'SHBVN', short: 'Shinhan Bank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam' },
  { bin: '970457', code: 'WVN', short: 'Woori Bank', name: 'Ngân hàng TNHH MTV Woori Việt Nam' },
  { bin: '970458', code: 'UOB', short: 'UOB', name: 'Ngân hàng United Overseas Bank Việt Nam' },
  { bin: '970410', code: 'SCVN', short: 'Standard Chartered', name: 'Ngân hàng TNHH MTV Standard Chartered Việt Nam' },
  { bin: '970439', code: 'PBVN', short: 'Public Bank', name: 'Ngân hàng TNHH MTV Public Việt Nam' },
  { bin: '458761', code: 'HSBC', short: 'HSBC', name: 'Ngân hàng TNHH MTV HSBC Việt Nam' },
  { bin: '422589', code: 'CIMB', short: 'CIMB', name: 'Ngân hàng TNHH MTV CIMB Việt Nam' },
  { bin: '970442', code: 'HLBVN', short: 'Hong Leong', name: 'Ngân hàng TNHH MTV Hong Leong Việt Nam' },
  { bin: '970434', code: 'IVB', short: 'Indovina', name: 'Ngân hàng TNHH Indovina' },
  { bin: '970421', code: 'VRB', short: 'VRB', name: 'Ngân hàng Liên doanh Việt - Nga' },
  { bin: '668888', code: 'KBANK', short: 'KBank', name: 'Ngân hàng Đại chúng TNHH Kasikornbank' },
];

const BY_BIN = new Map(BANKS.map((bank) => [bank.bin, bank]));

export function findBankByBin(bin) {
  return BY_BIN.get(String(bin)) || null;
}

/** Logo published by VietQR.io for the bank (by its VietQR code); '' for unknown banks. */
export function bankLogoUrl(bin) {
  const bank = findBankByBin(bin);
  return bank ? `https://api.vietqr.io/img/${bank.code}.png` : '';
}

/**
 * True when the user allows images from VietQR.io (Settings → Thẻ VietQR image toggle).
 * Bank logos and card thumbnails are only loaded from there in that case.
 */
export function allowsVietqrImages(settings) {
  return !!settings && settings.qrImageSource !== 'offline';
}

// Display label used in lists and the QR modal header.
export function bankLabel(bin) {
  const bank = findBankByBin(bin);
  return bank ? bank.short : `BIN ${bin}`;
}

// Stable accent color per bank so avatars are recognisable at a glance.
export function bankColor(bin) {
  const palette = ['#2f5bd3', '#0f8a6c', '#c2410c', '#7c3aed', '#be123c', '#0e7490', '#a16207', '#4338ca'];
  const n = String(bin).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return palette[n % palette.length];
}
