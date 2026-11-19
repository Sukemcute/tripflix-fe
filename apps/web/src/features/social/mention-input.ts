/**
 * Quản lý logic tag người dùng (@mention) trong bình luận (TF25).
 * Các hàm thuần: phát hiện @query ở con trỏ, chèn tag, cập nhật/loại bỏ offset khi sửa văn bản.
 */

export interface CommentMention {
  userId: string;
  offset: number;
  length: number;
}

export interface MentionQuery {
  query: string;
  atIndex: number;
}

export interface CommentSegment {
  type: 'text' | 'mention';
  text: string;
  userId?: string;
}

/** Tối đa 10 tag cho mỗi bình luận (theo domain Comment BE). */
export const MAX_COMMENT_MENTIONS = 10;

/** Độ dài tối đa của cụm từ khoá tìm kiếm sau ký tự @. */
export const MAX_MENTION_QUERY_LENGTH = 50;

/**
 * Phát hiện `@query` đang gõ ở vị trí con trỏ.
 * Ký tự `@` hợp lệ phải ở đầu chuỗi hoặc đứng sau khoảng trắng (không bắt `@` trong email).
 * Trả về null nếu con trỏ nằm trong tag đã chèn hoặc query chứa ký tự xuống dòng / không hợp lệ.
 */
export function getMentionQueryAtCursor(
  text: string,
  cursorPos: number,
  existingMentions: readonly CommentMention[] = [],
): MentionQuery | null {
  if (cursorPos <= 0 || cursorPos > text.length) return null;

  // Nếu con trỏ đang nằm bên trong một tag đã tồn tại thì không mở gợi ý tag mới.
  const isInsideExisting = existingMentions.some(
    (m) => cursorPos > m.offset && cursorPos < m.offset + m.length,
  );
  if (isInsideExisting) return null;

  // Quét ngược từ vị trí con trỏ tìm ký tự '@' gần nhất
  let atIndex = -1;
  for (let i = cursorPos - 1; i >= 0; i--) {
    const ch = text[i];
    // Ngắt nếu gặp ký tự xuống dòng hoặc khoảng cách quá 50 ký tự
    if (ch === '\n' || ch === '\r') break;
    if (cursorPos - 1 - i > MAX_MENTION_QUERY_LENGTH) break;
    if (ch === '@') {
      atIndex = i;
      break;
    }
  }

  if (atIndex === -1) return null;

  // Ký tự trước '@' phải là khoảng trắng hoặc đầu chuỗi (tránh trigger trong user@example.com)
  const prevChar = text[atIndex - 1];
  if (atIndex > 0 && (!prevChar || !/\s/.test(prevChar))) {
    return null;
  }

  // Nếu '@' này trùng đúng vị trí bắt đầu của một tag đã có, không trigger
  if (existingMentions.some((m) => m.offset === atIndex)) {
    return null;
  }

  const query = text.slice(atIndex + 1, cursorPos);

  // Không cho phép query bắt đầu bằng khoảng trắng ngay sau @ (ví dụ: "@ abc")
  if (query.startsWith(' ')) return null;

  // Kiểm tra không chứa ký tự điều khiển
  if (/[\p{C}]/u.test(query)) return null;

  return { query, atIndex };
}

/** Kiểm tra vị trí chỉ số UTF-16 có cắt đôi cặp surrogate (emoji/ký tự bổ sung) hay không. */
function splitsSurrogatePair(text: string, index: number): boolean {
  if (index <= 0 || index >= text.length) return false;
  const prev = text.charCodeAt(index - 1);
  const next = text.charCodeAt(index);
  return prev >= 0xd800 && prev <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
}

/**
 * Sắp xếp, kiểm tra tính hợp lệ theo UTF-16 code units và loại bỏ các mention bị chồng lấn / quá 10.
 */
