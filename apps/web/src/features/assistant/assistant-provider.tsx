'use client';

// Cùng luồng với apps/mobile/src/features/assistant/assistant-provider.tsx (TF31): gửi, lưu, khôi phục,
// đổi tài khoản, khách hết lượt rồi đăng nhập. Web chỉ khác chỗ lưu (localStorage) và không có reel đang xem.
// shortcut: chép logic của mobile vì app-core không được import React; khi có gói hook dùng chung thì gộp lại.
import { useApiSession, type AssistantAction, type AssistantCard, type AssistantTrip } from '@tripflix/api-client';
import {
  completeAssistantTurn,
  parseAssistantChat,
  serializeAssistantChat,
  takeQuestionToResend,
  type AssistantChatMessage,
} from '@tripflix/app-core';
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
import { readStoredChat, writeStoredChat } from './assistant-store';

export type AssistantMessage = AssistantChatMessage & {
  /** Thẻ Tripi trả về (video, bài viết, nơi ở, thời tiết, checklist, lộ trình). */
  cards?: AssistantCard[];
  /** Câu gợi ý, bấm là gửi. */
  suggestions?: string[];
  /** Tin của app mời đăng nhập (khách hết lượt). */
  action?: 'login';
};
export type AssistantReply = Omit<AssistantMessage, 'id' | 'role'> & { trip?: AssistantTrip | null };
/** Gửi kèm mỗi lượt: những gì Tripi nhớ về chuyến đi. */
export type AssistantContext = { trip: AssistantTrip | null; contextPostId?: string; action?: AssistantAction };
export type AssistantTransport = (
  messages: readonly AssistantMessage[],
  signal: AbortSignal,
  context: AssistantContext,
) => Promise<AssistantReply>;

function useAssistantState(transport: AssistantTransport) {
  const [isOpen, setIsOpen] = useState(false);
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
    try {
      writeStoredChat(raw);
      setHasStorageError(false);
    } catch {
      setHasStorageError(true);
    }
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
    saveChat(serializeAssistantChat(userId, messages, trip, Date.now()));
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
    try {
      const { trip: nextTrip, ...answer } = await transport(next, controller.signal, { trip, action });
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
  /** Khách hết lượt rồi đăng nhập: bỏ lời mời đăng nhập và tự gửi lại câu bị chặn. */
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
    try {
      const saved = parseAssistantChat(readStoredChat(), userId, Date.now());
      if (!saved) return;
      for (const message of saved.messages) {
        sequence.current = Math.max(sequence.current, Number(message.id) || 0);
      }
      setMessages((current) => (current.length ? current : saved.messages));
      setTrip((current) => current ?? (saved.trip as AssistantTrip | null));
    } catch {
      setHasStorageError(true);
    }
  }, [userId, clear, saveChat]);

  function reset() {
    clear();
    if (userId) saveChat(null);
  }
  return {
    trip,
    act: (label: string, action: AssistantAction) => send(label, false, action),
    isOpen,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    draft,
    setDraft,
    messages,
    isPending,
    hasError,
    hasStorageError: Boolean(userId && hasStorageError),
    send,
    reset,
  };
}

const AssistantStateContext = createContext<ReturnType<typeof useAssistantState> | null>(null);
export function AssistantProvider({ children, transport }: PropsWithChildren<{ transport: AssistantTransport }>) {
  const value = useAssistantState(transport);
  return <AssistantStateContext.Provider value={value}>{children}</AssistantStateContext.Provider>;
}
export function useAssistant() {
  const context = useContext(AssistantStateContext);
  if (!context) throw new Error('AssistantProvider is required');
  return context;
}
