'use client';
import { t, vi } from '@tripflix/i18n';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import styles from './soft-picker.module.css';
import { placeBelow, SoftSelect, useCloseOnScroll } from './soft-select';

type SoftDatePickerProps = {
  /** Ngày dạng YYYY-MM-DD, giống <input type="date">. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  /** Có thì tiêu đề lịch có ô chọn năm (ví dụ ngày sinh: [1920, năm nay]). */
  yearRange?: readonly [number, number];
  /** Có name thì gửi giá trị theo form gốc qua input ẩn. */
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** "bare": không viền/nền, dùng trong ô đã có khung riêng. */
  appearance?: 'field' | 'bare';
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

const VIETNAM_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

export function getVietnamToday() {
  return VIETNAM_DATE.format(new Date());
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function fromIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}
function addDays(value: string, days: number) {
  const date = fromIsoDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}
function addMonths(value: string, months: number) {
  const date = fromIsoDate(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // Ngày 31 sang tháng ngắn hơn thì về ngày cuối tháng.
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toIsoDate(date);
}
/** 42 ô (6 tuần) bắt đầu từ thứ Hai của tuần chứa ngày 1. */
export function getMonthGrid(monthValue: string) {
  const first = fromIsoDate(monthValue);
  first.setDate(1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) =>
    toIsoDate(new Date(first.getFullYear(), first.getMonth(), 1 - offset + index)),
  );
}
function clampDate(value: string, min?: string, max?: string) {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}
const longDate = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Ô ngày thay <input type="date">: lịch bo tròn, bóng mềm, tuần bắt đầu thứ Hai.
 * Lịch nằm ở top layer (Popover API) nên không bị khung overflow cắt; bấm ra ngoài hoặc Esc thì đóng.
 */
export function SoftDatePicker({
  value,
  defaultValue = '',
  onChange,
  min,
  max,
  yearRange,
  name,
  id,
  disabled,
  // Nhận required như <input> cũ cho chỗ gọi khỏi đổi; kiểm tra bắt buộc do validation của từng màn.
  required: _required,
  className,
  appearance = 'field',
  ...aria
}: SoftDatePickerProps) {
  const [ownValue, setOwnValue] = useState(defaultValue);
  const current = value ?? ownValue;
  const [focused, setFocused] = useState(() => current || clampDate(getVietnamToday(), min, max));
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDialogElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  // Lấy ngày hôm nay một lần khi tạo ô theo múi giờ Việt Nam, đồng bộ giữa SSR và Client.
  const [today] = useState(() => getVietnamToday());
  const days = getMonthGrid(focused);
  const viewMonth = fromIsoDate(focused).getMonth();
  const viewYear = fromIsoDate(focused).getFullYear();
  const isOutside = (day: string) => Boolean((min && day < min) || (max && day > max));
  const firstOfView = toIsoDate(new Date(viewYear, viewMonth, 1));
  const lastOfView = toIsoDate(new Date(viewYear, viewMonth + 1, 0));
  useCloseOnScroll(isOpen, popoverRef);

  useEffect(() => {
    if (isOpen) gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [isOpen, focused]);

  const open = () => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover || disabled) return;
    setFocused(current || clampDate(today, min, max));
    placeBelow(trigger, popover);
    popover.showPopover();
  };
  const choose = (day: string) => {
    if (isOutside(day)) return;
    if (value === undefined) setOwnValue(day);
    onChange?.(day);
    popoverRef.current?.hidePopover();
    triggerRef.current?.focus();
  };
  const moveFocus = (day: string) => setFocused(clampDate(day, min, max));
  const onGridKeyDown = (event: KeyboardEvent) => {
    const weekday = (fromIsoDate(focused).getDay() + 6) % 7;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -weekday),
      End: () => addDays(focused, 6 - weekday),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      moveFocus(move());
    }
  };

  return (
    <span className={`${styles.wrap} ${className ?? ''}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={styles.trigger}
        data-appearance={appearance}
        disabled={disabled}
        onClick={open}
        {...aria}
      >
        <span className={current ? styles.value : styles.placeholder}>
          {current ? current.split('-').reverse().join('/') : vi.common.chooseDate}
        </span>
        <svg className={styles.calendarIcon} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
          <path d="M8 3.5v4m8-4v4M4 10h16" />
        </svg>
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      <dialog
        ref={popoverRef}
        popover="auto"
        aria-labelledby={`${baseId}-title`}
        className={`${styles.popover} ${styles.calendar}`}
        onToggle={(event) => {
          setIsOpen(event.newState === 'open');
          if (event.newState === 'closed' && popoverRef.current?.contains(document.activeElement)) {
            triggerRef.current?.focus();
          }
        }}
      >
        <div className={styles.calendarHead}>
          <button
            type="button"
            className={styles.monthButton}
            aria-label={vi.common.previousMonth}
            disabled={Boolean(min && firstOfView <= min)}
            onClick={() => moveFocus(addMonths(focused, -1))}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14 7-5 5 5 5" />
            </svg>
          </button>
          {yearRange ? (
            <span className={styles.titleWithYear}>
              <strong id={`${baseId}-title`} aria-live="polite">
                {t('common.month', { month: viewMonth + 1 })}
              </strong>
              <SoftSelect
                className={styles.yearSelect}
                aria-label={vi.common.year}
                value={String(viewYear)}
                onChange={(year) => moveFocus(addMonths(focused, (Number(year) - viewYear) * 12))}
                options={Array.from({ length: yearRange[1] - yearRange[0] + 1 }, (_, index) => {
                  const year = String(yearRange[1] - index);
                  return { value: year, label: year };
                })}
              />
            </span>
          ) : (
            <strong id={`${baseId}-title`} aria-live="polite">
              {t('common.monthYear', { month: viewMonth + 1, year: viewYear })}
            </strong>
          )}
          <button
            type="button"
            className={styles.monthButton}
            aria-label={vi.common.nextMonth}
            disabled={Boolean(max && lastOfView >= max)}
            onClick={() => moveFocus(addMonths(focused, 1))}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m10 7 5 5-5 5" />
            </svg>
          </button>
        </div>
        <div className={styles.weekdays} aria-hidden="true">
          {vi.common.weekdaysShort.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div ref={gridRef} className={styles.days}>
          {days.map((day) => {
            const date = fromIsoDate(day);
            return (
              <button
                key={day}
                type="button"
                data-date={day}
                tabIndex={day === focused ? 0 : -1}
                className={styles.day}
                data-muted={date.getMonth() !== viewMonth || undefined}
                data-today={day === today || undefined}
                aria-pressed={day === current}
                aria-current={day === today ? 'date' : undefined}
                aria-label={longDate.format(date)}
                disabled={isOutside(day)}
                onClick={() => choose(day)}
                onKeyDown={onGridKeyDown}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </dialog>
    </span>
  );
}
