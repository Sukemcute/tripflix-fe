import { vi } from '@tripflix/i18n';
import { colors } from '@tripflix/tokens';

export type AvatarStickerCategory = 'accessories' | 'travel';

export type AvatarFrameId =
  | 'none'
  | 'fox-hat'
  | 'rose-pink'
  | 'rose-blue'
  | 'midnight-sorceress'
  | 'tripi-hood'
  | 'tropical-wreath';

export interface AvatarStickerPreset {
  id: string;
  label: string;
  category: AvatarStickerCategory;
  src: string;
  /** Kích thước cơ sở trên khung 240px (px). */
  baseSizePx: number;
  /** Vị trí mặc định khi mới bấm thêm (-0.18..1.18 theo khung tròn; <0 hoặc >1 là tràn ra ngoài khung). */
  defaultX: number;
  defaultY: number;
}

export interface PlacedSticker {
  instanceId: string;
  presetId: string;
  /** Tâm sticker theo tỉ lệ khung tròn (-0.18..1.18). */
  x: number;
  y: number;
  /** Hệ số nhân kích thước (0.5..2.4). */
  scale: number;
  /** Góc xoay đơn vị độ (-180..180). */
  rotationDeg: number;
  /** Có lật ngang hay không. */
  isFlipped: boolean;
}

export interface AvatarFrameOption {
  id: AvatarFrameId;
  label: string;
  /** SVG data URL vẽ khung thú / phụ kiện bọc bên ngoài hình tròn (viewBox 0 0 200 200, hình tròn avatar ở tâm r=68). */
  overlaySrc: string | null;
}

export interface StoredAvatarDecor {
  frameId: AvatarFrameId;
  stickers: PlacedSticker[];
}

export const MIN_STICKER_SCALE = 0.5;
export const MAX_STICKER_SCALE = 2.4;
/** Cho phép kéo tâm phụ kiện ra ngoài mép hình tròn (-0.18..1.18) để bọc tràn viền ngoài. */
export const MIN_NORM_POS = -0.18;
export const MAX_NORM_POS = 1.18;

export const AVATAR_DECOR_EVENT = 'tripflix:avatar-decor-updated';
const STORAGE_KEY = 'tripflix:avatar-decor:v1';

