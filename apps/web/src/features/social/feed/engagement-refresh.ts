/**
 * Query cần tải lại sau khi bấm Thích/Lưu/Chia sẻ. Like/Save đã ghi số của server vào cache (onSuccess), lỗi thì
 * rollback tự tải lại: chỉ làm mới chi tiết bài đó (và danh sách đã lưu khi Lưu), không tải lại cả bảng tin, tìm kiếm,
 * bình luận mỗi lần bấm. Share chưa có bước ghi cache nên vẫn tải lại mọi query social như cũ.
 */
export function getEngagementRefreshKeys(type: 'like' | 'save' | 'share', postId: string): readonly (readonly string[])[] {
  if (type === 'share') return [['social']];
  return type === 'save' ? [['social', 'post', postId], ['social', 'bookmarks']] : [['social', 'post', postId]];
}
