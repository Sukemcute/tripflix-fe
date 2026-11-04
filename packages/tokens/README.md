# @tripflix/tokens

Màu, font, khoảng cách theo brand (logo L5 "Hoàng hôn": coral `#FF5A3C`, vàng `#FFC531`, teal `#00B2A3`, navy `#141B3D`).

- Mobile: `import { colors, spacing } from '@tripflix/tokens'`.
- Web, admin: `@import "@tripflix/tokens/tokens.css";` trong CSS, rồi dùng class Tailwind `bg-coral`, `text-navy`, `font-sans`.
- Không ghi cứng mã màu trong app (RULES.md mục 10).
- Sửa màu ở `src/index.ts` thì sửa cả `src/tokens.css`. `pnpm test` báo lỗi nếu hai file lệch nhau.

Chủ: Thành (web) và Trang (mobile) cùng duyệt.
