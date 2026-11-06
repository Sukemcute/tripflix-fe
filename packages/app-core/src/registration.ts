export const REGISTRATION_PASSWORD_MIN = 12;
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
