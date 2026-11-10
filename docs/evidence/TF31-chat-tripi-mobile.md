# TF31 — bóng chat Tripi trên mobile

- Jira: [SCRUM-35](https://tripflix.atlassian.net/browse/SCRUM-35) · Notion: [TF31](https://app.notion.com/40dcb9b9e5c281f0a151d3583e23a0fc)
- Nhánh: `trang/TF31-chat-tripi-mobile` từ `origin/develop` tại `048ad2b`.
- Người làm: Trang (dùng AI: có). Ngày: 2026-11-10.
- Phạm vi: UI/UX mobile theo yêu cầu trong chat; chưa nối dịch vụ AI. Đây là phần giao diện hỗ trợ TF31, chưa hoàn tất tiêu chí AI của toàn task.

## Đối chiếu phạm vi

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Bóng Tripi kéo thả và bấm mở chat | Đạt trên bản web mobile | `verify-assistant-mobile.cjs`, ảnh 01/02 |
| Giữ bản nháp và hội thoại khi thu nhỏ | Đạt trên bản web mobile | Kiểm tra 320/390/430 px |
| Điểm nối cho Bảo tích hợp AI | Đã có adapter | `AssistantTransport` bên dưới |
| TF31: 100% gợi ý trên bộ 100 câu là có thật; câu không có kết quả được báo rõ | Chưa đánh giá | Cần Bảo nối dịch vụ AI và chạy bộ eval, ngoài phạm vi UI |
| Kiểm tra thiết bị Android | Chưa thực hiện | Không có thiết bị/emulator kết nối |

## Giao diện và hành vi

- Bóng Tripi 64 px nổi trên các màn chính, ban đầu nằm phía trên thanh tab; kéo trong vùng an toàn, thả để neo vào mép trái/phải. Kéo không mở chat.
- Không hiển thị trên onboarding, đăng nhập, tạo bài, checkout, trang trả kết quả thanh toán hoặc trang assistant riêng.
- Bấm bóng mở hộp thoại chat có nhận diện Tripi, ba gợi ý điền sẵn vào ô nhập và nút gửi tối thiểu 48 px.
- Thu nhỏ giữ nguyên bản nháp, hội thoại và yêu cầu đang xử lý trong phiên app. Không lưu xuống thiết bị; đóng app/tải lại sẽ mất hội thoại.
- Tạo hội thoại mới có xác nhận; huỷ giữ nguyên tin nhắn. Reset huỷ yêu cầu đang chạy và bỏ qua phản hồi đến muộn.
- Có trạng thái chờ, lỗi và thử lại cho adapter AI. Bản mặc định trả lời demo có thông báo rõ; không gọi endpoint tự đoán.
- Văn bản trong `packages/i18n/src/assistant.ts`; màu và font dùng tokens hiện có. Không thêm dependency.

## Bàn giao cho Bảo

Điểm nối: `apps/mobile/src/features/assistant/assistant-provider.tsx`.

```ts
type AssistantTransport = (
  messages: readonly AssistantMessage[],
  signal: AbortSignal,
) => Promise<string>;
type AssistantMessage = { id: string; role: 'user' | 'assistant'; text: string };
```

Truyền adapter qua `<AssistantProvider transport={adapter}>` trong root layout. Adapter dùng `packages/api-client` để gọi hợp đồng AI đã thống nhất; trả về nội dung phản hồi không rỗng, throw khi thất bại và chuyển tiếp AbortSignal. ID ở đây chỉ dùng hiển thị phía client; adapter tự quản lý conversation ID của dịch vụ nếu cần. Không truyền ID client thành ID hội thoại backend.

Khi có adapter, nhãn xem trước tự tắt. Retry gửi lại cùng lịch sử, không thêm bản sao tin nhắn người dùng. Phiên bản này nhận phản hồi hoàn chỉnh, chưa có streaming. Cần kiểm tra kết nối thực tế, lỗi mạng và huỷ request sau khi Bảo nối API.

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test build --affected` sau khi cập nhật develop: 22/22 tác vụ thành công; 172 unit tests pass (105 api-client, 64 app-core, 2 i18n, 1 tokens; gồm cache hợp lệ). Mobile và i18n lint không có warning/error. Web/admin còn các lint warning có sẵn, không thuộc phạm vi thay đổi.
- `node tools/check-boundaries.mjs`: không có vi phạm.
- `pnpm --filter @tripflix/mobile exec expo export --platform android --output-dir <thư-mục-evidence>/android-export`: thành công, 2126 modules, Hermes bundle 4.9 MB. Đây là kiểm tra bundle, không thay thế kiểm thử thiết bị.
- `pnpm --filter @tripflix/mobile exec expo export --platform web --output-dir web-build`: thành công.
- `node tools/verify-assistant-mobile.cjs`: pass ba kích thước 320, 390, 430 px, reduced motion. Kiểm tra mở chat, prompt, gửi demo, giữ draft/hội thoại, huỷ reset, reset, route assistant, bóng trên tab feed; kéo/neo mép và không mở nhầm tại 390 px. Không có runtime exception.
- `git diff --check`: pass.
- Đã xem ảnh welcome và hội thoại 390 px, tinh chỉnh để ba gợi ý hiển thị gọn. Evidence ảnh nằm ngoài repo: `D:/Sukem/VinUni/VSF/outputs/tripi-chat-20261110/`.
- Chưa kiểm tra Android/iOS thật: môi trường hiện không có thiết bị hoặc emulator kết nối. Bàn phím native, nút Back, screen reader và độ mượt trên máy Android cần kiểm tra tiếp trước khi phát hành. Không coi ảnh web là evidence Android.

## Cách kiểm lại

1. Export mobile bằng lệnh trên.
2. Chạy `node tests/fixtures/serve-mobile.cjs` từ repo FE, mở `http://localhost:8084/explore`.
3. Đặt `PLAYWRIGHT_PACKAGE` tới Playwright đã cài ngoài repo, `PLAYWRIGHT_CHANNEL=chrome`, `MOBILE_EVIDENCE_DIR` tới thư mục ảnh mong muốn; chạy `node tools/verify-assistant-mobile.cjs`.
4. Trên thiết bị native, mở tab chính và thử kéo bóng, mở chat, nhập khi bàn phím mở, thu nhỏ, nút Back, xoay/thay đổi kích thước nếu nền tảng cho phép, và chữ hệ thống lớn.

## Ảnh hưởng

Thêm feature `assistant`, gắn provider/bóng chat vào root layout mobile (Trang) và chuyển route `/assistant` sang giao diện mới. Giữ nguyên các màn discovery cũ. Thêm namespace bản dịch; không thay đổi API, code backend hay dữ liệu. Người dùng đã yêu cầu commit, push và tạo PR vào develop trong chat. Giữ nguyên bóng có khung tròn, bóng đổ và icon nhỏ theo lựa chọn cuối cùng.

## Bổ sung animation mở/thu nhỏ — 2026-11-10

- Nhánh `trang/TF31-animation-chat-tripi` từ develop `e7b846a`, sau PR #88 đã merge.
- Mở: Reanimated spring 300 ms, dampingRatio 0.8, overshootClamping; dịch lên nhẹ 64 px và scale 0.97 → 1, opacity nền và khung đồng bộ. Chỉ animate transform/opacity.
- Thu nhỏ: ease-out 200 ms chạy ngược từ vị trí hiện tại. Modal giữ mounted đến khi kết thúc, rồi mới hiện lại bóng; bỏ qua yêu cầu đóng lặp.
- Reduced motion: bỏ translate/scale, chỉ fade 100 ms. Không thêm thư viện.
- Kiểm tra `verify-assistant-mobile.cjs`: 390 px chuyển động bình thường; 320/430 px reduced motion. Bổ sung tình huống thu nhỏ khi animation mở chưa xong rồi mở lại; các luồng chat trước vẫn pass, không có runtime exception.
- Lấy mẫu 25 frame ở 390 px: opacity từ 0.758 → 1 và translateY từ 15.51 → 0, ghi nhận 5 transform khác nhau; xác nhận có chuyển động và kết thúc đúng vị trí. Ảnh trong `D:/Sukem/VinUni/VSF/outputs/tripi-chat-20261110/animation/`.
- `pnpm turbo run lint typecheck test build --affected`: 22/22 tác vụ thành công. Kiểm tra ranh giới module pass. Expo web và Android export pass (2126 modules, Hermes 4.9 MB).
- Chưa kiểm tra cảm giác chuyển động trên thiết bị Android thật; cần thử mở/thu nhỏ liên tục, Back khi đang mở và bật reduced motion trên thiết bị trước khi phát hành.

### Thiết kế cuối: bung từ bóng theo kiểu Messenger

Thay thế chuyển động scale nhẹ ở mục trên theo phản hồi người dùng. Không sử dụng skill Expo cho lần chỉnh sửa này.

- Đo tọa độ và kích thước bóng tại thời điểm bấm bằng `measureInWindow`, sau khi dừng chuyển động neo mép. Lưu điểm xuất phát trong provider; tôn trọng vị trí bóng đã kéo.
- Khung nổi bắt đầu đúng 64×64 px, mở rộng cả chiều ngang và dọc tới khung chat trong 360 ms; góc tròn chuyển thành góc cửa sổ. Đóng co về cùng điểm xuất phát trong 280 ms.
- Chỉ khung clip tuyệt đối đổi kích thước; nội dung bên trong giữ kích thước cuối để chữ không méo hoặc xuống dòng lại mỗi frame. Mascot chuyển sang nội dung chat bằng crossfade.
- Mỗi lần mở khởi tạo modal animation mới từ tọa độ hiện tại để không chớp về vị trí của lần mở trước. Reduced motion giữ fade 100 ms và bỏ nở khung.
- Kiểm thử lấy mẫu frame: 64×64 → 390×778 px, xác nhận xuất phát từ mép trái sau khi kéo bóng, thu về cùng tọa độ và chiều rộng/chiều cao nhỏ lại trước khi unmount. Cả 320/430 px reduced motion và các luồng hội thoại pass; không có runtime exception.
- Kiểm tra cuối: 22/22 tác vụ lint/typecheck/test/build thành công; boundaries và diff check pass; export web và Android thành công, Android 2126 modules/Hermes 4.9 MB. Chưa có kiểm tra hiệu năng thiết bị Android thật.
- Ảnh giao diện và ảnh đang bung ở `D:/Sukem/VinUni/VSF/outputs/tripi-chat-20261110/messenger/`, lưu ngoài repo. Cập nhật trong PR #89.
