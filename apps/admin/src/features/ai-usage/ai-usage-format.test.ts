import { describe, expect, it } from 'vitest';
import {
  answerKindLabel,
  bucketFor,
  buildWaterfall,
  formatBucketLabel,
  formatLatency,
  stepLabel,
} from './ai-usage-format';

describe('bucketFor', () => {
  it('hôm nay vẽ theo giờ, khoảng dài hơn theo ngày', () => {
    expect(bucketFor(1)).toBe('hour');
    expect(bucketFor(7)).toBe('day');
    expect(bucketFor(90)).toBe('day');
  });
});

describe('formatBucketLabel', () => {
  it('giờ và ngày theo giờ Việt Nam', () => {
    // 17:30 UTC ngày 17 là 00:30 ngày 18 ở Việt Nam.
    expect(formatBucketLabel('2026-11-17T17:30:00.000Z', 'hour')).toBe('00:30');
    expect(formatBucketLabel('2026-11-17T17:00:00.000Z', 'day')).toBe('18/11');
  });
});

describe('formatLatency', () => {
  it('dưới 1 giây hiện mili giây, trên đó hiện giây, thiếu thì dấu gạch', () => {
    expect(formatLatency(850)).toBe('850 ms');
    expect(formatLatency(1840)).toBe('1,8 giây');
    expect(formatLatency(null)).toBe('—');
  });
});

describe('nhãn', () => {
  it('kết quả và bước: giá trị đã biết dịch sang tiếng Việt, giá trị lạ giữ nguyên', () => {
    expect(answerKindLabel('error')).toBe('Lỗi');
    expect(answerKindLabel('moi_them')).toBe('moi_them');
    expect(answerKindLabel(null)).toBe('—');
    expect(stepLabel('controller')).toBe('Điều phối (controller)');
    expect(stepLabel('khac')).toBe('khac');
  });
});

describe('buildWaterfall', () => {
  const turn = { occurredAt: '2026-11-18T10:00:02.000Z', latencyMs: 2000 };

  it('đặt các bước nối tiếp nhau trong cả lượt', () => {
    // Lượt chạy 10:00:00 → 10:00:02. Controller 10:00:00 → 10:00:00,5; responder 10:00:01 → 10:00:02.
    const { totalMs, rows } = buildWaterfall(turn, [
      { id: 'a', occurredAt: '2026-11-18T10:00:00.500Z', latencyMs: 500 },
      { id: 'b', occurredAt: '2026-11-18T10:00:02.000Z', latencyMs: 1000 },
    ]);

    expect(totalMs).toBe(2000);
    expect(rows[0]).toEqual({ id: 'a', offsetPct: 0, widthPct: 25 });
    expect(rows[1]).toEqual({ id: 'b', offsetPct: 50, widthPct: 50 });
  });

  it('thiếu latencyMs thì bước tức thời nhưng vẫn thấy được (tối thiểu 1%)', () => {
    const { rows } = buildWaterfall({ occurredAt: '2026-11-18T10:00:02.000Z', latencyMs: 2000 }, [
      { id: 'a', occurredAt: '2026-11-18T10:00:01.000Z', latencyMs: null },
    ]);
    expect(rows[0]?.widthPct).toBe(1);
    expect(rows[0]?.offsetPct).toBe(50);
  });

  it('lượt cũ không có thời gian cả lượt thì lấy từ bước đầu tới cuối; không có bước thì tổng tối thiểu 1ms', () => {
    const noLatency = buildWaterfall({ occurredAt: '2026-11-18T10:00:02.000Z', latencyMs: null }, [
      { id: 'a', occurredAt: '2026-11-18T10:00:01.000Z', latencyMs: 1000 },
    ]);
    expect(noLatency.totalMs).toBe(2000);
    expect(noLatency.rows[0]).toMatchObject({ offsetPct: 0, widthPct: 50 });
    expect(buildWaterfall({ occurredAt: '2026-11-18T10:00:02.000Z', latencyMs: null }, []).totalMs).toBe(1);
  });

  it('bước kéo dài ra ngoài lượt vẫn nằm trong khung 0-100%', () => {
    const { rows } = buildWaterfall({ occurredAt: '2026-11-18T10:00:01.000Z', latencyMs: 1000 }, [
      { id: 'a', occurredAt: '2026-11-18T10:00:03.000Z', latencyMs: 500 },
    ]);
    const row = rows[0];
    expect(row && row.offsetPct + row.widthPct).toBeLessThanOrEqual(100);
  });
});
