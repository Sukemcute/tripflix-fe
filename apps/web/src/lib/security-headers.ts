/**
 * Header bảo mật cho mọi trang web (TF64). next.config.ts gắn vào mọi đường dẫn.
 * - nosniff: trình duyệt không đoán lại loại file, tránh chạy nhầm file tải lên thành script.
 * - strict-origin-when-cross-origin: sang trang khác chỉ gửi tên miền, không lộ đường dẫn và tham số (mã đặt chỗ, token).
 * - DENY: không trang nào nhúng được Tripflix vào iframe, chặn lừa bấm (clickjacking). Tripflix không tự nhúng trang mình.
 */
export const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
] as const;
