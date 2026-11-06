'use client';
import {
  getApiErrorKind,
  getAuthErrorKind,
  getRegistrationFieldError,
  type AuthAction,
} from '@tripflix/api-client';
import { countCharacters, CURRENT_PASSWORD_MAX } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { useState, type InputHTMLAttributes } from 'react';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Số ký tự tối đa có hiện bộ đếm "x/tối đa" cạnh nhãn; ô không cần bộ đếm vẫn dùng maxLength. */
  maxChars?: number;
};

/** Nhãn của ô, kèm bộ đếm ký tự khi ô có giới hạn (đổi màu khi chạm giới hạn). */
function FieldLabel({ id, label, value, maxChars }: Pick<InputProps, 'id' | 'label' | 'value' | 'maxChars'>) {
  const count = countCharacters(value);
  return (
    <div className="auth-label-row">
      <label htmlFor={id}>{label}</label>
      {maxChars !== undefined && (
        <span className={count >= maxChars ? 'auth-count is-full' : 'auth-count'} aria-hidden="true">
          {count}/{maxChars}
        </span>
      )}
    </div>
  );
}

export function AuthField({ id, label, value, onValueChange, maxChars, ...input }: InputProps) {
  return (
    <div className="auth-field">
      <FieldLabel id={id} label={label} value={value} maxChars={maxChars} />
      <input
        id={id}
        value={value}
        maxLength={maxChars}
        onChange={(event) => onValueChange(event.target.value)}
        {...input}
      />
    </div>
  );
}

/**
 * Ô mật khẩu có nút hiện/ẩn, để người dùng kiểm lại khi gõ trên màn hình nhỏ. maxChars: mật khẩu mới (64, có bộ đếm); bỏ trống: mật khẩu đang dùng, nhận tới
 * CURRENT_PASSWORD_MAX, không hiện bộ đếm.
 */
export function PasswordField({
  id,
  label,
  value,
  onValueChange,
  maxChars,
  ...input
}: Omit<InputProps, 'type'>) {
  const [isVisible, setVisible] = useState(false);
  return (
    <div className="auth-field">
      <FieldLabel id={id} label={label} value={value} maxChars={maxChars} />
      <div className="auth-password">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          maxLength={maxChars ?? CURRENT_PASSWORD_MAX}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          {...input}
        />
        <button
          type="button"
          className="auth-toggle"
          aria-label={isVisible ? vi.api.hidePasswordLabel : vi.api.showPasswordLabel}
          aria-pressed={isVisible}
          aria-controls={id}
          onClick={() => setVisible(!isVisible)}
        >
          {isVisible ? vi.api.hidePassword : vi.api.showPassword}
        </button>
      </div>
    </div>
  );
}

/** Câu báo lỗi theo ý nghĩa của từng màn (409 khi đăng ký là email đã dùng...), còn lại dùng câu chung. */
export function AuthErrorNotice({ error, action }: { error: unknown; action: AuthAction }) {
  if (!error) return null;
  const kind = getAuthErrorKind(error, action);
  const fieldError = action === 'register' ? getRegistrationFieldError(error) : undefined;
  return (
    <p role="alert" className="auth-error">
      {fieldError ?? (kind ? vi.api[kind] : vi.api[getApiErrorKind(error)])}
    </p>
  );
}
