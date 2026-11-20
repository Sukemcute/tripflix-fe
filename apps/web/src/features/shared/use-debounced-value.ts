'use client';

import { useEffect, useState } from 'react';

/** Huỷ bộ đếm cũ (nếu có) và hẹn cập nhật giá trị sau `delayMs`. */
export function scheduleDebouncedCommit<T>(
  previousTimer: ReturnType<typeof setTimeout> | undefined,
  value: T,
  delayMs: number,
  onCommit: (nextValue: T) => void,
): ReturnType<typeof setTimeout> {
  if (previousTimer !== undefined) {
    clearTimeout(previousTimer);
  }
  return setTimeout(() => {
    onCommit(value);
  }, delayMs);
}

/** Trì hoãn cập nhật giá trị sau `delayMs` để giảm số lần gọi API khi người dùng đang gõ liên tục. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = scheduleDebouncedCommit(undefined, value, delayMs, setDebouncedValue);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
