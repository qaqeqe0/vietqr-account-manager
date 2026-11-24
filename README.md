# Sổ tài khoản QR chuyển khoản (Chrome extension)

Quản lý số tài khoản ngân hàng và tạo mã VietQR chuyển khoản ngay trên thanh công cụ Chrome.

## Tính năng

- Danh sách tài khoản: ngân hàng (kèm logo từ VietQR.io khi cho phép ảnh VietQR.io), số TK, chủ TK, tên gợi nhớ, nhóm, ghi chú, yêu thích. Bản Vite: popup hiện dạng dòng thu gọn (avatar, chỉ logo ngân hàng kèm tooltip, ngôi sao yêu thích cạnh nhãn, menu ⋯ Sửa/Xoá); chế độ toàn tab hiện dạng thẻ với ảnh thẻ VietQR thu nhỏ căn đáy ngang nhãn nhóm, logo ngân hàng ở giữa phía trên ngang tên ngân hàng, ảnh mờ cho tới khi rê chuột.
- Tìm kiếm không dấu theo tên, số TK, ngân hàng (vcb, mb, vietin…), ghi chú. Phím `/` để tìm, `Enter` mở QR của kết quả đầu tiên.
- Lọc theo nhóm: Khách hàng, Bạn bè, Người thân, Đối tác, Nhà cung cấp, Của tôi, Khác, và nhóm tự tạo.
- Mã VietQR tạo **offline** (chuẩn NAPAS/EMVCo, có CRC), không gửi dữ liệu ra ngoài.
- Ô số tiền: hiểu `500k`, `1,5tr`, `1tr5`, `2k5`, `2 triệu`, `1.000.000`; có nút chọn nhanh, gồm số tiền đã dùng gần đây.
- Ô nội dung: mặc định là tên chủ tài khoản của bạn — người chuyển, nhập trong Cài đặt — (in hoa) + "chuyen tien" (hoặc nội dung mặc định riêng của tài khoản nếu có), nút chọn nhanh (nội dung gần đây, mẫu), tự bỏ dấu/ký tự đặc biệt trong QR, đếm ký tự.
- Hai kiểu hộp thoại mã QR (Cài đặt → "Kiểu hộp thoại mã QR"): "Thẻ VietQR" (mặc định) giống mẫu in, hoặc cổ điển — tên ngân hàng + chủ TK, thẻ VietQR có logo (ảnh từ img.vietqr.io, cần mạng và gửi số TK/tên/số tiền/nội dung tới VietQR.io; mất mạng thì tự dùng thẻ vẽ offline), khung số TK, ô số tiền, ô nội dung, nút "Tải mã QR". Trên thẻ, dòng "Số tiền" in đậm cùng kiểu với dòng "Số TK".
- Sao chép số TK, sao chép thông tin chuyển khoản, sao chép ảnh QR, tải ảnh QR (file PNG thật, mở được bằng mọi trình xem ảnh; ở kiểu "Thẻ VietQR" là đúng thẻ đang hiện, ở kiểu cổ điển là ảnh có tên, ngân hàng, số tiền, nội dung).
- Chọn ngân hàng trong một ô duy nhất: gõ để lọc (vcb, mb, vietin…, không cần dấu), danh sách thả xuống có logo, mã ngân hàng khớp từ đầu được xếp trước; chọn bằng chuột hoặc ↑ ↓ Enter, Esc đóng danh sách.
- Dán nhanh thông tin tài khoản từ tin nhắn để tự điền form.
- Chuột phải trên trang web → **"Quét mã VietQR trên trang này"**, hoặc chuột phải vào một ảnh → **"Thêm tài khoản từ mã QR trong ảnh này"**: tiện ích chụp tab đang xem, mở popup (hoặc tab mới nếu trình duyệt không mở được popup) và tự điền form thêm tài khoản.
- Thêm tài khoản bằng mã QR: quét mã VietQR đang hiện trên trang web, dán (⌘/Ctrl+V) hoặc kéo thả ảnh chụp mã QR, chọn ảnh, hoặc dùng camera. Tự điền ngân hàng, số TK, số tiền và nội dung mặc định. Tên chủ TK lấy theo thứ tự: tên trong mã QR (nếu ngân hàng có ghi) → đọc chữ in cạnh mã QR trên ảnh (OCR chạy ngay trên máy) → tra qua VietQR.io nếu bạn đã nhập API key. Nút "Tra tên" trong form cũng dùng VietQR.io; báo nếu tài khoản đã có trong sổ. Trong popup, "Chọn ảnh" và "Camera" mở toàn tab vì Chrome đóng popup khi mở hộp chọn file.
- Đồng bộ Google Sheet (qua Apps Script của bạn; dữ liệu ghi vào tab "TaiKhoan" của Google Sheet bạn chọn trong Cài đặt, hoặc Sheet chứa script, hoặc file tự tạo "Sổ tài khoản QR chuyển khoản (dữ liệu)" nếu script tạo riêng — tên file và link luôn hiện sau mỗi lần đồng bộ) và/hoặc Google Drive (file `so-tai-khoan-vietqr.json`): tự động sau mỗi thay đổi, khi mở popup và mỗi 30 phút, kèm nút "Đồng bộ ngay". Bản sửa mới hơn được giữ, tài khoản đã xoá không bị khôi phục lại. Thiết lập trong trang Cài đặt (bấm bánh răng trong popup, hoặc chuột phải icon tiện ích → Tuỳ chọn).
- Dropdown, checkbox, ô tìm kiếm, mục mở rộng và thanh cuộn được vẽ theo giao diện của tiện ích (không dùng kiểu mặc định của trình duyệt), theo cả chế độ sáng và tối.
- Nút ☕ trên thanh trên cùng: "Mời tác giả một ly cà phê", mở mã VietQR ví MoMo của tác giả (gợi ý 25k/50k/100k). Tài khoản này không nằm trong sổ của bạn, không đồng bộ và không lưu lịch sử.
- Xuất/nhập file JSON để sao lưu. Mẫu nội dung hỗ trợ `{toi}`, `{nguoinhan}`, `{thang}`, `{ngay}`.

