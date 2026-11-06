import { describe, expect, it } from 'vitest';
import { getRegistrationPasswordStrength } from './registration';

describe('registration password feedback', () => {
  it.each([
    ['huhuhuhu', 'passwordShort'],
    ['Password123456', 'passwordWeak'],
    ['aaaaaaaaaaaa', 'passwordWeak'],
    ['123456789012', 'passwordWeak'],
    ['Mua dong tren nui', 'passwordStrong'],
  ])('classifies %s as %s', (password, strength) => {
    expect(getRegistrationPasswordStrength(password)).toBe(strength);
  });
});