function toSvgDataUrl(svgBody: string, viewBox = '0 0 120 120'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">${svgBody}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Các mẫu khung bọc NGOÀI vòng tròn avatar (kiểu Discord Avatar Decorations).
 * Vòng tròn avatar nằm ở tâm (cx=100, cy=100, r=68); phần khung và thú bông tràn ra vùng r=68..98.
 */
export const AVATAR_FRAMES: readonly AvatarFrameOption[] = [
  {
    id: 'none',
    label: vi.api.avatarFrameNone,
    overlaySrc: null,
  },
  {
    id: 'fox-hat',
    label: vi.api.avatarFrameFoxHat,
    overlaySrc: toSvgDataUrl(
      `
      <!-- Tai cáo trái & phải vểnh ra ngoài đỉnh vòng tròn -->
      <path d="M36 58 L24 14 L68 32 Z" fill="rgb(138 78 45)" stroke="rgb(58 32 18)" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M36 50 L30 22 L58 34 Z" fill="rgb(46 28 20)"/>
      <path d="M164 58 L176 14 L132 32 Z" fill="rgb(138 78 45)" stroke="rgb(58 32 18)" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M164 50 L170 22 L142 34 Z" fill="rgb(46 28 20)"/>
      <!-- Lông má trắng kem xù ôm hai bên sườn ngoài hình tròn -->
      <path d="M28 62 C12 78, 12 104, 26 122 C20 104, 30 92, 36 86 C42 64, 68 46, 100 46 C132 46, 158 64, 164 86 C170 92, 180 104, 174 122 C188 104, 188 78, 172 62 C156 32, 130 20, 100 20 C70 20, 44 32, 28 62 Z" fill="rgb(243 226 202)" stroke="rgb(58 32 18)" stroke-width="3.5" stroke-linejoin="round"/>
      <!-- Mũ đầu cáo nâu hạt dẻ trùm lên đỉnh khung tròn -->
      <path d="M32 68 C42 30, 68 18, 100 18 C132 18, 158 30, 168 68 C150 52, 128 56, 100 38 C72 56, 50 52, 32 68 Z" fill="rgb(152 88 52)" stroke="rgb(58 32 18)" stroke-width="3.5" stroke-linejoin="round"/>
      <!-- Hai răng nanh nhỏ & mũi cáo ở mép trên vòng tròn -->
      <path d="M78 46 L82 55 L87 48 Z" fill="${colors.background}" stroke="rgb(58 32 18)" stroke-width="2"/>
      <path d="M122 46 L118 55 L113 48 Z" fill="${colors.background}" stroke="rgb(58 32 18)" stroke-width="2"/>
      <ellipse cx="100" cy="36" rx="9" ry="6" fill="rgb(46 28 20)"/>
      <ellipse cx="98" cy="34.5" rx="3" ry="1.6" fill="${colors.background}" opacity="0.7"/>
      <!-- Mắt & chân mày hạt đậu dễ thương -->
      <ellipse cx="78" cy="27" rx="4.5" ry="2.5" transform="rotate(-12 78 27)" fill="rgb(245 232 212)"/>
      <ellipse cx="122" cy="27" rx="4.5" ry="2.5" transform="rotate(12 122 27)" fill="rgb(245 232 212)"/>
      <circle cx="64" cy="40" r="3.6" fill="rgb(38 22 14)"/>
      <circle cx="136" cy="40" r="3.6" fill="rgb(38 22 14)"/>
      <circle cx="63" cy="38.8" r="1.2" fill="${colors.background}"/>
      <circle cx="135" cy="38.8" r="1.2" fill="${colors.background}"/>
      `,
      '0 0 200 200',
    ),
  },
  {
    id: 'rose-pink',
    label: vi.api.avatarFrameRosePink,
    overlaySrc: toSvgDataUrl(
      `
      <!-- Tai gấu hồng bên ngoài đỉnh khung -->
      <circle cx="46" cy="32" r="16" fill="rgb(244 162 184)" stroke="rgb(42 26 34)" stroke-width="3.8"/>
      <circle cx="46" cy="32" r="8" fill="rgb(225 112 144)"/>
      <circle cx="154" cy="32" r="16" fill="rgb(244 162 184)" stroke="rgb(42 26 34)" stroke-width="3.8"/>
      <circle cx="154" cy="32" r="8" fill="rgb(225 112 144)"/>
      <!-- Vòng thân gấu bông ôm trọn bên ngoài hình tròn r=68 -->
      <path d="M100 12 C48 12, 14 50, 14 102 C14 148, 46 184, 100 184 C154 184, 186 148, 186 102 C186 50, 152 12, 100 12 Z M100 36 C136 36, 165 65, 165 101 C165 137, 136 165, 100 165 C64 165, 35 137, 35 101 C35 65, 64 36, 100 36 Z" fill="rgb(244 162 184)" fill-rule="evenodd" stroke="rgb(42 26 34)" stroke-width="3.8" stroke-linejoin="round"/>
      <!-- Mặt gấu phía trên khung -->
      <ellipse cx="100" cy="25" rx="14" ry="9.5" fill="rgb(255 240 245)" stroke="rgb(42 26 34)" stroke-width="2.6"/>
      <ellipse cx="100" cy="22" rx="4.5" ry="3.2" fill="rgb(42 26 34)"/>
      <path d="M100 25.2 v3 M95 28.5 q5 4 10 0" stroke="rgb(42 26 34)" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="77" cy="22" r="3.4" fill="rgb(42 26 34)"/>
      <circle cx="123" cy="22" r="3.4" fill="rgb(42 26 34)"/>
      <ellipse cx="68" cy="28" rx="6" ry="3.6" fill="rgb(225 102 138)" opacity="0.75"/>
      <ellipse cx="132" cy="28" rx="6" ry="3.6" fill="rgb(225 102 138)" opacity="0.75"/>
      <!-- Hai chân gấu và hai tay ôm dưới đáy khung tròn -->
      <ellipse cx="46" cy="172" rx="18" ry="11" transform="rotate(-12 46 172)" fill="rgb(236 145 170)" stroke="rgb(42 26 34)" stroke-width="3.5"/>
      <ellipse cx="154" cy="172" rx="18" ry="11" transform="rotate(12 154 172)" fill="rgb(236 145 170)" stroke="rgb(42 26 34)" stroke-width="3.5"/>
      <ellipse cx="68" cy="166" rx="15" ry="9.5" transform="rotate(10 68 166)" fill="rgb(244 162 184)" stroke="rgb(42 26 34)" stroke-width="3.4"/>
      <ellipse cx="132" cy="166" rx="15" ry="9.5" transform="rotate(-10 132 166)" fill="rgb(244 162 184)" stroke="rgb(42 26 34)" stroke-width="3.4"/>
      <!-- Nơ đỏ & bông hoa hồng ở đáy vòng tròn -->
      <path d="M88 166 C78 158, 78 176, 88 170 Z M112 166 C122 158, 122 176, 112 170 Z" fill="rgb(198 52 88)" stroke="rgb(42 26 34)" stroke-width="3"/>
      <circle cx="100" cy="168" r="5.5" fill="rgb(220 72 108)" stroke="rgb(42 26 34)" stroke-width="2.8"/>
      <path d="M72 152 Q78 158 84 164" stroke="rgb(54 148 92)" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="68" cy="148" r="9.5" fill="rgb(238 82 118)" stroke="rgb(42 26 34)" stroke-width="3"/>
      <path d="M64 146 q4 -4 8 0 q-2 5 -8 3" fill="rgb(255 156 180)"/>
      `,
      '0 0 200 200',
    ),
  },
  {
    id: 'rose-blue',
    label: vi.api.avatarFrameRoseBlue,
    overlaySrc: toSvgDataUrl(
      `
      <!-- Tai gấu xanh tím bên ngoài đỉnh khung -->
      <circle cx="46" cy="32" r="16" fill="rgb(168 178 232)" stroke="rgb(30 34 62)" stroke-width="3.8"/>
      <circle cx="46" cy="32" r="8" fill="rgb(122 134 206)"/>
      <circle cx="154" cy="32" r="16" fill="rgb(168 178 232)" stroke="rgb(30 34 62)" stroke-width="3.8"/>
      <circle cx="154" cy="32" r="8" fill="rgb(122 134 206)"/>
      <!-- Vòng thân gấu xanh ôm trọn bên ngoài hình tròn r=68 -->
      <path d="M100 12 C48 12, 14 50, 14 102 C14 148, 46 184, 100 184 C154 184, 186 148, 186 102 C186 50, 152 12, 100 12 Z M100 36 C136 36, 165 65, 165 101 C165 137, 136 165, 100 165 C64 165, 35 137, 35 101 C35 65, 64 36, 100 36 Z" fill="rgb(168 178 232)" fill-rule="evenodd" stroke="rgb(30 34 62)" stroke-width="3.8" stroke-linejoin="round"/>
      <!-- Mặt gấu phía trên khung -->
      <ellipse cx="100" cy="25" rx="14" ry="9.5" fill="rgb(240 244 255)" stroke="rgb(30 34 62)" stroke-width="2.6"/>
      <ellipse cx="100" cy="22" rx="4.5" ry="3.2" fill="rgb(30 34 62)"/>
      <path d="M100 25.2 v3 M95 28.5 q5 4 10 0" stroke="rgb(30 34 62)" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="77" cy="22" r="3.4" fill="rgb(30 34 62)"/>
      <circle cx="123" cy="22" r="3.4" fill="rgb(30 34 62)"/>
      <ellipse cx="68" cy="28" rx="6" ry="3.6" fill="rgb(116 128 214)" opacity="0.75"/>
      <ellipse cx="132" cy="28" rx="6" ry="3.6" fill="rgb(116 128 214)" opacity="0.75"/>
      <!-- Hai chân gấu và hai tay ôm dưới đáy khung tròn -->
      <ellipse cx="46" cy="172" rx="18" ry="11" transform="rotate(-12 46 172)" fill="rgb(148 160 220)" stroke="rgb(30 34 62)" stroke-width="3.5"/>
      <ellipse cx="154" cy="172" rx="18" ry="11" transform="rotate(12 154 172)" fill="rgb(148 160 220)" stroke="rgb(30 34 62)" stroke-width="3.5"/>
      <ellipse cx="68" cy="166" rx="15" ry="9.5" transform="rotate(10 68 166)" fill="rgb(168 178 232)" stroke="rgb(30 34 62)" stroke-width="3.4"/>
      <ellipse cx="132" cy="166" rx="15" ry="9.5" transform="rotate(-10 132 166)" fill="rgb(168 178 232)" stroke="rgb(30 34 62)" stroke-width="3.4"/>
      <!-- Nơ xanh & bông hoa hồng xanh ở đáy vòng tròn -->
      <path d="M88 166 C78 158, 78 176, 88 170 Z M112 166 C122 158, 122 176, 112 170 Z" fill="rgb(45 104 212)" stroke="rgb(30 34 62)" stroke-width="3"/>
      <circle cx="100" cy="168" r="5.5" fill="rgb(68 128 235)" stroke="rgb(30 34 62)" stroke-width="2.8"/>
      <path d="M72 152 Q78 158 84 164" stroke="rgb(44 156 122)" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="68" cy="148" r="9.5" fill="rgb(78 112 232)" stroke="rgb(30 34 62)" stroke-width="3"/>
      <path d="M64 146 q4 -4 8 0 q-2 5 -8 3" fill="rgb(164 192 255)"/>
      `,
      '0 0 200 200',
    ),
  },
  {
    id: 'midnight-sorceress',
    label: vi.api.avatarFrameMidnight,
    overlaySrc: toSvgDataUrl(
      `
      <!-- Cặp sừng ma thuật uốn cong vươn rộng ra ngoài phía trên vòng tròn -->
      <path d="M84 36 C56 8, 14 18, 16 54 C18 78, 46 86, 56 68 C42 68, 36 52, 46 42 C56 32, 72 38, 80 48 Z" fill="rgb(36 168 192)" stroke="rgb(22 52 94)" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M116 36 C144 8, 186 18, 184 54 C182 78, 154 86, 144 68 C158 68, 164 52, 154 42 C144 32, 128 38, 120 48 Z" fill="rgb(36 168 192)" stroke="rgb(22 52 94)" stroke-width="3.2" stroke-linejoin="round"/>
      <!-- Vân ánh tím bên trong sừng -->
      <path d="M44 40 C32 48, 34 64, 50 66" stroke="rgb(112 72 196)" stroke-width="6" stroke-linecap="round"/>
      <path d="M156 40 C168 48, 166 64, 150 66" stroke="rgb(112 72 196)" stroke-width="6" stroke-linecap="round"/>
      <!-- Vương miện pha lê và ngọc hồng phát sáng ở đỉnh khung tròn -->
      <path d="M74 42 L88 26 L100 12 L112 26 L126 42 L100 56 Z" fill="rgb(26 58 118)" stroke="rgb(68 214 236)" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="100,20 108,34 100,48 92,34" fill="rgb(244 92 188)" stroke="rgb(255 210 242)" stroke-width="2"/>
      <!-- Viền hào quang mảnh quanh vòng tròn -->
      <circle cx="100" cy="102" r="70" stroke="rgb(68 214 236)" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.7"/>
      `,
      '0 0 200 200',
    ),
  },
  {
    id: 'tripi-hood',
    label: vi.api.avatarFrameTripiHood,
    overlaySrc: toSvgDataUrl(
      `
      <!-- Tai Cáo Tripi cam san hô vươn ra ngoài đỉnh khung -->
      <path d="M38 56 L22 12 L68 30 Z" fill="${colors.coral}" stroke="${colors.navy}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M36 46 L29 20 L56 32 Z" fill="${colors.sunSoft}"/>
      <path d="M162 56 L178 12 L132 30 Z" fill="${colors.coral}" stroke="${colors.navy}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M164 46 L171 20 L144 32 Z" fill="${colors.sunSoft}"/>
      <!-- Vòng mũ phi công cam san hô bọc ngoài hình tròn -->
      <path d="M28 66 C42 28, 68 18, 100 18 C132 18, 158 28, 172 66 C154 46, 128 38, 100 38 C72 38, 46 46, 28 66 Z" fill="${colors.coral}" stroke="${colors.navy}" stroke-width="3.5" stroke-linejoin="round"/>
      <!-- Kính phi công gác trên trán mũ -->
      <rect x="56" y="20" width="38" height="22" rx="10" fill="${colors.tealSoft}" stroke="${colors.sun}" stroke-width="4"/>
      <rect x="106" y="20" width="38" height="22" rx="10" fill="${colors.tealSoft}" stroke="${colors.sun}" stroke-width="4"/>
      <path d="M94 30h12" stroke="${colors.sun}" stroke-width="4" stroke-linecap="round"/>
      <!-- Khăn quàng & huy hiệu máy bay ở đáy ngoài vòng tròn -->
      <circle cx="100" cy="100" r="71" stroke="${colors.coralSoft}" stroke-width="4.5" stroke-dasharray="18 10"/>
      <circle cx="156" cy="154" r="18" fill="${colors.sun}" stroke="${colors.navy}" stroke-width="3.2"/>
      <path d="M146 158l20-10-6 14-5-4-4 3 1-5-6-2z" fill="${colors.coralInk}"/>
      `,
      '0 0 200 200',
    ),
  },
  {
    id: 'tropical-wreath',
    label: vi.api.avatarFrameTropical,
    overlaySrc: toSvgDataUrl(
      `
      <!-- Vòng lá nhiệt đới & sóng biển ôm quanh bên ngoài hình tròn -->
      <circle cx="100" cy="100" r="72" stroke="${colors.teal}" stroke-width="6"/>
      <circle cx="100" cy="100" r="76" stroke="${colors.sun}" stroke-width="2.5" stroke-dasharray="8 6"/>
      <!-- Nón cói rộng vành đội trùm ra ngoài đỉnh vòng tròn -->
      <ellipse cx="100" cy="30" rx="58" ry="14" fill="${colors.sun}" stroke="${colors.navy}" stroke-width="3.5"/>
      <path d="M68 28c3-18 15-24 32-24s29 6 32 24" fill="${colors.sunSoft}" stroke="${colors.navy}" stroke-width="3.5"/>
      <path d="M69 24c20 5 42 5 62 0" stroke="${colors.coral}" stroke-width="6" stroke-linecap="round"/>
      <!-- Hoa sứ & sao biển gắn ở hai góc dưới ngoài khung tròn -->
      <circle cx="42" cy="154" r="14" fill="${colors.coral}" stroke="${colors.background}" stroke-width="3"/>
      <circle cx="42" cy="154" r="5" fill="${colors.sun}"/>
      <circle cx="158" cy="154" r="14" fill="${colors.tealInk}" stroke="${colors.background}" stroke-width="3"/>
      <circle cx="158" cy="154" r="5" fill="${colors.sunSoft}"/>
      `,
      '0 0 200 200',
    ),
  },
];

export const AVATAR_STICKER_PRESETS: readonly AvatarStickerPreset[] = [
  {
    id: 'sun-hat',
    label: vi.api.avatarStickerSunHat,
    category: 'accessories',
    baseSizePx: 118,
    defaultX: 0.5,
    defaultY: 0.06,
    src: toSvgDataUrl(`
      <ellipse cx="60" cy="74" rx="52" ry="14" fill="${colors.sun}" stroke="${colors.navy}" stroke-width="3.5"/>
      <path d="M30 70c2-24 14-38 30-38s28 14 30 38" fill="${colors.sunSoft}" stroke="${colors.navy}" stroke-width="3.5"/>
      <path d="M31 64c19 6 39 6 58 0" stroke="${colors.coral}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="78" cy="65" r="6" fill="${colors.coralInk}"/>
      <path d="M78 68l8 14M76 68l-3 15" stroke="${colors.coral}" stroke-width="4" stroke-linecap="round"/>
    `),
  },
  {
    id: 'sunglasses',
    label: vi.api.avatarStickerSunglasses,
    category: 'accessories',
    baseSizePx: 108,
    defaultX: 0.5,
    defaultY: 0.38,
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
    id: 'headphones',
    label: vi.api.avatarStickerHeadphones,
    category: 'accessories',
    baseSizePx: 132,
    defaultX: 0.5,
    defaultY: 0.36,
    src: toSvgDataUrl(`
      <path d="M22 64V54a38 38 0 0 1 76 0v10" stroke="${colors.teal}" stroke-width="8" stroke-linecap="round"/>
      <rect x="10" y="54" width="20" height="34" rx="10" fill="${colors.coral}" stroke="${colors.navy}" stroke-width="3.5"/>
      <rect x="90" y="54" width="20" height="34" rx="10" fill="${colors.coral}" stroke="${colors.navy}" stroke-width="3.5"/>
    `),
  },
  {
    id: 'camera',
    label: vi.api.avatarStickerCamera,
    category: 'accessories',
    baseSizePx: 76,
    defaultX: 0.88,
    defaultY: 0.84,
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
    id: 'airplane',
    label: vi.api.avatarStickerAirplane,
    category: 'travel',
    baseSizePx: 76,
    defaultX: 0.12,
    defaultY: 0.14,
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
    baseSizePx: 76,
    defaultX: 0.12,
    defaultY: 0.86,
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
    baseSizePx: 74,
    defaultX: 0.88,
    defaultY: 0.14,
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
    baseSizePx: 76,
    defaultX: 0.14,
    defaultY: 0.86,
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
    baseSizePx: 82,
    defaultX: 0.86,
    defaultY: 0.86,
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
    baseSizePx: 86,
    defaultX: 0.88,
    defaultY: 0.82,
    src: '/brand/tripi-library/expr-happy.png',
  },
  {
    id: 'tripi-explore',
    label: vi.api.avatarStickerTripiExplore,
    category: 'travel',
    baseSizePx: 88,
    defaultX: 0.12,
    defaultY: 0.82,
    src: '/brand/tripi-library/action-explore.png',
  },
  {
    id: 'tripi-vacation',
    label: vi.api.avatarStickerTripiVacation,
    category: 'travel',
    baseSizePx: 88,
    defaultX: 0.88,
    defaultY: 0.82,
    src: '/brand/tripi-library/action-vacation.png',
  },
];

export function findStickerPreset(presetId: string): AvatarStickerPreset | undefined {
  return AVATAR_STICKER_PRESETS.find((preset) => preset.id === presetId);
}

export function findFrameOption(frameId: AvatarFrameId): AvatarFrameOption | undefined {
  return AVATAR_FRAMES.find((frame) => frame.id === frameId);
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

/** Đẩy phụ kiện đang chọn ra sát viền ngoài hình tròn (bán kính 0.54 tính từ tâm 0.5, 0.5). */
export function snapStickerToOuterRim(sticker: PlacedSticker): PlacedSticker {
  const dx = sticker.x - 0.5;
  const dy = sticker.y - 0.5;
  const dist = Math.hypot(dx, dy);
  const targetRadius = 0.54;
  if (dist < 0.001) {
    return { ...sticker, x: 0.5, y: clampStickerNorm(0.5 - targetRadius) };
  }
  return {
    ...sticker,
    x: clampStickerNorm(0.5 + (dx / dist) * targetRadius),
    y: clampStickerNorm(0.5 + (dy / dist) * targetRadius),
  };
}

export function loadUserAvatarDecor(userId?: string | null): StoredAvatarDecor {
  const empty: StoredAvatarDecor = { frameId: 'none', stickers: [] };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const map = JSON.parse(raw) as Record<string, StoredAvatarDecor>;
    const entry = userId ? map[userId] : map.active;
    if (!entry) return empty;
    return {
      frameId: findFrameOption(entry.frameId) ? entry.frameId : 'none',
      stickers: Array.isArray(entry.stickers) ? entry.stickers : [],
    };
  } catch {
    return empty;
  }
}

export function saveUserAvatarDecor(userId: string, decor: StoredAvatarDecor): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, StoredAvatarDecor>) : {};
    map[userId] = decor;
    map.active = decor;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(AVATAR_DECOR_EVENT, { detail: { userId, decor } }));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage.
  }
}
