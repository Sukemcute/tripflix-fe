# SCRUM-156 — Tinh gọn Tôi và Cài đặt

- Jira: https://tripflix.atlassian.net/browse/SCRUM-156
- Nhánh: `trang/SCRUM-156-profile-ui` · Trang (dùng AI) · 2026-11-19
- Base develop `fc65413b` đã merge PR #288. Không thay đổi nội dung SCRUM-145.

## Thay đổi

- Tab Tôi hiện hành dùng `MyProfileScreen` / `ProfileView`; nguồn audit `LiveProfileScreen` hiện đã là màn Cài đặt. Sửa đúng cả hai điểm vào hiện tại, không chuyển tab Tôi trở về menu cũ.
- UI/UX Pro Max: kết quả style `vibrant playful` → Vibrant & Block-based và hướng dẫn React Native. Giữ font Be Vietnam Pro, ảnh thương hiệu, vàng nắng/san hô/biển của màn Chuyến đi mới; bo card 10, nút/tab 6. Không thêm thư viện, gạch chân tab/chữ hoặc viền trang trí đầu card.
- Hồ sơ của mình có ảnh minh họa du lịch và tên 28/38, số thống kê thật 22/32, metadata 13/22; không giả ảnh avatar hoặc dữ liệu thống kê. Chữ viết tắt avatar là trang trí, tên đầy đủ vẫn có trong cây truy cập.
- Nhóm Cần bạn tiếp tục đặt trước các lối vào thông thường khi có đơn gần đây pending/paying hoặc bản nháp đã lưu trên server. Pending còn hạn mở checkout đúng orderId; paying mở chi tiết để kiểm tra, không tự thử trả tiền. Pending hết hạn không hiện nút tiếp tục thanh toán. Bản nháp gần nhất mở editor bằng `postId` đúng.
- Hai lối vào rõ nghĩa: Chuyến đi của tôi (đơn đặt chỗ/vé) và Nội dung đã lưu (Reels/bài viết). Không dùng tên Chuyến đi đã lưu cho bookmark nội dung.
- Bạn đã chia sẻ giữ Video / Bài viết / Đang kiểm tra của chính mình. Giữ luồng lưới Reels/vlog, nội dung held, tác vụ theo dõi và upload nền của team. Chỉ đổi style tab/held card của hồ sơ mình; hồ sơ người khác giữ giao diện và quyền truy cập hiện có.
- Cài đặt bỏ hàng shortcut và menu trùng Chuyến đi/Đã lưu/Chia sẻ. Còn hai nhóm: Tài khoản & gu du lịch; Hoạt động & trợ giúp. Giữ đường vào sửa tài khoản, khảo sát edit, thông báo, kiểm duyệt và Sheet trợ giúp.
- Guest có giới thiệu và đăng nhập; hai lối vào yêu cầu tài khoản giữ đúng `returnTo`. Không tải đơn/bản nháp riêng tư ở guest hoặc hồ sơ người khác. Lỗi tải có nhãn và nút thử lại, không bị hiểu là không có dữ liệu.

## Đối chiếu tiêu chí

| Tiêu chí Jira | Kết quả |
|---|---|
| Các nhóm có vai trò rõ, không hai tên đồng nghĩa | Một lối vào xem đơn/vé, một lối vào bookmark; nội dung của mình có tiêu đề riêng; Cài đặt không lặp lại |
| Guest/member, có/không pending/bản nháp | Browser fixtures đạt; pending, paying, expired, draft, empty và lỗi đều có ca kiểm tra |
| Bằng chứng trước/sau, phân biệt native | Ảnh Tôi/Cài đặt đính kèm Jira; QA JSON cùng nhánh; chưa có kiểm tra thiết bị native/usability với người mới |

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 22/22 tác vụ đạt. Cảnh báo cũ ngoài phạm vi còn tồn tại, không tắt lint/test.
- `node tools/check-boundaries.mjs`, `git diff --check`: đạt.
- `tools/verify-mobile-profile-ui.cjs`: app thật, auth/profile/order/post fixtures; 375/390/430 × 844. Mở đúng checkout/order/editor, danh sách đơn, bookmark và khảo sát edit. Không tạo/sửa/đăng bài hoặc charge thật.
- Kiểm tra card màu/bo 10/không viền đầu; mỗi lối vào chính đúng một lần; ba tab nội dung được đặt tên nhóm, vùng chạm >=48 và không underline. Public profile vẫn có nút Theo dõi hoạt động được; không đọc đơn/bản nháp riêng tư.
- Tên dài, chữ 140%, màn ngang 844×390 thao tác mở Đã lưu và tablet 768×1024 với reduced-motion/dark system preference là kiểm tra browser. App vẫn dùng theme sáng hiện có.
- Kết quả máy đọc: `SCRUM-156-profile-ui-qa.json`. Không page error hoặc tràn ngang trong các ca đã chạy.

## Cách kiểm lại

1. Chạy mobile preview cổng 8083. Đặt `PLAYWRIGHT_PACKAGE` tới Playwright đã cài, `MOBILE_EVIDENCE_DIR` tới thư mục output; chạy `node tools/verify-mobile-profile-ui.cjs` bằng Edge.
2. Đăng nhập → tab Tôi: kiểm tra đơn cần xử lý/bản nháp, Chuyến đi của tôi, Nội dung đã lưu và ba tab nội dung. Bánh răng mở Cài đặt, không còn hàng shortcut trùng.
3. Kiểm tra guest và một hồ sơ khác, tên dài, chuyển app/quay lại; không hiển thị hoặc tải dữ liệu riêng tư của tài khoản ở hồ sơ khác.

## Giới hạn / ảnh

- Phần ưu tiên là **preview trang đơn mới nhất** và **bản nháp server gần nhất** (`limit: 1`), không phải số đếm hoặc lịch sử đầy đủ. Không quét toàn bộ lịch sử ở mỗi lần mở Tôi; nút Xem đơn và vé dẫn tới danh sách phân trang. Bản soạn chưa lưu trên máy thuộc SCRUM-129, không coi là đã khôi phục trong task này.
- Chưa chạy Android/iOS thật, TalkBack/Dynamic Type lớn nhất, thao tác chọn media/upload nền hoặc cổng thanh toán thật. Chưa có usability session với người dùng mới; giữ In Review để xác nhận các phần này.
- Không đổi màu/kích thước tab bar hệ thống, API, schema, auth/payment operation, editor hoặc dữ liệu nghiệp vụ.
- Ảnh Jira: `SCRUM-156-before-after.png` (Tôi), `SCRUM-156-settings-before-after.png`, `guest-profile-390.png`.
- Ảnh du lịch ở header là minh họa thương hiệu, không khẳng định người dùng đã tới điểm đến đó.

## Ảnh hưởng

- `apps/mobile/src/features/account/{profile-hub,public-profile-screen,live-account-screens}.tsx` thuộc Trang; giữ luồng TF47/TF47B, lưới của Thắng, held và PostUploadCard của team.
- Bổ sung copy ở `packages/i18n/src/mobile.ts`; không sửa generated client, component dùng chung hoặc web/admin.
