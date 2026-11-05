# TF06K — Web: thanh tìm kiếm trang Cảm hứng

- Notion: <dán link task TF06K> · Nhánh: `dung/TF06K-thanh-tim-kiem` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06
- Chỉ FE, không đổi API.

## Vấn đề

Thanh tìm kiếm ở `/inspiration`: placeholder và dòng gợi ý bên dưới lặp y một câu "Nhập tên địa điểm hoặc khách sạn (ít nhất 2 ký tự)."; nhãn "Tìm kiếm" chung chung; ô nhập và nút "Tìm chuyến hợp gu ↗" là hai khối rời, nút dùng mũi tên kiểu "mở link"; thẻ gợi ý chữ 10px, có ↗, nằm lạc trong khung.

## Đã làm

- `SearchForm` (`features/discovery/search-form.tsx`): nhãn "Bạn muốn đến đâu?"; một thanh liền bo tròn gồm kính lúp (SVG trong code, không thêm thư viện), ô nhập `type="search"` và nút "Tìm chuyến hợp gu" (kính lúp + chữ) nằm bên trong; cả thanh có viền teal + vòng sáng khi focus. Placeholder ngắn "Nha Trang, Hội An, khách sạn…", dòng dưới chỉ còn "Nhập ít nhất 2 ký tự." (`aria-describedby`), `minLength={2}`, `maxLength={100}`. Vẫn gửi `GET /search?q=`, vẫn "Đang tìm chuyến…" khi đang gửi.
- Thẻ gợi ý (`home-screen.tsx`): `nav` có nhãn, chữ "GỢI Ý", thẻ bo tròn cao 36px có ghim địa điểm, đổi màu khi rê chuột, bỏ ↗; ngăn với thanh tìm kiếm bằng một đường kẻ.
- Màn ≤ 640px: thanh vẫn liền, nút chỉ còn kính lúp (chữ ẩn bằng kỹ thuật cho trình đọc màn hình, tên nút vẫn là "Tìm chuyến hợp gu"), thẻ gợi ý tự xuống hàng.
- CSS chỉ trong `.home-search`, `.search-field`, `.suggested-queries` (lớp `.search-form` dùng chung với form khác không đổi), chỉ dùng biến trong `packages/tokens`. Khoá chữ mới `searchWhere`, `searchShortPlaceholder`, `searchMinChars`, `suggestionsLabel`.
- Không ảnh hưởng `/search` (dùng `LiveSearchScreen`, có test `tests/e2e/discovery/suggestions.cjs` riêng).

## Kết quả kiểm tra

Chạy ngày 2026-11-06, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass; mọi gói "Found 0 warnings and 0 errors"
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/web build → Compiled successfully
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên web `:3100`: **9/9 PASS**.

```
(1) nhãn "Bạn muốn đến đâu?", placeholder ngắn, gợi ý dưới không lặp lại placeholder
(2) ô nhập và nút nằm trong một thanh liền (nút bên trong khung, cùng hàng)
(3) focus vào ô nhập: viền thanh đổi sang teal rgb(0, 108, 99) và có vòng sáng 4px
(4) gõ "Hội An" + Enter → /search?q=Hội An
(5) bấm "Tìm chuyến hợp gu" → /search?q=Vinpearl
(6) gõ 1 ký tự: không gửi, vẫn ở /inspiration
(7) 3 thẻ gợi ý cao bằng nhau (36px), không còn mũi tên ↗
(8) bấm thẻ "Hội An, Quảng Nam" → /search?q=Hội An, Quảng Nam
(9) 390px: thanh vẫn liền, nút chỉ còn kính lúp (48px) nhưng vẫn có tên "Tìm chuyến hợp gu", không tràn ngang
```

Placeholder ở 390px rộng 208px, vừa ô nhập 214px.

## Ảnh / video

- Đính kèm trong PR: trước / sau (desktop, mobile), trạng thái focus. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/features/discovery/search-form.tsx`, `home-screen.tsx` (phần thẻ gợi ý) của Trang, `apps/web/src/app/globals.css`, `packages/i18n` (chủ: Thành). Đã báo Trang, Thành trước khi làm.
