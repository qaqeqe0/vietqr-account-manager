# AGENTS — hướng dẫn cho agent làm việc trong repo này

- Repo có hai nhánh cần clone cạnh nhau: `main` (thư mục `vietqr-account-manager-vite`, bản Tailwind) và `plain` (thư mục `vietqr-account-manager-extension`, toàn bộ logic dùng chung). Xem `README.md`.
- **Trước khi sửa giao diện:** đọc [DESIGN.md](DESIGN.md) (token, quy tắc thành phần, chuyển động, giọng văn).
- **Sau khi sửa giao diện:** kiểm tra theo [REVIEW.md](REVIEW.md) ở đủ 4 kích thước (popup 420×600, 375×812, 768×1024, 1440×900) và đính ảnh chụp.
- Sửa logic dùng chung ở nhánh `plain` (`src/`), rồi chạy `npm run build` ở đây. Bản Vite chỉ thay phần hiển thị (`popup.html`, `src/ui-helpers.js`, `src/account-list-view.js`, `src/account-row-compact.js`, `src/styles/app.css`).
- Khi sửa `docs/store/privacy-policy.html`, chép nội dung sang `privacy/index.html` của repo `qaqeqe0/so-tai-khoan-qr` (GitHub Pages) để trang công khai cập nhật.
- Khi giao diện đổi đáng kể, chụp lại ảnh store trong `docs/store/screenshots/` (1280×800) và cập nhật `docs/store/chrome-web-store-listing.md`.
- Không đổi tên file sao lưu Drive `so-tai-khoan-vietqr.json` hay khoá lưu trữ `vietqrAccountManager`: dữ liệu cũ của người dùng phụ thuộc vào chúng.
