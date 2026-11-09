'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Bảng thả xuống trên header (tài khoản, thông báo): bấm ra ngoài thì đóng, Esc thì đóng và trả focus về nút,
 * sang trang khác (kể cả Back/Forward) thì tự coi là đóng mà không cần effect.
 */
export function useHeaderPopover() {
  const pathname = usePathname();
  // Lưu trang lúc mở: pathname đổi thì isOpen tự thành false.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const isOpen = openedAt === pathname;
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenedAt(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenedAt(null);
      toggle.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return {
    isOpen,
    root,
    toggle,
    setOpen: (open: boolean) => setOpenedAt(open ? pathname : null),
    close: () => setOpenedAt(null),
  };
}