export function validateMentions(
  text: string,
  mentions: readonly CommentMention[],
): CommentMention[] {
  if (!mentions.length) return [];

  // Lọc các mention có toạ độ nguyên UTF-16 hợp lệ, bắt đầu bằng '@' và không cắt đôi surrogate pair
  const valid = mentions.filter(
    (m) =>
      typeof m.userId === 'string' &&
      m.userId.trim().length > 0 &&
      Number.isInteger(m.offset) &&
      Number.isInteger(m.length) &&
      m.offset >= 0 &&
      m.length > 1 &&
      m.offset + m.length <= text.length &&
      text[m.offset] === '@' &&
      !splitsSurrogatePair(text, m.offset + m.length),
  );

  // Sắp xếp theo offset tăng dần
  const sorted = [...valid].sort((a, b) => a.offset - b.offset);

  // Bỏ các mention trùng hoặc chồng lấn
  const result: CommentMention[] = [];
  let lastEnd = 0;
  for (const m of sorted) {
    if (m.offset >= lastEnd) {
      result.push(m);
      lastEnd = m.offset + m.length;
    }
  }

  return result.slice(0, MAX_COMMENT_MENTIONS);
}

/**
 * Chuẩn hoá body (trim khoảng trắng đầu/cuối) đồng thời dịch offset của các tag theo phần đầu bị bỏ
 * để offset/length UTF-16 khớp chính xác với nội dung gửi lên BE.
 */
export function prepareCommentSubmission(
  body: string,
  mentions: readonly CommentMention[] = [],
): { body: string; mentions: CommentMention[] } {
  const trimmedStart = body.trimStart();
  const leadingTrim = body.length - trimmedStart.length;
  const trimmedBody = trimmedStart.trimEnd();

  if (!mentions.length) {
    return { body: trimmedBody, mentions: [] };
  }

  const shifted = mentions.map((m) => ({
    ...m,
    offset: m.offset - leadingTrim,
  }));

  return {
    body: trimmedBody,
    mentions: validateMentions(trimmedBody, shifted),
  };
}

/**
 * Chèn một tag người dùng vào vị trí con trỏ (thay thế phần `@query` đang gõ).
 * Thêm khoảng trắng sau tên để người dùng gõ tiếp tự nhiên.
 * Cập nhật offset của các mention phía sau.
 */
export function insertMentionTag(
  text: string,
  cursorPos: number,
  user: { id: string; displayName: string },
  existingMentions: readonly CommentMention[] = [],
): { newText: string; newCursor: number; newMentions: CommentMention[] } {
  const active = getMentionQueryAtCursor(text, cursorPos, existingMentions);
  const atIndex = active ? active.atIndex : cursorPos;

  // Tìm vị trí kết thúc của từ đang gõ dở nếu con trỏ ở giữa từ
  let replaceEnd = cursorPos;
  while (replaceEnd < text.length) {
    const charAtEnd = text[replaceEnd];
    if (!charAtEnd || /\s/.test(charAtEnd)) break;
    if (existingMentions.some((m) => m.offset === replaceEnd)) break;
    replaceEnd++;
  }

  const tag = `@${user.displayName}`;
  const inserted = `${tag} `;
  const textBefore = text.slice(0, atIndex);
  const textAfter = text.slice(replaceEnd);
  const newText = textBefore + inserted + textAfter;
  const newCursor = atIndex + inserted.length;

  const newMention: CommentMention = {
    userId: user.id,
    offset: atIndex,
    length: tag.length,
  };

  const delta = inserted.length - (replaceEnd - atIndex);
  const updated: CommentMention[] = [];

  for (const m of existingMentions) {
    // Mention nằm hoàn toàn trước tag mới chèn
    if (m.offset + m.length <= atIndex) {
      updated.push(m);
    }
    // Mention nằm sau vùng bị thay thế -> dịch offset theo delta
    else if (m.offset >= replaceEnd) {
      updated.push({
        ...m,
        offset: m.offset + delta,
      });
    }
    // Mention chồng lấn với vùng bị thay thế -> loại bỏ
  }

  updated.push(newMention);

  return {
    newText,
    newCursor,
    newMentions: validateMentions(newText, updated),
  };
}

/**
 * Cập nhật danh sách mention khi người dùng sửa văn bản:
 * - Sửa trước tag: dịch chuyển offset của tag theo độ lệch (delta).
 * - Sửa sau tag: giữ nguyên offset của tag.
 * - Sửa vào trong tag hoặc xoá tag: loại bỏ tag đó khỏi danh sách.
 */
