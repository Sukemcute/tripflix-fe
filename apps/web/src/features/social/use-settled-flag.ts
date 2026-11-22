import { useEffect, useState } from 'react';

/**
 * `true` khi `isReady` đã giữ `true` qua hai khung hình; `isReady` về `false` thì trả `false` ngay.
 * Dùng để chỉ bật hiệu ứng bố cục sau khi màn đã hiện xong bố cục ban đầu (mới mount, vừa chuyển tab,
 * dữ liệu vừa tải xong), để những thay đổi đó đặt thẳng vị trí thay vì co giãn.
 */
export function useSettledFlag(isReady: boolean): boolean {
  const [isSettled, setIsSettled] = useState(false);
  const [lastIsReady, setLastIsReady] = useState(isReady);

  // Hết sẵn sàng thì tắt ngay trong lúc render, không chờ effect, để không lọt khung hình nào có hiệu ứng.
  if (lastIsReady !== isReady) {
    setLastIsReady(isReady);
    if (!isReady) setIsSettled(false);
  }

  useEffect(() => {
    if (!isReady) return;
    const frames = { first: 0, second: 0 };
    frames.first = window.requestAnimationFrame(() => {
      frames.second = window.requestAnimationFrame(() => setIsSettled(true));
    });
    return () => {
      window.cancelAnimationFrame(frames.first);
      window.cancelAnimationFrame(frames.second);
    };
  }, [isReady]);

  return isReady && isSettled;
}
