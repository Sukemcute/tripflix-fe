import {
  accountControllerChangePassword,
  passwordResetControllerReset,
} from './generated/core-api/auth/auth';
import { sendWithPasswords } from './password-encryption';

/** Các thao tác có mật khẩu ngoài đăng nhập, đăng ký (TF056): mọi mật khẩu đi qua sendWithPasswords. */

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  return sendWithPasswords(
    [
      {
        encrypted: 'encCurrentPassword',
        value: input.currentPassword,
        purpose: 'change_current',
      },
      { encrypted: 'encNewPassword', value: input.newPassword, purpose: 'change_new' },
    ],
    undefined,
    async (fields) => {
      await accountControllerChangePassword(fields);
    },
  );
}

export function resetPassword(input: { token: string; newPassword: string }): Promise<void> {
  return sendWithPasswords(
    [{ encrypted: 'encNewPassword', value: input.newPassword, purpose: 'reset' }],
    undefined,
    async (fields) => {
      await passwordResetControllerReset({ token: input.token, ...fields });
    },
  );
}
