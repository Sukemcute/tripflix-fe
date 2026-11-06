import { useCallback, useEffect, useState } from 'react';

/** Số giây còn lại (làm tròn lên) tới lúc được gửi lại; 0 khi đã hết thời gian chờ. */
export function getSecondsLeft(availableAtMs: number | undefined, nowMs: number): number {
  if (availableAtMs === undefined) return 0;
  return Math.max(0, Math.ceil((availableAtMs - nowMs) / 1000));
}

/**
 * Đếm ngược tới lúc được gửi lại mã (web và mobile dùng chung). start(seconds) bắt đầu chờ, clear() bỏ chờ
 * (ví dụ khi đổi email). Chỉ chạy đồng hồ khi đang chờ.
 */
export function useResendCooldown() {
  const [availableAtMs, setAvailableAtMs] = useState<number>();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const secondsLeft = getSecondsLeft(availableAtMs, nowMs);

  useEffect(() => {
    if (availableAtMs === undefined) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      if (now >= availableAtMs) setAvailableAtMs(undefined);
    }, 1000);
    return () => clearInterval(timer);
  }, [availableAtMs]);

  const start = useCallback((seconds: number) => {
    const now = Date.now();
    setNowMs(now);
    setAvailableAtMs(seconds > 0 ? now + seconds * 1000 : undefined);
  }, []);
  const clear = useCallback(() => setAvailableAtMs(undefined), []);

  return { secondsLeft, isWaiting: secondsLeft > 0, start, clear };
}
