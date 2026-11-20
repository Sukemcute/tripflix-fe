# SCRUM-129 — Bảo vệ và khôi phục bản soạn bài đăng

- Jira: https://tripflix.atlassian.net/browse/SCRUM-129
- Nhánh: `trang/SCRUM-129-protect-post-draft`; base `origin/develop` tại `d4cde5b6`.
- Người làm: Trang, có AI; ngày: 2026-11-20. Assignee Jira giữ trống.

## Thay đổi

Màn đăng trước đây chỉ bảo vệ khi đang lưu/tải lên; caption, hashtag, quyền xem và lộ trình đang viết mất khi màn bị đóng. Nay tự lưu bản soạn trên thiết bị theo tài khoản và theo bài đang sửa, khôi phục trước khi cho nhập, và thông báo rõ đây là bản thiết bị chưa đồng bộ máy chủ. Mỗi tài khoản có một bản soạn mới và bản riêng cho từng bài đang sửa; đây không phải danh sách nhiều bản nháp mới.

Khi rời màn có thay đổi, hiển thị ba lựa chọn: **Lưu trên thiết bị & thoát / Tiếp tục viết / Bỏ thay đổi & thoát**. Chỉ thoát sau khi ghi/xoá thành công; lỗi lưu không giả báo thành công. Back giữa các bước giữ form. Màn chào cho quay lại viết tiếp với bản đã khôi phục, kể cả khi chưa chọn lại video. Header vẫn dùng được ở màn nhỏ; nội dung dài và hộp thoại có vùng cuộn. Nút nằm ngoài hộp thoại được ẩn khỏi cây trợ năng khi hộp thoại mở.

Lưu máy chủ là nút riêng. Lỗi mạng vẫn giữ bản thiết bị. Lưu máy chủ thành công chỉ dọn bản khớp nội dung đã gửi; phần gõ thêm khi request đang chạy được giữ lại. Đăng nền giữ bản thiết bị cho tới khi đăng thành công và dùng cùng điều kiện dọn bản, tránh xoá bản mới đang viết. Không thêm API hay thư viện, không đổi hợp đồng upload/đăng bài.

## Cách lưu và giới hạn media

- Web: localStorage, ghi đồng bộ trước khi pagehide/unload. Browser có cảnh báo rời trang khi còn thay đổi.
- Native: JSON trong thư mục document, ghi tuần tự vào file tạm rồi chuyển thay bản cũ sau khi ghi xong. AppState background yêu cầu lưu bản mới nhất. Chưa kiểm chứng filesystem/force-stop trên thiết bị, không bảo đảm ký tự chưa kịp ghi trước khi hệ điều hành dừng tiến trình.
- Kiểm tra version, tài khoản, bài, cấu trúc lộ trình và media trước khôi phục. Dữ liệu hỏng hiển thị cảnh báo thay vì làm crash editor. Bản quá 1 triệu ký tự báo lỗi lưu.
- Chỉ lưu metadata video; không serialize Blob/readRange, không nhân bản video lớn. Native kiểm tra file gốc còn đọc được trước khôi phục; web yêu cầu chọn lại video sau mở lại vì Blob không có File nguồn. Video thiếu vẫn giữ chữ/lộ trình, thông báo rõ, chặn lưu máy chủ/đăng tới khi chọn lại. Huỷ picker giữ nguyên nội dung.
- Key điểm lộ trình được đổi sang namespace khôi phục để không trùng p1/p2 của điểm mới sau khi khởi động lại. Không thay dữ liệu hoạt động/giờ/đặt phòng trong lộ trình.

## Đối chiếu tiêu chí

| Tiêu chí Jira                                   | Kết quả                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Back header có lưu/bỏ/tiếp tục                  | Đạt trên preview. Tiếp tục giữ form, lưu rồi mở lại khôi phục đủ nội dung; bỏ chỉ xoá bản thiết bị.                             |
| Khôi phục caption, hashtag, quyền xem, lộ trình | Đạt: caption dài, hashtag, private, chi phí, hoạt động/giờ và hai ngày; kiểm tra JSON đã lưu và giao diện sau mở lại.           |
| Đóng app/reload                                 | Đã thử đóng/mở lại trang preview và reload. Native force-stop/background thực chưa chạy.                                        |
| Android Back/swipe-back                         | Cùng hook usePreventRemove của route; triển khai guard nhưng chưa kiểm thử cử chỉ/Back trên thiết bị.                           |
| Mất mạng khi lưu, lỗi lưu thiết bị, huỷ picker  | Đạt trên browser fixture: request máy chủ abort, localStorage giả lỗi quota, picker huỷ; không mất nội dung và thử lại được.    |
| Media tạm không còn                             | Đạt trên preview với Blob hết hiệu lực: cảnh báo, giữ form, chặn lưu/đăng. Native file check mới chỉ kiểm tra source/typecheck. |
| Bằng chứng trước/sau, phân biệt preview/native  | Ảnh và JSON đính kèm Jira; giữ In Review tới khi kiểm tra thiết bị.                                                             |

