# @tripflix/ui-web

Component giao diện dùng chung cho `apps/web` và `apps/admin`: shadcn/ui + Tailwind v4, màu lấy từ `@tripflix/tokens`. Mobile không dùng package này.

- Mỗi app import CSS một lần: `@import "@tripflix/ui-web/styles.css";` trong `app/globals.css`.
- Dùng component: `import { Button } from '@tripflix/ui-web'`.
- Thêm component shadcn: chép mã từ [ui.shadcn.com](https://ui.shadcn.com) vào `src/components/`, đổi màu sang class token (`bg-coral`, `text-navy`…), rồi export trong `src/index.ts`. File `components.json` đã khai báo sẵn cho CLI shadcn.

Đã có: `Button`, `cn`.

Chủ: Thành.
