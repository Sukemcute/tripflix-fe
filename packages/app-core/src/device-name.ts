// Tên thiết bị gửi kèm khi đăng nhập (deviceName), hiện ở danh sách "Thiết bị đang đăng nhập".
// Chỉ đoán trình duyệt và hệ điều hành phổ biến; không nhận ra thì trả null để BE để trống.

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/coc_coc_browser/i, 'Cốc Cốc'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
  [/Android/, 'Android'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
];

const findName = (patterns: [RegExp, string][], userAgent: string) =>
  patterns.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;

/** Ví dụ "Chrome · Windows". BE giới hạn deviceName 100 ký tự. */
export function describeDevice(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const browser = findName(BROWSERS, userAgent);
  const system = findName(SYSTEMS, userAgent);
  const label = [browser, system].filter(Boolean).join(' · ');
  return label ? label.slice(0, 100) : null;
}
