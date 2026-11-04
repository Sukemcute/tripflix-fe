// Màu, font, khoảng cách theo brand Tripflix (logo L5 "Hoàng hôn").
// Web đọc qua CSS variables trong tokens.css; mobile import object này.
// Sửa ở đây thì sửa cả tokens.css (test kiểm hai file khớp nhau).

export const colors = {
  // Brand
  coral: '#FF5A3C', // màu chính: nút, điểm nhấn
  coralSoft: '#FF7B60',
  sun: '#FFC531', // vàng mặt trời: huy hiệu, ưu đãi
  teal: '#00B2A3', // xanh biển: thành công, đường đi
  tealSoft: '#D9F4F1',
  navy: '#141B3D', // chữ chính, logo chữ
  // Nền và chữ
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  text: '#141B3D',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  // Trạng thái
  success: '#00B2A3',
  warning: '#FFC531',
  danger: '#E5484D',
} as const;

export const fonts = {
  sans: '"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Consolas, monospace',
} as const;

/** Bước khoảng cách theo lưới 4px. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export type ColorToken = keyof typeof colors;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Tên CSS variable của một màu, ví dụ `coralSoft` → `--color-coral-soft`. */
export const cssVar = (token: ColorToken) => `--color-${kebab(token)}`;
