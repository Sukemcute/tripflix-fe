# TF46F — Số thông báo chưa đọc và trang thông báo mới trên mobile

- Notion: (chưa có link) · Nhánh: `dung/TF46F-huy-hieu-va-trang-thong-bao` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-16

## Đã làm
- **Chuông có số chưa đọc:** `NotificationBell` thay cho chuông cũ ở Khám phá và Chuyến của tôi. Số lấy từ `unreadCount` của `GET /notifications`; quá 9 thì hiện "9+", bằng 0 thì ẩn. Socket `/ws` (TF46E) làm mới danh sách nên số tự đổi.
- **Tab Khám phá có cùng số:** `(tabs)/_layout` truyền `tabBarBadge`, còn `FloatingTabBar` vẽ huy hiệu `UnreadBadge` ở góc icon. Trình đọc màn hình đọc "Khám phá, 3 thông báo chưa đọc".
- **Trang thông báo thiết kế lại** (`features/account/notifications-screen.tsx`):
  - icon và màu theo loại: bình luận, cảm xúc, kiểm duyệt, theo dõi, đơn;
  - mục chưa đọc có nền cam nhạt, tiêu đề đậm và chấm đỏ;
  - đoạn trích bình luận nằm trong khung xám;
  - thời gian ghi kiểu "5 phút trước", "Hôm qua";
  - danh sách chia "Hôm nay" và "Trước đó";
  - nút "Đọc hết" ở đầu trang, và màn trống có lời giải thích.
- Phần logic không phụ thuộc giao diện nằm ở `packages/app-core/notification-display.ts`: tính thời gian, so sánh cùng ngày và chữ trên huy hiệu.
- Chữ mới nằm trong `packages/i18n` (`mobile.notifications.*`). Không thêm thư viện.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chuông hiện số chưa đọc | Chờ thử trên máy | `notification-display.test.ts` (ẩn khi 0, "9+") |
| Tab Khám phá hiện số chưa đọc | Chờ thử trên máy | như trên |
| Trang thông báo đẹp hơn | Chờ thử trên máy | `notification-display.test.ts` (vừa xong, phút, giờ, hôm qua, ngày; giờ lệch tương lai) |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 21/21 task pass.
- app-core: 172 test pass, trong đó 8 test mới.
- Lint 0 lỗi. Cảnh báo còn lại đều có sẵn ở các file reels.

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/mobile start -c`, mở bằng Expo Go và đăng nhập tài khoản A.
2. Dùng tài khoản B bình luận hoặc thích bài của A. Chuông và tab Khám phá hiện số tăng lên.
3. Mở trang Thông báo: mục mới nằm trong "Hôm nay", có nền cam nhạt và chấm đỏ. Bấm "Đọc hết" thì số trên chuông và tab biến mất.

## Ảnh / video
- (Sẽ thêm vào PR sau khi thử trên máy.)

## Ảnh hưởng tới phần của người khác
- Có, `apps/mobile` (của Trang):
  - `(tabs)/_layout.tsx`, `components/floating-tab-bar.tsx`, `features/discovery/live-discovery-screens.tsx`, `features/booking/trips-screen.tsx`: chỉ thay chuông và thêm huy hiệu;
  - `features/account/live-account-screens.tsx`: màn thông báo cũ (khoảng 55 dòng) chuyển sang file mới.
- Cần báo Trang.