## Cài đặt

1. Mở `chrome://extensions`, bật **Developer mode**.
2. Bấm **Load unpacked** và chọn thư mục `vietqr-account-manager-extension`.
3. Ghim extension lên thanh công cụ. Phím tắt mở nhanh: `Alt+Shift+Q`.

## Xem thử ngoài Chrome

```bash
node scripts/dev-static-server.mjs 5178
```

Mở `http://localhost:5178/popup.html` (dữ liệu khi đó lưu ở localStorage).

## Cấu trúc

- `popup.html` — trang popup.
- `styles/popup.css` (bố cục chính, biến màu sáng/tối), `styles/dialogs.css` (hộp thoại), `styles/form-controls.css` (dropdown, ô chọn ngân hàng, checkbox, ô tìm kiếm, mục mở rộng, thanh cuộn).
- `src/vietqr-payload.js` — tạo chuỗi VietQR + CRC16.
- `src/bank-list.js` — danh sách ngân hàng và mã BIN.
- `src/storage.js` — lưu trữ `chrome.storage.local`, sao lưu/nhập.
- `src/suggestion-engine.js` — gợi ý số tiền/nội dung cho nút chọn nhanh.
- `src/qr-modal.js` (chọn kiểu hộp thoại, kiểu cổ điển), `src/qr-card-modal.js` (kiểu "Thẻ VietQR"), `src/qr-dialog-core.js` (ô số tiền/nội dung và các nút dùng chung), `src/qr-print-card.js` (thẻ VietQR từ img.vietqr.io hoặc vẽ offline, chuyển thành PNG), `src/qr-image-renderer.js` (vẽ mã QR và ảnh kiểu cổ điển).
- `src/donate-coffee.js` — nút mời cà phê (ví MoMo của tác giả).
- `src/text-utils.js` — bỏ dấu tiếng Việt, đọc số tiền, định dạng VND.
- `src/popup-app.js` (trang chính), `src/account-book-changes.js` (thêm/sửa/xoá/nhập sao lưu), `src/popup-side-features.js` (xuất sao lưu, dòng trạng thái đồng bộ, nhận ảnh từ menu chuột phải).
- `src/account-form.js` (form thêm/sửa), `src/account-form-fields.js` (nhóm, tên chủ TK), `src/bank-combobox.js` (ô chọn ngân hàng), `src/account-form-scan.js` (thông báo quét, dán/kéo thả ảnh), `src/paste-account-parser.js`, `src/settings-form.js` + `src/settings-page.js` (trang Cài đặt `options.html`), `src/account-list-view.js`.
- `src/vietqr-payload-parser.js`, `src/qr-image-decoder.js`, `src/qr-scan-sources.js`, `src/qr-scan-strip.js` — đọc mã QR để thêm tài khoản.
- `src/holder-name-resolver.js`, `src/ocr-holder-name.js`, `src/vietqr-name-lookup.js` — lấy tên chủ tài khoản (OCR, VietQR.io).
- `src/background.js` (service worker), `src/background-context-menu.js`, `src/background-context-menu-keys.js` — menu chuột phải quét QR.
- `src/sync-merge.js`, `src/sync-engine.js`, `src/sync-config.js`, `src/google-sheets-provider.js`, `src/google-drive-provider.js`, `src/sync-settings-panel.js`, `src/background-sync.js` — đồng bộ Google.
- `google-apps-script/vietqr-sheet-sync.gs` — mã Apps Script dán vào Google Sheet (nút "Sao chép mã Apps Script" điền sẵn mã bí mật).
- `lib/qrcode.js` — qrcode-generator 1.4.4 (MIT, Kazuhiko Arase).
- `lib/jsqr.js` — jsQR 1.4.0 (Apache-2.0, xem `lib/jsqr-LICENSE.txt`), dùng khi trình duyệt không có BarcodeDetector (ví dụ Chrome trên Windows).
- `lib/tesseract/` — Tesseract.js 5.1.1 + core LSTM (Apache-2.0) và dữ liệu tiếng Việt `vie` (best_int) để đọc tên trên ảnh, chạy offline.

