import type { AssistantCard } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Thẻ gợi ý Tripi tìm được (video, bài viết, nơi ở). */
  cards?: AssistantCard[];
};
export type AssistantOrigin = { x: number; y: number; width: number; height: number };
/** Bảo supplies an adapter using the generated API client; no endpoint is assumed here. */
export type AssistantTransport = (
  messages: readonly AssistantMessage[],
  signal: AbortSignal,
) => Promise<string | { text: string; cards: AssistantCard[] }>;

function useAssistantState(transport?: AssistantTransport) {
  const [isOpen, setIsOpen] = useState(false);
  const [origin, setOrigin] = useState<AssistantOrigin | null>(null);
  function openFromBubble(bounds: AssistantOrigin) {
    setOrigin(bounds);
    setIsOpen(true);
  }
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => request.current?.abort(), []);
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
      const reply = transport ? await transport(next, controller.signal) : vi.assistant.demoReply;
      const { text: replyText, cards } = typeof reply === 'string' ? { text: reply, cards: [] } : reply;
      if (!replyText.trim()) throw new Error('Empty assistant response');
      if (!controller.signal.aborted)
        setMessages([...next, { id: String(++sequence.current), role: 'assistant', text: replyText, cards }]);
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
    request.current?.abort();
    request.current = null;
    setMessages([]);
    setDraft('');
    setHasError(false);
    setIsPending(false);
  }
  return {
    isOpen,
    setIsOpen,
    origin,
    openFromBubble,
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

const AssistantContext = createContext<ReturnType<typeof useAssistantState> | null>(null);
export function AssistantProvider({
  children,
  transport,
}: PropsWithChildren<{ transport?: AssistantTransport }>) {
  const value = useAssistantState(transport);
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error('AssistantProvider is required');
  return context;
}
