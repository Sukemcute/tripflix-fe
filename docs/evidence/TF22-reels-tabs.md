# TF22 — Reels: tab Dành cho bạn / Đang hot

- Task: TF22 (Jira SCRUM-26, [Notion TF22](https://app.notion.com/40dcb9b9e5c281c18c1dcb63040aa066)) · Nhánh: `phong/TF22-reels-tabs` · Người làm: Phong (dùng AI: có) · Ngày: 2026-11-10

## Đã làm
- Thanh tab trên Reels: Dành cho bạn, Đang hot, Đang theo dõi.
  - Vuốt ngang hoặc bấm tab để đổi.
  - Danh sách cũ rời màn hình rồi mới đổi sang danh sách mới. Ảnh bìa video đầu của tab bên cạnh được tải trước, nên lúc vuốt không bị khung đen.
  - Tab Đang theo dõi hiện "Sắp ra mắt".
- Tab Đang hot gọi `GET /api/v1/feed?tab=hot`. Core xếp theo tổng tương tác có trọng số. Bỏ bài trùng khi điểm của bài thay đổi lúc đang lướt.
- Lớp tương tác trên video làm lại. Bảng bình luận có nút thích bình luận (`PUT /api/v1/comments/:id/reaction`). Khối tóm tắt AI gọn hơn, có hiệu ứng mở.
- Trang chi tiết bài tách khỏi `live-feed-screen.tsx` sang `live-post-detail-screen.tsx`, có thanh hành động. Vuốt từ mép trái để quay lại.
- Thanh tab dưới nền đen; nút Đăng bài dùng gradient (`expo-linear-gradient`).
- Merge `develop`, giữ thay đổi của cả hai bên:
  - mở đúng reel từ thẻ video trong chat Tripi, tự về tab Dành cho bạn;
  - ô tìm kiếm trên Reels đổi thành nút kính lúp ở góc phải thanh tab, vì header cũ đã thay bằng thanh tab;
  - báo cáo bài, xử lý bài 404 và tên thật tác giả chuyển sang trang chi tiết mới.

## Đối chiếu "Xong khi"
| Tiêu chí (chép từ task) | Đạt | Bằng chứng |
|---|---|---|
| Hai tab hoạt động | Đạt | Tab Dành cho bạn và Đang hot đều gọi API thật. Staging trả `200` cho `tab=hot`. |
| Mỗi video có lý do dựa trên số liệu thật (lượt lưu, số người đặt theo lộ trình 7 ngày) | Chưa | Chưa có trên app, và API feed chưa trả lý do. |
| Dấu "Đã xác thực", địa điểm, thẻ lộ trình, nút "Đặt y chang" trên video | Chưa | Chưa làm trong nhánh này. |
| Bảng tin hợp gu hơn sau khi thích, lưu, lướt qua | Chưa | Tab Dành cho bạn vẫn xếp mới nhất trước. |

## Kết quả kiểm tra
- Sau khi merge `develop` mới nhất (đã có TF24):
  - `pnpm turbo run lint typecheck test`: 23/23 task đạt.
  - `node tools/check-boundaries.mjs`: không vi phạm.
  - `api-client`: 129/129 test. `app-core`: 73/73 test, gồm test `reels.ts` (chọn tab sau khi vuốt, ảnh bìa tải trước).
- Commit reels `04511bf` cũng được kiểm riêng trước khi merge: 23/23 task, `api-client` 76/76, `app-core` 43/43.
- Chưa có ảnh hay video quay màn hình. Phần merge với develop chưa chạy trên điện thoại.

## Cách kiểm lại
1. `pnpm install && pnpm turbo run lint typecheck test`
2. `EXPO_PUBLIC_API_URL=https://api.tripflix.io.vn pnpm --filter @tripflix/mobile start --go --tunnel --clear`
3. Mở tab Reels, vuốt ngang qua lại giữa Dành cho bạn, Đang hot, Đang theo dõi.
4. Bấm kính lúp mở Khám phá. Bấm vào một bài để mở chi tiết, vuốt từ mép trái để quay lại.

## Ảnh / video
- Bổ sung trong PR sau khi quay trên điện thoại.

## Ảnh hưởng tới phần của người khác
- `apps/mobile` (chủ: Trang): sửa màn Reels, bình luận, tóm tắt AI, thanh tab dưới, `_layout.tsx`.
- Gộp với phần của người khác khi merge develop:
  - chat Tripi (Trang);
  - tìm kiếm trên Reels (Duy, TF27);
  - tên thật tác giả, báo cáo (TF25, TF32);
  - cảnh báo an toàn trong tóm tắt (Trang, TF14).
- `packages/tokens`: thêm 4 màu (`tabBar`, `composeStart`, `composeEnd`, `composeIconShadow`).
