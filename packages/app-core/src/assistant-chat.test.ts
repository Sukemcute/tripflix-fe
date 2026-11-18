import { describe, expect, it } from 'vitest';
import {
  takeQuestionToResend,
  ASSISTANT_CHAT_DAYS,
  buildAssistantHistory,
  completeAssistantTurn,
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

  it('stores cards with text and kind, leaves out suggestions and reads existing sessions', () => {
    const extended = [
      { ...messages[1]!, cards: [{ id: 'reel-1', details: 'x'.repeat(3000) }], suggestions: ['Xem reel'] },
    ];
    const trip = { v: 1, place: 'Đà Lạt' };
    const raw = serializeAssistantChat('u1', extended, trip, NOW);
    const expected = { messages: [{ ...messages[1], cards: extended[0]!.cards }], trip };
    expect(JSON.parse(raw)).toMatchObject(expected);
    expect(parseAssistantChat(raw, 'u1', NOW)).toEqual(expected);
    expect(raw).not.toContain('suggestions');
    const legacy = JSON.stringify({ userId: 'u1', savedAt: NOW, messages: extended, trip });
    expect(parseAssistantChat(legacy, 'u1', NOW)).toEqual(expected);
  });

  it.each([null, {}, 'invalid', 123])('drops cards that are not an array: %j', (cards) => {
    const raw = JSON.stringify({ userId: 'u1', savedAt: NOW, messages: [{ ...messages[1], cards }] });
    expect(parseAssistantChat(raw, 'u1', NOW)?.messages).toEqual([messages[1]]);
  });

  it('drops old cards before messages and keeps the newest assistant cards', () => {
    const old = { ...messages[1]!, cards: [{ id: 'old', detail: 'x'.repeat(3000) }] };
    const latest = { id: '4', role: 'assistant' as const, text: 'Lộ trình đây', cards: [{ id: 'new' }] };
    const history = [messages[0]!, old, { ...messages[0]!, id: '3' }, latest];
    const raw = serializeAssistantChat('u1', history, null, NOW, 700);
    expect(encodeURI(raw).match(/%[0-9A-F]{2}|./g)?.length).toBeLessThanOrEqual(700);
    expect(parseAssistantChat(raw, 'u1', NOW)?.messages).toEqual([
      messages[0],
      messages[1],
      history[2],
      latest,
    ]);
    expect(old.cards).toHaveLength(1);
  });

  it('keeps the newest assistant cards longer than old message text', () => {
    const latest = {
      id: '4',
      role: 'assistant' as const,
      text: 'Lộ trình',
      cards: [{ id: 'new', detail: 'x'.repeat(150) }],
    };
    const history = [
      { ...messages[0]!, text: 'x'.repeat(3000) },
      messages[1]!,
      { ...messages[0]!, id: '3' },
      latest,
    ];
    const raw = serializeAssistantChat('u1', history, null, NOW, 700);
    expect(parseAssistantChat(raw, 'u1', NOW)?.messages).toEqual(history.slice(-2));
  });

  it('drops even the newest cards when needed to keep the newest full turn', () => {
    const latest = {
      id: '4',
      role: 'assistant' as const,
      text: 'Lộ trình',
      cards: [{ detail: 'x'.repeat(3000) }],
    };
    const raw = serializeAssistantChat('u1', [messages[0]!, latest], null, NOW, 400);
    expect(parseAssistantChat(raw, 'u1', NOW)?.messages).toEqual([
      messages[0],
      { id: '4', role: 'assistant', text: 'Lộ trình' },
    ]);
  });

  it('fits long Vietnamese conversations into SecureStore and keeps the newest full turn and trip', () => {
    const long = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      text: 'Đà Lạt 🧥 '.repeat(30),
    }));
    const trip = { v: 1, place: 'Đà Lạt' };
    const raw = serializeAssistantChat('u1', long, trip, NOW, 2048);
    expect(encodeURI(raw).match(/%[0-9A-F]{2}|./g)?.length).toBeLessThanOrEqual(2048);
    expect(parseAssistantChat(raw, 'u1', NOW)).toEqual({ messages: long.slice(-2), trip });
  });

  it('keeps recent messages when the trip alone exceeds SecureStore capacity', () => {
    const raw = serializeAssistantChat('u1', messages, { detail: 'Đà Lạt'.repeat(3000) }, NOW, 2048);
    expect(parseAssistantChat(raw, 'u1', NOW)).toEqual({ messages: messages.slice(0, 2), trip: null });
  });
});

describe('buildAssistantHistory', () => {
  it('sends the kind of Tripi answers and leaves out app notices', () => {
    expect(buildAssistantHistory(messages)).toEqual([
      { role: 'user', text: 'ks vung tau t7' },
      { role: 'assistant', text: 'Bạn trả phòng ngày nào?', kind: 'clarify' },
    ]);
  });

  it('displays a denied question but leaves it out of the next request and stored session', () => {
    const prior = messages.slice(0, 2);
    const denied: AssistantChatMessage = { id: '4', role: 'user', text: 'Câu hỏi vượt hạn mức' };
    const afterDenial = completeAssistantTurn([...prior, denied], messages[2]!);
    expect(afterDenial.map((message) => message.text)).toContain(denied.text);
    const accepted: AssistantChatMessage = { id: '5', role: 'user', text: 'Xem dự báo Đà Lạt' };
    const nextReply: AssistantChatMessage = { id: '6', role: 'assistant', text: 'Có mưa', kind: 'answer' };
    const settled = completeAssistantTurn([...afterDenial, accepted], nextReply);
    expect(buildAssistantHistory(settled)).toEqual(buildAssistantHistory([...prior, accepted, nextReply]));
    const raw = serializeAssistantChat('u1', settled, null, NOW);
    expect(parseAssistantChat(raw, 'u1', NOW)?.messages).toEqual([...prior, accepted, nextReply]);
  });
});

describe('takeQuestionToResend', () => {
  const asked = { id: '1', role: 'user' as const, text: 'Đi Đà Lạt' };
  const answered = { id: '2', role: 'assistant' as const, text: 'Lộ trình đây' };
  const refused = { id: '3', role: 'user' as const, text: 'Gợi ý chỗ ở', isLocal: true };
  const prompt = { id: '4', role: 'assistant' as const, text: 'Đăng nhập để chat tiếp', isLocal: true, action: 'login' };

  it('bỏ lời mời và câu bị từ chối, trả câu đó để gửi lại', () => {
    expect(takeQuestionToResend([asked, answered, refused, prompt])).toEqual({
      messages: [asked, answered],
      question: 'Gợi ý chỗ ở',
    });
  });

  it('chỉ có lời mời (không có câu bị từ chối): bỏ lời mời, không có gì để gửi', () => {
    expect(takeQuestionToResend([asked, answered, prompt])).toEqual({ messages: [asked, answered], question: '' });
  });

  it('cuối không phải lời mời đăng nhập thì không đổi', () => {
    expect(takeQuestionToResend([asked, answered])).toBeNull();
    expect(takeQuestionToResend([])).toBeNull();
    expect(takeQuestionToResend([asked, { ...answered, isLocal: true }])).toBeNull();
  });
});
