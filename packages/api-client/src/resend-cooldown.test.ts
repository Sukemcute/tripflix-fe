import { describe, expect, it } from 'vitest';
import { getSecondsLeft } from './resend-cooldown';

describe('getSecondsLeft', () => {
  it('rounds up the remaining seconds and stops at zero', () => {
    expect(getSecondsLeft(undefined, 1_000)).toBe(0);
    expect(getSecondsLeft(61_000, 1_000)).toBe(60);
    expect(getSecondsLeft(61_000, 1_001)).toBe(60);
    expect(getSecondsLeft(61_000, 60_500)).toBe(1);
    expect(getSecondsLeft(61_000, 61_000)).toBe(0);
    expect(getSecondsLeft(61_000, 90_000)).toBe(0);
  });
});
