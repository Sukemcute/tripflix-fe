import { describe, expect, it } from 'vitest';
import { decideSheetListDrag, type SheetListDragStep } from './sheet-list-drag';

/** Chạy một lần vuốt: mỗi bước là vị trí ngón tay và độ cuộn của danh sách lúc đó. */
function runSwipe(startY: number, moves: { touchY: number; scrollY: number }[], activateAfter = 12) {
  let anchorY = startY;
  const steps: SheetListDragStep[] = [];
  for (const move of moves) {
    const next = decideSheetListDrag({ ...move, anchorY, horizontalTravel: 0, touchCount: 1, activateAfter });
    anchorY = next.anchorY;
    steps.push(next.step);
    if (next.step !== 'wait') break;
  }
  return steps;
}

describe('decideSheetListDrag', () => {
  it('danh sách ở trên cùng: kéo xuống quá ngưỡng thì kéo sheet', () => {
    expect(
      runSwipe(300, [
        { touchY: 306, scrollY: 0 },
        { touchY: 313, scrollY: 0 },
      ]),
    ).toEqual(['wait', 'activate']);
  });

  it('vuốt từ giữa danh sách đang cuộn dở: cuộn lên đỉnh rồi cùng lần vuốt đó kéo sheet', () => {
    // Lỗi cũ: chạm tay lúc danh sách chưa ở đỉnh là bỏ hẳn, chat AI (luôn cuộn ở cuối) chỉ đóng được ở phần đầu khung.
    expect(
      runSwipe(300, [
        { touchY: 400, scrollY: 200 },
        { touchY: 500, scrollY: 100 },
        { touchY: 599, scrollY: 2 },
        { touchY: 600, scrollY: 0 },
        { touchY: 610, scrollY: 0 },
        { touchY: 613, scrollY: 0 },
      ]),
    ).toEqual(['wait', 'wait', 'wait', 'wait', 'wait', 'activate']);
  });

  it('quãng kéo sheet chỉ tính từ lúc chạm đỉnh, không cộng quãng đã cuộn', () => {
    expect(
      runSwipe(300, [
        { touchY: 600, scrollY: 2 },
        { touchY: 605, scrollY: 0 },
      ]),
    ).toEqual(['wait', 'wait']);
  });

  it('ở đỉnh mà ngón tay đi lên thì để danh sách cuộn, đổi chiều lại vẫn kéo được sheet', () => {
    expect(
      runSwipe(300, [
        { touchY: 280, scrollY: 0 },
        { touchY: 260, scrollY: 20 },
        { touchY: 270, scrollY: 0 },
        { touchY: 275, scrollY: 0 },
      ]),
    ).toEqual(['wait', 'wait', 'wait', 'activate']);
  });

  it('lệch ngang hoặc hai ngón tay thì nhường cử chỉ khác', () => {
    const base = { scrollY: 0, anchorY: 300, touchY: 320, activateAfter: 12 };
    expect(decideSheetListDrag({ ...base, horizontalTravel: 21, touchCount: 1 }).step).toBe('fail');
    expect(decideSheetListDrag({ ...base, horizontalTravel: 0, touchCount: 2 }).step).toBe('fail');
  });
});
