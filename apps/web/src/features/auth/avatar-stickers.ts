import { vi } from '@tripflix/i18n';
import { colors } from '@tripflix/tokens';

export type AvatarStickerCategory = 'accessories' | 'travel';

export type AvatarFrameId = 'none' | 'sunset' | 'ocean' | 'passport';

export interface AvatarStickerPreset {
  id: string;
  label: string;
  category: AvatarStickerCategory;
  src: string;
  /** Kích thước cơ sở trên khung 280px (px). */
  baseSizePx: number;
  /** Vị trí mặc định khi mới bấm thêm (0..1 theo khung cắt). */
  defaultX: number;
  defaultY: number;
}

export interface PlacedSticker {
  instanceId: string;
  presetId: string;
  /** Tâm sticker theo tỉ lệ khung cắt (0..1). */
  x: number;
  y: number;
  /** Hệ số nhân kích thước (0.5..2.2). */
  scale: number;
  /** Góc xoay đơn vị độ (-180..180). */
  rotationDeg: number;
  /** Có lật ngang hay không. */
  isFlipped: boolean;
}

export interface AvatarFrameOption {
  id: AvatarFrameId;
  label: string;
  previewRingColor: string;
}

export const MIN_STICKER_SCALE = 0.5;
export const MAX_STICKER_SCALE = 2.2;
const MIN_NORM_POS = 0.08;
const MAX_NORM_POS = 0.92;

