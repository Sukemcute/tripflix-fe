'use client';
import { vi } from '@tripflix/i18n';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import styles from './soft-picker.module.css';

export type SoftSelectOption = { value: string; label: string };

type SoftSelectProps = {
  options: readonly SoftSelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
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

/**
 * Ô chọn thay <select>: bảng xổ bo tròn, bóng mềm, mở trượt nhẹ.
 * Bảng nằm ở top layer (Popover API) nên không bị khung overflow cắt; bấm ra ngoài hoặc Esc thì đóng.
 */
export function SoftSelect({
  options,
  value,
  defaultValue = '',
  onChange,
  name,
  id,
  disabled,
  required,
  className,
  appearance = 'field',
  ...aria
}: SoftSelectProps) {
  const [ownValue, setOwnValue] = useState(defaultValue);
  const current = value ?? ownValue;
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const selected = options.find((option) => option.value === current);
  useCloseOnScroll(isOpen, listRef);
  useEffect(() => {
    if (isOpen) document.getElementById(`${baseId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex, baseId]);

  const open = () => {
    const trigger = triggerRef.current;
    const list = listRef.current;
    if (!trigger || !list || disabled) return;
    placeBelow(trigger, list);
    list.showPopover();
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((option) => option.value === current),
      ),
    );
    list.focus();
  };
  const close = () => {
    listRef.current?.hidePopover();
    triggerRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (value === undefined) setOwnValue(option.value);
    onChange?.(option.value);
    close();
  };
  const onListKeyDown = (event: KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(activeIndex + 1, last),
      ArrowUp: Math.max(activeIndex - 1, 0),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActiveIndex(moves[event.key]!);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === 'Tab') {
      listRef.current?.hidePopover();
    } else if (event.key.length === 1) {
      // Gõ chữ cái đầu để nhảy tới lựa chọn.
      const start = activeIndex + 1;
      const key = event.key.toLocaleLowerCase('vi');
      const order = [...options.slice(start), ...options.slice(0, start)];
      const match = order.find((option) => option.label.toLocaleLowerCase('vi').startsWith(key));
      if (match) setActiveIndex(options.indexOf(match));
    }
  };

  return (
    <span className={`${styles.wrap} ${className ?? ''}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- <select>/<input type=date> gốc không làm mềm được bảng xổ; đây là mẫu listbox ARIA chuẩn
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-expanded={isOpen}
        aria-required={required || undefined}
        className={styles.trigger}
        data-appearance={appearance}
        disabled={disabled}
        onClick={open}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
            event.preventDefault();
            open();
          }
        }}
        {...aria}
      >
        <span className={selected?.value ? styles.value : styles.placeholder}>
          {selected?.label ?? vi.common.chooseOption}
        </span>
        <Chevron />
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      <div
        ref={listRef}
        id={listId}
        popover="auto"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- <select>/<input type=date> gốc không làm mềm được bảng xổ; đây là mẫu listbox ARIA chuẩn
        role="listbox"
        tabIndex={-1}
        className={styles.popover}
        aria-activedescendant={activeIndex >= 0 ? `${baseId}-${activeIndex}` : undefined}
        onKeyDown={onListKeyDown}
        onToggle={(event) => setIsOpen(event.newState === 'open')}
      >
        {options.map((option, index) => (
          // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- phím xử lý ở listbox (aria-activedescendant)
          <div
            key={option.value}
            id={`${baseId}-${index}`}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- <select>/<input type=date> gốc không làm mềm được bảng xổ; đây là mẫu listbox ARIA chuẩn
            role="option"
            aria-selected={option.value === current}
            tabIndex={-1}
            data-active={index === activeIndex || undefined}
            className={styles.option}
            onPointerEnter={() => setActiveIndex(index)}
            onClick={() => choose(index)}
          >
            {option.label}
          </div>
        ))}
      </div>
    </span>
  );
}

/** Bảng xổ đặt theo toạ độ khung nhìn, nên cuộn trang thì đóng lại để không lệch khỏi ô. */
export function useCloseOnScroll(isOpen: boolean, popoverRef: { current: HTMLElement | null }) {
  useEffect(() => {
    if (!isOpen) return;
    const hide = (event: Event) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      popoverRef.current?.hidePopover();
    };
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, { capture: true });
      window.removeEventListener('resize', hide);
    };
  }, [isOpen, popoverRef]);
}

/** Đặt bảng xổ ngay dưới ô (bảng ở top layer nên tính toạ độ theo khung nhìn). */
export function placeBelow(trigger: HTMLElement, popover: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < 260 && rect.top > spaceBelow;
  popover.style.minWidth = `${Math.max(rect.width, 180)}px`;
  popover.style.left = `${Math.min(rect.left, window.innerWidth - Math.max(rect.width, 180) - 8)}px`;
  popover.style.top = openUp ? 'auto' : `${rect.bottom + 6}px`;
  popover.style.bottom = openUp ? `${window.innerHeight - rect.top + 6}px` : 'auto';
  popover.dataset.side = openUp ? 'top' : 'bottom';
}

export function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}
