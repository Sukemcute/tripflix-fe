import { describe, expect, it } from 'vitest';
import {
  canSendRegistrationCode,
  COMMON_NATIONALITIES,
  countCharacters,
  getAgeOn,
  getRegistrationPasswordStrength,
  getSignupProfileIssue,
  parseDayMonthYear,
} from './registration';

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

describe('TF06O: thông tin cá nhân khi đăng ký', () => {
  const today = new Date(Date.UTC(2026, 10, 9));
  const valid = { dateOfBirth: '2000-05-20', gender: 'female', nationality: 'VN', hasAcceptedTerms: true };

  it('tuổi tròn năm, tính cả trước sinh nhật; ngày không có thật trả null', () => {
    expect(getAgeOn('2000-11-09', today)).toBe(26);
    expect(getAgeOn('2000-11-10', today)).toBe(25);
    expect(getAgeOn('2000-02-30', today)).toBeNull();
    expect(getAgeOn('20/05/2000', today)).toBeNull();
  });

  it('đổi "ngày/tháng/năm" gõ trên app sang YYYY-MM-DD', () => {
    expect(parseDayMonthYear('20/5/2000')).toBe('2000-05-20');
    expect(parseDayMonthYear(' 01/12/1999 ')).toBe('1999-12-01');
    expect(parseDayMonthYear('2000-05-20')).toBe('');
  });

  it('đủ thông tin thì không có lỗi', () => {
    expect(getSignupProfileIssue(valid, today)).toBeNull();
  });

  it('báo lỗi đầu tiên theo thứ tự trên màn hình', () => {
    expect(getSignupProfileIssue({ ...valid, dateOfBirth: '' }, today)).toBe('signupDateOfBirthMissing');
    expect(getSignupProfileIssue({ ...valid, dateOfBirth: '2014-01-01' }, today)).toBe('signupAgeOutOfRange');
    expect(getSignupProfileIssue({ ...valid, dateOfBirth: '1900-01-01' }, today)).toBe('signupAgeOutOfRange');
    expect(getSignupProfileIssue({ ...valid, dateOfBirth: '2013-11-09' }, today)).toBeNull();
    expect(getSignupProfileIssue({ ...valid, gender: '' }, today)).toBe('signupGenderMissing');
    expect(getSignupProfileIssue({ ...valid, nationality: '' }, today)).toBe('signupNationalityMissing');
    expect(getSignupProfileIssue({ ...valid, hasAcceptedTerms: false }, today)).toBe('signupTermsRequired');
  });

  it('danh sách quốc tịch hay gặp có Việt Nam đầu, đều là mã 2 chữ in hoa', () => {
    expect(COMMON_NATIONALITIES[0]).toBe('VN');
    expect(COMMON_NATIONALITIES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
  });
});
