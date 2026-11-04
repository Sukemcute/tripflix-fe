# tripflix-fe

Frontend Tripflix: mobile (Expo), web và trang quản trị (Next.js), dùng pnpm + Turborepo.

## Cài đặt và chạy

```sh
corepack enable
pnpm install
pnpm dev
```

Web chạy ở `http://localhost:3100`, admin ở `http://localhost:3200`. Chạy `pnpm --filter @tripflix/mobile start` để mở Expo.

## Kiểm tra

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Đọc [RULES.md](RULES.md) trước khi làm việc.
