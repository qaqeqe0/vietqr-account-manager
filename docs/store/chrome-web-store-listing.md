# Hồ sơ đăng Chrome Web Store — Sổ tài khoản QR chuyển khoản 1.2.5

Nội dung để dán vào [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). File nộp: `vietqr-account-manager-vite-v1.2.5.zip` (build từ nhánh `main`, chạy `npm run zip`).

## 1. Trước khi nộp

- [ ] Tài khoản nhà phát triển Chrome Web Store (phí một lần 5 USD), bật xác minh 2 bước cho tài khoản Google.
- [x] Chính sách quyền riêng tư đã đăng tại https://qaqeqe0.github.io/so-tai-khoan-qr/privacy/ (repo công khai `qaqeqe0/so-tai-khoan-qr`, GitHub Pages). Khi sửa `privacy-policy.html` thì chép sang `privacy/index.html` của repo đó.
- [ ] Cài file zip lên Chrome thật (Load unpacked thư mục `dist`), thử: thêm tài khoản, quét QR, mở và tải mã QR, đồng bộ, nút cà phê.
- [ ] Chuyển thử một khoản nhỏ qua mã QR MoMo của nút cà phê.

## 2. Thông tin chính (Store listing)

**Tên:** Sổ tài khoản QR chuyển khoản (đã bỏ chữ "VietQR" khỏi tên vì đây là thương hiệu của NAPAS; trong mô tả chỉ dùng "mã VietQR" để nói tiện ích hỗ trợ chuẩn này)

**Mô tả ngắn** (lấy từ manifest, 124/132 ký tự):

> Quản lý số tài khoản ngân hàng, tạo mã VietQR chuyển khoản offline với gợi ý số tiền và nội dung, tìm kiếm và lọc theo nhóm.

**Danh mục:** Productivity → Tools · **Ngôn ngữ:** Tiếng Việt

**Mô tả chi tiết:**

```text
Sổ tài khoản QR chuyển khoản giúp bạn lưu số tài khoản ngân hàng của khách hàng, bạn bè, người thân và tạo mã VietQR để nhận chuyển khoản chỉ với một cú bấm trên thanh công cụ Chrome.

TẠO MÃ VIETQR NHANH
• Mã VietQR theo chuẩn NAPAS 247, tạo ngay trên máy, quét được bằng mọi ứng dụng ngân hàng và ví điện tử.
• Ô số tiền hiểu cách gõ quen thuộc: 500k, 1,5tr, 1tr5, 2 triệu; nút chọn nhanh số tiền hay dùng.
• Nội dung chuyển khoản tự điền "TÊN BẠN chuyen tien", có mẫu nội dung và nội dung gần đây.
• Thẻ VietQR đẹp như bản in, tải về ảnh PNG hoặc sao chép ảnh để dán vào tin nhắn.

QUẢN LÝ SỔ TÀI KHOẢN
• Hơn 50 ngân hàng và ví (Vietcombank, VietinBank, BIDV, Agribank, MB, Techcombank, ACB, MoMo…), có logo.
• Tìm kiếm không dấu theo tên, số tài khoản, ngân hàng (gõ vcb, mb, vietin…), ghi chú.
• Lọc theo nhóm: Khách hàng, Bạn bè, Người thân, Đối tác, Nhà cung cấp… và nhóm tự tạo; đánh dấu yêu thích.

THÊM TÀI KHOẢN BẰNG MÃ QR
• Chuột phải trên trang web → "Quét mã VietQR trên trang này".
• Dán, kéo thả ảnh chụp mã QR, chọn ảnh hoặc dùng camera.
• Tự đọc tên chủ tài khoản in cạnh mã QR (chạy offline trên máy).
• Dán đoạn tin nhắn "Vietcombank 0123456789 NGUYEN VAN A" để tự điền.

SAO LƯU VÀ ĐỒNG BỘ (TUỲ CHỌN)
• Đồng bộ với Google Sheet của bạn: dán đoạn Apps Script có sẵn trong Cài đặt vào Google Sheet, triển khai thành web app rồi dán link vào tiện ích. Dữ liệu nằm trong Sheet của chính bạn.
• Sao lưu vào Google Drive của bạn: tính năng này cần bạn tự tạo một OAuth Client ID (loại "Web application") trong Google Cloud Console và dán vào Cài đặt; phần Cài đặt có hướng dẫn từng bước. Tiện ích chỉ xin quyền drive.file, nghĩa là chỉ đọc và ghi đúng file sao lưu do nó tạo, không thấy các file khác trong Drive.
• Không cần dùng Google vẫn có thể xuất và nhập file JSON để sao lưu.

RIÊNG TƯ
• Dữ liệu lưu trên trình duyệt của bạn. Tác giả không có máy chủ, không thu thập dữ liệu, không quảng cáo.
• Ảnh thẻ VietQR chính thức và logo ngân hàng được tải từ VietQR.io; có thể tắt trong Cài đặt để mọi thứ chạy hoàn toàn offline.
• Kết nối Google và VietQR.io chỉ bật khi bạn chọn.

ỦNG HỘ TÁC GIẢ
Tiện ích miễn phí, không quảng cáo và không có tính năng trả phí. Nút ☕ "Mời tác giả một ly cà phê" trên thanh công cụ của tiện ích mở mã QR ví MoMo của tác giả để bạn ủng hộ nếu muốn. Việc ủng hộ hoàn toàn tự nguyện, không mở khoá thêm tính năng nào, và tiện ích không ghi lại việc bạn có chuyển tiền hay không.

Tiện ích không phải sản phẩm chính thức của NAPAS hay VietQR.io; "VietQR" và "NAPAS 247" là thương hiệu của chủ sở hữu tương ứng.

Phím tắt mở nhanh: Alt+Shift+Q.
```

