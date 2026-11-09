'use client';
import { MAX_SIGNUP_AGE } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { SoftSelect } from '@/features/shared/soft-select';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: MAX_SIGNUP_AGE + 1 }, (_, index) => {
  const year = String(CURRENT_YEAR - index);
  return { value: year, label: year };
});
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: t('common.month', { month: index + 1 }),
}));

/** Số ngày của tháng (1–12); chưa chọn năm thì coi như năm nhuận để tháng 2 vẫn chọn được ngày 29. */
function getDaysInMonth(month: number, year: number | null): number {
  return new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate();
}

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Ngày sinh bằng ba ô chọn Ngày / Tháng / Năm (kiểu form đăng ký quen thuộc): chọn ô nào giá trị đổi ngay,
 * không phải lật lịch qua nhiều năm. Trả "YYYY-MM-DD" khi đủ ba ô, chuỗi rỗng khi còn thiếu.
 */
export function DateOfBirthSelect({
  id,
  onChange,
  isInvalid,
}: {
  id: string;
  onChange: (dateOfBirth: string) => void;
  isInvalid?: boolean;
}) {
  const [parts, setParts] = useState({ day: '', month: '', year: '' });
  const maxDay = getDaysInMonth(Number(parts.month) || 1, parts.year ? Number(parts.year) : null);
  const dayOptions = Array.from({ length: parts.month ? maxDay : 31 }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));

  const update = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch };
    // Đổi sang tháng ít ngày hơn (31 → tháng 2): kéo ngày về ngày cuối của tháng mới.
    if (next.day && next.month) {
      const limit = getDaysInMonth(Number(next.month), next.year ? Number(next.year) : null);
      if (Number(next.day) > limit) next.day = String(limit);
    }
    setParts(next);
    onChange(
      next.day && next.month && next.year
        ? `${next.year}-${pad(Number(next.month))}-${pad(Number(next.day))}`
        : '',
    );
  };

  return (
    <div className="auth-dob-select">
      <SoftSelect
        id={id}
        aria-label={vi.api.dobDay}
        aria-invalid={isInvalid || undefined}
        value={parts.day}
        onChange={(day) => update({ day })}
        options={[{ value: '', label: vi.api.dobDay }, ...dayOptions]}
      />
      <SoftSelect
        id={`${id}-month`}
        aria-label={vi.api.dobMonth}
        aria-invalid={isInvalid || undefined}
        value={parts.month}
        onChange={(month) => update({ month })}
        options={[{ value: '', label: vi.api.dobMonth }, ...MONTH_OPTIONS]}
      />
      <SoftSelect
        id={`${id}-year`}
        aria-label={vi.common.year}
        aria-invalid={isInvalid || undefined}
        value={parts.year}
        onChange={(year) => update({ year })}
        options={[{ value: '', label: vi.common.year }, ...YEAR_OPTIONS]}
      />
    </div>
  );
}
