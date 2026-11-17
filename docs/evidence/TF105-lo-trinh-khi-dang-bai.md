# TF105 — Đăng reel kèm lộ trình (đã đi hoặc tự nhập)

- Jira: SCRUM-173 · Nhánh: `thang/TF105-lo-trinh-khi-dang-bai` (FE và BE) · Người làm: Thắng (dùng AI: có) · Ngày: 2026-11-17
- BE đi kèm: `tripflix-be-team/docs/evidence/TF105-lo-trinh-khi-dang-bai.md`

## Đã làm
- **Đăng reel theo bước** (mobile, chỉ video): chọn video → xem trước có tiếng (chạm dừng, nút loa) → chi tiết (caption, hashtag, công khai/riêng tư) → lộ trình (tuỳ chọn).
- **Soạn lộ trình**: lấy từ chuyến đã đi (đơn đã thanh toán) hoặc tự nhập; điểm đến chọn qua `/api/suggest`; mỗi ngày có các điểm (giờ, hoạt động, khách sạn, chặng di chuyển); kéo thả đổi thứ tự bằng bấm giữ; poster riêng hoặc dùng poster video.
- **Khách sạn**: điểm khách sạn bấm "Chọn khách sạn" → màn tìm khách sạn → chọn loại phòng → quay về. Một chuyến có **nhiều khách sạn**; mỗi điểm khách sạn là một chặng ở (nhận phòng ngày đó, trả khi sang khách sạn kế hoặc hết chuyến).
- **Chặng bay**: chọn sân bay đi thì sân bay đến mặc định theo điểm đến của chuyến; chiều về tự về sân bay nhà; nút "Thêm chiều về (khứ hồi)".
- **Đặt theo lộ trình**: báo giá, đổi khách sạn, đổi phòng, bỏ chọn và đặt từng chặng ở trong một đơn (tối đa 10 mục); ưu tiên loại phòng người đăng đã chọn.
- **Đăng chạy nền**: bấm Đăng về màn chính ngay; thẻ tiến độ (%) ở đầu trang cá nhân, lỗi thì Thử lại.
- **Trang Tôi**: lưới 3 cột sát mép kiểu TikTok, thẻ tiến độ; bấm reel mở màn xem riêng các reel của tác giả (`/user-reels`); bỏ ô "Bài chia sẻ" ở menu cài đặt.
- Tab Đặt lộ trình làm lại giao diện (commit `065e3cb`).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| User đã đi gắn lộ trình từ chuyến đã thanh toán khi đăng bài | Có | `buildTripDraftFromOrder` (`trip-plan.test.ts`), chọn chuyến trong `trip-plan-editor.tsx` |
| Tự nhập lộ trình theo ngày, có giờ, khách sạn, chặng bay | Có | `trip-plan.test.ts`: `buildTripAttachment`, `getTripPlanStays`, `pickTripFlightDestination` |
| Lộ trình có poster | Có | `posterMediaId`, BE kiểm poster là ảnh của tác giả (`trip-attachment.spec.ts`) |
| Người xem đặt được theo lộ trình, nhiều khách sạn | Có | `trip-booking-screen.tsx`, test `getBookableTripPlan` nhiều chặng ở |
| Affiliate | Hoãn | Theo thoả thuận, làm sau |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected` (FE): 25/25 task thành công.
- `packages/app-core`: 184/184 test qua.
- Chạy app thật: Expo Go trên iPhone và Expo web (Chrome) với core-api local: đăng reel 47 MB thành công, video-worker chuyển mã xong, reel hiện trong lưới trang cá nhân.

## Cách kiểm lại
1. Chạy BE local (core-api, video-worker) và `apps/mobile` bằng Expo; đăng nhập `member@tripflix.local`.
2. Bấm "+" → chọn video → Tiếp → nhập caption → "Chia sẻ lộ trình" → thêm điểm khách sạn ở ngày 1 và ngày 3, chặng bay → Đăng bài.
3. Về màn chính, xem thẻ % ở tab Tôi; xong thì reel hiện trong lưới Video.
4. Tab Đặt → chọn bài → thấy 2 thẻ khách sạn đúng ngày, số đêm đúng; bấm Đặt ngay.

## Ảnh / video
- Đính kèm trong PR (ảnh trang Tôi, trình soạn lộ trình, tab Đặt).
- Video reel ở local chỉ phát được khi CloudFront mở khoá thư mục `dev/` (anh Phong đang làm); bản staging phát bình thường.

## Ảnh hưởng tới phần của người khác
- `apps/mobile` (Trang): trình đăng bài, đặt lộ trình, xem lộ trình.
- `apps/mobile/src/features/account/public-profile-screen.tsx` (Dũng, TF47B): lưới 3 cột tính theo bề ngang lưới, thẻ tiến độ, bấm reel mở `/user-reels`.
- `apps/mobile/src/features/discovery/*` (Duy): chế độ chọn khách sạn `pick=post` ở màn tìm khách sạn.
- Client API sinh lại: chỉ giữ phần lộ trình và đơn hàng.
