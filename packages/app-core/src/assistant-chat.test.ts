import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_CHAT_DAYS,
  buildAssistantHistory,
  parseAssistantChat,
  serializeAssistantChat,
  type AssistantChatMessage,
} from './assistant-chat';

const NOW = Date.UTC(2026, 10, 16);
const DAY = 24 * 60 * 60 * 1000;
const messages: AssistantChatMessage[] = [
  { id: '1', role: 'user', text: 'ks vung tau t7' },
  { id: '2', role: 'assistant', text: 'Bạn trả phòng ngày nào?', kind: 'clarify' },
  { id: '3', role: 'assistant', text: 'Đăng nhập để chat tiếp nha', isLocal: true },
];

describe('assistant chat persistence', () => {
  it('restores the chat of the same user and drops local notices', () => {
    const raw = serializeAssistantChat('u1', messages, { v: 1, place: 'Vũng Tàu' }, NOW);
    expect(parseAssistantChat(raw, 'u1', NOW + DAY)).toEqual({
      messages: messages.slice(0, 2),
      trip: { v: 1, place: 'Vũng Tàu' },
    });
  });

  it('never gives one user the chat of another, nor an old or broken one', () => {
    const raw = serializeAssistantChat('u1', messages, null, NOW);
    expect(parseAssistantChat(raw, 'u2', NOW)).toBeNull();
    expect(parseAssistantChat(raw, 'u1', NOW + (ASSISTANT_CHAT_DAYS + 1) * DAY)).toBeNull();
    expect(parseAssistantChat('{oops', 'u1', NOW)).toBeNull();
    expect(parseAssistantChat(null, 'u1', NOW)).toBeNull();
  });

  it('keeps at most 10 turns', () => {
    const long = Array.from({ length: 30 }, (_, i) => ({ id: String(i), role: 'user' as const, text: `m${i}` }));
    const restored = parseAssistantChat(serializeAssistantChat('u1', long, null, NOW), 'u1', NOW);
    expect(restored?.messages).toHaveLength(20);
    expect(restored?.messages[0]?.text).toBe('m10');
  });
});

describe('buildAssistantHistory', () => {
  it('sends the kind of Tripi answers and leaves out app notices', () => {
    expect(buildAssistantHistory(messages)).toEqual([
      { role: 'user', text: 'ks vung tau t7' },
      { role: 'assistant', text: 'Bạn trả phòng ngày nào?', kind: 'clarify' },
    ]);
  });
});
