import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { watchPostComments } from './notifications-realtime';
import { useApiSession } from './session';

/** Mỗi bảng bình luận gốc theo dõi một bài; các danh sách trả lời dùng chung lần tải lại. */
export function usePostCommentsRealtime(postId: string, enabled = true): void {
  const client = useQueryClient();
  const { user } = useApiSession();
  useEffect(() => {
    if (!enabled) return;
    return watchPostComments(postId, () => {
      void client.invalidateQueries({ queryKey: ['social', 'comments', postId] });
      void client.invalidateQueries({ queryKey: ['social', 'comment-thread', postId] });
      void client.invalidateQueries({ queryKey: ['social', 'post', postId] });
      void client.invalidateQueries({ queryKey: ['feed'] });
      void client.invalidateQueries({
        queryKey: ['social'],
        predicate: (query) => ['public', 'mine', 'bookmarks', 'author'].includes(String(query.queryKey[1])),
      });
    });
  }, [client, postId, enabled, user?.id]);
}
