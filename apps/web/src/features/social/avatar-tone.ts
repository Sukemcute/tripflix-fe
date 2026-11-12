export const AVATAR_TONES = ['coral', 'teal', 'sun', 'navy'] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];

/** Màu avatar ổn định theo tên: cùng một người luôn cùng màu, dễ nhận ra trong luồng bình luận. */
export function getAvatarTone(name: string | null | undefined): AvatarTone {
  const key = (name ?? '').trim().toLowerCase();
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length] ?? 'coral';
}
