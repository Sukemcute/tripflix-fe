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
  ink: '#18242B',
  warmMist: '#FFF7F2',
  seaMist: '#E7F7F4',
  tealInk: '#006C63',
  coralInk: '#BC331E',
  sunSoft: '#FFF6D8',
  coralTint: '#FFF0EB',
  overlay: '#18242B80',
  overlayHeavy: '#18242BCC',
  tabBar: '#000000',
  composeStart: '#FFAA38',
  composeEnd: '#EA432D',
  composeIconShadow: '#60180E47',
  transparent: 'transparent',
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

/** Native family names registered by Expo Font; keep web families unchanged. */
export const nativeFonts = {
  regular: 'BeVietnamPro-Regular',
  medium: 'BeVietnamPro-Medium',
  semibold: 'BeVietnamPro-Semibold',
  bold: 'BeVietnamPro-Bold',
  extraBold: 'BeVietnamPro-ExtraBold',
} as const;

export const mobileLayout = {
  gutter: 20,
  buttonHeight: 50,
  touchTarget: 44,
  inputRadius: 12,
  cardRadius: 20,
  sheetRadius: 24,
  contentWidth: 430,
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Design system v2 "Original Explorer" (docs/ui-redesign/NEW_DESIGN_SYSTEM.md).
 * Màn được chuyển sang v2 thì chỉ dùng khối này; contrast các cặp chữ/nền được kiểm trong tokens.test.ts.
 */
const explorerDay = {
  canvas: '#FFF7F2',
  surface: '#FFFFFF',
  tintExplore: '#E7F7F4',
  tintWarm: '#FFEDE6',
  tintSun: '#FFF3CC',
  text: '#18242B',
  textSecondary: '#52606D',
  link: '#006C63',
  line: '#EADFD8',
  input: '#7A8794',
  error: '#BA1A1A',
  success: '#006C63',
} as const;

const explorerNight = {
  canvas: '#0E1418',
  surface: '#18242B',
  tintExplore: '#0F2A28',
  tintWarm: '#2A1A16',
  tintSun: '#3A2F0E',
  text: '#F4F6F7',
  textSecondary: '#AEB9C2',
  link: '#3DD6C6',
  line: '#26343C',
  input: '#8A97A3',
  error: '#FF8A80',
  success: '#3DD6C6',
} as const;

export type ExplorerSurface = { readonly [K in keyof typeof explorerDay]: string };

export const explorer = {
  day: explorerDay as ExplorerSurface,
  night: explorerNight as ExplorerSurface,
  brand: { coral: '#FF5A3C', teal: '#00B2A3', sun: '#FFC531', ink: '#18242B', white: '#FFFFFF' },
  action: {
    primary: '#FF5A3C',
    onPrimary: '#FFFFFF',
    primaryPressed: '#E8472A',
    secondary: '#18242B',
    onSecondary: '#FFFFFF',
    explore: '#00B2A3',
    onExplore: '#18242B',
  },
  /** Gradient "Hoàng hôn" của logo: chỉ dùng cho nút Tạo và logo. */
  sunset: ['#FFAA38', '#FF5A3C', '#EA432D'],
  /** Scrim dưới chữ đặt trên ảnh/video, đọc được trên khung hình sáng. */
  scrim: ['#18242B00', '#18242B8C', '#18242BD9'],
  glass: '#18242B73',
  backdrop: '#18242B66',
  focus: '#006C63',
  shadow: '#18242B',
  space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, section: 40 },
  gutter: 20,
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  control: { primary: 52, compact: 44, chip: 36, touch: 48, tabBar: 64 },
  type: {
    display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.68, font: 'extraBold' },
    title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.4, font: 'bold' },
    headline: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2, font: 'bold' },
    subhead: { fontSize: 17, lineHeight: 24, letterSpacing: 0, font: 'semibold' },
    body: { fontSize: 16, lineHeight: 24, letterSpacing: 0, font: 'regular' },
    bodyStrong: { fontSize: 16, lineHeight: 24, letterSpacing: 0, font: 'semibold' },
    label: { fontSize: 14, lineHeight: 20, letterSpacing: 0, font: 'semibold' },
    caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0, font: 'medium' },
    micro: { fontSize: 12, lineHeight: 16, letterSpacing: 0, font: 'semibold' },
  },
  elevation: {
    floating: { offsetY: 4, blur: 16, opacity: 0.12, android: 4 },
    sheet: { offsetY: 12, blur: 32, opacity: 0.18, android: 12 },
  },
  motion: { feedback: 120, state: 220, transition: 340, moment: 600 },
} as const;

export type ExplorerTypeRole = keyof typeof explorer.type;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Tên CSS variable của một màu, ví dụ `coralSoft` → `--color-coral-soft`. */
export const cssVar = (token: ColorToken) => `--color-${kebab(token)}`;
