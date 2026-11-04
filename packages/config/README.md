# @tripflix/config

Cấu hình TypeScript dùng chung. Mỗi package `extends` một file:

| File | Dùng cho |
|---|---|
| `tsconfig/library.json` | package không có giao diện (`utils`, `app-core`, `i18n`, `tokens`, `api-client`) |
| `tsconfig/react-library.json` | package có React cho web (`ui-web`) |
| `tsconfig/nextjs.json` | `apps/web`, `apps/admin` |

`apps/mobile` dùng `expo/tsconfig.base` của Expo. Lint dùng `.oxlintrc.json` ở gốc repo, format dùng `.prettierrc` ở gốc repo.

Chủ: Tech Lead.