export function updateMentionsOnTextChange(
  prevText: string,
  nextText: string,
  mentions: readonly CommentMention[],
  editCursor?: number,
): CommentMention[] {
  if (!mentions.length) return [];
  if (prevText === nextText) return validateMentions(nextText, mentions);
  if (!nextText.length) return [];

  // Tìm phạm vi thay đổi giữa prevText và nextText
  let prefix = 0;
  while (
    prefix < prevText.length &&
    prefix < nextText.length &&
    prevText[prefix] === nextText[prefix]
  ) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < prevText.length - prefix &&
    suffix < nextText.length - prefix &&
    prevText[prevText.length - 1 - suffix] === nextText[nextText.length - 1 - suffix]
  ) {
    suffix++;
  }

  let editStart = prefix;
  let editEnd = prevText.length - suffix;
  const delta = nextText.length - prevText.length;

  // Tinh chỉnh bằng editCursor (vị trí con trỏ sau khi sửa) nếu hợp lệ
  if (typeof editCursor === 'number' && editCursor >= 0 && editCursor <= nextText.length) {
    if (delta > 0) {
      // Chèn ký tự: vị trí chèn kết thúc ở editCursor
      const insertStart = editCursor - delta;
      if (insertStart >= prefix && insertStart <= prevText.length - suffix) {
        editStart = insertStart;
        editEnd = insertStart;
      }
    } else if (delta < 0) {
      // Xoá ký tự: vị trí xoá bắt đầu ở editCursor
      const deleteCount = -delta;
      if (editCursor >= prefix && editCursor <= prevText.length - suffix - deleteCount) {
        editStart = editCursor;
        editEnd = editCursor + deleteCount;
      }
    }
  }

  const surviving: CommentMention[] = [];

  for (const m of mentions) {
    let newOffset = m.offset;

    // Sửa chữ xảy ra hoàn toàn trước tag -> dịch chuyển offset
    if (editEnd <= m.offset) {
      newOffset = m.offset + delta;
    }
    // Sửa chữ xảy ra hoàn toàn sau tag -> giữ nguyên offset
    else if (editStart >= m.offset + m.length) {
      newOffset = m.offset;
    }
    // Sửa chữ đụng vào bên trong tag -> loại bỏ tag
    else {
      continue;
    }

    // Kiểm tra toạ độ mới còn nằm trong phạm vi xâu mới
    if (newOffset < 0 || newOffset + m.length > nextText.length) continue;

    // Phải vẫn bắt đầu bằng '@'
    if (nextText[newOffset] !== '@') continue;

    // Nội dung tag trong văn bản mới phải trùng khớp tuyệt đối với tag cũ
    const prevTag = prevText.slice(m.offset, m.offset + m.length);
    const nextTag = nextText.slice(newOffset, newOffset + m.length);
    if (prevTag !== nextTag) continue;

    surviving.push({
      userId: m.userId,
      offset: newOffset,
      length: m.length,
    });
  }

  return validateMentions(nextText, surviving);
}

/**
 * Tách nội dung bình luận thành các đoạn text và mention để hiển thị.
 * Dữ liệu cũ không có mentions hoặc mentions rỗng vẫn hiển thị thành 1 đoạn text bình thường.
 */
export function parseCommentSegments(
  body: string,
  mentions?: readonly CommentMention[] | null,
): CommentSegment[] {
  if (!body) return [];
  if (!mentions || !mentions.length) {
    return [{ type: 'text', text: body }];
  }

  const valid = validateMentions(body, mentions);
  if (!valid.length) {
    return [{ type: 'text', text: body }];
  }

  const segments: CommentSegment[] = [];
  let cursor = 0;

  for (const m of valid) {
    if (m.offset > cursor) {
      segments.push({
        type: 'text',
        text: body.slice(cursor, m.offset),
      });
    }

    segments.push({
      type: 'mention',
      text: body.slice(m.offset, m.offset + m.length),
      userId: m.userId,
    });

    cursor = m.offset + m.length;
  }

  if (cursor < body.length) {
    segments.push({
      type: 'text',
      text: body.slice(cursor),
    });
  }

  return segments;
}
