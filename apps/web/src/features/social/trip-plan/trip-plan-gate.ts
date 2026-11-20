/**
 * Có hiện skeleton của trang lộ trình không (TF113).
 * Khi đã có bài (kể cả từ prefetch ở server lúc chưa biết phiên), không chờ phiên sẵn sàng, nên HTML ẩn danh có nội dung.
 * Khi chưa có bài thì vẫn chờ phiên và lúc tải, như trước.
 */
export function shouldShowTripPlanSkeleton({
  hasPost,
  isReady,
  isPending,
}: {
  hasPost: boolean;
  isReady: boolean;
  isPending: boolean;
}): boolean {
  if (hasPost) return false;
  return !isReady || isPending;
}
