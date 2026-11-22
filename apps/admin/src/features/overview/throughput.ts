import type { ModerationLogDto } from '@tripflix/api-client/core-api/model/index';

const HOUR_MS = 3_600_000;
export const THROUGHPUT_HOURS = 24;

export interface ThroughputBucket {
  /** Đầu giờ (epoch ms), để định dạng theo múi giờ của người xem. */
  startsAt: number;
  staff: number;
  system: number;
}

/** Chia thao tác kiểm duyệt trong 24 giờ gần nhất theo giờ, tách kiểm duyệt viên và hệ thống tự động. */
export function buildThroughput(items: Pick<ModerationLogDto, 'createdAt' | 'actorType'>[], now: number): ThroughputBucket[] {
  const currentHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const firstHour = currentHour - (THROUGHPUT_HOURS - 1) * HOUR_MS;
  const buckets = Array.from({ length: THROUGHPUT_HOURS }, (_, index) => ({
    startsAt: firstHour + index * HOUR_MS,
    staff: 0,
    system: 0,
  }));
  for (const item of items) {
    const index = Math.floor((new Date(item.createdAt).getTime() - firstHour) / HOUR_MS);
    const bucket = buckets[index];
    if (!bucket) continue;
    if (item.actorType === 'system') bucket.system += 1;
    else bucket.staff += 1;
  }
  return buckets;
}

/** Chỉ giữ thao tác nằm trong 24 giờ của biểu đồ, để biểu đồ và bảng loại quyết định cùng một cửa sổ. */
export function selectThroughputWindow<T extends Pick<ModerationLogDto, 'createdAt'>>(items: T[], now: number): T[] {
  const firstHour = Math.floor(now / HOUR_MS) * HOUR_MS - (THROUGHPUT_HOURS - 1) * HOUR_MS;
  const end = firstHour + THROUGHPUT_HOURS * HOUR_MS;
  return items.filter((item) => {
    const at = new Date(item.createdAt).getTime();
    return at >= firstHour && at < end;
  });
}

/** Đếm theo loại quyết định, nhiều nhất trước. */
export function countActions(items: Pick<ModerationLogDto, 'action'>[]): [action: string, count: number][] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.action, (counts.get(item.action) ?? 0) + 1);
  return [...counts].sort(([, a], [, b]) => b - a);
}
