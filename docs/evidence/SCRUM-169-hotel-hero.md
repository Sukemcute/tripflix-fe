# SCRUM-169 — Hero và nhận diện khách sạn

- Jira: https://tripflix.atlassian.net/browse/SCRUM-169
- Nhánh: `trang/SCRUM-169-hotel-hero` · Người làm: Trang (có dùng AI)
- Ngày: 2026-11-18

## Đã làm

Hero cũ đổi chiều cao theo phần thông tin phía dưới; tên và địa chỉ chỉ được dùng khoảng 68–70% bề rộng để nhường chỗ cho mascot/mảng trang trí. Baseline bằng ảnh tải thành công cho thấy tên dài bị bẻ thành nhiều dòng. Không kết luận ảnh bị trống trên mọi nền tảng: preview với ảnh fixture hợp lệ đã tải được ảnh trước khi sửa.

Ảnh đầu trang mới cao tối đa 230 px, 180 px khi màn thấp. Tên dùng toàn bề ngang, cỡ 26/36, địa chỉ 14/23; bỏ mascot và khối trang trí trong vùng nhận diện. Có nhãn Hạng N sao riêng với Điểm từ khách, số đánh giá và nguồn. Thiếu hạng sao hoặc chưa có đánh giá được nói rõ; count bằng 0 không bị trình bày thành điểm đánh giá thật.

Giá theo đêm và nút Chọn phòng cố định, cỡ chữ CTA 15/24, vùng chạm cao 52 px. Bo nhẹ 6 px cho điều khiển, không thêm chữ gạch chân hay viền trang trí đầu card. Bản đồ, giỏ và đường quay lại được giữ; tham số ngày, người lớn, trẻ em và em bé truyền qua màn phòng giữ nguyên.

Gallery dùng chung có trạng thái đang tải, không có ảnh, ảnh lỗi và thử tải lại từng ảnh. Ảnh chưa tải giữ nguyên chiều cao; lỗi không chặn xem thông tin/chọn phòng. Ảnh đại diện được dùng khi danh sách ảnh rỗng. Gallery vẫn lướt ngang, thêm điều khiển Trước/Tiếp 44 px và bộ đếm rõ; slide ngoài vùng chọn được ẩn khỏi cây truy cập. Dành chỗ riêng cho pager để nút retry không chồng lên pager trên hero thấp. Màn phòng dùng chung gallery được kiểm tra lại.

## Đối chiếu nghiệm thu

| Tiêu chí                                 | Kết quả          | Bằng chứng                                                                                        |
| ---------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| Tên dài, hạng sao/điểm khách tách biệt   | Đạt trên preview | 375/390/430 px, tên không line clamp và xuất hiện trước y=300                                     |
| Thiếu sao/review/ảnh, thumbnail fallback | Đạt với fixtures | Empty state, count 0, ảnh đại diện đơn không có pager giả                                         |
| Ảnh lỗi/chậm                             | Đạt với fixtures | Retry thành công; pending không chặn CTA; tên giữ y trước/sau tải; retry không đè pager ở 375×667 |
| Hành động và dữ liệu được giữ            | Đạt với fixtures | Gallery khách sạn/phòng, CTA giữ id/ngày/người lớn/trẻ em/em bé khi chuyển màn, quay về hoạt động |
| Native và cỡ chữ hệ thống                | Chưa chạy        | Text 140% mới là mô phỏng browser, không thay thế native                                          |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 22/22 tác vụ thành công; mobile còn 19 cảnh báo ở code ngoài phần thay đổi, không có cảnh báo mới ở hotel-screen/hotel-parts.
- `node tools/check-boundaries.mjs`, `git diff --check`: đạt.
- `node tools/verify-mobile-hotel-hero.cjs`: đạt 3 kích thước, không page error; kiểm tra cả gallery dùng chung ở phòng, title dài, CTA, dữ liệu điều hướng, ảnh lỗi/retry/slow/empty/thumbnail và thiếu sao/review.
- Kết quả máy đọc: `SCRUM-169-hotel-hero-qa.json`.
- API và ảnh dùng fixture; ảnh là asset khách sạn hiện có trong repo, không gán cho khách sạn thật. Không tạo đơn hoặc ghi dữ liệu backend.
- Chưa xác nhận thiết bị Android/iOS, font scale, bàn phím/trình đọc màn hình native hoặc gallery qua mạng thật. Không đồng nhất kết quả preview với native.

## Cách kiểm lại

1. Khám phá → chọn khách sạn có tên dài. Đọc tên, địa chỉ, hạng sao, điểm khách và nguồn; thử ở 375/390/430 px.
2. Lướt ảnh hoặc dùng Trước/Tiếp. Thử ảnh lỗi, mạng chậm, không có ảnh và trường hợp chỉ có thumbnail; thử tải lại mà không mất thông tin khách sạn.
3. Chọn phòng, đối chiếu ngày và đủ ba nhóm khách; thử gallery ảnh phòng rồi quay lại.
4. Chạy script với `PLAYWRIGHT_PACKAGE` trỏ Playwright, `MOBILE_PREVIEW_URL` trỏ Metro (mặc định 8083), `MOBILE_EVIDENCE_DIR` là thư mục đầu ra. Script dùng Edge headless; `CAPTURE_BASELINE=1` chỉ dành cho bản chưa sửa.

## Ảnh và phạm vi

- Ảnh trước/sau, lỗi ảnh trên màn thấp và empty state đính kèm Jira. Bản local: `outputs/mobile-hotel-hero-2026-11-18`; không commit PNG.
- Mobile thuộc Trang; i18n chỉ thêm nhãn. Không thay hợp đồng API, lọc phòng, tính giá, tồn kho hoặc checkout; phần thông tin/chính sách/review phía dưới giữ nguyên.
- Nhánh bám `develop` tại `43c45e14`, trong đó commit `bf6bf64` đã hoàn tác SCRUM-131. PR này không phục hồi hoặc thay đổi lại phần SCRUM-131.
- Giữ task In Review, assignee trống. Không đóng thay SCRUM-137 hoặc SCRUM-142; native vẫn cần xác nhận.
