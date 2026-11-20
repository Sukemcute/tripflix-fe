'use client';

import { cn } from '@tripflix/ui-web';
import type { KeyboardEvent, ReactNode } from 'react';

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  /** Số đếm nhỏ cạnh nhãn (ví dụ số hồ sơ chờ). */
  count?: number;
}

const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/**
 * Tab gạch chân theo mẫu ARIA tablist: mũi tên trái/phải đổi tab, Home/End nhảy đầu/cuối,
 * chỉ tab đang chọn nằm trong thứ tự Tab của bàn phím.
 */
export function Tabs<Id extends string>({
  label,
  idPrefix,
  tabs,
  active,
  onChange,
}: {
  label: string;
  idPrefix: string;
  tabs: readonly TabItem<Id>[];
  active: Id;
  onChange: (id: Id) => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : -1;
    const next = tabs[target];
    if (!next) return;
    event.preventDefault();
    onChange(next.id);
    document.getElementById(tabId(idPrefix, next.id))?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-5 overflow-x-auto border-b border-border">
      {tabs.map((tab, index) => {
        const isSelected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={tabId(idPrefix, tab.id)}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              '-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-[13px] whitespace-nowrap',
              'transition-colors duration-150 ease-adm motion-reduce:transition-none',
              isSelected ? 'border-teal-ink text-ink' : 'border-transparent text-text-muted hover:text-ink',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded-adm-sm bg-surface-muted px-1.5 text-xs text-ink tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Vùng nội dung của tab đang chọn; gắn đúng aria-labelledby với `Tabs` cùng `idPrefix`. */
export function TabPanel({
  idPrefix,
  active,
  children,
}: {
  idPrefix: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={panelId(idPrefix, active)} aria-labelledby={tabId(idPrefix, active)}>
      {children}
    </div>
  );
}