## Kiểm thử

- `pnpm turbo run lint typecheck test --affected`: 23/23 tác vụ thành công. App-core 262 tests (3 hồi quy mới), api-client 327, web 510, admin 67, tokens 1, i18n 2, mobile 3; không lỗi lint. Mobile còn 19 cảnh báo sẵn có và 1 cảnh báo mới `prefer-tag-over-role` cho React Native View dùng role dialog (không dùng thẻ HTML dialog trên native); không tắt rule. Web 28, admin 2, api-client 1 cảnh báo có sẵn ở base.
- `node tools/check-boundaries.mjs`, `git diff --check`: đạt.
- `tools/verify-mobile-post-draft.cjs`: **9 nhóm ca đạt**, Edge/Chromium touch viewport 390×844 và 320×667, auth/post API fixture, không tạo hay đăng bài thật; không lỗi JS. Có ca giữ bản gõ thêm trong lúc lưu máy chủ và lỗi quota không cho thoát trước khi thử lại thành công.
- JSON kết quả cùng nhánh: `docs/evidence/SCRUM-129-protect-post-draft-qa.json`.
- Chưa test đăng nền end-to-end với video thật, native disk đầy, Android hardware Back, swipe-back iOS, AppState background/force-stop, hoặc khôi phục file video thật. Không tuyên bố browser close là kiểm thử app bị kill.

## Bằng chứng Jira

- `23-unsaved-draft-lost.jpg`, attachment 10047: ảnh trước từ bộ audit 2026-11-16; không phải capture lại base hôm nay.
- `exit-dialog-390.png`, 10048: hộp chọn giữ/bỏ/tiếp tục, bo 8px, màu Tripflix.
- `restored-390.png`, 10049: thông báo khôi phục và các trường đã điền.
- `storage-failure-320.png`, 10050: lưu thiết bị thất bại, giữ hộp thoại để không mất chữ.
- `qa-results.json`, 10051: kết quả 9 nhóm ca, không chứa thông tin xác thực.

## Kiểm lại

1. Đăng nhập, chọn video, viết caption/hashtag; đổi private, tạo lộ trình hai ngày có hoạt động/giờ.
2. Back về màn video rồi đóng. Chọn Tiếp tục viết: form còn nguyên. Đóng lần nữa, chọn lưu thiết bị; mở lại mục đăng và kiểm tra đủ trường.
3. Thử khi mất mạng, khi backend lưu lỗi; bản thiết bị phải giữ được. Sau lưu máy chủ thành công, không còn bản thiết bị cũ; gõ thêm trong lúc đang lưu không được bị xoá.
4. Đóng/mở app, thu hồi file tạm rồi mở lại: chữ/lộ trình còn và có lời nhắc chọn lại video. Huỷ picker không đổi bản soạn.
5. Chọn Bỏ thay đổi & thoát rồi mở lại: màn mới rỗng hoặc bài đang sửa lấy bản máy chủ. Đổi tài khoản không thấy bản của tài khoản trước.
6. Chạy script preview với `PLAYWRIGHT_PACKAGE` trỏ tới Playwright có sẵn và `MOBILE_EVIDENCE_DIR` là thư mục output. Native cần chạy lại các ca Back/swipe/background/force-stop trên thiết bị.

## Phạm vi ảnh hưởng

Mobile thuộc Trang: editor, kho lưu thiết bị, dialog và callback dọn bản khi tiến trình đăng nền thành công. App-core bổ sung parser có test, i18n thêm nhãn; không sửa web/admin, file sinh API, cấu hình chung hay logic thanh toán. Lint cảnh báo role dialog được ghi lại ở trên; chưa bỏ qua kiểm tra nào.
