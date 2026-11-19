'use client';
import type { KeyboardEvent, ReactNode } from 'react';

export interface AiUsageTabItem<T extends string> {
  id: T;
  label: string;
}

/**
 * Tab của trang Chi phí AI. Làm riêng trong tính năng vì admin chưa có tab dùng chung; có role tablist,
 * mũi tên trái phải đổi tab, và chỉ tab đang chọn nằm trong thứ tự Tab của bàn phím.
 */
export function AiUsageTabs<T extends string>({
  label,
  tabs,
  active,
  onChange,
  children,
}: {
  label: string;
  tabs: readonly AiUsageTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  children: ReactNode;
}) {
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (!next) return;
    onChange(next.id);
    document.getElementById(`ai-usage-tab-${next.id}`)?.focus();
  };

  return (
    <>
      <div role="tablist" aria-label={label} className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`ai-usage-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`ai-usage-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => move(event, index)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${selected ? 'border-teal text-teal-ink' : 'border-transparent text-text-muted hover:text-ink'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`ai-usage-panel-${active}`} aria-labelledby={`ai-usage-tab-${active}`}>
        {children}
      </div>
    </>
  );
}
