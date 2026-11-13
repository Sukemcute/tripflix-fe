'use client';
import { type ReactNode, useId, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useApiSession } from '@tripflix/api-client';
import { useCloseOnScroll } from '@/features/shared/soft-select';
import { ReportContentDialog } from './report-content-dialog';
import styles from './comment-visibility.module.css';

const changedEvent = 'tripflix-comment-visibility';
const fallback = new Map<string, boolean>();
function subscribe(callback: () => void) {
  window.addEventListener(changedEvent, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(changedEvent, callback);
    window.removeEventListener('storage', callback);
  };
}

export function CommentVisibility({
  commentId,
  isMine,
  loginHref,
  className,
  children,
}: {
  commentId: string;
  isMine: boolean;
  loginHref: string;
  className?: string;
  children: ReactNode;
}) {
  const { user } = useApiSession();
  // shortcut: Personal hiding stays in this browser; use an API when cross-device sync is required.
  const key = `tripflix:hidden-comment:${user?.id ?? 'guest'}:${commentId}`;
  const hidden = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === '1';
      } catch {
        return fallback.get(key) ?? false;
      }
    },
    () => false,
  );
  const setHidden = (value: boolean) => {
    try {
      if (value) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
    } catch {
      fallback.set(key, value);
    }
    window.dispatchEvent(new Event(changedEvent));
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useCloseOnScroll(menuOpen, menu);

  if (hidden && !isMine)
    return (
      <div className={styles.hidden}>
        <span>Bạn đã ẩn bình luận này.</span>
        <button type="button" onClick={() => setHidden(false)}>
          Hoàn tác
        </button>
      </div>
    );
  return (
    <div className={`${styles.row} ${className ?? ''}`}>
      {children}
      {!isMine && (
        <>
          <button
            ref={trigger}
            type="button"
            className={styles.trigger}
            aria-label="Tùy chọn bình luận"
            aria-expanded={menuOpen}
            aria-controls={id}
            onClick={() => {
              const popup = menu.current;
              const button = trigger.current;
              if (!popup || !button) return;
              if (popup.matches(':popover-open')) {
                popup.hidePopover();
                return;
              }
              popup.showPopover();
              const rect = button.getBoundingClientRect();
              const height = popup.getBoundingClientRect().height;
              popup.style.left = `${Math.max(8, Math.min(rect.right - popup.offsetWidth, window.innerWidth - popup.offsetWidth - 8))}px`;
              popup.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - height - 8))}px`;
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          <div
            ref={menu}
            id={id}
            popover="auto"
            className={styles.menu}
            onToggle={(event) => setMenuOpen(event.newState === 'open')}
          >
            <button
              type="button"
              onClick={() => {
                menu.current?.hidePopover();
                setHidden(true);
              }}
            >
              Ẩn bình luận
            </button>
            {user ? (
              <button
                type="button"
                disabled={reported}
                onClick={() => {
                  menu.current?.hidePopover();
                  setReportOpen(true);
                }}
              >
                {reported ? 'Đã báo cáo' : 'Báo cáo bình luận'}
              </button>
            ) : (
              <Link prefetch={false} href={loginHref}>
                Báo cáo bình luận
              </Link>
            )}
            <p>Ẩn chỉ áp dụng cho bạn trên trình duyệt này.</p>
          </div>
          {reportOpen && (
            <ReportContentDialog
              targetType="comment"
              targetId={commentId}
              onClose={() => {
                setReportOpen(false);
                trigger.current?.focus();
              }}
              onReported={() => setReported(true)}
            />
          )}
        </>
      )}
    </div>
  );
}
