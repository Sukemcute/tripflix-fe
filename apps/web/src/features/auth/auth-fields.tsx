'use client';
import {
  getApiErrorKind,
  getAuthErrorKind,
  getRegistrationFieldError,
  type AuthAction,
} from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useState, type InputHTMLAttributes } from 'react';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
};

export function AuthField({ id, label, value, onValueChange, ...input }: InputProps) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(event) => onValueChange(event.target.value)} {...input} />
    </div>
  );
}

/** Ô mật khẩu có nút hiện/ẩn, để người dùng kiểm lại khi gõ trên màn hình nhỏ. */
export function PasswordField({ id, label, value, onValueChange, ...input }: Omit<InputProps, 'type'>) {
  const [isVisible, setVisible] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          maxLength={128}
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
