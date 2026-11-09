export const REGISTRATION_PASSWORD_MIN = 12;
/** Mật khẩu mới (đăng ký, đổi, đặt lại) tối đa 64 ký tự; Core API kiểm lại cùng giới hạn. */
export const NEW_PASSWORD_MAX = 64;
/** Mật khẩu đang dùng (đăng nhập, mật khẩu hiện tại): nhận tới 128 cho tài khoản đặt mật khẩu dài từ trước. */
export const CURRENT_PASSWORD_MAX = 128;
export const DISPLAY_NAME_MAX = 30;
export const REGISTRATION_CODE_PATTERN = /^[0-9]{8}$/;

// Phản hồi ngay khi nhập. Core API kiểm lại cùng quy tắc trước khi gửi mã và tạo tài khoản.
const COMMON_PASSWORD =
  /^(?:password|matkhau|mat-khau|tripflix|qwerty|admin|letmein|iloveyou|welcome)[\d!@#$%^&*._-]*$/i;
const REPEATED_PATTERN = /^(.{1,4})\1+$/u;
const VISIBLE_CHARACTER = /[^\p{White_Space}\p{Default_Ignorable_Code_Point}\p{Cc}]/u;

export function getRegistrationPasswordStrength(
  password: string,
): 'passwordShort' | 'passwordWeak' | 'passwordStrong' {
  if (Array.from(password).length < REGISTRATION_PASSWORD_MIN) return 'passwordShort';
  const candidate = password.trim();
  if (
    !VISIBLE_CHARACTER.test(candidate) ||
    COMMON_PASSWORD.test(candidate) ||
    REPEATED_PATTERN.test(candidate) ||
    /^(?:0123456789|1234567890|9876543210)[0-9]*$/.test(candidate)
  )
    return 'passwordWeak';
  return 'passwordStrong';
}

/** Đủ điều kiện xin mã đăng ký: đã nhập tên hiển thị, email và mật khẩu đạt yêu cầu. */
export function canSendRegistrationCode(input: {
  displayName: string;
  email: string;
  password: string;
}): boolean {
  return (
    input.displayName.trim().length > 0 &&
    input.email.trim().length > 0 &&
    getRegistrationPasswordStrength(input.password) === 'passwordStrong'
  );
}

/** Đếm theo ký tự người dùng thấy (emoji tính 1), như Core API đếm. */
export function countCharacters(text: string): number {
  return Array.from(text).length;
}

// Thông tin cá nhân bắt buộc khi đăng ký (TF06O); Core API kiểm lại cùng quy tắc (tuổi 13–120, giới tính, mã quốc gia).
export const SIGNUP_GENDERS = ['male', 'female', 'other'] as const;
export type SignupGender = (typeof SIGNUP_GENDERS)[number];
export const MIN_SIGNUP_AGE = 13;
export const MAX_SIGNUP_AGE = 120;

/** Mã quốc gia hay gặp (ISO 3166-1 alpha-2), đặt Việt Nam đầu; tên hiển thị do từng app dịch. */
export const COMMON_NATIONALITIES = [
  'VN',
  'US',
  'GB',
  'AU',
  'CA',
  'CN',
  'TW',
  'HK',
  'JP',
  'KR',
  'SG',
  'TH',
  'MY',
  'ID',
  'PH',
  'LA',
  'KH',
  'IN',
  'FR',
  'DE',
  'IT',
  'ES',
  'NL',
  'RU',
  'NZ',
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Tuổi tròn năm tại `today` (UTC) của ngày sinh YYYY-MM-DD; null nếu ngày không có thật. */
export function getAgeOn(dateOfBirth: string, today: Date): number | null {
  const match = ISO_DATE.exec(dateOfBirth);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    return null;
  const isBeforeBirthday =
    today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
  return today.getUTCFullYear() - year - (isBeforeBirthday ? 1 : 0);
}

/** "20/05/2000" (cách gõ trên app) thành "2000-05-20"; sai dạng trả chuỗi rỗng. */
export function parseDayMonthYear(text: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return '';
  return `${match[3]}-${match[2]!.padStart(2, '0')}-${match[1]!.padStart(2, '0')}`;
}

export type SignupProfileIssue =
  | 'signupDateOfBirthMissing'
  | 'signupAgeOutOfRange'
  | 'signupGenderMissing'
  | 'signupNationalityMissing'
  | 'signupTermsRequired';

/** Lỗi đầu tiên của bước thông tin cá nhân (theo thứ tự trên màn hình); null khi đủ để gửi mã. */
export function getSignupProfileIssue(
  input: { dateOfBirth: string; gender: string; nationality: string; hasAcceptedTerms: boolean },
  today: Date = new Date(),
): SignupProfileIssue | null {
  const age = input.dateOfBirth ? getAgeOn(input.dateOfBirth, today) : null;
  if (age === null) return 'signupDateOfBirthMissing';
  if (age < MIN_SIGNUP_AGE || age > MAX_SIGNUP_AGE) return 'signupAgeOutOfRange';
  if (!(SIGNUP_GENDERS as readonly string[]).includes(input.gender)) return 'signupGenderMissing';
  if (!/^[A-Z]{2}$/.test(input.nationality)) return 'signupNationalityMissing';
  if (!input.hasAcceptedTerms) return 'signupTermsRequired';
  return null;
}
