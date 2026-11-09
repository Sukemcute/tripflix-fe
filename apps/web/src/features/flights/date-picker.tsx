'use client';

import { t, vi } from '@tripflix/i18n';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { FlightIcon } from './flight-icon';
import styles from './flights.module.css';

const copy = vi.flights;
const WEEKDAYS = copy.weekdays.split(' ');
const DAY_MS = 24 * 60 * 60 * 1000;
const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' });

// Ngày luôn ở dạng chuỗi YYYY-MM-DD và tính theo UTC để không lệch múi giờ.
const toDate = (iso: string) => new Date(iso + 'T00:00:00Z');
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => toIso(new Date(toDate(iso).getTime() + days * DAY_MS));
const startOfMonth = (iso: string) => iso.slice(0, 8) + '01';

function addMonths(monthIso: string, months: number): string {
  const date = toDate(monthIso);
  return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)));
}

/** Các ô của một tháng, tuần bắt đầu từ thứ Hai; ô trống đầu tháng là null. */
function getMonthCells(monthIso: string): (string | null)[] {
  const first = toDate(monthIso);
  const leadingBlanks = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => addDays(monthIso, index)),
  ];
}

function formatWeekday(iso: string): string {
  const text = weekdayFormatter.format(toDate(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const formatShortDate = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

interface DatePickerProps {
  name: string;
  label: string;
  today: string;
  value: string;
  onChange: (value: string) => void;
  /** Ngày sớm nhất được chọn, mặc định là hôm nay; ngày về dùng ngày đi. */
  minDate?: string;
  /** Tô dải ngày từ đây tới ngày đang chọn, ví dụ từ ngày đi tới ngày về. */
  rangeStart?: string;
  dialogLabel?: string;
}

export function DatePicker({
  name,
  label,
  today,
  value,
  onChange,
  minDate = today,
  rangeStart,
  dialogLabel = copy.pickDate,
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(value));
  const [focusedDate, setFocusedDate] = useState(value);
  const firstMonth = startOfMonth(minDate);
  const tomorrow = addDays(today, 1);
  const months = [visibleMonth, addMonths(visibleMonth, 1)];

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [isOpen]);

  // Giữ focus bàn phím trên ô ngày đang chọn khi di chuyển bằng phím mũi tên.
  useEffect(() => {
    if (isOpen) gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)?.focus();
  }, [isOpen, focusedDate, visibleMonth]);

  const open = () => {
    setVisibleMonth(startOfMonth(value));
    setFocusedDate(value);
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };
  const choose = (iso: string) => {
    onChange(iso);
    close();
  };
  const moveFocus = (days: number) => {
    const next = addDays(focusedDate, days);
    if (next < minDate) return;
    setFocusedDate(next);
    const nextMonth = startOfMonth(next);
    if (nextMonth < visibleMonth) setVisibleMonth(nextMonth);
    else if (nextMonth > addMonths(visibleMonth, 1)) setVisibleMonth(addMonths(nextMonth, -1));
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      moveFocus(step);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  return (
    <div ref={rootRef} className={styles.field + ' ' + styles.dateField} data-open={isOpen || undefined}>
      <input type="hidden" name={name} value={value} />
      <button
        ref={triggerRef}
        type="button"
        className={styles.fieldTrigger}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label + ': ' + formatWeekday(value) + ' ' + formatShortDate(value)}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
      >
        <span className={styles.fieldIcon}>
          <FlightIcon name="calendar" size={22} />
        </span>
        <span className={styles.fieldBody}>
          <span className={styles.fieldLabel}>{label}</span>
          <span className={styles.dateValue}>
            <strong>{formatShortDate(value).slice(0, 5)}</strong>
            <span>
              {WEEKDAYS[(toDate(value).getUTCDay() + 6) % 7]} · {value.slice(0, 4)}
            </span>
          </span>
        </span>
        <span className={styles.chevron}>
          <FlightIcon name="chevron" size={18} />
        </span>
      </button>
      {isOpen && (
        <div className={styles.popover + ' ' + styles.calendar} role="dialog" aria-label={dialogLabel}>
          <div className={styles.calendarNav}>
            <button
              type="button"
              aria-label={copy.previousMonth}
              disabled={visibleMonth <= firstMonth}
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            >
              <FlightIcon name="chevron" size={18} />
            </button>
            <button
              type="button"
              aria-label={copy.nextMonth}
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            >
              <FlightIcon name="chevron" size={18} />
            </button>
          </div>
          <div ref={gridRef} className={styles.calendarMonths} onKeyDown={handleKeyDown}>
            {months.map((month) => (
              <div key={month} className={styles.calendarMonth}>
                <h4>
                  {t('flights.monthTitle', {
                    month: Number(month.slice(5, 7)),
                    year: month.slice(0, 4),
                  })}
                </h4>
                <div className={styles.calendarGrid}>
                  {WEEKDAYS.map((weekday) => (
                    <span key={weekday} className={styles.calendarWeekday} aria-hidden="true">
                      {weekday}
                    </span>
                  ))}
                  {getMonthCells(month).map((iso, index) =>
                    iso ? (
                      <button
                        key={iso}
                        type="button"
                        data-date={iso}
                        data-today={iso === today || undefined}
                        data-weekend={index % 7 >= 5 || undefined}
                        data-range-start={iso === rangeStart || undefined}
                        data-in-range={(rangeStart && iso > rangeStart && iso < value) || undefined}
                        aria-pressed={iso === value}
                        aria-label={formatWeekday(iso) + ' ' + formatShortDate(iso)}
                        tabIndex={iso === focusedDate ? 0 : -1}
                        disabled={iso < minDate}
                        onClick={() => choose(iso)}
                      >
                        {Number(iso.slice(8, 10))}
                      </button>
                    ) : (
                      <span key={'blank-' + index} aria-hidden="true" />
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.calendarFooter}>
            <button type="button" disabled={today < minDate} onClick={() => choose(today)}>
              {copy.today}
            </button>
            <button type="button" disabled={tomorrow < minDate} onClick={() => choose(tomorrow)}>
              {copy.tomorrow}
            </button>
            <span>
              {dialogLabel}:{' '}
              <strong>{formatWeekday(focusedDate) + ', ' + formatShortDate(focusedDate)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
