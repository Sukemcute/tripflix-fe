'use client';

import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TripiMascot } from '@/features/mascot/tripi-mascot';
import { withReturnTo } from '@/features/auth/auth-return';
import { AssistantCards } from './assistant-cards';
import { AssistantIcon, type AssistantIconName } from './assistant-icon';
import { useAssistant } from './assistant-provider';
import {
  getPanelCloseTimeoutMs,
  getPanelVisibility,
  reducePanelPresence,
  shouldCompletePanelClose,
} from './panel-motion';
import styles from './assistant.module.css';

const copy = vi.assistant;
const PROMPT_ICONS: Record<string, AssistantIconName> = {
  'map-outline': 'map',
  'sunny-outline': 'sun',
  'wallet-outline': 'wallet',
};

/** Trang không hiện Tripi: đăng nhập/đăng ký (khung riêng), checkout và thanh toán (tránh che nút trả tiền). */
export function isAssistantHidden(pathname: string): boolean {
  return /^\/(?:login|register|forgot-password|dat-lai-mat-khau|xac-thuc-email|checkout|payments|onboarding)(?:\/|$)/.test(
    pathname,
  );
}

function AssistantThinking() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setStep((current) => (current + 1) % copy.thinkingSteps.length), 1800);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className={styles.thinking} role="status" aria-label={copy.thinking}>
      <TripiMascot animation="searching" size={52} alt="" />
      <div className={styles.thinkingBubble}>
        <span className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <p key={step} className={styles.thinkingText}>
          {copy.thinkingSteps[step]}
        </p>
      </div>
    </div>
  );
}

