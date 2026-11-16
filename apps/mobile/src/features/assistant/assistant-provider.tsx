import { useApiSession, type AssistantCard, type AssistantTrip } from '@tripflix/api-client';
import { parseAssistantChat, serializeAssistantChat, type AssistantChatMessage } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { readStoredChat, writeStoredChat } from './assistant-store';

/** Bong bóng Tripi: nhỏ để bớt che video, vẫn trên 44pt nên dễ bấm. Khung chat thu về đúng cỡ này khi đóng. */
export const BUBBLE_SIZE = 52;
export const BUBBLE_MASCOT_SIZE = 46;
export type AssistantMessage = AssistantChatMessage & {
  /** Thẻ Tripi trả về (video, bài viết, nơi ở, thời tiết, checklist, lộ trình). */
  cards?: AssistantCard[];
  /** Câu gợi ý, bấm là gửi. */
  suggestions?: string[];
  /** Tin của app mời đăng nhập (khách hết lượt). */
  action?: 'login';
};
export type AssistantReply = Omit<AssistantMessage, 'id' | 'role'> & { trip?: AssistantTrip | null };
export type AssistantOrigin = { x: number; y: number; width: number; height: number };
/** Gửi kèm mỗi lượt: reel đang mở và những gì Tripi nhớ về chuyến đi. */
export type AssistantContext = { trip: AssistantTrip | null; contextPostId?: string };
export type AssistantTransport = (
  messages: readonly AssistantMessage[],
  signal: AbortSignal,
  context: AssistantContext,
) => Promise<string | AssistantReply>;

function useAssistantState(transport?: AssistantTransport) {
  const [dialog, setDialog] = useState<{ origin?: AssistantOrigin } | null>(null);
  const [contextPostId, setContextPostId] = useState<string>();
  /** Mở từ một reel thì reel đó là ngữ cảnh; mở ở chỗ khác thì không có reel nào đang xem. */
  const openDialog = useCallback((origin?: AssistantOrigin, postId?: string) => {
    setContextPostId(postId);
    setDialog({ origin });
  }, []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [trip, setTrip] = useState<AssistantTrip | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const userId = useApiSession().user?.id ?? null;
  const previousUserId = useRef(userId);
  useEffect(() => () => request.current?.abort(), []);

  const clear = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setMessages([]);
    setTrip(null);
    setDraft('');
    setHasError(false);
    setIsPending(false);
  }, []);

  // Đổi người hoặc đăng xuất: xoá phiên. Khách vừa đăng nhập: giữ phiên đang dở và bắt đầu lưu.
  useEffect(() => {
    const previous = previousUserId.current;
    previousUserId.current = userId;
    if (previous && previous !== userId) {
      clear();
      writeStoredChat(null).catch(() => undefined);
    }
    if (!userId || previous === userId) return;
    readStoredChat()
      .then((raw) => {
        const saved = parseAssistantChat<AssistantMessage>(raw, userId, Date.now());
        // Người dùng đã đổi trong lúc đọc: bỏ kết quả cũ.
        if (previousUserId.current !== userId || !saved) return;
        setMessages((current) => (current.length ? current : saved.messages));
        setTrip((current) => current ?? (saved.trip as AssistantTrip | null));
      })
      .catch(() => undefined);
  }, [userId, clear]);

  useEffect(() => {
    if (!userId || !messages.length) return;
    writeStoredChat(serializeAssistantChat(userId, messages, trip, Date.now())).catch(() => undefined);
  }, [userId, messages, trip]);

  async function send(text = draft, retry = false) {
    if (!text.trim() || request.current) return;
    const next = retry
      ? messages
      : [...messages, { id: String(++sequence.current), role: 'user' as const, text: text.trim() }];
    const controller = new AbortController();
    request.current = controller;
    setMessages(next);
    setDraft('');
    setHasError(false);
    setIsPending(true);
    try {
      const reply = transport
        ? await transport(next, controller.signal, { trip, contextPostId })
        : vi.assistant.demoReply;
      const { trip: nextTrip, ...answer } = typeof reply === 'string' ? { text: reply } : reply;
      if (!answer.text.trim()) throw new Error('Empty assistant response');
      if (controller.signal.aborted) return;
      setMessages([...next, { id: String(++sequence.current), role: 'assistant', ...answer }]);
      if (nextTrip) setTrip(nextTrip);
    } catch {
      if (!controller.signal.aborted) setHasError(true);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setIsPending(false);
      }
    }
  }
  function reset() {
    clear();
    if (userId) writeStoredChat(null).catch(() => undefined);
  }
  return {
    isOpen: dialog !== null,
    origin: dialog?.origin,
    openDialog,
    closeDialog,
    draft,
    setDraft,
    messages,
    isPending,
    hasError,
    send,
    reset,
    isPreview: !transport,
  };
}

const AssistantStateContext = createContext<ReturnType<typeof useAssistantState> | null>(null);
export function AssistantProvider({
  children,
  transport,
}: PropsWithChildren<{ transport?: AssistantTransport }>) {
  const value = useAssistantState(transport);
  return <AssistantStateContext.Provider value={value}>{children}</AssistantStateContext.Provider>;
}
export function useAssistant() {
  const context = useContext(AssistantStateContext);
  if (!context) throw new Error('AssistantProvider is required');
  return context;
}
