'use client';

import { vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AdminButton } from './button';
import { ConfirmDialog } from './dialog';
import { ChevronDownIcon, CloseIcon } from './icons';

const copy = vi.adminOperations.drawer;
const DESKTOP_QUERY = '(min-width: 1024px)';

const SIZES = {
  compact: 'lg:w-[440px]',
  standard: 'lg:w-[640px]',
  wide: 'lg:w-[800px]',
  xwide: 'lg:w-[900px]',
} as const;

const subscribeDesktop = (callback: () => void) => {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
const useIsDesktop = () =>
  useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );

export interface DrawerNavigation {
  /** Ví dụ "3 / 20". */
  position?: string;
  onPrevious?: () => void;
  onNext?: () => void;
}

export interface DetailDrawerProps {
  title: string;
  /** Mã hồ sơ hoặc dòng phụ cạnh trạng thái. */
  subtitle?: ReactNode;
  status?: ReactNode;
  headerActions?: ReactNode;
  /** Thanh tab dính dưới tiêu đề. */
  tabs?: ReactNode;
  /** Thanh hành động dính phía dưới (Duyệt, Từ chối, Lưu…). */
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  navigation?: DrawerNavigation;
  /** Có thay đổi chưa lưu: đóng hoặc chuyển hồ sơ sẽ hỏi xác nhận trước. */
  isDirty?: boolean;
  /** Đổi giá trị này (thường là id hồ sơ) thì phần thân cuộn về đầu. */
  scrollKey?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Drawer chi tiết bên phải: xem một hồ sơ mà không rời danh sách.
 * - ≥1024px: không-modal, phủ lên phần phải của trang (danh sách giữ nguyên vị trí cuộn, vẫn bấm được hàng khác).
 * - <1024px: modal toàn màn hình, có bẫy focus.
 * Esc đóng (bỏ qua khi một hộp thoại modal khác đang mở; Esc đang đóng danh sách của ô chọn native do trình duyệt xử lý riêng); đóng xong trả focus về phần tử đã mở nó.
 * J/K chuyển hồ sơ sau/trước khi có `navigation`. Có `isDirty` thì đóng/chuyển hồ sơ qua hộp xác nhận.
 */
export function DetailDrawer({
  title,
  subtitle,
  status,
  headerActions,
  tabs,
  footer,
  size = 'standard',
  navigation,
  isDirty = false,
  scrollKey,
  onClose,
  children,
}: DetailDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isDesktop = useIsDesktop();
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  // Giữ props mới nhất cho các listener toàn trang mà không phải gắn lại mỗi lần render.
  const latest = useRef({ isDirty, onClose, navigation });
  useEffect(() => {
    latest.current = { isDirty, onClose, navigation };
  });

  const guard = useCallback((action: () => void) => {
    if (latest.current.isDirty) {
      pendingAction.current = action;
      setIsDiscardOpen(true);
    } else action();
  }, []);
  const requestClose = useCallback(() => guard(() => latest.current.onClose()), [guard]);

  // Trả focus về hàng đang được chọn trong danh sách (nút ở ô đầu, aria-current); không có thì về phần tử đã mở drawer.
  const returnTarget = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const selected = document.querySelector<HTMLElement>('button[aria-current="true"]');
    if (selected && !ref.current?.contains(selected)) returnTarget.current = selected;
  });
  useEffect(() => {
    returnTarget.current ??= document.activeElement as HTMLElement | null;
    return () => {
      const target = returnTarget.current;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isDesktop) dialog.show();
    else dialog.showModal();
    dialog.focus({ preventScroll: true });
    return () => dialog.close();
  }, [isDesktop]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (event.key === 'Escape') {
        if (!isDesktop) return; // chế độ modal: sự kiện cancel của <dialog> lo
        if (document.querySelector('dialog:modal')) return;
        if (isTyping && !ref.current?.contains(target)) return;
        // preventDefault: nếu hộp xác nhận vừa mở (modal), Esc này không được đóng luôn hộp đó.
        event.preventDefault();
        requestClose();
        return;
      }
      if ((event.key === 'j' || event.key === 'k') && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const go = event.key === 'j' ? latest.current.navigation?.onNext : latest.current.navigation?.onPrevious;
        if (go) {
          event.preventDefault();
          guard(go);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDesktop, requestClose, guard]);

  return (
    <>
      <dialog
        ref={ref}
        tabIndex={-1}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
        className={cn(
          'adm-drawer fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-none p-0 text-ink',
          'border-l border-border bg-background shadow-adm-float open:flex open:flex-col focus:outline-none',
          'lg:z-40 lg:max-w-[calc(100vw-260px)]',
          SIZES[size],
        )}
      >
        <header className="shrink-0 border-b border-border">
          <div className="flex items-start gap-3 px-5 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate text-base leading-6 font-semibold">
                {title}
              </h2>
              {(status || subtitle) && (
                <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-text-muted">
                  {status}
                  {subtitle && <span className="min-w-0 truncate">{subtitle}</span>}
                </div>
              )}
            </div>
            <div className="-mt-1 -mr-2 flex shrink-0 items-center gap-1">
              {navigation && (
                <>
                  {navigation.position && (
                    <span className="px-1 text-xs text-text-muted tabular-nums">{navigation.position}</span>
                  )}
                  <AdminButton
                    variant="ghost"
                    size="icon"
                    aria-label={copy.previous}
                    title={`${copy.previous} (K)`}
                    disabled={!navigation.onPrevious}
                    onClick={() => navigation.onPrevious && guard(navigation.onPrevious)}
                  >
                    <span className="rotate-180">
                      <ChevronDownIcon />
                    </span>
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    size="icon"
                    aria-label={copy.next}
                    title={`${copy.next} (J)`}
                    disabled={!navigation.onNext}
                    onClick={() => navigation.onNext && guard(navigation.onNext)}
                  >
                    <ChevronDownIcon />
                  </AdminButton>
                </>
              )}
              {headerActions}
              <AdminButton variant="ghost" size="icon" aria-label={copy.close} onClick={requestClose}>
                <CloseIcon />
              </AdminButton>
            </div>
          </div>
          {tabs && <div className="px-5">{tabs}</div>}
        </header>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-5 py-3">
            {footer}
          </footer>
        )}
      </dialog>
      {isDiscardOpen && (
        <ConfirmDialog
          title={copy.discardTitle}
          description={copy.discardBody}
          confirmLabel={copy.discard}
          cancelLabel={copy.keepEditing}
          tone="danger"
          onClose={() => {
            pendingAction.current = null;
            setIsDiscardOpen(false);
          }}
          onConfirm={() => {
            const action = pendingAction.current;
            pendingAction.current = null;
            setIsDiscardOpen(false);
            action?.();
          }}
        />
      )}
    </>
  );
}
