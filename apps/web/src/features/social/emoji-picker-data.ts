/** Emoji hay dùng khi bình luận du lịch: mặt cười, cảm xúc, cử chỉ, rồi vài biểu tượng du lịch. */
export const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
  '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😌',
  '😔', '😪', '😴', '😷', '🥵', '🥶', '😵', '🤯',
  '🥳', '😎', '🤓', '😕', '😟', '🙁', '😮', '😯',
  '😲', '😳', '🥺', '😢', '😭', '😱', '😤', '😡',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '👌', '✌️',
  '🔥', '✨', '🎉', '⭐', '🌅', '🏖️', '⛰️', '🏝️',
  '✈️', '🧳', '📸', '🍜', '☕', '🍹', '🌸', '🌊',
] as const;

/** Số emoji tối đa trong hàng "Dùng gần đây". */
export const RECENT_EMOJI_LIMIT = 8;

/** Đưa emoji vừa chọn lên đầu danh sách gần đây, bỏ bản trùng và cắt theo giới hạn. */
export function pushRecentEmoji(
  recent: readonly string[],
  emoji: string,
  limit: number = RECENT_EMOJI_LIMIT,
): string[] {
  return [emoji, ...recent.filter((item) => item !== emoji)].slice(0, limit);
}

/** Chèn chữ vào đúng chỗ con trỏ (thay phần đang bôi đen nếu có) và trả vị trí con trỏ mới. */
export function insertAtSelection(
  value: string,
  selectionStart: number | null,
  selectionEnd: number | null,
  text: string,
): { value: string; caret: number } {
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? start;
  return { value: value.slice(0, start) + text + value.slice(end), caret: start + text.length };
}
