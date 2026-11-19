# TF25 — Reels web: bỏ bài đã nhả nguồn khỏi danh sách sẵn sàng

- Notion: TF25 · Nhánh: `thanh/TF25-reels-sua-bai-san-sang` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
- **Lỗi:** `readyPostIdsRef` trong trình xem Reels (`live-posts.tsx`) chỉ thêm bài khi video có hình đầu tiên, không bao giờ xoá. Bài rời cửa sổ video (N-1..N+2) bị gỡ thẻ `<video>`, nguồn và bộ đệm bị nhả, nhưng vẫn bị coi là "đã có hình". Ví dụ: xem bài 5, lướt lui về bài 2 (bài 5 bị nhả nguồn), lướt tới bài 4. Lúc này `navigateStep` thấy bài 5 "sẵn sàng" nên không chặn (`canStepToNextReel`), và người xem lướt vào vòng chờ thay vì đứng lại với thông báo "Đang tải video tiếp theo".
- **Sửa:** thêm hàm thuần `pruneReadyReelIds` (`reel-post.ts`). Hàm chỉ giữ những bài còn trong cửa sổ video (`getReelRenderMode === 'video'`) và còn trong danh sách, rồi trả về một Set mới. Trình xem gọi hàm này mỗi khi `posts` hoặc `activeIndex` đổi.
- Không đụng `reel-hls.ts`, luồng cookie (`usePlaybackSession`, `onAuthError`) hay `packages/*`. Không đổi chữ ký hàm nào đang dùng.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Bài rời cửa sổ rồi quay lại không còn được coi là sẵn sàng | Có | `reel-post.test.ts` › `pruneReadyReelIds` › bài rời cửa sổ video (đã nhả nguồn) rồi quay lại thì không còn được coi là có hình. Test tái hiện đúng kịch bản 5 → 2 → 4 và kiểm `canStepToNextReel` chặn |
| Bài đang trong cửa sổ vẫn giữ trạng thái | Có | `reel-post.test.ts` › bài còn trong cửa sổ video giữ trạng thái đã có hình |
| Bài bị bỏ khỏi danh sách (bỏ lưu) bị bỏ, không sửa Set cũ | Có | `reel-post.test.ts` › bài bị bỏ khỏi danh sách (bỏ lưu) cũng bị bỏ; không sửa Set cũ |

## Kết quả kiểm tra
Chạy trong `apps/web` (binary trong `node_modules`):
- Lint `oxlint -c ../../.oxlintrc.json src`: 0 lỗi, 28 warning (giữ nguyên số warning, không có warning mới ở dòng đã sửa).
- Typecheck `next typegen && tsc --noEmit`: pass.
- Test `vitest run`: 49 file, 359 test pass.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web test -- reel-post` để chạy test mới.
2. Chạy tay: mở Reels, lướt xuống tới bài thứ 6, lướt lên 3 bài, rồi lướt xuống liên tục. Lúc tới bài thứ 5, bài thứ 6 đang tải lại. Mong đợi: hiện "Đang tải video tiếp theo" và đứng lại (tối đa 3 giây) thay vì lướt vào vòng chờ. Nên bật DevTools Network → Slow 4G để dễ thấy.

## Ảnh / video
- Không đổi giao diện. Chưa kiểm tay trên trình duyệt trong phiên này (không có trình duyệt đăng nhập được), cần anh Thành thử theo bước 2 ở trên.

## Ảnh hưởng tới phần của người khác
- Không. Chỉ sửa `live-posts.tsx`, `reel-post.ts` và `reel-post.test.ts` (phần web, chủ Thành). Không đụng luồng cookie của anh Phong.
