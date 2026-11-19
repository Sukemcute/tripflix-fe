import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Quay lại trang (Reels, Bài viết) mà danh sách gợi ý đã có trong cache: bỏ cache, tải lại từ trang 1.
 * Gợi ý tính theo tín hiệu mới nhất mỗi lần gọi (vừa tìm Hội An thì có bài Hội An), nhưng cache giữ danh sách cũ
 * cho tới khi tải lại cả trang. Chỉ chạy một lần mỗi lần mount: đổi chip trong trang vẫn dùng cache như cũ.
 */
export function useResetOnReturn(queryKey: readonly unknown[], isActive: boolean): void {
  const client = useQueryClient();
  const isDoneRef = useRef(false);
  // queryKey là mảng mới mỗi lần render nên effect chạy lại, nhưng isDoneRef chặn: chỉ lần đầu sẵn sàng mới làm.
  useEffect(() => {
    if (!isActive || isDoneRef.current) return;
    isDoneRef.current = true;
    if (client.getQueryData(queryKey) === undefined) return;
    void client.resetQueries({ queryKey, exact: true });
  }, [client, isActive, queryKey]);
}
