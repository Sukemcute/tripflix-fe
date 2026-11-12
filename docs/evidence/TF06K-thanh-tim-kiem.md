# TF06K — Web: thanh tìm bài viết ở trang Cảm hứng

- Notion: <dán link task TF06K> · Nhánh: `dung/TF06K-thanh-tim-kiem` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06
- Chỉ FE, không đổi API BE (dùng tham số `keyword` có sẵn của `GET /v1/posts`).

## Vấn đề

- Thanh tìm kiếm ở `/inspiration` nhìn rời rạc: placeholder và dòng gợi ý lặp y một câu, nhãn "Tìm kiếm" chung chung, ô nhập và nút "Tìm chuyến hợp gu ↗" là hai khối rời, thẻ gợi ý chữ 10px có ↗; khác hẳn khung tìm kiếm ở trang chủ.
- Form gửi `/search?q=`. Lúc đầu (`0365a03`, 05/11) `/search` là bản demo tìm "chuyến đi" trong danh sách mẫu; từ khi nối API (`358b395`, 05/11) `/search` là tìm khách sạn, nên thanh ở trang Cảm hứng luôn ra khách sạn dù chữ ghi "Tìm chuyến hợp gu".

## Đã làm

- **Tìm bài viết ngay trên trang Cảm hứng**: `app/inspiration/page.tsx` đọc `?q=`; `HomeScreen` nhận `query`; có từ khoá thì phần danh sách thành "Kết quả cho “…”" + nút "Xóa tìm kiếm", `PublicPosts` nhận thêm `keyword` (truyền xuống `useSocialPosts(kind, keyword)` có sẵn trong api-client → `GET /v1/posts?keyword=`), không có bài thì báo "Chưa có bài viết nào nhắc tới “…”". `PublicPosts` không truyền `keyword` (trang tài khoản) giữ như cũ.
- **Cùng kiểu khung tìm kiếm trang chủ**: `SearchForm` dùng lại `stay-search.module.css` và `StaySearchIcon` của trang chủ (thẻ dịch vụ "Cảm hứng" + câu dẫn, ô có biểu tượng + nhãn nhỏ "Bài viết, trải nghiệm", nút teal "Tìm bài viết", thanh công cụ có câu gợi ý). File nhỏ `search-form.module.css` chỉ đổi lưới còn 2 cột (lặp tên lớp `.row.row` để thắng lưới 6 cột của trang chủ ở ≤ 1199px và viền `.panel .field`), ≤ 900px một cột như trang chủ.
- Tìm bằng `router.push('/inspiration?q=…#trips')` (không có JS thì form GET tới cùng địa chỉ); `minLength={2}`, `maxLength={100}`; "Đang tìm…" khi chờ trang tải. `SearchForm` có `key` theo từ khoá nên bấm thẻ gợi ý / "Xóa tìm kiếm" thì ô nhập cập nhật.
- Câu gợi ý: "Tìm theo tiêu đề và nội dung bài viết, gõ có dấu (ví dụ: Hội An)." (BE so khớp `ILIKE`, không dấu như "hoi an" ra 0 bài); placeholder "Hội An, cáp treo, Phú Quốc…".
- **Thẻ gợi ý** nằm bên phải thanh công cụ (chỗ "Bộ lọc thêm" ở trang chủ): Nha Trang, Hội An, Đà Nẵng (tên ngắn vì "Nha Trang, Khánh Hòa" không khớp bài nào), bo tròn có ghim địa điểm, bỏ ↗; màn hẹp căn trái.
- `.home-search` không còn viền riêng (khung tìm kiếm đã có viền). Khoá chữ mới `searchWhere`, `searchShortPlaceholder`, `searchPosts*`, `searchResults*`, `clearSearch`, `noPostsForKeyword`, `suggestionsLabel`.
- Không ảnh hưởng `/search` (tìm khách sạn, `LiveSearchScreen`, test `tests/e2e/discovery/suggestions.cjs`).

## Kết quả kiểm tra

Chạy ngày 2026-11-06, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass; mọi gói "Found 0 warnings and 0 errors"
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/web build → Compiled successfully (/inspiration thành trang động vì đọc ?q=)
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên web `:3100` → gateway `:8080` → core-api thật; số bài trên trang so với chính `GET /v1/posts?keyword=`: **10/10 PASS**.

```
(1)  cùng kiểu với khung trang chủ (so style thật: khung, thẻ dịch vụ, hàng ô, nhãn, chữ trong ô, nút) — giống hệt
(2)  thẻ "Cảm hứng", nhãn "Bài viết, trải nghiệm", nút "Tìm bài viết", gợi ý gõ có dấu
(3)  "Hội An" + Enter → /inspiration?q=Hội An, "Kết quả cho “Hội An”", số bài khớp API (1), bài nào cũng nhắc Hội An
(4)  "cáp treo" + bấm "Tìm bài viết" → số bài khớp API (2)
(5)  từ khoá không khớp: báo "Chưa có bài viết nào nhắc tới “…”"
(6)  gõ 1 ký tự: không tìm, địa chỉ không đổi
(7)  bấm thẻ "Đà Nẵng" → ô nhập đổi thành "Đà Nẵng", số bài khớp API (1)
(8)  "Xóa tìm kiếm" → về danh sách mặc định, ô nhập trống
(9b) 1000, 1100, 1199, 1280, 1366, 1920px: lưới 2 cột, nút sát mép phải hàng ô, không có kẻ dọc, biểu tượng ô luôn hiện
(9)  390px: nút dưới ô, rộng bằng ô (như trang chủ), không tràn ngang
```

Lỗi tìm ra khi xem ở 1000–1200px và đã sửa: lưới 6 cột của trang chủ đè lưới 2 cột (nút bị kéo vào cột 2, bên phải trống), viền dọc sau ô nhập.

## Cách kiểm lại

1. BE, FE chạy như README.
2. Mở `http://localhost:3100/inspiration`, gõ "Hội An" / "cáp treo", bấm thẻ gợi ý, "Xóa tìm kiếm"; thu nhỏ cửa sổ về khoảng 1100px và 390px.

## Ảnh / video

- Đính kèm trong PR: trước (desktop, mobile), sau (desktop, 1100px, mobile), khung trang chủ để so sánh, kết quả "Hội An", không có kết quả. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/features/discovery/search-form.tsx`, `home-screen.tsx`, `app/inspiration/page.tsx` (Trang làm), `apps/web/src/features/social/live-posts.tsx` (thêm prop `keyword`), `apps/web/src/app/globals.css`, `packages/i18n` (chủ: Thành). Dùng lại (không sửa) `stay-search.module.css`, `stay-search-icon.tsx` của trang chủ. Đã báo Trang, Thành trước khi làm.
