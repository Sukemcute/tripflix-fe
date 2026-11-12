# TF28 — Trang Cảm hứng hiện bài gợi ý theo gu

- Notion: chưa có link · Nhánh: `duy/TF28-cam-hung-goi-y-bai` · Người làm: Duy (dùng AI: có) · Ngày: 2026-11-12
- Phụ thuộc PR BE: Sukemcute/tripflix-be#161 (endpoint `GET /api/recommendations/posts`)

## Đã làm
- Sinh lại api-client từ contracts của PR BE #161.
- `recommendPublicPosts` (`packages/api-client/src/explore-search.ts`): lấy danh sách gợi ý rồi lấy chi tiết từng bài, trả cùng dạng trang với `socialApi.listPosts`.
- `useSocialPosts` thêm tham số tuỳ chọn `publicSource` (`'latest'` mặc định, `'recommended'`). Các màn khác không đổi.
- Trang Cảm hứng (`social-feed-view.tsx`): feed không có từ khoá dùng `'recommended'`; có từ khoá vẫn dùng tìm kiếm của discovery.
- Feed gợi ý lấy 7 bài một lần (`RECOMMEND_PAGE_SIZE`), tự gọi trang sau khi bài kế cuối của phần đã tải hiện ra (còn 2 bài chưa xem), không phụ thuộc chiều cao bài. Duy yêu cầu, Thành đồng ý.
- Thả tim/lưu bài: không tải lại feed gợi ý (đã cập nhật tại chỗ). Trước đây tải lại làm bài vừa thích biến mất và các bài bên dưới xô lệch.
- Gửi bình luận: các màn khác gọi `invalidateQueries(['social'])`, trước đây làm feed gợi ý tải lại mọi trang với trang 1 mới, sinh trùng key và một loạt request. `recommendedPage` dùng lại trang đã tải.
- Admin: 2 trang mới **Job tìm kiếm** (`/search-jobs`) và **Job gợi ý** (`/recommend-jobs`), owner Duy, Trang đồng ý. Xem 20 lần chạy gần nhất của từng job (cách chạy, kết quả, thời lượng, tóm tắt, lỗi), số liệu gợi ý; nút **Chạy ngay** chỉ hiện với superadmin, khoá khi job đang chạy. Làm mới 2 giây khi có job đang chạy, 30 giây khi không. Gọi API `GET/POST /api/v1/admin/discovery/jobs` của PR BE #161.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Cảm hứng gọi endpoint gợi ý | Có | Network: `GET /api/recommendations/posts?mode=for_you&limit=10&postType=vlog` → 200, rồi `GET /api/v1/posts/{id}` từng bài |
| Khách thấy bài thịnh hành, đăng nhập thấy bài theo gu | Có | Kiểm trên stack local với `member@tripflix.local` |
| Thả tim không làm feed trống hay xô lệch | Chưa kiểm tay | Sửa sau khi Duy báo lỗi; BE đã kiểm bằng script (tải lại 2 trang sau khi thả tim, không rỗng). Cần reviewer bấm thử trên web |
| Thứ tự gợi ý giữ nguyên, bài lỗi chi tiết bị bỏ | Có | `recommend-public-posts.test.ts` |
| Mỗi lần gọi 7 bài, gọi tiếp ở bài 5–6 | Có | Web local (khách): gọi gợi ý lần 2 khi đang xem bài 5, lần 3 ở bài 12, lần 4 ở bài 19; request `limit=7` |
| Bấm chạy job, theo dõi tới khi xong | Có (API) | Stack local, superadmin: `recommend_build` 202 → `running` → `succeeded` sau ~1 s, tóm tắt 243 bài · 2 người; `explore` `running` → `succeeded` 3,75 s, 2.443 mục; bấm lần 2 khi đang chạy → `accepted: false`. Màn admin: chưa chụp (cần đăng nhập trên admin) |
| Moderator xem được, không chạy được | Có (API) | moderator: GET 200, POST 403; nút ẩn khi `role !== 'superadmin'` |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 20/21 task pass. `@tripflix/mobile#typecheck` lỗi ở `src/features/booking/hotel-screen.tsx:81` (`/hotel-rooms`), có sẵn trên develop, không do nhánh này.
- `pnpm --filter @tripflix/admin typecheck` pass; lint admin không có cảnh báo mới. Admin chưa có test runner nên trang job chưa có test component (thêm vitest cho admin cần hỏi Thành).

## Cách kiểm lại
1. Chạy stack BE ở nhánh PR #161, `pnpm --filter @tripflix/web dev`.
2. Mở `/inspiration` khi chưa đăng nhập và khi đã đăng nhập; xem Network.
3. Thả tim một bài: feed không tải lại.
4. `pnpm --filter @tripflix/admin dev`, đăng nhập superadmin, vào **Job gợi ý** / **Job tìm kiếm**, bấm **Chạy ngay**.

## Ảnh / video
- Không có thay đổi giao diện; thứ tự bài khác.

## Ảnh hưởng tới phần của người khác
- Có: `packages/api-client` và `apps/web` của Thành. Chỉ thêm hàm và một tham số tuỳ chọn, đổi 2 dòng trong `social-feed-view.tsx`. Merge với `77159ee` (Thành, kết quả tìm dạng grid): giữ luồng tìm kiếm mới. Cần Thành duyệt.
- Có: `apps/admin` (Thành): thêm 2 route, 2 mục menu `owner: 'Duy'`, 2 nhãn vào `MODERATOR_PAGES` và một nhánh trong `live-workspace.tsx`; không đổi logic có sẵn. `packages/i18n`: thêm `discovery-jobs.ts` và 2 nhãn menu. Không đụng trang Theo dõi tìm kiếm của Trang.
