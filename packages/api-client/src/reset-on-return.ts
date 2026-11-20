import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Quay lại trang (Reels, Bài viết) mà danh sách gợi ý đã có trong cache: bỏ cache, tải lại từ trang 1.
 * Gợi ý tính theo tín hiệu mới nhất mỗi lần gọi (vừa tìm Hội An thì có bài Hội An), nhưng cache giữ danh sách cũ
 * cho tới khi tải lại cả trang. "Quay lại" = isActive chuyển từ false sang true (mount lại, hoặc tab được giữ mount
 * nay hiện ra lại); lần đầu vào trang chưa có cache thì không làm gì. Đổi chip trong trang vẫn dùng cache như cũ.
 */
export function useResetOnReturn(queryKey: readonly unknown[], isActive: boolean): void {
  const client = useQueryClient();
  const wasActiveRef = useRef(false);
  // queryKey là mảng mới mỗi lần render nên effect chạy lại, nhưng chỉ làm khi isActive vừa bật.
  useEffect(() => {
    const isJustActivated = isActive && !wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (!isJustActivated || client.getQueryData(queryKey) === undefined) return;
    void client.resetQueries({ queryKey, exact: true });
  }, [client, isActive, queryKey]);
}
