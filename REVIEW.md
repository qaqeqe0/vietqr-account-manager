# REVIEW — checklist UX/AX

Dùng khi review mọi thay đổi giao diện của tiện ích. Thay đổi giao diện phải kèm ảnh chụp ở đủ 4 kích thước.

## Kích thước bắt buộc

| Tên | Kích thước | Ghi chú |
|---|---|---|
| Popup | 420×600 | Chế độ dùng chính. Ngoài Chrome, giả lập bằng cách tiêm `chrome.runtime` và `chrome.storage.session` trước khi trang tải |
| Điện thoại | 375×812 | Chế độ toàn tab |
| Máy tính bảng | 768×1024 | |
| Máy tính | 1440×900 | |

Màn cần chụp: danh sách, hộp thoại mã QR, form thêm tài khoản (danh sách ngân hàng mở), Cài đặt, hộp thoại mời cà phê, trạng thái trống.

## Rubric (0–3 mỗi mục, dưới 2 phải có đề xuất)

1. Ấn tượng đầu tiên: trong 5 giây biết đây là gì và bấm vào đâu.
2. Nhận diện: tên không bị cắt, màu nhấn và ảnh thẻ VietQR nhất quán.
3. Nội dung: nhãn nói kết quả, không thừa chữ.
4. Rõ ràng: một hành động chính mỗi màn.
5. Hướng dẫn lần đầu: trạng thái trống có hành động và gợi ý.
6. Tin cậy: phiên bản và chính sách quyền riêng tư trong Cài đặt.
7. Chuyển động: 150–250ms, tôn trọng `prefers-reduced-motion`.
8. Responsive: không tràn ngang, không cắt chữ, không chồng lấn.
9. Truy cập: vùng bấm ≥ 24px, `focus-visible`, nhãn cho nút chỉ có biểu tượng, toast `aria-live`.
10. Cảm giác hiệu năng: popup mở nhanh, OCR chỉ tải khi quét, ảnh `loading="lazy"`.

## Kiểm tra tự động

- `npm run build` thành công.
- Script đo: `document.documentElement.scrollWidth - clientWidth === 0`, và không phần tử bấm được nào nhỏ hơn 24×24px ở cả 4 kích thước.
- Trang chính sách: `node render-check.mjs <privacy-policy.html>` (skill `ak-frontend-design`) báo "no findings" ở 375, 768, 1440px.

## Bề mặt công khai (AX)

- Chính sách quyền riêng tư: `https://qaqeqe0.github.io/so-tai-khoan-qr-privacy/` (repo `qaqeqe0/so-tai-khoan-qr-privacy`, file `index.html` chép từ `docs/store/privacy-policy.html`). Phải trả về 200 cho OAI-SearchBot và Claude-SearchBot.
- Hồ sơ Chrome Web Store: `docs/store/chrome-web-store-listing.md`; ảnh store tạo lại khi giao diện đổi.
