import { describe, expect, it } from 'vitest';
import { COMMON_EMOJIS, insertAtSelection, pushRecentEmoji } from './emoji-picker-data';

describe('pushRecentEmoji', () => {
  it('đưa emoji vừa dùng lên đầu và bỏ bản trùng', () => {
    expect(pushRecentEmoji(['😀', '🔥', '😂'], '😂')).toEqual(['😂', '😀', '🔥']);
  });

  it('không vượt quá giới hạn', () => {
    expect(pushRecentEmoji(['1', '2', '3'], '4', 3)).toEqual(['4', '1', '2']);
  });
});

describe('insertAtSelection', () => {
  it('chèn vào giữa chữ tại vị trí con trỏ', () => {
    expect(insertAtSelection('Đẹp quá', 3, 3, '😍')).toEqual({ value: 'Đẹp😍 quá', caret: 5 });
  });

  it('thay phần đang bôi đen', () => {
    expect(insertAtSelection('Đẹp quá', 4, 7, '🔥')).toEqual({ value: 'Đẹp 🔥', caret: 6 });
  });

  it('không có vị trí con trỏ thì chèn vào cuối', () => {
    expect(insertAtSelection('Hay', null, null, '👍')).toEqual({ value: 'Hay👍', caret: 5 });
  });
});

describe('COMMON_EMOJIS', () => {
  it('không có emoji trùng', () => {
    expect(new Set(COMMON_EMOJIS).size).toBe(COMMON_EMOJIS.length);
  });
});
