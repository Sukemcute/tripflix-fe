import { describe, expect, it } from 'vitest';
import {
  getMentionQueryAtCursor,
  insertMentionTag,
  parseCommentSegments,
  prepareCommentSubmission,
  updateMentionsOnTextChange,
  validateMentions,
  type CommentMention,
} from './mention-input';

describe('mention-input', () => {
  describe('getMentionQueryAtCursor', () => {
    it('phát hiện @ ở đầu chuỗi', () => {
      const res = getMentionQueryAtCursor('@', 1);
      expect(res).toEqual({ query: '', atIndex: 0 });
    });

    it('phát hiện query sau @ ở đầu chuỗi', () => {
      const res = getMentionQueryAtCursor('@nam', 4);
      expect(res).toEqual({ query: 'nam', atIndex: 0 });
    });

    it('phát hiện query khi con trỏ ở giữa chuỗi sau khoảng trắng', () => {
      const text = 'Xin chào @Thành ơi';
      // Con trỏ đặt ngay sau chữ 'Thành' (index 15)
      const res = getMentionQueryAtCursor(text, 15);
      expect(res).toEqual({ query: 'Thành', atIndex: 9 });
    });

    it('không bắt @ trong địa chỉ email', () => {
      const text = 'contact@tripflix.com';
      const res = getMentionQueryAtCursor(text, 15);
      expect(res).toBeNull();
    });

    it('không kích hoạt khi sau @ là khoảng trắng', () => {
      const text = 'Chào @ bạn';
      const res = getMentionQueryAtCursor(text, 8);
      expect(res).toBeNull();
    });

    it('không kích hoạt khi con trỏ nằm trong tag đã tồn tại', () => {
      const text = 'Chào @Tuấn Anh bạn nhé';
      const mentions: CommentMention[] = [{ userId: 'u1', offset: 5, length: 9 }];
      // Con trỏ ở vị trí 8 (giữa "@Tuấn Anh")
      const res = getMentionQueryAtCursor(text, 8, mentions);
      expect(res).toBeNull();
    });

    it('bỏ qua nếu query vượt quá độ dài tối đa', () => {
      const text = '@' + 'a'.repeat(55);
      const res = getMentionQueryAtCursor(text, text.length);
      expect(res).toBeNull();
    });

    it('không bắt query nếu có ký tự xuống dòng giữa @ và con trỏ', () => {
      const text = 'Chào @\nnam';
      const res = getMentionQueryAtCursor(text, text.length);
      expect(res).toBeNull();
    });
  });

  describe('insertMentionTag', () => {
    it('chèn tag vào đầu chuỗi', () => {
      const text = '@';
      const result = insertMentionTag(text, 1, { id: 'u1', displayName: 'Huy Thành' });
      expect(result.newText).toBe('@Huy Thành ');
      expect(result.newCursor).toBe(11);
      expect(result.newMentions).toEqual([
        { userId: 'u1', offset: 0, length: 10 },
      ]);
    });

    it('thay thế từ khoá đang gõ và giữ lại phần văn bản phía sau', () => {
      const text = 'Gặp @tha vào chiều nay';
      const result = insertMentionTag(text, 8, { id: 'u2', displayName: 'Thành' });
      expect(result.newText).toBe('Gặp @Thành  vào chiều nay');
      expect(result.newMentions).toEqual([
        { userId: 'u2', offset: 4, length: 6 },
      ]);
    });

    it('cập nhật offset của các mention phía sau', () => {
      const text = 'Chào @a và @Bob nhé';
      const existingMentions: CommentMention[] = [{ userId: 'u_bob', offset: 11, length: 4 }];
      const result = insertMentionTag(
        text,
        7,
        { id: 'u_alice', displayName: 'Alice' },
        existingMentions,
      );
      // "@a" (length 2) thay bằng "@Alice " (length 7) -> delta = +5
      expect(result.newText).toBe('Chào @Alice  và @Bob nhé');
      expect(result.newMentions).toEqual([
        { userId: 'u_alice', offset: 5, length: 6 },
        { userId: 'u_bob', offset: 16, length: 4 },
      ]);
    });
  });

  describe('updateMentionsOnTextChange', () => {
    it('trả về mảng rỗng nếu không có mention nào', () => {
      expect(updateMentionsOnTextChange('abc', 'abcd', [])).toEqual([]);
    });

    it('giữ nguyên mention nếu thêm chữ ở phía sau tag', () => {
      const prev = '@Thành';
      const next = '@Thành ơi';
      const mentions: CommentMention[] = [{ userId: 'u1', offset: 0, length: 6 }];
      const updated = updateMentionsOnTextChange(prev, next, mentions);
      expect(updated).toEqual([{ userId: 'u1', offset: 0, length: 6 }]);
    });

    it('dịch chuyển offset khi chèn thêm chữ ở phía trước tag', () => {
      const prev = 'Chào @Thành';
      const next = 'Xin Chào @Thành'; // thêm "Xin " (4 ký tự) ở đầu
      const mentions: CommentMention[] = [{ userId: 'u1', offset: 5, length: 6 }];
      const updated = updateMentionsOnTextChange(prev, next, mentions);
      expect(updated).toEqual([{ userId: 'u1', offset: 9, length: 6 }]);
    });

    it('dịch chuyển offset khi xoá chữ ở phía trước tag', () => {
      const prev = 'Xin Chào @Thành';
      const next = 'Chào @Thành'; // xoá "Xin " (4 ký tự)
      const mentions: CommentMention[] = [{ userId: 'u1', offset: 9, length: 6 }];
      const updated = updateMentionsOnTextChange(prev, next, mentions);
      expect(updated).toEqual([{ userId: 'u1', offset: 5, length: 6 }]);
    });

    it('loại bỏ mention nếu người dùng xoá ký tự @ của tag', () => {
      const prev = '@Thành chào bạn';
      const next = 'Thành chào bạn'; // xoá ký tự @
      const mentions: CommentMention[] = [{ userId: 'u1', offset: 0, length: 6 }];
      const updated = updateMentionsOnTextChange(prev, next, mentions);
      expect(updated).toEqual([]);
    });

    it('loại bỏ mention nếu người dùng sửa chữ bên trong tag', () => {
      const prev = 'Chào @Thành nhé';
      const next = 'Chào @Thànx nhé'; // sửa ký tự 'h' thành 'x'
      const mentions: CommentMention[] = [{ userId: 'u1', offset: 5, length: 6 }];
      const updated = updateMentionsOnTextChange(prev, next, mentions);
      expect(updated).toEqual([]);
    });

    it('loại bỏ mention nếu xoá toàn bộ chuỗi', () => {
      const prev = 'Chào @Thành';
      const next = '';
      const mentions: CommentMention[] = [{ userId: 'u1', offset: 5, length: 6 }];
      expect(updateMentionsOnTextChange(prev, next, mentions)).toEqual([]);
    });

    it('xử lý nhiều mention: sửa giữa chừng chỉ ảnh hưởng mention phía sau', () => {
      const prev = '@User1 chào @User2';
      const next = '@User1 rất chào @User2'; // thêm "rất " (4 ký tự) vào giữa
      const mentions: CommentMention[] = [
        { userId: 'u1', offset: 0, length: 6 },
        { userId: 'u2', offset: 12, length: 6 },
      ];
      const updated = updateMentionsOnTextChange(prev, next, mentions);
      expect(updated).toEqual([
        { userId: 'u1', offset: 0, length: 6 },
        { userId: 'u2', offset: 16, length: 6 },
      ]);
    });
  });

  describe('validateMentions', () => {
    it('loại bỏ mention có toạ độ vượt quá độ dài chuỗi hoặc không bắt đầu bằng @', () => {
      const text = 'Chào @Thành';
      const invalidMentions: CommentMention[] = [
        { userId: 'u1', offset: 0, length: 4 }, // text[0] là 'C', không phải '@'
        { userId: 'u2', offset: 20, length: 5 }, // vượt quá độ dài
        { userId: 'u3', offset: 5, length: 6 }, // hợp lệ: "@Thành"
      ];
      expect(validateMentions(text, invalidMentions)).toEqual([
        { userId: 'u3', offset: 5, length: 6 },
      ]);
    });

    it('loại bỏ các mention trùng hoặc chồng lấn nhau', () => {
      const text = '@Nguyen @Van';
      const mentions: CommentMention[] = [
        { userId: 'u1', offset: 0, length: 7 }, // "@Nguyen" (0..7)
        { userId: 'u2', offset: 2, length: 4 }, // chồng lấn bên trong
        { userId: 'u3', offset: 8, length: 4 }, // "@Van" (8..12)
      ];
      expect(validateMentions(text, mentions)).toEqual([
        { userId: 'u1', offset: 0, length: 7 },
        { userId: 'u3', offset: 8, length: 4 },
      ]);
    });

    it('giới hạn tối đa 10 mentions', () => {
      let text = '';
      const mentions: CommentMention[] = [];
      for (let i = 0; i < 15; i++) {
        const offset = text.length;
        const tag = `@u${i} `;
        text += tag;
        mentions.push({ userId: `u${i}`, offset, length: tag.length - 1 });
      }
      expect(validateMentions(text, mentions)).toHaveLength(10);
    });
  });

  describe('parseCommentSegments', () => {
    it('trả về 1 đoạn text nếu mentions rỗng hoặc undefined (dữ liệu cũ)', () => {
      expect(parseCommentSegments('Bình luận cũ')).toEqual([
        { type: 'text', text: 'Bình luận cũ' },
      ]);
      expect(parseCommentSegments('Bình luận cũ', [])).toEqual([
        { type: 'text', text: 'Bình luận cũ' },
      ]);
    });

    it('tách đúng các đoạn text và mention', () => {
      const body = 'Xin chào @Thành và @Huy nhé!';
      const mentions: CommentMention[] = [
        { userId: 'u1', offset: 9, length: 6 }, // "@Thành"
        { userId: 'u2', offset: 19, length: 4 }, // "@Huy"
      ];
      const segments = parseCommentSegments(body, mentions);
      expect(segments).toEqual([
        { type: 'text', text: 'Xin chào ' },
        { type: 'mention', text: '@Thành', userId: 'u1' },
        { type: 'text', text: ' và ' },
        { type: 'mention', text: '@Huy', userId: 'u2' },
        { type: 'text', text: ' nhé!' },
      ]);
    });

    it('hoạt động chuẩn khi mention ở đầu hoặc cuối chuỗi', () => {
      const body = '@Thành';
      const mentions: CommentMention[] = [{ userId: 'u1', offset: 0, length: 6 }];
      expect(parseCommentSegments(body, mentions)).toEqual([
        { type: 'mention', text: '@Thành', userId: 'u1' },
      ]);
    });

    it('dùng cho mirror: giữ nguyên từng ký tự (khoảng trắng liên tiếp, xuống dòng cuối, emoji UTF-16)', () => {
      const body = '  😀 @Huy Thành\n  nhắn   @Tuấn Anh\n';
      const mentions: CommentMention[] = [
        { userId: 'u1', offset: 5, length: 10 },
        { userId: 'u2', offset: 25, length: 9 },
      ];
      const segments = parseCommentSegments(body, mentions);
      expect(segments).toEqual([
        { type: 'text', text: '  😀 ' },
        { type: 'mention', text: '@Huy Thành', userId: 'u1' },
        { type: 'text', text: '\n  nhắn   ' },
        { type: 'mention', text: '@Tuấn Anh', userId: 'u2' },
        { type: 'text', text: '\n' },
      ]);
      expect(segments.map((s) => s.text).join('')).toBe(body);
    });
  });

  describe('UTF-16 và prepareCommentSubmission', () => {
    it('tính offset/length chuẩn UTF-16 code units khi có emoji trước tag', () => {
      // '😀 ' dài 3 UTF-16 code units (emoji = 2 + space = 1) -> '@' ở index 3, cursor sau '@' là 4
      const text = '😀 @';
      const inserted = insertMentionTag(text, 4, { id: 'u1', displayName: 'Nguyễn An' });
      expect(inserted.newText).toBe('😀 @Nguyễn An ');
      expect(inserted.newMentions).toEqual([{ userId: 'u1', offset: 3, length: 10 }]);
      expect(inserted.newText.slice(3, 13)).toBe('@Nguyễn An');

      // Chèn thêm emoji '🎉' (+2 UTF-16 code units) vào trước tag
      const edited = '🎉' + inserted.newText;
      const updated = updateMentionsOnTextChange(inserted.newText, edited, inserted.newMentions, 2);
      expect(updated).toEqual([{ userId: 'u1', offset: 5, length: 10 }]);
      expect(edited.slice(5, 15)).toBe('@Nguyễn An');
    });

    it('loại bỏ mention có độ dài cắt đôi cặp surrogate (UTF-16)', () => {
      const text = 'Chào @An😀';
      // '@An' dài 3, '😀' nằm tại index 8..10 -> length 4 cắt đôi surrogate tại index 9
      const mentions: CommentMention[] = [{ userId: 'u1', offset: 5, length: 4 }];
      expect(validateMentions(text, mentions)).toEqual([]);
      expect(validateMentions(text, [{ userId: 'u1', offset: 5, length: 5 }])).toEqual([
        { userId: 'u1', offset: 5, length: 5 },
      ]);
    });

    it('prepareCommentSubmission trim khoảng trắng đầu/cuối và dịch offset tương ứng', () => {
      const rawBody = '  Chào @Nguyễn An nhé  ';
      const rawMentions: CommentMention[] = [{ userId: 'u1', offset: 7, length: 10 }];
      const prepared = prepareCommentSubmission(rawBody, rawMentions);
      expect(prepared).toEqual({
        body: 'Chào @Nguyễn An nhé',
        mentions: [{ userId: 'u1', offset: 5, length: 10 }],
      });
      expect(prepared.body.slice(5, 15)).toBe('@Nguyễn An');
    });
  });
});
