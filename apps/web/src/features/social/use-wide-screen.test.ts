import { describe, expect, it } from 'vitest';
import { resolvePanelOpen } from './use-wide-screen';

describe('resolvePanelOpen', () => {
  it('starts closed on narrow screens so the comment sheet does not cover the reel', () => {
    expect(resolvePanelOpen(null, false)).toBe(false);
  });

  it('starts open on wide screens like before', () => {
    expect(resolvePanelOpen(null, true)).toBe(true);
  });

  it('keeps what the user chose on any screen', () => {
    expect(resolvePanelOpen(true, false)).toBe(true);
    expect(resolvePanelOpen(false, true)).toBe(false);
  });
});
