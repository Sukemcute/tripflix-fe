import { describe, expect, it } from 'vitest';
import { cartSubtotal, holdCountdown } from './booking';

describe('holdCountdown', () => {
  const now = new Date('2026-11-04T10:00:00Z');

  it('còn thời gian', () => {
    expect(holdCountdown('2026-11-04T10:30:00Z', now)).toEqual({ secondsLeft: 1800, expired: false });
  });

  it('đã hết hạn thì về 0', () => {
    expect(holdCountdown('2026-11-04T09:59:00Z', now)).toEqual({ secondsLeft: 0, expired: true });
  });
});

describe('cartSubtotal', () => {
  it('cộng phòng theo số đêm, vé theo số lượng', () => {
    expect(
      cartSubtotal([
        { unitPrice: 1_000_000, quantity: 1, nights: 2 },
        { unitPrice: 300_000, quantity: 3 },
      ]),
    ).toBe(2_900_000);
  });
});
