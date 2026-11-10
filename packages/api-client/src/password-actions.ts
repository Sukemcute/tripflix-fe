import { adminControllerCreateStaff } from './generated/core-api/admin/admin';
import {
  accountControllerChangePassword,
  passwordResetControllerReset,
} from './generated/core-api/auth/auth';
import type { AdminUserDto, CreateUserDtoRole } from './generated/core-api/model';
import { sendWithPasswords } from './password-encryption';
import { readEntity } from './response';

/** Các thao tác có mật khẩu ngoài đăng nhập, đăng ký (TF056): mọi mật khẩu đi qua sendWithPasswords. */

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  return sendWithPasswords(
    [
      {
        plain: 'currentPassword',
        encrypted: 'encCurrentPassword',
        value: input.currentPassword,
        purpose: 'change_current',
      },
      { plain: 'newPassword', encrypted: 'encNewPassword', value: input.newPassword, purpose: 'change_new' },
    ],
    undefined,
    async (fields) => {
      await accountControllerChangePassword(fields);
    },
  );
}

export function resetPassword(input: { token: string; newPassword: string }): Promise<void> {
  return sendWithPasswords(
    [{ plain: 'newPassword', encrypted: 'encNewPassword', value: input.newPassword, purpose: 'reset' }],
    undefined,
    async (fields) => {
      await passwordResetControllerReset({ token: input.token, ...fields });
    },
  );
}

/**
 * Superadmin tạo nhân sự. Không có mật khẩu mặc định: bỏ trống password thì core-api gửi email để nhân sự tự đặt.
 */
export async function createStaffUser(input: {
  email: string;
  displayName: string;
  role: CreateUserDtoRole;
  password?: string;
}): Promise<AdminUserDto> {
  const base = { email: input.email, displayName: input.displayName, role: input.role };
  const res = input.password
    ? await sendWithPasswords(
        [{ plain: 'password', encrypted: 'encPassword', value: input.password, purpose: 'staff_create' }],
        input.email,
        (fields) => adminControllerCreateStaff({ ...base, ...fields }),
      )
    : await adminControllerCreateStaff(base);
  return readEntity(res.data as AdminUserDto, ['id', 'email', 'role']);
}
