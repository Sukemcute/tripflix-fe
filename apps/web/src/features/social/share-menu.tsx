'use client';

import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from 'react';
import { vi } from '@tripflix/i18n';
import { useCloseOnScroll } from '@/features/shared/soft-select';
import { buildPostShareUrl, buildShareChannelUrl, placeShareMenu, type ShareChannel } from './post-share';
import styles from './share-menu.module.css';

/** Hiện "Đã sao chép" một lúc rồi tự đóng menu. */
const COPIED_CLOSE_DELAY_MS = 1200;
/**
 * Popover tự đóng ngay lúc nhấn chuột ra ngoài, trước khi nút share nhận click. Bấm lại đúng nút đó trong khoảng
 * này là muốn đóng, không mở lại.
 */
const REOPEN_GUARD_MS = 300;

export interface ShareTarget {
  postId: string;
  postType: string;
  title: string;
}

export interface ShareMenuHandle {
  /** Mở menu cạnh nút vừa bấm; bấm lại đúng nút đang mở thì đóng. */
  toggle: (anchor: HTMLElement, target: ShareTarget) => void;
}

export interface ShareMenuProps {
  ref?: Ref<ShareMenuHandle>;
  side: 'left' | 'above';
  /** Gọi khi người dùng thật sự chia sẻ (chép được link, mở trang chia sẻ, hộp chia sẻ của máy hoàn tất). */
  onShared: (postId: string) => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Menu chia sẻ dùng chung cho Reels và tab Bài viết. Dùng popover của trình duyệt (top layer) nên không bị khung
 * video cắt, tự đóng khi bấm ra ngoài hoặc nhấn Esc.
 */
export function ShareMenu({ ref, side, onShared }: ShareMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const closedAtRef = useRef(0);
  const [target, setTarget] = useState<ShareTarget | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  // Server không có navigator: luôn false ở lần vẽ đầu để khớp lúc hydrate.
  const canUseNativeShare = useSyncExternalStore(
    subscribeToNothing,
    () => typeof navigator.share === 'function',
    () => false,
  );
  const titleId = useId();
  useCloseOnScroll(isOpen, menuRef);

  useImperativeHandle(ref, () => ({
    toggle: (anchor, nextTarget) => {
      const menu = menuRef.current;
      if (!menu) return;
      const isSameAnchor = anchorRef.current === anchor;
      if (menu.matches(':popover-open')) {
        menu.hidePopover();
        if (isSameAnchor) return;
      } else if (isSameAnchor && Date.now() - closedAtRef.current < REOPEN_GUARD_MS) {
        return;
      }
      anchorRef.current = anchor;
      setTarget(nextTarget);
      setCopyState('idle');
      menu.showPopover();
      // Đặt ngay để không loé ở giữa màn; effect dưới chỉnh lại khi nội dung mới vẽ xong.
      positionMenu(menu, anchor, side);
    },
  }));

  // Đặt vị trí sau khi nội dung đã vẽ xong (kích thước menu đổi theo trạng thái sao chép).
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const anchor = anchorRef.current;
    if (!isOpen || !menu || !anchor) return;
    positionMenu(menu, anchor, side);
  }, [isOpen, target, copyState, side]);

  // Ghi lúc đóng bằng beforetoggle (chạy ngay khi đóng); toggle chạy sau click của nút nên không kịp chặn mở lại.
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const recordClose = (event: Event) => {
      if ((event as ToggleEvent).newState === 'closed') closedAtRef.current = Date.now();
    };
    menu.addEventListener('beforetoggle', recordClose);
    return () => menu.removeEventListener('beforetoggle', recordClose);
  }, []);

  useEffect(() => {
    if (copyState !== 'copied') return;
    const timer = window.setTimeout(() => menuRef.current?.hidePopover(), COPIED_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const shareUrl = target && typeof window !== 'undefined' ? buildPostShareUrl(window.location.origin, target.postId, target.postType) : '';

  const handleCopy = async () => {
    if (!target) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      onShared(target.postId);
    } catch {
      // Trình duyệt chặn clipboard (trang không an toàn, bị từ chối quyền): hiện link để chép tay.
      setCopyState('failed');
    }
  };

  const handleOpenChannel = (channel: ShareChannel) => {
    if (!target) return;
    const href = buildShareChannelUrl(channel, shareUrl, target.title);
    if (channel === 'email') window.location.href = href;
    else window.open(href, '_blank', 'noopener,noreferrer,width=640,height=600');
    onShared(target.postId);
    menuRef.current?.hidePopover();
  };

  const handleNativeShare = async () => {
    if (!target) return;
    menuRef.current?.hidePopover();
    try {
      await navigator.share({ title: target.title, url: shareUrl });
      onShared(target.postId);
    } catch {
      // Người dùng đóng hộp chia sẻ: không tính là đã chia sẻ.
    }
  };

  return (
    <div
      ref={menuRef}
      popover="auto"
      aria-labelledby={titleId}
      className={styles.menu}
      onToggle={(event) => setIsOpen(event.newState === 'open')}
    >
      <p id={titleId} className={styles.title}>
        {vi.api.shareMenuTitle}
      </p>
      <button type="button" className={styles.item} onClick={() => void handleCopy()}>
        <span className={styles.iconCircle} data-state={copyState === 'copied' ? 'done' : undefined}>
          {copyState === 'copied' ? <CheckIcon /> : <LinkIcon />}
        </span>
        <span aria-live="polite">{copyState === 'copied' ? vi.api.shareLinkCopied : vi.api.shareCopyLink}</span>
      </button>
      {copyState === 'failed' && (
        <div className={styles.manualCopy}>
          <p>{vi.api.shareCopyFailed}</p>
          <input
            readOnly
            value={shareUrl}
            aria-label={vi.api.shareCopyLink}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
      <button type="button" className={styles.item} onClick={() => handleOpenChannel('facebook')}>
        <span className={styles.iconCircle}>
          <FacebookIcon />
        </span>
        <span>{vi.api.shareFacebook}</span>
      </button>
      <button type="button" className={styles.item} onClick={() => handleOpenChannel('x')}>
        <span className={styles.iconCircle}>
          <XIcon />
        </span>
        <span>{vi.api.shareX}</span>
      </button>
      <button type="button" className={styles.item} onClick={() => handleOpenChannel('email')}>
        <span className={styles.iconCircle}>
          <MailIcon />
        </span>
        <span>{vi.api.shareEmail}</span>
      </button>
      {canUseNativeShare && (
        <button type="button" className={styles.item} onClick={() => void handleNativeShare()}>
          <span className={styles.iconCircle}>
            <MoreIcon />
          </span>
          <span>{vi.api.shareMoreOptions}</span>
        </button>
      )}
    </div>
  );
}

function subscribeToNothing() {
  return () => {};
}

function positionMenu(menu: HTMLElement, anchor: HTMLElement, side: 'left' | 'above') {
  const position = placeShareMenu({
    anchor: anchor.getBoundingClientRect(),
    menu: { width: menu.offsetWidth, height: menu.offsetHeight },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    side,
  });
  menu.style.left = `${position.left}px`;
  menu.style.top = `${position.top}px`;
}

const STROKE_ICON = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.85,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

function LinkIcon() {
  return (
    <svg {...STROKE_ICON}>
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...STROKE_ICON}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...STROKE_ICON}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg {...STROKE_ICON}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21h3Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
    </svg>
  );
}
