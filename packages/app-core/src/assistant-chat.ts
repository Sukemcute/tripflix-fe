// Phiên chat Tripi: người đã đăng nhập giữ trên máy 7 ngày; khách chỉ giữ trong bộ nhớ app
// (Bảo chốt 2026-11-16). Server không lưu hội thoại nên app gửi lại history và trip mỗi lượt.

export const ASSISTANT_CHAT_DAYS = 7;
/** Lưu trên máy 20 tin (10 lượt hỏi đáp). */
export const ASSISTANT_SAVED_MESSAGES = 20;
/** Tin gửi kèm mỗi lượt: server đọc tối đa 20 tin khi test (TF31, 2026-11-17), nhận tối đa 30. */
export const ASSISTANT_HISTORY_TURNS = 20;
const MAX_TEXT_CHARS = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Loại câu trả lời (answer, clarify, …); server dùng để không hỏi lại hai lần. */
  kind?: string;
  cards?: unknown[];
  /** Tin do app tự thêm (mời đăng nhập, báo đang đông): không gửi lên server. */
  isLocal?: boolean;
};

type SavedChat = { userId: string; savedAt: number; messages: AssistantChatMessage[]; trip: unknown };

function storedMessage({ id, role, text, kind, cards }: AssistantChatMessage): AssistantChatMessage {
  return {
    id,
    role,
    text,
    ...(kind === undefined ? {} : { kind }),
    ...(Array.isArray(cards) ? { cards } : {}),
  };
}

export function serializeAssistantChat(
  userId: string,
  messages: readonly AssistantChatMessage[],
  trip: unknown,
  now: number,
  maxBytes?: number,
): string {
  const recent = messages.filter((message) => !message.isLocal).slice(-ASSISTANT_SAVED_MESSAGES).map(storedMessage);
  const saved: SavedChat = {
    userId,
    savedAt: now,
    messages: recent,
    trip: trip ?? null,
  };
  if (maxBytes === undefined) return JSON.stringify(saved);

  // Tính theo byte UTF-8, kể cả chữ tiếng Việt và emoji.
  const fits = (value: string) => encodeURIComponent(value).replace(/%[0-9A-F]{2}/g, 'x').length <= maxBytes;
  if (!fits(JSON.stringify({ ...saved, messages: [] }))) saved.trip = null;
  let value = JSON.stringify(saved);
  const latestAnswer = [...recent].reverse().find((message) => message.role === 'assistant');
  for (const message of recent) {
    if (fits(value)) break;
    if (message === latestAnswer || !message.cards) continue;
    delete message.cards;
    value = JSON.stringify(saved);
  }
  let start = 0;
  while (!fits(value) && start < recent.length) {
    const oldestIsPair = recent[start]?.role === 'user' && recent[start + 1]?.role === 'assistant';
    const next = start + (oldestIsPair ? 2 : 1);
    if (latestAnswer?.cards && next > recent.indexOf(latestAnswer)) delete latestAnswer.cards;
    else start = next;
    value = JSON.stringify({ ...saved, messages: recent.slice(start) });
  }
  return value;
}

/** Phiên đã lưu của đúng người này và chưa quá 7 ngày; còn lại coi như không có. */
export function parseAssistantChat(
  raw: string | null,
  userId: string,
  now: number,
): { messages: AssistantChatMessage[]; trip: unknown } | null {
  if (!raw) return null;
  let saved: Partial<SavedChat>;
  try {
    saved = JSON.parse(raw) as Partial<SavedChat>;
  } catch {
    return null;
  }
  if (saved?.userId !== userId || typeof saved.savedAt !== 'number') return null;
  if (now - saved.savedAt > ASSISTANT_CHAT_DAYS * DAY_MS || !Array.isArray(saved.messages)) return null;
  const messages = saved.messages.filter(
    (message) =>
      (message?.role === 'user' || message?.role === 'assistant') &&
      typeof message.id === 'string' &&
      typeof message.text === 'string' &&
      !message.isLocal,
  );
  return { messages: messages.slice(-ASSISTANT_SAVED_MESSAGES).map(storedMessage), trip: saved.trip ?? null };
}

/** Giữ lượt bị từ chối trên màn hình và bỏ cả câu hỏi lẫn thông báo khỏi lịch sử gửi/lưu. */
export function completeAssistantTurn<M extends AssistantChatMessage>(messages: readonly M[], reply: M): M[] {
  const question = messages.at(-1);
  if (reply.isLocal && question?.role === 'user') {
    return [...messages.slice(0, -1), { ...question, isLocal: true }, reply];
  }
  return [...messages, reply];
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

/**
 * Khách hết lượt rồi đăng nhập: bỏ lời mời đăng nhập và câu hỏi bị từ chối khỏi khung chat,
 * trả lại câu đó để app tự gửi lại, các tin trước vẫn giữ nguyên làm ngữ cảnh.
 * Không có lời mời đăng nhập ở cuối thì trả về null, không đổi gì.
 */
export function takeQuestionToResend<M extends AssistantChatMessage & { action?: string }>(
  messages: readonly M[],
): { messages: M[]; question: string } | null {
  const prompt = messages.at(-1);
  if (!prompt || prompt.role !== 'assistant' || prompt.action !== 'login') return null;
  const question = messages.at(-2);
  const isRefused = question?.role === 'user' && question.isLocal === true;
  return {
    messages: messages.slice(0, isRefused ? -2 : -1),
    question: isRefused ? question.text : '',
  };
}
