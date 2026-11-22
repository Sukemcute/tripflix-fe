type Bounds = { top: number; right: number; bottom: number; left: number };
type HighlightRect = { top: number; left: number; width: number; height: number };

/** Tọa độ phần bài đang hiện, dùng chung cho bóng hover và viền highlight. */
export function getVisiblePostRect(
  viewport: Bounds,
  card: Bounds,
  coveredTop = viewport.top,
): HighlightRect | null {
  const top = Math.max(viewport.top, coveredTop, card.top);
  const bottom = Math.min(viewport.bottom, card.bottom);
  const left = Math.max(viewport.left, card.left);
  const right = Math.min(viewport.right, card.right);

  if (bottom <= top || right <= left) return null;
  return { top: top - viewport.top, left: left - viewport.left, width: right - left, height: bottom - top };
}

/** Phần thẻ bị cắt bởi vùng cuộn cần một viền riêng nằm trên mặt nạ bo góc. */
export function getClippedHighlightRect(
  viewport: Bounds,
  card: Bounds,
  coveredTop = viewport.top,
): HighlightRect | null {
  const rect = getVisiblePostRect(viewport, card, coveredTop);
  if (!rect) return null;
  if (
    rect.top + viewport.top === card.top &&
    rect.left + viewport.left === card.left &&
    rect.height === card.bottom - card.top &&
    rect.width === card.right - card.left
  )
    return null;
  return rect;
}