## 3. Ảnh (Graphic assets)

| Mục | Kích thước | File |
|---|---|---|
| Biểu tượng cửa hàng | 128×128, hình 96×96 chừa viền trong suốt 16px theo hướng dẫn của Google | `store-icon-128.png` |
| Ảnh chụp 1 — danh sách tài khoản | 1280×800 | `screenshots/01-account-list-1280x800.png` |
| Ảnh chụp 2 — hộp thoại thẻ VietQR | 1280×800 | `screenshots/02-vietqr-card-1280x800.png` |
| Ảnh chụp 3 — thêm tài khoản, chọn ngân hàng | 1280×800 | `screenshots/03-add-account-1280x800.png` |
| Ô quảng cáo nhỏ | 440×280 | `promo-tile-440x280.png` |
| Ô quảng cáo marquee (tuỳ chọn) | 1400×560 | `marquee-1400x560.png` (dựng từ `marquee-tile.html`) |
| Video quảng cáo (tuỳ chọn) | URL YouTube | Để trống |

Dữ liệu trong ảnh chụp là dữ liệu mẫu, không phải người thật. Ảnh chụp và ô quảng cáo đều là PNG 24 bit không có kênh alpha, đúng yêu cầu của store.

**Các trường bổ sung:**

| Ô | Giá trị |
|---|---|
| URL chính thức | Để trống. Ô này chỉ nhận trang web đã xác minh quyền sở hữu trong Google Search Console; `github.io` không xác minh được. |
| URL trang chủ | https://qaqeqe0.github.io/so-tai-khoan-qr/ |
| URL hỗ trợ | https://github.com/qaqeqe0/so-tai-khoan-qr/issues |

Trang chủ, chính sách và hỗ trợ nằm trong repo công khai `qaqeqe0/so-tai-khoan-qr` (GitHub Pages). Sau khi tiện ích lên store, thay dòng "Sắp có trên Chrome Web Store" trong `index.html` của repo đó bằng liên kết tới trang store.

## 4. Privacy practices (tab Privacy)

**Single purpose** (mục đích duy nhất):

> Lưu sổ tài khoản ngân hàng của người dùng và tạo mã VietQR (chuẩn NAPAS 247) để nhận chuyển khoản. / Keep the user's book of bank accounts and generate VietQR (NAPAS 247) codes for receiving bank transfers.

**Giải trình quyền** (dán từng ô; tiếng Anh cho người duyệt):

| Quyền | Giải trình |
|---|---|
| `storage` | Stores the user's account book and settings locally in chrome.storage.local. Nothing is sent to the developer. |
| `activeTab` | When the user chooses "Scan VietQR on this page" from the context menu or popup, the extension captures the visible tab once to read the QR code locally. Used only on that explicit action. |
| `contextMenus` | Adds "Quét mã VietQR trên trang này" (scan this page) and "Thêm tài khoản từ mã QR trong ảnh này" (add account from this image) to the right-click menu. |
| `identity` | Signs the user in with Google (launchWebAuthFlow, drive.file scope) only when they turn on the optional Google Drive backup, so the extension can save its own backup file in the user's Drive. |
| `alarms` | Runs the optional background sync with the user's Google Sheet / Drive every 30 minutes when sync is turned on. |
| Optional host `script.google.com`, `script.googleusercontent.com` | Requested only when the user turns on Google Sheet sync; talks to the Apps Script web app the user deployed in their own Google account. |
| Optional host `www.googleapis.com` | Requested only for the optional Google Drive backup (Drive API, drive.file scope). |
| Optional host `api.vietqr.io` | Requested only when the user enters their own VietQR.io API key, to look up an account holder name. |
| Optional host `img.vietqr.io` | Reads the official VietQR card image (CORS-enabled) to redraw it as a PNG for download. |

