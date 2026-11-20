'use client';

import { t } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDownIcon, adminIcons } from './icons';
import type { AdminNavGroup, AdminNavItem } from './nav-types';

const STORAGE_KEY = 'tripflix-admin-nav-collapsed';

function readCollapsed(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeCollapsed(value: Record<string, boolean>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Trình duyệt chặn lưu trữ: menu vẫn dùng được, chỉ không nhớ trạng thái thu gọn.
  }
}

const isActive = (item: AdminNavItem, pathname: string) =>
  item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);

function NavLink({
  item,
  pathname,
  count,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  count?: number;
  onNavigate?: () => void;
}) {
  const Icon = adminIcons[item.icon];
  const active = isActive(item, pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'flex h-8 items-center gap-2.5 rounded-adm border px-2.5 text-[13px]',
        'transition-colors duration-150 ease-adm motion-reduce:transition-none',
        active
          ? 'border-border bg-background text-ink'
          : 'border-transparent text-text-muted hover:bg-surface-muted hover:text-ink',
      )}
    >
      <span className={cn('shrink-0', active && 'text-teal-ink')}>
        <Icon />
      </span>
      <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
      {count !== undefined && (
        <span className="min-w-5 rounded-adm-sm bg-surface-muted px-1.5 text-center text-xs text-ink tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}

/**
 * Menu bên trái: nhóm theo nghiệp vụ, thu gọn được (nhớ trong localStorage).
 * Nhóm chứa trang đang mở luôn mở để không mất vị trí.
 */
export function SidebarNav({
  groups,
  pathname,
  counts = {},
  label,
  onNavigate,
}: {
  groups: readonly AdminNavGroup[];
  pathname: string;
  counts?: Partial<Record<string, number>>;
  label: string;
  onNavigate?: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsed);
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = { ...current, [id]: !current[id] };
      writeCollapsed(next);
      return next;
    });

  return (
    <nav aria-label={label} className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
      {groups.map((group) => {
        const hasActive = group.items.some((item) => isActive(item, pathname));
        const isOpen = !group.label || hasActive || !collapsed[group.id];
        const listId = `admin-nav-${group.id}`;
        return (
          <div key={group.id}>
            {group.label && (
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={listId}
                onClick={() => toggle(group.id)}
                disabled={hasActive}
                className="mb-1 flex h-6 w-full items-center justify-between rounded-adm-sm px-2.5 text-xs text-text-muted transition-colors duration-150 ease-adm hover:text-ink disabled:cursor-default disabled:opacity-100 disabled:hover:text-text-muted"
              >
                {group.label}
                <span className={cn('transition-transform duration-150 ease-adm', !isOpen && '-rotate-90')}>
                  <ChevronDownIcon width={14} height={14} />
                </span>
              </button>
            )}
            <ul id={listId} hidden={!isOpen} className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} pathname={pathname} count={counts[item.href]} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