function toSvgDataUrl(svgBody: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">${svgBody}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const AVATAR_STICKER_PRESETS: readonly AvatarStickerPreset[] = [
  {
    id: 'sunglasses',
    label: vi.api.avatarStickerSunglasses,
    category: 'accessories',
    baseSizePx: 112,
    defaultX: 0.5,
    defaultY: 0.42,
    src: toSvgDataUrl(`
      <path d="M10 48h100" stroke="${colors.navy}" stroke-width="5" stroke-linecap="round"/>
      <path d="M52 50c4-4 12-4 16 0" stroke="${colors.sun}" stroke-width="4.5" stroke-linecap="round"/>
      <rect x="14" y="42" width="40" height="28" rx="10" fill="${colors.navy}" stroke="${colors.sun}" stroke-width="3.5"/>
      <rect x="66" y="42" width="40" height="28" rx="10" fill="${colors.navy}" stroke="${colors.sun}" stroke-width="3.5"/>
      <path d="M22 48l10 16M30 47l6 10" stroke="${colors.tealSoft}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
      <path d="M74 48l10 16M82 47l6 10" stroke="${colors.tealSoft}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
    `),
  },
  {
    id: 'sun-hat',
    label: vi.api.avatarStickerSunHat,
    category: 'accessories',
    baseSizePx: 124,
    defaultX: 0.5,
    defaultY: 0.22,
    src: toSvgDataUrl(`
      <ellipse cx="60" cy="74" rx="52" ry="14" fill="${colors.sun}" stroke="${colors.navy}" stroke-width="3.5"/>
      <path d="M30 70c2-24 14-38 30-38s28 14 30 38" fill="${colors.sunSoft}" stroke="${colors.navy}" stroke-width="3.5"/>
      <path d="M31 64c19 6 39 6 58 0" stroke="${colors.coral}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="78" cy="65" r="6" fill="${colors.coralInk}"/>
      <path d="M78 68l8 14M76 68l-3 15" stroke="${colors.coral}" stroke-width="4" stroke-linecap="round"/>
    `),
  },
  {
    id: 'camera',
    label: vi.api.avatarStickerCamera,
    category: 'accessories',
    baseSizePx: 78,
    defaultX: 0.76,
    defaultY: 0.76,
    src: toSvgDataUrl(`
      <rect x="18" y="36" width="84" height="58" rx="14" fill="${colors.navy}" stroke="${colors.background}" stroke-width="4"/>
      <path d="M40 36l6-10h28l6 10" fill="${colors.coral}" stroke="${colors.background}" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="60" cy="65" r="19" fill="${colors.teal}" stroke="${colors.background}" stroke-width="4"/>
      <circle cx="60" cy="65" r="9" fill="${colors.navy}"/>
      <circle cx="65" cy="60" r="3.5" fill="${colors.background}"/>
      <circle cx="86" cy="49" r="4.5" fill="${colors.sun}"/>
    `),
  },
  {
    id: 'headphones',
    label: vi.api.avatarStickerHeadphones,
    category: 'accessories',
    baseSizePx: 118,
    defaultX: 0.5,
    defaultY: 0.44,
    src: toSvgDataUrl(`
      <path d="M22 64V54a38 38 0 0 1 76 0v10" stroke="${colors.teal}" stroke-width="8" stroke-linecap="round"/>
      <rect x="12" y="54" width="18" height="32" rx="9" fill="${colors.coral}" stroke="${colors.navy}" stroke-width="3.5"/>
      <rect x="90" y="54" width="18" height="32" rx="9" fill="${colors.coral}" stroke="${colors.navy}" stroke-width="3.5"/>
    `),
  },
  {
    id: 'airplane',
    label: vi.api.avatarStickerAirplane,
    category: 'travel',
    baseSizePx: 78,
    defaultX: 0.24,
    defaultY: 0.24,
    src: toSvgDataUrl(`
      <circle cx="60" cy="60" r="44" fill="${colors.seaMist}" stroke="${colors.background}" stroke-width="4"/>
      <path d="M30 74l60-28-18 40-14-12-12 8 2-14-18-6z" fill="${colors.coral}" stroke="${colors.navy}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M48 64l42-18" stroke="${colors.background}" stroke-width="2.5" stroke-linecap="round"/>
    `),
  },
  {
    id: 'luggage',
    label: vi.api.avatarStickerLuggage,
    category: 'travel',
    baseSizePx: 78,
    defaultX: 0.24,
    defaultY: 0.76,
    src: toSvgDataUrl(`
      <path d="M46 34V22a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v12" stroke="${colors.navy}" stroke-width="5" stroke-linecap="round"/>
      <rect x="28" y="32" width="64" height="64" rx="14" fill="${colors.coral}" stroke="${colors.background}" stroke-width="4"/>
      <path d="M44 34v60M76 34v60" stroke="${colors.sunSoft}" stroke-width="3.5" opacity="0.8"/>
      <rect x="48" y="52" width="24" height="16" rx="4" fill="${colors.sun}" stroke="${colors.navy}" stroke-width="2.5"/>
      <circle cx="40" cy="100" r="5" fill="${colors.navy}"/>
      <circle cx="80" cy="100" r="5" fill="${colors.navy}"/>
    `),
  },
  {
    id: 'compass',
    label: vi.api.avatarStickerCompass,
    category: 'travel',
    baseSizePx: 76,
    defaultX: 0.78,
    defaultY: 0.24,
    src: toSvgDataUrl(`
      <circle cx="60" cy="60" r="44" fill="${colors.navy}" stroke="${colors.sun}" stroke-width="5"/>
      <circle cx="60" cy="60" r="35" fill="${colors.warmMist}"/>
      <polygon points="60,28 70,60 60,54 50,60" fill="${colors.coral}"/>
      <polygon points="60,92 70,60 60,66 50,60" fill="${colors.tealInk}"/>
      <circle cx="60" cy="60" r="4.5" fill="${colors.navy}"/>
    `),
  },
  {
    id: 'coconut',
    label: vi.api.avatarStickerCoconut,
    category: 'travel',
    baseSizePx: 78,
    defaultX: 0.24,
    defaultY: 0.76,
    src: toSvgDataUrl(`
      <path d="M66 48l16-24 12 2" stroke="${colors.coral}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="44" cy="48" r="14" fill="${colors.sun}" stroke="${colors.navy}" stroke-width="3"/>
      <path d="M24 56a36 36 0 0 0 72 0H24z" fill="${colors.tealInk}" stroke="${colors.background}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M30 56h60" stroke="${colors.sunSoft}" stroke-width="5" stroke-linecap="round"/>
    `),
  },
  {
    id: 'stamp',
    label: vi.api.avatarStickerStamp,
    category: 'travel',
    baseSizePx: 86,
    defaultX: 0.74,
    defaultY: 0.76,
    src: toSvgDataUrl(`
      <circle cx="60" cy="60" r="45" fill="${colors.warmMist}" stroke="${colors.coralInk}" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="60" cy="60" r="36" stroke="${colors.coralInk}" stroke-width="2"/>
      <path d="M40 54l40-10-12 24-10-6-8 6 1-9-11-5z" fill="${colors.coralInk}"/>
      <rect x="32" y="68" width="56" height="13" rx="6" fill="${colors.coralInk}"/>
      <circle cx="44" cy="74.5" r="2.2" fill="${colors.warmMist}"/>
      <circle cx="60" cy="74.5" r="2.2" fill="${colors.warmMist}"/>
      <circle cx="76" cy="74.5" r="2.2" fill="${colors.warmMist}"/>
    `),
  },
  {
    id: 'tripi-happy',
    label: vi.api.avatarStickerTripiHappy,
    category: 'travel',
    baseSizePx: 88,
    defaultX: 0.76,
    defaultY: 0.74,
    src: '/brand/tripi-library/expr-happy.png',
  },
  {
    id: 'tripi-explore',
    label: vi.api.avatarStickerTripiExplore,
    category: 'travel',
    baseSizePx: 90,
    defaultX: 0.24,
    defaultY: 0.74,
    src: '/brand/tripi-library/action-explore.png',
  },
  {
    id: 'tripi-vacation',
    label: vi.api.avatarStickerTripiVacation,
    category: 'travel',
    baseSizePx: 90,
    defaultX: 0.76,
    defaultY: 0.74,
    src: '/brand/tripi-library/action-vacation.png',
  },
];

