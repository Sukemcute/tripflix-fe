'use client';
import { useEffect, useState } from 'react';

/** Thời điểm hiện tại, tự cập nhật theo nhịp để nhãn "x phút trước" không đứng yên. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
