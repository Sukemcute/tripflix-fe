import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi as vitestVi } from 'vitest';
import {
  formatAbsoluteUtcDate,
  formatFullDateTime,
  formatRelativeTime,
  getRelativeClockListenerCount,
  getRelativeClockSnapshot,
  RELATIVE_CLOCK_INTERVAL_MS,
  subscribeRelativeClock,
} from './relative-time';
import { RelativeTime } from './relative-time-label';

afterEach(() => {
  vitestVi.useRealTimers();
  vitestVi.unstubAllGlobals();
  vitestVi.restoreAllMocks();
});

describe('formatRelativeTime', () => {
  const now = new Date(2026, 10, 19, 12, 0, 0, 0); // 19/11/2026 12:00:00 giờ máy người xem

  it('mốc tương lai (lệch đồng hồ) và < 60 giây trả "Vừa xong"', () => {
    expect(formatRelativeTime(new Date(now.getTime() + 5_000), now)).toBe('Vừa xong');
    expect(formatRelativeTime(new Date(now.getTime() + 86_400_000), now)).toBe('Vừa xong');
    expect(formatRelativeTime(now, now)).toBe('Vừa xong');
    expect(formatRelativeTime(new Date(now.getTime() - 59_000), now)).toBe('Vừa xong');
    expect(formatRelativeTime(new Date(now.getTime() - 59_999), now)).toBe('Vừa xong');
  });

  it('mốc 60 giây tới 59 phút 59 giây trả "N phút"', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 60_000), now)).toBe('1 phút');
    expect(formatRelativeTime(new Date(now.getTime() - 59 * 60_000), now)).toBe('59 phút');
    expect(formatRelativeTime(new Date(now.getTime() - (59 * 60_000 + 59_000)), now)).toBe('59 phút');
  });

  it('mốc 60 phút tới 23 giờ 59 phút trả "N giờ"', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 60 * 60_000), now)).toBe('1 giờ');
    expect(formatRelativeTime(new Date(now.getTime() - (23 * 3_600_000 + 59 * 60_000)), now)).toBe('23 giờ');
  });

  it('mốc 24 giờ tới dưới 7 ngày trả "N ngày"', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 24 * 3_600_000), now)).toBe('1 ngày');
    expect(formatRelativeTime(new Date(now.getTime() - 6 * 86_400_000), now)).toBe('6 ngày');
    expect(formatRelativeTime(new Date(now.getTime() - (7 * 86_400_000 - 1_000)), now)).toBe('6 ngày');
  });

  it('từ 7 ngày trở lên trong cùng năm trả "D thg M" gồm cả đầu năm và cuối năm', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 7 * 86_400_000), now)).toBe('12 thg 11');
    expect(formatRelativeTime(new Date(2026, 0, 1, 0, 5), new Date(2026, 0, 15, 12, 0))).toBe('1 thg 1');
    expect(formatRelativeTime(new Date(2026, 11, 1, 10, 0), new Date(2026, 11, 31, 23, 59))).toBe('1 thg 12');
  });

  it('khác năm (từ 7 ngày trở lên) trả "DD/MM/YYYY"; giáp năm < 7 ngày vẫn trả "N ngày"', () => {
    expect(formatRelativeTime(new Date(2025, 10, 19, 12, 0), now)).toBe('19/11/2025');
    expect(formatRelativeTime(new Date(2025, 0, 5, 9, 0), now)).toBe('05/01/2025');
    expect(formatRelativeTime(new Date(2025, 11, 31, 23, 59), new Date(2026, 0, 10, 10, 0))).toBe('31/12/2025');
    expect(formatRelativeTime(new Date(2025, 11, 30, 10, 0), new Date(2026, 0, 2, 10, 0))).toBe('3 ngày');
  });

  it('chuỗi ngày không hợp lệ trả chuỗi rỗng', () => {
    expect(formatRelativeTime('không-hợp-lệ', now)).toBe('');
  });
});

describe('đồng hồ chung subscribeRelativeClock', () => {
  it('chỉ tạo một setInterval chung cho nhiều bình luận, tạm dừng khi ẩn tab và dọn sạch khi huỷ', () => {
    vitestVi.useFakeTimers();
    vitestVi.setSystemTime(new Date(2026, 10, 19, 12, 0, 0));

    let visibilityState: DocumentVisibilityState = 'visible';
    const visibilityHandlers = new Set<() => void>();
    const fireVisibilityChange = () => {
      for (const cb of visibilityHandlers) cb();
    };
    vitestVi.stubGlobal('document', {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener: vitestVi.fn((event: string, cb: () => void) => {
        if (event === 'visibilitychange') visibilityHandlers.add(cb);
      }),
      removeEventListener: vitestVi.fn((event: string, cb: () => void) => {
        if (event === 'visibilitychange') visibilityHandlers.delete(cb);
      }),
    });

    const setIntervalSpy = vitestVi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vitestVi.spyOn(globalThis, 'clearInterval');

    const listeners = Array.from({ length: 5 }, () => vitestVi.fn());
    const unsubscribes = listeners.map((fn) => subscribeRelativeClock(fn));

    expect(getRelativeClockListenerCount()).toBe(5);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    const t0 = getRelativeClockSnapshot();
    vitestVi.advanceTimersByTime(RELATIVE_CLOCK_INTERVAL_MS);
    expect(getRelativeClockSnapshot()).toBe(t0 + RELATIVE_CLOCK_INTERVAL_MS);
    for (const fn of listeners) expect(fn).toHaveBeenCalledTimes(1);

    // Khi ẩn tab: dừng interval, không gọi listener dù thời gian trôi qua.
    visibilityState = 'hidden';
    fireVisibilityChange();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    vitestVi.advanceTimersByTime(RELATIVE_CLOCK_INTERVAL_MS * 4);
    for (const fn of listeners) expect(fn).toHaveBeenCalledTimes(1);

    // Khi mở lại tab: cập nhật ngay và bật lại đúng 1 interval chung.
    visibilityState = 'visible';
    fireVisibilityChange();
    for (const fn of listeners) expect(fn).toHaveBeenCalledTimes(2);
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);

    // Huỷ dần cho tới người nghe cuối cùng mới dừng hẳn timer.
    unsubscribes.slice(0, 4).forEach((unsub) => unsub());
    expect(getRelativeClockListenerCount()).toBe(1);
    unsubscribes[4]!();
    expect(getRelativeClockListenerCount()).toBe(0);
    expect(visibilityHandlers.size).toBe(0);
  });
});

describe('component RelativeTime', () => {
  it('trên server render ngày UTC cố định trong thẻ <time> để không lệch hydration', () => {
    const iso = '2026-11-19T06:00:00.000Z';
    const html = renderToStaticMarkup(<RelativeTime value={iso} />);
    expect(html).toContain(`<time dateTime="${iso}">${formatAbsoluteUtcDate(iso)}</time>`);
    expect(html).not.toContain('title=');
  });

  it('trên client (có now) render thời gian tương đối và tooltip ngày giờ đầy đủ', () => {
    const createdAt = new Date(2026, 10, 19, 11, 45, 0);
    const now = new Date(2026, 10, 19, 12, 0, 0);
    const iso = createdAt.toISOString();
    const html = renderToStaticMarkup(<RelativeTime value={iso} now={now} />);
    expect(html).toContain(`dateTime="${iso}"`);
    expect(html).toContain(`title="${formatFullDateTime(iso)}"`);
    expect(html).toContain('>15 phút</time>');
  });
});
