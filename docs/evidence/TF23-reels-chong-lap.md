# TF23 — Reels app chống lặp giữa các phiên (tab Dành cho bạn đọc từ discovery)

- Jira: SCRUM-27 · Nhánh: `phong/TF23-reels-chong-lap` · Người làm: Phong (dùng AI: có) · Ngày: 2026-11-20
- BE: cần PR #319 của Duy (`mode=mixed`, `fresh=true`) merge trước. Client sinh từ contract của #319.

## Đã làm
- Trước đây tab Dành cho bạn của app đọc `GET /v1/feed?tab=for_you`: mỗi lần mở chỉ xáo lại bằng seed mới, không nhớ người xem đã được gợi ý bài nào. Web đã đọc discovery (PR #317 của Duy) nên chỉ app còn lặp.
- `apps/mobile/src/features/feed/reels-tab-source.ts`: chọn nguồn cho từng tab.
  - Dành cho bạn, đã đăng nhập: discovery `mode=mixed` (cứ ô thứ 4 là một bài Hot, còn lại là for_you). Discovery nhớ bài đã gợi ý 48 giờ (tối đa 100 bài) và đẩy chúng xuống ở phiên sau, bài đã tương tác (gồm lượt xem app gửi) cũng bị đẩy xuống.
  - Dành cho bạn, khách: giữ feed. Discovery không chống lặp cho khách và trả kiểu trending, trùng tab Đang hot.
  - Đang hot: giữ feed (`trend_scores` của TF111).
- `use-reels-tab-feed.ts`: hook trả danh sách và hàm tải lại của tab; gọi cả hai nguồn, chỉ bật nguồn tab đang dùng (hook không gọi có điều kiện được).
- `reels-screen.tsx`: danh sách, ảnh bìa tải trước và thao tác tải lại (nhấn lại icon Reels, vuốt xuống ở video đầu) dùng hook trên.
- `packages/api-client/src/feed.ts`: thêm `reloadRecommendedReels(queryClient, mode)`, cắt về trang đầu rồi gọi lại như `reloadReelsFeed`, và đánh dấu để trang đầu kế tiếp gửi `fresh=true`. Export thêm `RECOMMENDED_REELS_KEY`.
  - Lý do cần `fresh`: thử trên iPhone, vuốt xuống ở video đầu ra lại đúng danh sách cũ. Discovery coi 30 phút là một phiên và xếp hạng cố định, nên trang đầu không cursor trong 30 phút luôn giống nhau. `fresh=true` (thêm vào #319) coi mọi bài đã gợi ý tới lúc tải lại là đã xem.
  - Chỉ lần tải lại do người xem chủ động mới gửi `fresh`; mở app lần đầu vẫn theo phiên bình thường.
- `reel-social-overlay.tsx`, `live-post-detail-screen.tsx`: lúc thả tim hoặc lưu, hủy thêm request đang chạy của danh sách discovery, để trang về sau không đè trạng thái vừa bấm. Hàm cập nhật cache `updateReelSocialCache` vốn đã cập nhật danh sách này.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Người đăng nhập mở lại Reels không gặp lại ngay các bài vừa được gợi ý | Chờ thử máy thật | Mục "Thử trên máy thật" |
| Tab Đang hot và khách không đổi hành vi | Đạt | `reels-tab-source.test.mjs` (3 test) |
| Tải lại tab Dành cho bạn chỉ gọi lại trang đầu của đúng danh sách, gửi `fresh` đúng một lần | Đạt | `reload-recommended-reels.test.ts` (3 test) |
| `fresh=true` cho danh sách khác trang trước | Đạt (BE) | Test của #319; thử máy thật chờ #319 lên staging |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --filter=@tripflix/mobile --filter=@tripflix/api-client --filter=@tripflix/web`: 9/9 task đạt.
- api-client: 39 file, 330/330 test đạt.
- web: 514/514 test đạt (web vẫn dùng `useRecommendedReelsFeed`, không đổi hành vi vì không gọi `reloadRecommendedReels`).
- mobile: 6/6 test đạt.
- Lint: 0 lỗi; cảnh báo còn lại có sẵn từ trước, không nằm ở dòng đã sửa.

Đo trên VM staging (curl nội bộ, khách, 5 lần): `reels?mode=for_you` 67–89 ms, `/v1/feed?tab=for_you` 43–257 ms. Người đăng nhập chưa đo.

## Thử trên máy thật
<!-- điền sau khi thử -->

## Cách kiểm lại
1. Đăng nhập app, mở Reels, tab Dành cho bạn, ghi lại 5 bài đầu, lướt qua 2–3 trang.
2. Nhấn lại icon Reels (hoặc vuốt xuống ở video đầu) để tải lại: 5 bài cũ không đứng đầu nữa.
3. Đăng xuất: tab Dành cho bạn vẫn hiện và xáo như trước.

## Rủi ro đã biết
- Mở Reels từ thẻ video trong chat Tripi: app vẫn dò tối đa 5 trang Dành cho bạn để tìm đúng video. Danh sách đã cá nhân hóa nên khả năng không tìm thấy cao hơn trước; khi đó app mở ở video đầu như cũ.
- Màn chuyến đi nổi bật (`featured-trips`) vẫn đọc feed `for_you`, không đổi.

## Ảnh / video
- Đính trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/mobile` (Trang) — `reels-screen.tsx`, `reel-social-overlay.tsx`, `live-post-detail-screen.tsx`. Phong đã thống nhất với Trang nhận phần chuyển Reels mobile sang discovery.
- `packages/api-client` dùng chung: chỉ thêm hàm và export, không đổi hàm cũ.
- Đọc endpoint discovery của Duy. Tham số `fresh` thêm trên PR #319 của Duy (Phong làm, Duy duyệt).
