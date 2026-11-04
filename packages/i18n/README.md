# @tripflix/i18n

Mọi chữ hiện cho người dùng (mobile, web, admin). Hiện chỉ có tiếng Việt, trong `src/vi.ts`.

```ts
import { t } from '@tripflix/i18n';
t('tabs.feed'); // "Lướt"
t('booking.holdExpiresIn', { time: '29:59' }); // "Giữ chỗ còn 29:59"
```

Thêm chữ mới: thêm khoá vào `src/vi.ts`. Gõ sai khoá thì TypeScript báo lỗi.

Chủ: Thành (web) và Trang (mobile).
