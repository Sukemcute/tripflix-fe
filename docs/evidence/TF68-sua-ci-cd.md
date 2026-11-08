# TF68 — Sửa CI/CD: CI đủ khi push, sửa build mobile, thêm cache và giới hạn thời gian

- Jira: [SCRUM-72](https://tripflix.atlassian.net/browse/SCRUM-72) · Nhánh: `trang/TF68-sua-ci-cd` · Người làm: Lê Thị Thùy Trang (dùng AI: có) · Ngày: 2026-11-07

## Đã làm
- `ci.yml`: `--affected` chỉ dùng cho PR (so với `origin/<nhánh đích>`). Push lên develop/main/tag chạy lint, typecheck, test, build toàn bộ. Trước đây push đặt `TURBO_SCM_BASE` rỗng, turbo có thể so sai gốc và bỏ qua kiểm tra (ví dụ khi merge release vào `main`) mà image vẫn được build.
- `publish.yml`: thêm `mobile-v*` vào danh sách tag. Trước đây job `mobile` chờ tag `mobile-v*` nhưng workflow chỉ nghe `v*`, `web-v*`, `admin-v*`, nên không bao giờ chạy. Tag mobile bỏ qua `check` và build web/admin.
- `ci.yml`: `concurrency` huỷ lần chạy cũ của cùng PR; nhánh develop/main không huỷ.
- `timeout-minutes: 30` cho CI, build image, build APK.
- Build image: thêm `docker/setup-buildx-action` và cache `type=gha`, mỗi app một scope.
- Không đổi `deploy-web.yml` và luồng deploy web.

## Kết quả kiểm tra
- Cả 3 repo: mọi file trong `.github/workflows/` parse YAML hợp lệ (`yaml.safe_load`).
- Chưa chạy được `actionlint` trên máy (Docker Desktop tắt, không tải được binary). Workflow chỉ chạy thật trên GitHub: kết quả xem ở tab Actions của PR này và của lần merge vào `develop`.

## Cách kiểm lại
1. Mở PR: workflow `ci` chạy một lần. Push thêm commit lên PR: lần chạy cũ bị huỷ (concurrency).
2. Sau khi merge vào `develop`: workflow `publish` có job `check / check` chạy trước, job build image chỉ chạy khi `check` xanh.
3. Lần publish thứ hai trở đi: log `build-push-action` có dòng `importing cache manifest from gha:...`, các bước cài dependency báo `CACHED`.
4. Tag `mobile-v0.0.1-test` (khi cần): chỉ job `mobile` chạy, không có `check`, `web`.

## Ảnh hưởng tới phần của người khác
- Có: `.github/` (chủ: Thành). Không đổi lệnh kiểm tra. Cần Thành duyệt.
