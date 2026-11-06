import { describe, expect, it } from 'vitest';
import { HttpError } from './http';
import { getApiErrorKind, getAuthErrorKind } from './response';

describe('getApiErrorKind', () => {
  it('distinguishes unverified email from other forbidden responses', () => {
    expect(getApiErrorKind(new HttpError(403, { code: 'email_unverified' }))).toBe('emailUnverified');
    expect(getApiErrorKind(new HttpError(403, { code: 'other' }))).toBe('forbidden');
  });
});

const fieldErrors = {
  message: 'Dữ liệu gửi lên không hợp lệ',
  errors: [{ field: 'newPassword', message: 'ngắn' }],
};

describe('getAuthErrorKind', () => {
  it('maps the same status to the meaning of each auth screen', () => {
    expect(getAuthErrorKind(new HttpError(401, {}), 'login')).toBe('wrongCredentials');
    expect(getAuthErrorKind(new HttpError(409, { message: 'trùng' }), 'register')).toBe('accountExists');
    expect(getAuthErrorKind(new HttpError(401, {}), 'google')).toBe('googleFailed');
    expect(getAuthErrorKind(new HttpError(503, {}), 'google')).toBe('googleUnavailable');
    expect(getAuthErrorKind(new HttpError(400, { message: 'hết hạn' }), 'resetPassword')).toBe(
      'resetLinkInvalid',
    );
    expect(getAuthErrorKind(new HttpError(400, { message: 'sai' }), 'changePassword')).toBe(
      'wrongCurrentPassword',
    );
  });

  it('429 is always "too many attempts", on every screen', () => {
    for (const action of [
      'login',
      'register',
      'google',
      'forgotPassword',
      'resetPassword',
      'changePassword',
    ] as const)
      expect(getAuthErrorKind(new HttpError(429, {}), action)).toBe('tooManyAttempts');
  });

  it('field validation 400 and unrelated errors fall back to the generic notice', () => {
    expect(getAuthErrorKind(new HttpError(400, fieldErrors), 'resetPassword')).toBeNull();
    expect(getAuthErrorKind(new HttpError(400, fieldErrors), 'changePassword')).toBeNull();
    expect(getAuthErrorKind(new HttpError(409, {}), 'login')).toBeNull();
    expect(getAuthErrorKind(new HttpError(500, {}), 'register')).toBeNull();
    expect(getAuthErrorKind(new TypeError('offline'), 'login')).toBeNull();
    expect(getAuthErrorKind(new HttpError(202, {}), 'forgotPassword')).toBeNull();
  });
});