**Remote code:** chọn **No, I am not using remote code**. Toàn bộ JavaScript và WebAssembly (jsQR, qrcode-generator, Tesseract.js cùng dữ liệu tiếng Việt) nằm trong gói; Tesseract được cấu hình đọc worker, core và dữ liệu ngôn ngữ từ thư mục `lib/tesseract` của tiện ích. CSP có `wasm-unsafe-eval` chỉ để chạy WebAssembly đóng gói sẵn.

**Data usage** — đánh dấu các loại dữ liệu tiện ích xử lý:

| Loại | Chọn | Lý do |
|---|---|---|
| Personally identifiable information | Có | Tên chủ tài khoản do người dùng lưu |
| Financial and payment information | Có | Số tài khoản ngân hàng |
| Authentication information | Có | API key VietQR.io, mã bí mật Apps Script, OAuth Client ID do người dùng nhập |
| Website content | Có | Ảnh chụp tab khi người dùng chọn quét QR (xử lý trên máy, không lưu) |
| Còn lại (health, location, communications, activity, browsing history…) | Không | |

Đánh dấu cả ba cam kết: không bán hoặc chuyển dữ liệu cho bên thứ ba ngoài các trường hợp được phép; không dùng cho mục đích không liên quan đến chức năng chính; không dùng để đánh giá tín dụng hoặc cho vay.

**Privacy policy URL:** https://qaqeqe0.github.io/so-tai-khoan-qr/privacy/

## 5. Ghi chú cho người duyệt (Test instructions)

```text
No account or login is needed. Click the toolbar icon, press "Thêm tài khoản" (Add account), pick a bank, type any account number and save; then press "Nhận tiền" or the QR thumbnail to open the VietQR code. Google Sheet/Drive sync and VietQR.io name lookup are optional and require the user's own Google Apps Script deployment / OAuth client ID / VietQR.io API key, so they cannot be exercised without those credentials. The coffee button opens the developer's own MoMo VietQR for voluntary donations.
```

## 6. Phân phối

- **Visibility:** Public (hoặc Unlisted để thử với người quen trước).
- **Regions:** Việt Nam (mã VietQR chỉ dùng được với ngân hàng Việt Nam), hoặc tất cả.
- **Pricing:** miễn phí.

## 7. Rủi ro khi duyệt và cách xử lý

| Rủi ro | Cách xử lý |
|---|---|
| "VietQR" và "NAPAS 247" là thương hiệu của NAPAS; ảnh thẻ chính thức có logo | Đã đổi tên tiện ích thành "Sổ tài khoản QR chuyển khoản" và thêm dòng "không phải sản phẩm chính thức" cuối mô tả. Logo chỉ nằm trên ảnh thẻ do VietQR.io cung cấp. |
| `tesseract.min.js` và `worker.min.js` chứa đường dẫn CDN mặc định (không dùng tới) | Nếu bị từ chối vì "remote code", trả lời người duyệt kèm giải thích ở mục 4, hoặc xoá các chuỗi CDN khỏi hai file rồi nộp lại. |
| Ảnh thẻ chính thức gửi số tài khoản và tên tới img.vietqr.io và đang bật sẵn | Đã ghi trong chính sách quyền riêng tư và mô tả. Có thể đổi mặc định sang thẻ vẽ offline nếu người duyệt yêu cầu. |
| Nút ủng hộ | Được phép; mô tả có mục "Ủng hộ tác giả" nói rõ là tự nguyện, không mở khoá tính năng, không ghi lại việc chuyển tiền. |
| Sao lưu Google Drive cần người dùng tự tạo OAuth Client ID | Hợp lệ; mô tả giải thích rõ bước này và phạm vi drive.file. Ghi chú cho người duyệt (mục 5) nói tính năng này cần thông tin đăng nhập của chính người dùng. |
