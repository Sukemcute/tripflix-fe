'use client';

import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { TripiMascot } from '@/features/mascot/tripi-mascot';
import { withReturnTo } from '@/features/auth/auth-return';
import { AssistantCards } from './assistant-cards';
import { AssistantIcon, type AssistantIconName } from './assistant-icon';
import { useAssistant } from './assistant-provider';
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

function AssistantPanel() {
  const chat = useAssistant();
  const pathname = usePathname();
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  // Lỗi không khoá ô nhập: người dùng sửa câu rồi gửi lại, hoặc bấm "Thử gửi lại".
  const isDisabled = !chat.draft.trim() || chat.isPending;
  const messageCount = chat.messages.length;

  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messageCount, chat.isPending, chat.hasError]);

  return (
    <section
      className={styles.panel}
      role="dialog"
      aria-label={copy.name}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (isConfirming) setIsConfirming(false);
        else chat.close();
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
          onClick={chat.close}
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

/** Nút Tripi nổi góc phải dưới; bấm mở khung chat (ngăn bên trên máy tính, toàn màn hình trên điện thoại). */
export function AssistantWidget() {
  const chat = useAssistant();
  const pathname = usePathname();
  if (isAssistantHidden(pathname)) return null;
  return chat.isOpen ? (
    <AssistantPanel />
  ) : (
    <button type="button" className={styles.bubble} aria-label={copy.open} title={copy.open} onClick={chat.open}>
      <TripiMascot pose="expr-happy" size={46} alt="" />
      <span className={styles.bubbleBadge} aria-hidden="true">
        <AssistantIcon name="sparkles" size={10} />
      </span>
    </button>
  );
}