export const AVATAR_FRAMES: readonly AvatarFrameOption[] = [
  { id: 'none', label: vi.api.avatarFrameNone, previewRingColor: colors.border },
  { id: 'sunset', label: vi.api.avatarFrameSunset, previewRingColor: colors.coral },
  { id: 'ocean', label: vi.api.avatarFrameOcean, previewRingColor: colors.teal },
  { id: 'passport', label: vi.api.avatarFramePassport, previewRingColor: colors.navy },
];

export function findStickerPreset(presetId: string): AvatarStickerPreset | undefined {
  return AVATAR_STICKER_PRESETS.find((preset) => preset.id === presetId);
}

export function clampStickerNorm(value: number): number {
  return Math.min(MAX_NORM_POS, Math.max(MIN_NORM_POS, value));
}

export function clampStickerScale(scale: number): number {
  return Math.min(MAX_STICKER_SCALE, Math.max(MIN_STICKER_SCALE, scale));
}

export function createPlacedSticker(presetId: string, existingCount: number, instanceId: string): PlacedSticker {
  const preset = findStickerPreset(presetId);
  const offset = (existingCount % 4) * 0.035;
  return {
    instanceId,
    presetId,
    x: clampStickerNorm((preset?.defaultX ?? 0.5) + offset),
    y: clampStickerNorm((preset?.defaultY ?? 0.5) + offset),
    scale: 1,
    rotationDeg: 0,
    isFlipped: false,
  };
}

/** Vẽ khung viền tròn trang trí lên canvas xuất ảnh đại diện. */
export function drawAvatarFrame(ctx: CanvasRenderingContext2D, frameId: AvatarFrameId, edgePx: number): void {
  if (frameId === 'none') return;
  const center = edgePx / 2;
  const ringWidth = Math.round(edgePx * 0.055);
  const radius = center - ringWidth / 2;

  ctx.save();
  if (frameId === 'sunset') {
    const grad = ctx.createLinearGradient(0, 0, edgePx, edgePx);
    grad.addColorStop(0, colors.coral);
    grad.addColorStop(0.55, colors.coralSoft);
    grad.addColorStop(1, colors.sun);
    ctx.strokeStyle = grad;
    ctx.lineWidth = ringWidth;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = colors.background;
    ctx.lineWidth = Math.max(2, Math.round(edgePx * 0.008));
    ctx.beginPath();
    ctx.arc(center, center, center - ringWidth - 2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (frameId === 'ocean') {
    const grad = ctx.createLinearGradient(0, edgePx, edgePx, 0);
    grad.addColorStop(0, colors.tealInk);
    grad.addColorStop(0.6, colors.teal);
    grad.addColorStop(1, colors.tealSoft);
    ctx.strokeStyle = grad;
    ctx.lineWidth = ringWidth;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = colors.seaMist;
    ctx.lineWidth = Math.max(2, Math.round(edgePx * 0.008));
    ctx.setLineDash([Math.round(edgePx * 0.03), Math.round(edgePx * 0.02)]);
    ctx.beginPath();
    ctx.arc(center, center, center - ringWidth - 3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (frameId === 'passport') {
    ctx.strokeStyle = colors.navy;
    ctx.lineWidth = ringWidth;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = colors.sun;
    ctx.lineWidth = Math.max(3, Math.round(edgePx * 0.012));
    ctx.setLineDash([Math.round(edgePx * 0.04), Math.round(edgePx * 0.025)]);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
