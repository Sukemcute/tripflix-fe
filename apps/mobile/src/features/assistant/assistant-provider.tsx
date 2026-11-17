import { useApiSession, type AssistantAction, type AssistantCard, type AssistantTrip } from '@tripflix/api-client';
import { completeAssistantTurn, parseAssistantChat, serializeAssistantChat, type AssistantChatMessage } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ASSISTANT_STORAGE_MAX_BYTES, readStoredChat, writeStoredChat } from './assistant-store';

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
export type AssistantContext = { trip: AssistantTrip | null; contextPostId?: string; action?: AssistantAction };
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
  const [hasStorageError, setHasStorageError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const userId = useApiSession().user?.id ?? null;
  const previousUserId = useRef<string | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const saveChat = useCallback((raw: string | null) => {
    void writeStoredChat(raw).then(
      () => setHasStorageError(false),
      () => setHasStorageError(true),
    );
  }, []);

  const clear = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setMessages([]);
    setTrip(null);
    setDraft('');
    setHasError(false);
    setIsPending(false);
  }, []);

  useEffect(() => {
    // Chạy trước effect đổi tài khoản để tránh ghi tin của người cũ dưới ID mới.
    if (previousUserId.current && previousUserId.current !== userId) return;
    if (!userId || !messages.length || isPending || hasError) return;
    const raw = serializeAssistantChat(userId, messages, trip, Date.now(), ASSISTANT_STORAGE_MAX_BYTES);
    saveChat(raw);
  }, [userId, messages, trip, isPending, hasError, saveChat]);

  // Đổi người hoặc đăng xuất: xoá phiên. Khách vừa đăng nhập: giữ phiên đang dở và bắt đầu lưu.
  useEffect(() => {
    const previous = previousUserId.current;
    previousUserId.current = userId;
    if (previous && previous !== userId) {
      clear();
      saveChat(null);
    }
    if (!userId) return;
    const restore = new AbortController();
    readStoredChat()
      .then((raw) => {
        const saved = parseAssistantChat(raw, userId, Date.now());
        if (restore.signal.aborted || !saved) return;
        for (const message of saved.messages) {
          sequence.current = Math.max(sequence.current, Number(message.id) || 0);
        }
        setMessages((current) => (current.length ? current : saved.messages));
        setTrip((current) => current ?? (saved.trip as AssistantTrip | null));
      })
      .catch(() => {
        if (!restore.signal.aborted) setHasStorageError(true);
      });
    return () => restore.abort();
  }, [userId, clear, saveChat]);

  /** action: nút trên thẻ (Chọn, Hoàn tác); text là chữ hiện trong khung chat cho lượt đó. */
  async function send(text = draft, retry = false, action?: AssistantAction) {
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
        ? await transport(next, controller.signal, { trip, contextPostId, action })
        : vi.assistant.demoReply;
      const { trip: nextTrip, ...answer } = typeof reply === 'string' ? { text: reply } : reply;
      if (!answer.text.trim()) throw new Error('Empty assistant response');
      if (controller.signal.aborted) return;
      setMessages(completeAssistantTurn(next, { id: String(++sequence.current), role: 'assistant', ...answer }));
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
    if (userId) saveChat(null);
  }
  return {
    trip,
    act: (label: string, action: AssistantAction) => send(label, false, action),
    isOpen: dialog !== null,
    origin: dialog?.origin,
    openDialog,
    closeDialog,
    draft,
    setDraft,
    messages,
    isPending,
    hasError,
    hasStorageError: Boolean(userId && hasStorageError),
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
