# TF110 — Làm lại giao diện trang Trạng thái kiểm duyệt (web)

- Notion: chưa có task · Nhánh: `dung/TF110-giao-dien-kiem-duyet` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-18

## Đã làm
- Trang `/account/moderation` trước đây là chữ trơn ngăn bằng đường kẻ, "Gửi khiếu nại" trông như chữ thường. Người dùng khó biết nội dung nào bị xử lý và còn khiếu nại được không.
- Chia 2 tab: **Quyết định** và **Báo cáo của tôi**.
- Mỗi quyết định là một thẻ bo tròn: loại nội dung, nhãn trạng thái có màu (tạm ẩn/đã ẩn vàng, đã gỡ coral, đã khôi phục teal, đã đóng xám), thời gian, nội dung trích trong khung, lý do có icon cờ và nhãn coral.
- Khiếu nại hiện thành khung màu theo trạng thái: đang xem xét, được chấp nhận, giữ nguyên.
- "Gửi khiếu nại" là nút thật (`primary-button`) kèm "Còn N ngày để khiếu nại" (30 ngày từ lúc ra quyết định, cùng quy tắc với BE).
- Trạng thái trống có icon; đang tải dùng `LoadingDots`.
- Chữ hiển thị chuyển vào `packages/i18n` (`moderation.myStatus`), màu lấy từ token.
- Không đổi API hay logic khiếu nại.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Mỗi quyết định là một thẻ, có nhãn trạng thái màu | Có | `moderation-status.tsx`, ảnh trong PR |
| "Gửi khiếu nại" là nút thật, có trạng thái hết hạn/đã gửi | Có | `moderation-status.tsx`, ảnh trong PR |
| Số ngày còn hạn tính đúng | Có | `appeal-days.test.ts` |
| Trống / đang tải dùng `LoadingDots` | Có | `moderation-status.tsx` |
| Không đổi API, logic khiếu nại | Có | diff chỉ đổi JSX/CSS/i18n, cùng các lời gọi `moderationApi` |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/i18n`: 6/6 task pass.
- web: 34 file test, 220 test pass.
- i18n: 1 file test, 2 test pass.

## Cách kiểm lại
1. Chạy API và `pnpm dev` trong `tripflix-fe`.
2. Đăng nhập tài khoản có bình luận/bài bị kiểm duyệt, mở `http://localhost:3100/account/moderation`.
3. Xem tab Quyết định, bấm "Gửi khiếu nại", gửi một lý do; khung "Đã gửi khiếu nại · Đang xem xét" hiện ra.
4. Chuyển sang tab Báo cáo của tôi.

## Ảnh / video
- Ảnh trước/sau trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web` (Thành) — cần Thành duyệt. `packages/i18n` chỉ thêm khoá mới. Không đụng `content/moderation` (Trang).
