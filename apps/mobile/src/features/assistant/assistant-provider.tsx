import { readAssistantCards, useApiSession, type AssistantAction, type AssistantCard, type AssistantTrip } from '@tripflix/api-client';
import {
  completeAssistantTurn,
  parseAssistantChat,
  serializeAssistantChat,
  takeQuestionToResend,
  type AssistantChatMessage,
} from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
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
export type AssistantContext = {
  trip: AssistantTrip | null;
  contextPostId?: string;
  action?: AssistantAction;
  conversationId?: string;
};
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
  const [conversationId, setConversationId] = useState<string>('');
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
    setConversationId('');
  }, []);

  useEffect(() => {
    // Chạy trước effect đổi tài khoản để tránh ghi tin của người cũ dưới ID mới.
    if (previousUserId.current && previousUserId.current !== userId) return;
    if (!userId || !messages.length || isPending || hasError) return;
    const raw = serializeAssistantChat(userId, messages, trip, Date.now(), ASSISTANT_STORAGE_MAX_BYTES);
    saveChat(raw);
  }, [userId, messages, trip, isPending, hasError, saveChat]);

  async function sendFrom(base: AssistantMessage[], text: string, retry = false, action?: AssistantAction) {
    if (!text.trim() || request.current) return;
    const next = retry
      ? base
      : [...base, { id: String(++sequence.current), role: 'user' as const, text: text.trim() }];
    const controller = new AbortController();
    request.current = controller;
    setMessages(next);
    setDraft('');
    setHasError(false);
    setIsPending(true);
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      activeConversationId =
        globalThis.crypto?.randomUUID?.() ??
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
          const value = Math.floor(Math.random() * 16);
          return (char === 'x' ? value : (value & 3) | 8).toString(16);
        });
      setConversationId(activeConversationId);
    }
    try {
      const reply = transport
        ? await transport(next, controller.signal, {
            trip,
            contextPostId,
            action,
            conversationId: activeConversationId,
          })
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
  /** action: nút trên thẻ (Chọn, Hoàn tác); text là chữ hiện trong khung chat cho lượt đó. */
  function send(text = draft, retry = false, action?: AssistantAction) {
    return sendFrom(messages, text, retry, action);
  }
  /**
   * Khách hết lượt rồi đăng nhập: bỏ lời mời đăng nhập và tự gửi lại câu bị chặn; các tin trước giữ làm ngữ cảnh.
   * Effect event: chạy khi phiên đổi nhưng đọc tin nhắn mới nhất.
   */
  const resumeAfterLogin = useEffectEvent(() => {
    const resume = takeQuestionToResend(messages);
    if (!resume) return;
    if (resume.question) void sendFrom(resume.messages, resume.question);
    else setMessages(resume.messages);
  });
  // Đổi người hoặc đăng xuất: xoá phiên. Khách vừa đăng nhập: giữ phiên đang dở và bắt đầu lưu.
  useEffect(() => {
    const previous = previousUserId.current;
    previousUserId.current = userId;
    if (previous && previous !== userId) {
      clear();
      saveChat(null);
    }
    if (!userId) return;
    if (!previous) resumeAfterLogin();
    const restore = new AbortController();
    readStoredChat()
      .then((raw) => {
        const saved = parseAssistantChat(raw, userId, Date.now());
        if (restore.signal.aborted || !saved) return;
        for (const message of saved.messages) {
          sequence.current = Math.max(sequence.current, Number(message.id) || 0);
        }
        const restored = saved.messages.map((message) => ({ ...message, cards: readAssistantCards(message.cards) }));
        setMessages((current) => (current.length ? current : restored));
        setTrip((current) => current ?? (saved.trip as AssistantTrip | null));
      })
      .catch(() => {
        if (!restore.signal.aborted) setHasStorageError(true);
      });
    return () => restore.abort();
  }, [userId, clear, saveChat]);

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
