import { describe, expect, it } from 'vitest';
import { canSendRegistrationCode, countCharacters, getRegistrationPasswordStrength } from './registration';

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

describe('canSendRegistrationCode', () => {
  const ready = { displayName: 'Lan', email: 'lan@example.com', password: 'Mua dong tren nui' };

  it('needs a display name, an email and a strong password', () => {
    expect(canSendRegistrationCode(ready)).toBe(true);
    expect(canSendRegistrationCode({ ...ready, displayName: '' })).toBe(false);
    expect(canSendRegistrationCode({ ...ready, displayName: '   ' })).toBe(false);
    expect(canSendRegistrationCode({ ...ready, email: ' ' })).toBe(false);
    expect(canSendRegistrationCode({ ...ready, password: 'Password123456' })).toBe(false);
  });
});

describe('countCharacters', () => {
  it('counts an emoji as one character, like Core API', () => {
    expect(countCharacters('')).toBe(0);
    expect(countCharacters('Lan')).toBe(3);
    expect(countCharacters('Đà Lạt')).toBe(6);
    expect(countCharacters('😀😀')).toBe(2);
  });
});