function AssistantPanel({
  isClosing = false,
  onClosed,
}: {
  isClosing?: boolean;
  onClosed: () => void;
}) {
  const chat = useAssistant();
  const pathname = usePathname();
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLElement>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Đo vị trí mép dưới của .ota-header để neo khung chat chính xác theo thanh điều hướng
  useLayoutEffect(() => {
    const headerEl = document.querySelector('.ota-header');
    const panelEl = panel.current;
    if (!headerEl || !panelEl) return;
    const updateAnchor = () => {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      const top = isMobile ? 0 : Math.max(12, Math.min(Math.ceil(headerEl.getBoundingClientRect().bottom) + 8, window.innerHeight - 160));
      panelEl.style.setProperty('--panel-top', `${top}px`);
      panelEl.style.setProperty('--panel-max-height', `${Math.max(0, window.innerHeight - top - 16)}px`);
    };
    updateAnchor();
    const observer = new ResizeObserver(updateAnchor);
    observer.observe(headerEl);
    window.addEventListener('resize', updateAnchor, { passive: true });
    window.addEventListener('scroll', updateAnchor, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor);
    };
  }, [pathname]);

  useLayoutEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat.messages.length, chat.isPending, chat.hasError]);

  // Lỗi không khoá ô nhập: người dùng sửa câu rồi gửi lại, hoặc bấm "Thử gửi lại".
  const isDisabled = !chat.draft.trim() || chat.isPending;

  useEffect(() => {
    if (!isClosing) input.current?.focus({ preventScroll: true });
  }, [isClosing]);

  const handleClose = () => {
    chat.close();
    const trigger = document.getElementById('header-assistant-button');
    trigger?.focus();
  };

  return (
    <section
      ref={panel}
      id="tripi-assistant-panel"
      className={`${styles.panel} ${isClosing ? styles.panelClosing : ''}`}
      role="dialog"
      aria-label={copy.name}
      aria-hidden={isClosing || undefined}
      inert={Boolean(isClosing)}
      onAnimationEnd={(event) => {
        if (shouldCompletePanelClose(event.target, event.currentTarget, isClosing)) {
          onClosed();
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (isConfirming) setIsConfirming(false);
        else handleClose();
      }}
    >
      <header className={styles.header}>
        <span className={styles.avatar}>
          <TripiMascot pose="expr-happy" size={34} alt="" />
          <span className={styles.statusDot} data-pending={chat.isPending || undefined} />
        </span>
        <div className={styles.grow}>
          <p className={styles.name}>{copy.name}</p>
          <p className={styles.subtitle}>{chat.isPending ? copy.thinkingOnline : copy.subtitle}</p>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={copy.reset}
          title={copy.reset}
          onClick={() => {
            if (chat.messages.length || chat.draft.trim()) setIsConfirming(true);
            else input.current?.focus();
          }}
        >
          <AssistantIcon name="compose" />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={copy.minimize}
          title={copy.minimize}
          onClick={handleClose}
        >
          <AssistantIcon name="minimize" />
        </button>
      </header>

      <div ref={list} className={styles.messages}>
        {!chat.messages.length ? (
          <div className={styles.welcome}>
            <div className={styles.welcomeHead}>
              <TripiMascot animation="greeting" size={92} alt="" />
              <div className={styles.welcomeBubble}>
                <p className={styles.welcomeHello}>{copy.greeting}</p>
                <p className={styles.welcomeTitle}>{copy.title}</p>
              </div>
            </div>
            <div className={styles.prompts}>
              {copy.prompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  className={styles.prompt}
                  onClick={() => {
                    chat.setDraft(prompt.text);
                    input.current?.focus();
                  }}
                >
                  <span className={styles.cardIcon}>
                    <AssistantIcon name={PROMPT_ICONS[prompt.icon] ?? 'sparkles'} />
                  </span>
                  <span className={styles.grow}>
                    <span className={styles.promptLabel}>{prompt.label}</span>
                    <span className={styles.meta}>{prompt.caption}</span>
                  </span>
                  <AssistantIcon name="arrowRight" size={18} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.messages.map((message, index) => {
            const isAssistant = message.role === 'assistant';
            const isLatest = index === chat.messages.length - 1;
            // Avatar chỉ ở tin đầu của một lượt Tripi, tránh lặp mặt Tripi mỗi bong bóng.
            const startsGroup = isAssistant && chat.messages[index - 1]?.role !== 'assistant';
            return (
              <div key={message.id} className={styles.turn}>
                <div className={styles.messageRow} data-role={message.role}>
                  {isAssistant &&
                    (startsGroup ? (
                      <TripiMascot pose="expr-happy" size={34} alt="" />
                    ) : (
                      <span className={styles.avatarSpacer} />
                    ))}
                  <p className={styles.message} data-role={message.role}>
                    {message.text}
                  </p>
                </div>
                {/* Thẻ và gợi ý là khối riêng dưới lời giải thích, không ép vào bong bóng hẹp. */}
                {isAssistant && (!!message.cards?.length || message.action === 'login') && (
                  <div className={styles.attachments}>
                    {!!message.cards?.length && (
                      <AssistantCards
                        cards={message.cards}
                        onOpen={chat.close}
                        actions={
                          isLatest && !chat.isPending
                            ? {
                                act: (label, action) => void chat.act(label, action),
                                canUndo: !!chat.trip?.ops?.length,
                              }
                            : undefined
                        }
                      />
                    )}
                    {message.action === 'login' && (
                      // Phiên chat nằm ở provider gốc nên vẫn còn khi đăng nhập xong quay lại.
                      <Link className={styles.loginButton} href={withReturnTo('/login', pathname)} onClick={chat.close}>
                        <AssistantIcon name="login" size={18} />
                        {copy.login}
                      </Link>
                    )}
                  </div>
                )}
                {isAssistant && isLatest && !chat.isPending && !!message.suggestions?.length && (
                  <div className={styles.attachments}>
                    <p className={styles.suggestionsLabel}>{copy.suggestionsLabel}</p>
                    <div className={styles.chips}>
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={styles.chip}
                          onClick={() => void chat.send(suggestion)}
                        >
                          <AssistantIcon name="sparkles" size={14} />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        {chat.isPending && <AssistantThinking />}
        {chat.hasError && (
          <div role="alert" className={styles.error}>
            <p>{copy.error}</p>
            <button
              type="button"
              className={styles.retry}
              onClick={() => void chat.send(chat.messages.at(-1)?.text, true)}
            >
              <AssistantIcon name="refresh" />
              {copy.retry}
            </button>
          </div>
        )}
      </div>

      <form
        className={styles.composerArea}
        onSubmit={(event) => {
          event.preventDefault();
          if (!isDisabled) void chat.send();
        }}
      >
        {chat.hasStorageError && (
          <p role="alert" className={styles.footnote}>
            {copy.storageError}
          </p>
        )}
        <div className={styles.composer}>
          <textarea
            ref={input}
            aria-label={copy.placeholder}
            placeholder={copy.placeholder}
            value={chat.draft}
            onChange={(event) => chat.setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter gửi, Shift+Enter xuống dòng; đang gõ tiếng Việt (IME) thì Enter chỉ chốt chữ.
              if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            rows={1}
            maxLength={4000}
            className={styles.input}
          />
          <button type="submit" className={styles.send} aria-label={copy.send} disabled={isDisabled}>
            <AssistantIcon name="arrowUp" />
          </button>
        </div>
        <p className={styles.footnote}>{copy.footer}</p>
      </form>

      {isConfirming && (
        <div className={styles.confirmBackdrop}>
          <div className={styles.confirm} role="alertdialog" aria-label={copy.resetTitle}>
            <p className={styles.name}>{copy.resetTitle}</p>
            <p className={styles.meta}>{copy.resetBody}</p>
            <button
              type="button"
              className={styles.confirmAction}
              data-danger
              onClick={() => {
                chat.reset();
                setIsConfirming(false);
              }}
            >
              {copy.confirm}
            </button>
            <button type="button" autoFocus className={styles.confirmAction} onClick={() => setIsConfirming(false)}>
              {copy.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Khung chat Tripi ở gốc (TF31): giữ panel qua `isExiting` để chạy hết animation đóng (fade + trượt nhẹ) rồi mới gỡ.
 * Giữ nguyên phiên chat và tiến trình stream ngay cả khi đóng mở khung.
 */
export function AssistantWidget() {
  const chat = useAssistant();
  const pathname = usePathname();
  const isOpen = chat.isOpen && !isAssistantHidden(pathname);
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);
  if (lastIsOpen !== isOpen) {
    const next = reducePanelPresence({ lastIsOpen, isExiting }, isOpen);
    setLastIsOpen(next.lastIsOpen);
    setIsExiting(next.isExiting);
  }
  const { isClosing, rendered } = getPanelVisibility(isOpen, isExiting);

  // Bộ hẹn giờ dự phòng khi onAnimationEnd không kích hoạt hoặc khi giảm chuyển động
  useEffect(() => {
    if (!isClosing) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => {
      setIsExiting(false);
    }, getPanelCloseTimeoutMs(Boolean(prefersReducedMotion)));
    return () => clearTimeout(timer);
  }, [isClosing]);

  // Bấm ra ngoài khung thì đóng
  useEffect(() => {
    if (!rendered || isClosing) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const panelEl = document.getElementById('tripi-assistant-panel');
      const buttonEl = document.getElementById('header-assistant-button');
      if (panelEl?.contains(target) || buttonEl?.contains(target)) return;
      chat.close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const panelEl = document.getElementById('tripi-assistant-panel');
      if (panelEl?.contains(event.target as Node)) return;
      chat.close();
      document.getElementById('header-assistant-button')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [rendered, isClosing, chat]);

  const handleClosed = useCallback(() => setIsExiting(false), []);

  if (isAssistantHidden(pathname) || !rendered) return null;

  return <AssistantPanel isClosing={isClosing} onClosed={handleClosed} />;
}

/**
 * Nút bật/tắt Tripi trên thanh điều hướng đầu trang (bên cạnh giỏ hàng).
 */
export function AssistantHeaderButton() {
  const chat = useAssistant();
  const pathname = usePathname();
  if (isAssistantHidden(pathname)) return null;

  const label = chat.isOpen ? `${copy.name}, ${copy.minimize}` : `${copy.name}, ${copy.open}`;

  return (
    <button
      id="header-assistant-button"
      type="button"
      className={styles.headerButton}
      aria-expanded={chat.isOpen}
      aria-controls="tripi-assistant-panel"
      aria-haspopup="dialog"
      aria-label={label}
      title={copy.name}
      onClick={() => {
        if (chat.isOpen) {
          chat.close();
        } else {
          chat.open();
        }
      }}
    >
      <span className={styles.headerMascot}>
        <TripiMascot pose="expr-happy" size={44} alt="" />
      </span>
      <span className={styles.headerBadge} aria-hidden="true">
        <AssistantIcon name="sparkles" size={9} />
      </span>
      {chat.isPending && <span className={styles.headerPendingDot} aria-hidden="true" />}
    </button>
  );
}
