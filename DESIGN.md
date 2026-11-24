# DESIGN — Sổ tài khoản QR chuyển khoản

**Bản chất:** một sổ tay ngân hàng gọn gàng, đáng tin, giúp tạo mã chuyển khoản trong một cú bấm.

## Hướng thiết kế

- Giao diện sản phẩm (product UI), không phải trang marketing: gọn, rõ, một hành động chính cho mỗi màn.
- Popup 420px là nơi dùng nhiều nhất: dòng thu gọn, hành động chính là nút QR nền xanh. Chế độ toàn tab dùng thẻ lớn có ảnh thẻ VietQR thu nhỏ.
- Ảnh thẻ VietQR là điểm nhận diện: thẻ trong hộp thoại, ảnh thu nhỏ trên thẻ tài khoản, logo ngân hàng cạnh tên.

## Token (Tailwind 3, `src/styles/app.css`)

| Nhóm | Giá trị |
|---|---|
| Màu nhấn | `blue-600` cho hành động chính, lựa chọn và focus; `blue-50` cho nền nhạt |
| Trung tính | dải `slate` (nền `slate-50`, chữ `slate-900`, chữ phụ `slate-500`, viền `slate-200`) |
| Ấm | `amber` chỉ cho yêu thích (ngôi sao) và nút mời cà phê |
| Chữ | Inter 400/500/600/700 (`@fontsource/inter`); số tài khoản dùng `font-mono` |
| Bo góc | 8px (`rounded-lg`) cho nút và ô nhập; 12px (`rounded-xl`) cho thẻ và hộp thoại; tròn cho chip |
| Bóng | `shadow-sm` cho thẻ; bóng lớn chỉ cho lớp phủ (hộp thoại, danh sách thả xuống) |
| Biểu tượng | Font Awesome 6 solid/regular, một nét |

## Quy tắc thành phần

- **Vùng bấm:** tối thiểu 24×24px (WCAG 2.2, tiêu chí 2.5.8), nên 32px; nút chính 40–44px. Tăng vùng bấm bằng padding, không phóng to biểu tượng.
- **Form:** không để control mặc định của trình duyệt.
  - Dropdown có chevron.
  - Danh sách dài là combobox gõ để lọc (`bank-combobox.js`).
  - Checkbox tự vẽ.
  - Thanh cuộn mảnh.
- **Trạng thái:** mỗi phần tử tương tác có hover, `focus-visible` (vòng `blue-500`), active và disabled; hành động có toast phản hồi (`aria-live`).
- **Trạng thái trống:** nói rõ cái gì sẽ ở đây và đưa hành động đầu tiên, kèm gợi ý lần đầu (`empty-state-hints.js`).
- **Tên sản phẩm:** một dòng khi đủ chỗ; dưới 640px và trong popup thì tách hai dòng ("Sổ tài khoản" nhỏ trên, "QR chuyển khoản" đậm dưới), không bao giờ bị cắt "…".

## Chuyển động

- 150–250ms, `ease-out` khi mở; chỉ animate `opacity` và `transform`.
- Hộp thoại: `fade-in` nền + `pop-in` 200ms.
- `prefers-reduced-motion: reduce`: tắt animation hộp thoại và transition; giữ vòng focus và con xoay đang tải.
- Ảnh thẻ thu nhỏ chỉ mờ-tới-rõ khi rê chuột ở thiết bị có chuột (`@media (hover: hover)`).

## Kích thước kiểm tra

Popup 420×600 · điện thoại 375×812 · máy tính bảng 768×1024 · máy tính 1440×900.

## Giọng văn

Tiếng Việt ngắn gọn, nói kết quả cho người dùng ("Tải mã QR", "Nhận tiền", "Sao chép thông tin"). Nội dung chuyển khoản trong mã QR không dấu. Không quảng cáo, không thúc ép; nút ủng hộ luôn ghi rõ là tự nguyện.

## Nên / không nên

| Nên | Không nên |
|---|---|
| Một hành động chính nổi bật mỗi dòng hoặc mỗi thẻ | Nhiều nút cùng màu xanh tranh nhau |
| Logo ngân hàng kèm tên, tooltip khi chỉ có logo | Chỉ có logo mà không có tên hoặc tooltip |
| Giữ dữ liệu trên máy, nói rõ khi gửi đi đâu | Gửi dữ liệu ra ngoài khi người dùng chưa bật |
| "mã VietQR" để mô tả chuẩn hỗ trợ | Dùng "VietQR" trong tên sản phẩm (thương hiệu của NAPAS) |