Quyền: `storage` (lưu dữ liệu), `activeTab` (chụp tab đang xem khi bấm "Quét QR trên trang"), `identity` (đăng nhập Google Drive), `alarms` (đồng bộ định kỳ), `contextMenus` (menu chuột phải quét QR). Quyền truy cập `script.google.com`, `googleapis.com`, `api.vietqr.io`, `img.vietqr.io` là tuỳ chọn, chỉ xin khi bạn bật tính năng tương ứng. CSP có `wasm-unsafe-eval` để chạy bộ đọc chữ WebAssembly.

## Bản giao diện Tailwind (Vite)

Repo [qaqeqe0/vietqr-account-manager](https://github.com/qaqeqe0/vietqr-account-manager) có hai nhánh:

| Nhánh | Nội dung | Thư mục khi làm việc |
|---|---|---|
| `main` | Bản Vite: giao diện Tailwind, cấu hình build | `vietqr-account-manager-vite` |
| `plain` (nhánh này) | Bản thường, chứa toàn bộ logic dùng chung | `vietqr-account-manager-extension` |

Bản Vite là cùng tiện ích này với giao diện Tailwind (font Inter, icon Font Awesome, màu xanh `blue-600`, nút + nổi). Dữ liệu, tính năng và logic giữ nguyên: bản Vite import trực tiếp các module trong `src/` ở đây và chỉ thay phần hiển thị (`popup.html`, `ui-helpers.js`, `account-list-view.js`, `account-row-compact.js`, `styles/app.css`). Sửa logic ở thư mục này thì build lại bản Vite là có.

Hai nhánh phải được clone vào hai thư mục nằm cạnh nhau, đúng tên như bảng trên:

```bash
git clone -b plain https://github.com/qaqeqe0/vietqr-account-manager.git vietqr-account-manager-extension
git clone -b main  https://github.com/qaqeqe0/vietqr-account-manager.git vietqr-account-manager-vite
cd vietqr-account-manager-vite
npm install
npm run build   # tạo dist/ (load unpacked thư mục dist trong chrome://extensions)
npm run zip     # dist + vietqr-account-manager-vite.zip
npm run dev     # xem thử tại http://localhost:5188/popup.html (dữ liệu lưu localStorage)
```

Lưu ý: hai bản là hai extension khác nhau trong Chrome nên có kho dữ liệu riêng; dùng "Xuất file JSON" ở bản này rồi "Nhập file JSON" ở bản kia (hoặc cùng bật đồng bộ Google Sheet) để chuyển dữ liệu.

## Giấy phép

Mã nguồn phát hành theo giấy phép [MIT](LICENSE). Các thư viện đi kèm giữ giấy phép riêng: QR Code Generator của Kazuhiko Arase (MIT), jsQR và Tesseract.js cùng dữ liệu tiếng Việt (Apache-2.0).
