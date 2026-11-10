# TF10 — Sửa giật ở dải "Có phòng cho chuyến đi sắp tới" (trang chủ web)

- Task: phản hồi của Bảo sau TF10 (chưa có ticket riêng) · Nhánh: `bao/TF10-sua-giat-dai-phong` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-10

## Đã làm
- **Viền răng cưa nhảy một phát khi cuộn tới:** cả dải có `data-home-reveal`, nên lần đầu vào màn hình nó chạy `section-arrive` (dịch 26px, mờ 0.48 → 1) trên toàn bộ dải, gồm mép giấy và ảnh nền blur. Bỏ `data-home-reveal` khỏi dải này; chip và thẻ vẫn có hiệu ứng theo cuộn riêng.
- **Thẻ biến mất khi đổi điểm đến:** query đổi key nên `data` rỗng trong lúc tải. Thêm `placeholderData: keepPreviousData`, 3 thẻ cũ ở lại (mờ 60%, `aria-busy`) cho tới khi có dữ liệu mới.
- **Ảnh vé giật khi đổi:** ảnh mới chỉ được gắn vào DOM lúc bấm, hiệu ứng mờ chạy trong khi ảnh chưa tải xong. Giờ ảnh của cả 3 điểm đến nằm sẵn trong DOM, đổi điểm đến chỉ đổi `opacity` (700ms). Bỏ state `prevDestination`, class `stayLandscapePrev` và keyframes `stay-photo-in`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Cuộn tới dải, viền răng cưa không giật | Có | Sau khi cuộn tới: dải không có `data-home-entered`, `transform: none`, không có animation nào chạy trên dải |
| Đổi điểm đến, ảnh chuyển mượt | Có | Trước khi bấm cả 3 ảnh đã tải xong; 300ms sau khi bấm "Hội An": ảnh cũ 0.39, ảnh mới 0.61; sau 1,2 giây: 0 và 1 |
| Đổi điểm đến, thẻ không biến mất | Chưa kiểm | Không gọi được API khi thử (xem dưới) |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 2/2 task đạt (web không có task test); lint 0 lỗi, 12 cảnh báo.
- Thử bằng `next dev` ở cổng 3173, viewport 1440×900. Backend chỉ cho CORS từ cổng 3100 (đang bị Expo web chiếm) nên không tải được danh sách phòng; phần giữ thẻ cũ chưa thử với dữ liệu thật.

## Cách kiểm lại
1. Chạy web ở cổng 3100 với backend, tải lại trang chủ, cuộn tới dải "Có phòng cho chuyến đi sắp tới": viền răng cưa không nhảy.
2. Bấm lần lượt Hội An, Đà Nẵng: 3 thẻ cũ mờ nhẹ rồi đổi sang thẻ mới, không có lúc nào trống; ảnh vé mờ dần sang ảnh mới.

## Ảnh / video
- Đính trong PR.

## Ảnh hưởng tới phần của người khác
- Không: chỉ sửa `ota-home-previews.tsx` và phần `.stay*` trong `ota-home.module.css` (Bảo viết ở TF10; `apps/web` do Thành phụ trách).
