# tripflix-fe

Frontend Tripflix: mobile (Expo), web và trang quản trị (Next.js), dùng pnpm + Turborepo.

## Cài đặt và chạy

```sh
corepack enable
pnpm install
pnpm dev
```

Web chạy ở `http://localhost:3100`, admin ở `http://localhost:3200`. Chạy `pnpm --filter @tripflix/mobile start` để mở Expo.

## Chạy cả hệ thống và Expo Go trên iPhone (Windows)

Các lệnh dưới đây dùng PowerShell. Mở Docker Desktop trước; cần có ba repo `tripflix-be`, `tripflix-fe`, `tripflix-ai` cạnh nhau, đã cài dependencies và cấu hình môi trường local theo README của BE. Thay đường dẫn nếu clone ở vị trí khác.

### Terminal 1: backend, Web và Admin

```powershell
cd D:\Sukem\VinUni\VSF\tripflix\tripflix-be
pnpm stack:up
pnpm stack:ps
```

`stack:up` build và khởi động BE, Web, Admin và gateway trong Docker, đồng thời chạy migration và seed. Lệnh này **không bật AI** để khởi động nhanh hơn. Đợi các service khởi động xong trước khi mở ứng dụng.

Khi cần tính năng AI (trợ lý, tóm tắt bài viết), bật thêm AI lên stack đang chạy:

```powershell
pnpm stack:ai        # bật ai-service + ai-summary-worker
pnpm stack:ai:down   # tắt riêng AI, BE vẫn chạy
```

Muốn chạy cả hệ thống kèm AI ngay từ đầu thì dùng `pnpm stack:full` thay cho `pnpm stack:up`. Khi AI tắt, các lời gọi `/ai/*` trả lỗi 502; bài viết mới vẫn được tóm tắt bù khi bật AI lại.

| Lệnh                                        | Chạy gì                                      |
| ------------------------------------------- | -------------------------------------------- |
| `pnpm stack:up`                             | BE, Web, Admin, gateway (không AI)           |
| `pnpm stack:watch`                          | Như trên, sửa code thì container tự cập nhật |
| `pnpm stack:ai` / `pnpm stack:ai:down`      | Bật / tắt riêng AI                           |
| `pnpm stack:full` / `pnpm stack:watch:full` | Cả hệ thống kèm AI                           |
| `pnpm stack:be`                             | Chỉ BE + gateway                             |

| Thành phần  | Địa chỉ trên máy tính                     |
| ----------- | ----------------------------------------- |
| Web         | http://localhost:3100                     |
| Admin       | http://localhost:3200                     |
| API gateway | http://localhost:8080                     |
| Swagger     | http://localhost:3000/docs                |
| Mailpit     | http://localhost:8025                     |
| AI service  | http://localhost:8000 (khi đã `stack:ai`) |

### Terminal 2: mobile bằng Expo Go

iPhone và máy tính cần dùng cùng Wi-Fi. Kiểm tra IP Wi-Fi của máy:

```powershell
Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" | Select-Object IPAddress
```

Ví dụ máy có IP `192.168.1.105`, chạy:

```powershell
cd D:\Sukem\VinUni\VSF\tripflix\tripflix-fe
$env:EXPO_PUBLIC_API_URL="http://192.168.1.105:8080"
pnpm --filter @tripflix/mobile start --go --lan --port 8082 --clear
```

- Thay `192.168.1.105` bằng IP vừa kiểm tra; địa chỉ có thể thay đổi khi đổi mạng hoặc khởi động lại router.
- Quét QR bằng Camera iPhone, rồi mở trong Expo Go.
- Dùng cổng `8082` cho Expo vì dashboard Traefik của Docker dùng `8081`.
- Trên iPhone thật, API phải dùng IP LAN của máy tính; `localhost` trỏ tới chính điện thoại, còn `10.0.2.2` dành cho Android emulator.
- Biến `$env:EXPO_PUBLIC_API_URL` chỉ áp dụng trong terminal hiện tại. Chạy lại dòng này khi mở terminal mới và khởi động lại Expo sau khi đổi IP.
- Nếu không kết nối được, kiểm tra Windows Firewall cho phép Node/Expo và các cổng `8080`, `8082` trên mạng Private.

### Xem log và dừng hệ thống

Chạy trong thư mục `tripflix-be`:

```powershell
pnpm stack:logs
pnpm stack:down
```

`stack:logs` theo dõi log; nhấn `Ctrl+C` để thoát xem log. `stack:down` dừng tất cả service, kể cả AI, và giữ dữ liệu local. Dừng Expo bằng `Ctrl+C` trong terminal mobile.

### Khi muốn sửa Web/Admin với hot reload

Dùng `pnpm stack:be` thay cho `pnpm stack:up`, rồi chạy `pnpm dev` trong `tripflix-fe`. Nếu toàn bộ stack đang chạy, dùng `pnpm stack:down` trước khi chuyển cách chạy để giải phóng cổng `3100` và `3200`. Terminal Expo vẫn chạy riêng như trên.

## Kiểm tra

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Đọc [RULES.md](RULES.md) trước khi làm việc.
