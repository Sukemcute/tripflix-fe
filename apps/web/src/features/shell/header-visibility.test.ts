import { describe, expect, it } from 'vitest';
import { getNextHeaderVisibility, type HeaderVisibilityInput } from './header-visibility';

const base: HeaderVisibilityInput = { anchorY: 200, currentY: 200, isHidden: false, headerHeight: 57, isPinned: false };

describe('getNextHeaderVisibility', () => {
  it('keeps the header visible while the page is scrolled less than the header height', () => {
    expect(getNextHeaderVisibility({ ...base, anchorY: 0, currentY: 50, isHidden: true })).toEqual({
      isHidden: false,
      anchorY: 50,
    });
  });

  it('hides after scrolling down more than 8px', () => {
    expect(getNextHeaderVisibility({ ...base, currentY: 209 })).toEqual({ isHidden: true, anchorY: 209 });
  });

  it('shows again after scrolling up more than 8px', () => {
    expect(getNextHeaderVisibility({ ...base, isHidden: true, currentY: 191 })).toEqual({
      isHidden: false,
      anchorY: 191,
    });
  });

  it('ignores small jitters of 8px or less in the opposite direction', () => {
    expect(getNextHeaderVisibility({ ...base, isHidden: true, currentY: 192 })).toEqual({
      isHidden: true,
      anchorY: 200,
    });
    expect(getNextHeaderVisibility({ ...base, currentY: 208 })).toEqual({ isHidden: false, anchorY: 200 });
  });

  it('moves the anchor along while scrolling further in the same direction', () => {
    const hidden = getNextHeaderVisibility({ ...base, isHidden: true, currentY: 205 });
    expect(hidden).toEqual({ isHidden: true, anchorY: 205 });
    // Quay đầu 9px tính từ điểm sâu nhất là hiện lại.
    expect(getNextHeaderVisibility({ ...base, ...hidden, currentY: 196 }).isHidden).toBe(false);
  });

  it('never hides while a header menu is open or focus is inside the header', () => {
    expect(getNextHeaderVisibility({ ...base, currentY: 400, isPinned: true })).toEqual({
      isHidden: false,
      anchorY: 400,
    });
  });
});
