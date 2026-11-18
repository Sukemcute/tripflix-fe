import { describe, expect, it } from 'vitest';
import { chatQuestion, describeEvent, kindLabel, userActivityRange } from './user-activity-format';

describe('userActivityRange', () => {
  it('tính ngày theo giờ Việt Nam, gồm cả hôm nay', () => {
    // 18:30 UTC ngày 16 là 01:30 ngày 17 ở Việt Nam.
    const now = Date.parse('2026-11-16T18:30:00Z');
    expect(userActivityRange(1, now)).toEqual({ from: '2026-11-17', to: '2026-11-17' });
    expect(userActivityRange(7, now)).toEqual({ from: '2026-11-11', to: '2026-11-17' });
    expect(userActivityRange(90, now)).toEqual({ from: '2026-08-20', to: '2026-11-17' });
  });
});

describe('mô tả hoạt động', () => {
  it('đổi loại sang tiếng Việt, loại lạ giữ nguyên', () => {
    expect(kindLabel('chat')).toBe('Chat Tripi');
    expect(kindLabel('bookmark')).toBe('bookmark');
  });

  it('lượt chat hiện câu hỏi, kèm ghi chú khi Tripi lỗi hoặc người dùng bấm nút', () => {
    const chat = (detail: Record<string, unknown>) => ({ kind: 'chat', detail: { question: 'tour Huế 2 ngày', ...detail } });
    expect(chatQuestion(chat({}))).toBe('tour Huế 2 ngày');
    expect(describeEvent(chat({ answerKind: 'answer', isAction: false }))).toBe('tour Huế 2 ngày');
    expect(describeEvent(chat({ answerKind: 'error' }))).toBe('tour Huế 2 ngày · Tripi trả lời lỗi');
    expect(describeEvent(chat({ isAction: true }))).toBe('tour Huế 2 ngày · Bấm nút trên thẻ');
  });

  it('lượt xem hiện số giây, lượt thích hiện cảm xúc bằng tiếng Việt', () => {
    expect(describeEvent({ kind: 'view', detail: { watchedMs: 15_400 } })).toBe('15 giây');
    expect(describeEvent({ kind: 'reaction', detail: { reaction: 'love' } })).toBe('Yêu thích');
    expect(describeEvent({ kind: 'comment', detail: {} })).toBe('');
  });

  it('không phải lượt chat thì không có câu hỏi', () => {
    expect(chatQuestion({ kind: 'view', detail: { question: 'x' } })).toBeNull();
  });
});
