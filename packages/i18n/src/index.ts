import { vi } from './vi';

export { vi };

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];

/** Khoá dạng `tabs.feed`. Gõ sai khoá thì TypeScript báo lỗi. */
export type MessageKey = Paths<typeof vi>;

/**
 * Lấy chuỗi theo khoá, thay `{tên}` bằng giá trị truyền vào.
 * Ví dụ: `t('booking.holdExpiresIn', { time: '29:59' })`.
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let node: unknown = vi;
  for (const part of key.split('.')) node = (node as Record<string, unknown>)[part];
  const text = typeof node === 'string' ? node : key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}
