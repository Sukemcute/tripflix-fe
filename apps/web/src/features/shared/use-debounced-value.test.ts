import { afterEach, describe, expect, it, vi as vitestVi } from 'vitest';
import { scheduleDebouncedCommit } from './use-debounced-value';

afterEach(() => {
  vitestVi.useRealTimers();
});

describe('useDebouncedValue / scheduleDebouncedCommit', () => {
  it('gõ nhanh 5 phím trong < 250ms chỉ chốt 1 giá trị cuối cùng sau đủ 250ms', () => {
    vitestVi.useFakeTimers();
    const onCommit = vitestVi.fn();
    let timer: ReturnType<typeof setTimeout> | undefined;

    for (const keystroke of ['ng', 'ngu', 'nguy', 'nguye', 'nguyen']) {
      timer = scheduleDebouncedCommit(timer, keystroke, 250, onCommit);
      vitestVi.advanceTimersByTime(60);
    }

    // Tổng cộng đã trôi 60ms kể từ phím cuối -> chưa gọi
    expect(onCommit).not.toHaveBeenCalled();

    // Tới 249ms kể từ phím cuối -> vẫn chưa gọi
    vitestVi.advanceTimersByTime(189);
    expect(onCommit).not.toHaveBeenCalled();

    // Đủ 250ms -> chốt đúng 1 giá trị cuối cùng
    vitestVi.advanceTimersByTime(1);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('nguyen');
  });
});
