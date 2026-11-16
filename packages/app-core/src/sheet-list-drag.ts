/** Danh sách cách đỉnh dưới số điểm này thì coi như đang ở trên cùng. */
export const SHEET_LIST_TOP_SLOP = 1;
/** Ngón tay lệch ngang quá số điểm này trước khi kéo thì nhường cho cử chỉ ngang (vuốt reel, cuộn ngang). */
export const SHEET_LIST_HORIZONTAL_FAIL = 20;

export type SheetListDragStep = 'fail' | 'activate' | 'wait';

/**
 * Mỗi lần ngón tay di chuyển trong danh sách của sheet, chưa kéo sheet: quyết định để danh sách cuộn,
 * bắt đầu kéo sheet, hay nhường cử chỉ khác. Danh sách còn cuộn được hoặc ngón tay đi lên thì điểm tính
 * (`anchorY`) dời theo ngón tay, nên quãng kéo sheet chỉ tính từ lúc danh sách chạm đỉnh. Nhờ vậy vuốt từ
 * giữa danh sách đang cuộn dở vẫn kéo được sheet trong cùng một lần vuốt.
 */
export function decideSheetListDrag({
  scrollY,
  anchorY,
  touchY,
  horizontalTravel,
  touchCount,
  activateAfter,
}: {
  scrollY: number;
  anchorY: number;
  touchY: number;
  /** Quãng ngang (pt, trị tuyệt đối) tính từ lúc chạm. */
  horizontalTravel: number;
  touchCount: number;
  activateAfter: number;
}): { step: SheetListDragStep; anchorY: number } {
  'worklet';
  if (touchCount !== 1 || horizontalTravel > SHEET_LIST_HORIZONTAL_FAIL) return { step: 'fail', anchorY };
  if (scrollY > SHEET_LIST_TOP_SLOP || touchY < anchorY) return { step: 'wait', anchorY: touchY };
  return { step: touchY - anchorY > activateAfter ? 'activate' : 'wait', anchorY };
}
