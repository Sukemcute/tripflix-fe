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
  /** Nhãn nằm trong ô, thu nhỏ lên góc trên khi ô có chữ hoặc đang gõ (trang đăng nhập). */
  isFloating?: boolean;
  /** Icon nhỏ ở đầu ô; dùng cùng isFloating (icon căn giữa theo chiều cao ô). */
  leadingIcon?: keyof typeof LEADING_ICONS;
};

const ICON_PROPS = { 'aria-hidden': true, viewBox: '0 0 24 24', width: 20, height: 20 } as const;

const LEADING_ICONS = {
  mail: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
  lock: (
    <svg {...ICON_PROPS}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  ),
  user: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </svg>
  ),
  key: (
    <svg {...ICON_PROPS}>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.7-8.7M16.5 6.5l2 2M14.5 8.5l1.5 1.5" />
    </svg>
  ),
};

const EYE_OPEN = (
  <svg {...ICON_PROPS}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EYE_CLOSED = (
  <svg {...ICON_PROPS}>
    <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </svg>
);

function fieldClassName(isFloating?: boolean, leadingIcon?: string): string {
  return ['auth-field', isFloating && 'is-floating', leadingIcon && 'has-icon'].filter(Boolean).join(' ');
}
// Nhãn nổi dựa vào :placeholder-shown để biết ô còn trống, nên ô cần một placeholder (khoảng trắng).
const floatingPlaceholder = (isFloating?: boolean) => (isFloating ? ' ' : undefined);

function LeadingIcon({ name }: { name?: keyof typeof LEADING_ICONS }) {
  return name ? <span className="auth-field-icon">{LEADING_ICONS[name]}</span> : null;
}

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

export function AuthField({
  id,
  label,
  value,
  onValueChange,
  maxChars,
  isFloating,
  leadingIcon,
  ...input
}: InputProps) {
  return (
    <div className={fieldClassName(isFloating, leadingIcon)}>
      <LeadingIcon name={leadingIcon} />
      <FieldLabel id={id} label={label} value={value} maxChars={maxChars} />
      <input
        id={id}
        value={value}
        maxLength={maxChars}
        placeholder={floatingPlaceholder(isFloating)}
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
  isFloating,
  leadingIcon,
  ...input
}: Omit<InputProps, 'type'>) {
  const [isVisible, setVisible] = useState(false);
  return (
    <div className={fieldClassName(isFloating, leadingIcon)}>
      <LeadingIcon name={leadingIcon} />
      <FieldLabel id={id} label={label} value={value} maxChars={maxChars} />
      <div className="auth-password">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          maxLength={maxChars ?? CURRENT_PASSWORD_MAX}
          placeholder={floatingPlaceholder(isFloating)}
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
          {/* Mắt mở: bấm để hiện mật khẩu; mắt gạch: đang hiện, bấm để ẩn. Chữ cho trình đọc màn hình nằm ở aria-label. */}
          {isVisible ? EYE_CLOSED : EYE_OPEN}
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
