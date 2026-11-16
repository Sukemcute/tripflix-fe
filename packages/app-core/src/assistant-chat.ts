// Phiên chat Tripi: người đã đăng nhập giữ trên máy 7 ngày; khách chỉ giữ trong bộ nhớ app
// (Bảo chốt 2026-11-16). Server không lưu hội thoại nên app gửi lại history và trip mỗi lượt.

export const ASSISTANT_CHAT_DAYS = 7;
/** 10 lượt hỏi đáp; server chỉ đọc 10 tin gần nhất. */
export const ASSISTANT_SAVED_MESSAGES = 20;
export const ASSISTANT_HISTORY_TURNS = 10;
const MAX_TEXT_CHARS = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Loại câu trả lời (answer, clarify, …); server dùng để không hỏi lại hai lần. */
  kind?: string;
  /** Tin do app tự thêm (mời đăng nhập, báo đang đông): không gửi lên server. */
  isLocal?: boolean;
};

type SavedChat<M> = { userId: string; savedAt: number; messages: M[]; trip: unknown };

export function serializeAssistantChat<M extends AssistantChatMessage>(
  userId: string,
  messages: readonly M[],
  trip: unknown,
  now: number,
): string {
  const saved: SavedChat<M> = {
    userId,
    savedAt: now,
    messages: messages.filter((message) => !message.isLocal).slice(-ASSISTANT_SAVED_MESSAGES),
    trip: trip ?? null,
  };
  return JSON.stringify(saved);
}

/** Phiên đã lưu của đúng người này và chưa quá 7 ngày; còn lại coi như không có. */
export function parseAssistantChat<M extends AssistantChatMessage>(
  raw: string | null,
  userId: string,
  now: number,
): { messages: M[]; trip: unknown } | null {
  if (!raw) return null;
  let saved: Partial<SavedChat<M>>;
  try {
    saved = JSON.parse(raw) as Partial<SavedChat<M>>;
  } catch {
    return null;
  }
  if (saved?.userId !== userId || typeof saved.savedAt !== 'number') return null;
  if (now - saved.savedAt > ASSISTANT_CHAT_DAYS * DAY_MS || !Array.isArray(saved.messages)) return null;
  const messages = saved.messages.filter(
    (message) =>
      (message?.role === 'user' || message?.role === 'assistant') && typeof message.text === 'string',
  );
  return { messages: messages.slice(-ASSISTANT_SAVED_MESSAGES), trip: saved.trip ?? null };
}

/** Lịch sử gửi lên /chat: bỏ tin của app, giữ kind của Tripi, cắt độ dài như server cho phép. */
export function buildAssistantHistory(
  messages: readonly AssistantChatMessage[],
): { role: 'user' | 'assistant'; text: string; kind?: string }[] {
  return messages
    .filter((message) => !message.isLocal && message.text.trim())
    .slice(-ASSISTANT_HISTORY_TURNS)
    .map((message) => ({
      role: message.role,
      text: message.text.slice(0, MAX_TEXT_CHARS),
      ...(message.role === 'assistant' && message.kind ? { kind: message.kind } : {}),
    }));
}
