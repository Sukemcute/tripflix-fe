import { describe, expect, it } from 'vitest';
import { buildThroughput, countActions, selectThroughputWindow, THROUGHPUT_HOURS } from './throughput';

const now = Date.parse('2026-11-17T08:30:00Z');

describe('buildThroughput (TF104)', () => {
  it('chia 24 giờ gần nhất theo giờ, giờ hiện tại ở cuối', () => {
    const buckets = buildThroughput([], now);
    expect(buckets).toHaveLength(THROUGHPUT_HOURS);
    expect(new Date(buckets.at(-1)!.startsAt).toISOString()).toBe('2026-11-17T08:00:00.000Z');
    expect(new Date(buckets[0]!.startsAt).toISOString()).toBe('2026-11-16T09:00:00.000Z');
  });

  it('tách kiểm duyệt viên và hệ thống, bỏ thao tác cũ hơn 24 giờ hoặc ở tương lai', () => {
    const buckets = buildThroughput(
      [
        { createdAt: '2026-11-17T08:05:00Z', actorType: 'staff' },
        { createdAt: '2026-11-17T08:20:00Z', actorType: 'system' },
        { createdAt: '2026-11-17T07:59:59Z', actorType: 'staff' },
        { createdAt: '2026-11-16T08:59:59Z', actorType: 'staff' },
        { createdAt: '2026-11-17T09:10:00Z', actorType: 'system' },
      ],
      now,
    );
    expect(buckets.at(-1)).toMatchObject({ staff: 1, system: 1 });
    expect(buckets.at(-2)).toMatchObject({ staff: 1, system: 0 });
    expect(buckets.reduce((sum, bucket) => sum + bucket.staff + bucket.system, 0)).toBe(3);
  });
});

describe('selectThroughputWindow', () => {
  it('bỏ thao tác ngoài 24 giờ của biểu đồ', () => {
    const kept = selectThroughputWindow(
      [
        { createdAt: '2026-11-17T08:05:00Z', action: 'hide' },
        { createdAt: '2026-11-16T08:59:59Z', action: 'restore' },
        { createdAt: '2026-11-17T09:00:00Z', action: 'dismiss' },
      ],
      now,
    );
    expect(kept.map((item) => item.action)).toEqual(['hide']);
  });
});

describe('countActions', () => {
  it('đếm theo loại quyết định, nhiều nhất trước', () => {
    expect(countActions([{ action: 'hide' }, { action: 'restore' }, { action: 'hide' }])).toEqual([
      ['hide', 2],
      ['restore', 1],
    ]);
  });
});
