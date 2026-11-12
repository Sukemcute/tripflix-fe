import { vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '@/components/mobile-ui';

// Cảm xúc hay dùng khi bình luận du lịch; chạm là chèn vào cuối câu, không cần mở bàn phím emoji.
const QUICK_EMOJIS = ['😍', '😂', '🔥', '👏', '🥰', '😮', '🙌', '✈️'] as const;
const EMOJI_HIDE_DELAY_MS = 250;

export function ReelCommentComposer({
  value,
  label = vi.api.commentBody,
  placeholder = vi.mobile.reelComments.placeholder,
  onChange,
  onSend,
  isPending = false,
  focusRequest = 0,
  authorName,
}: {
  value: string;
  label?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isPending?: boolean;
  /** Tăng số này để mở bàn phím, ví dụ lúc bấm "Trả lời". */
  focusRequest?: number;
  authorName?: string;
}) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [isFocused, setFocused] = useState(false);
  // Chạm emoji làm ô nhập mất focus trước khi lần chạm tới nút; ẩn hàng emoji ngay thì emoji không bao giờ được chèn.
  // Đợi một nhịp: chạm emoji sẽ focus lại ô nhập và huỷ việc ẩn.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  // Vị trí con trỏ, để emoji chèn đúng chỗ đang gõ chứ không luôn dồn về cuối câu.
  const selection = useRef({ start: value.length, end: value.length });
  const insertEmoji = (emoji: string) => {
    const { start, end } = selection.current;
    const from = Math.min(start, value.length);
    const to = Math.min(end, value.length);
    onChange(`${value.slice(0, from)}${emoji}${value.slice(to)}`);
    selection.current = { start: from + emoji.length, end: from + emoji.length };
    // Chỉ chèn vào ô nhập, không gửi; giữ bàn phím để gõ tiếp.
    input.current?.focus();
  };
  useEffect(() => {
    if (focusRequest > 0) input.current?.focus();
  }, [focusRequest]);
  const isDisabled = isPending || !value.trim();
  return (
    <View>
      {isFocused && (
        <View style={styles.emojis}>
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={emoji}
              onPress={() => insertEmoji(emoji)}
              // Giữ focus ở ô nhập ngay lúc chạm, để bàn phím không đóng rồi mở lại.
              onPressIn={() => clearTimeout(hideTimer.current)}
              style={({ pressed }) => [styles.emoji, pressed && styles.emojiPressed]}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.row}>
        {!!authorName && (
          <View style={styles.avatar} accessible={false}>
            <Text style={styles.initial}>{Array.from(authorName.trim())[0]?.toLocaleUpperCase('vi-VN')}</Text>
          </View>
        )}
        <TextInput
          ref={input}
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChange}
          onFocus={() => {
            clearTimeout(hideTimer.current);
            setFocused(true);
          }}
          onBlur={() => {
            clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setFocused(false), EMOJI_HIDE_DELAY_MS);
          }}
          onSelectionChange={(event) => {
            selection.current = event.nativeEvent.selection;
          }}
          multiline
          maxLength={10000}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={vi.api.send}
          accessibilityState={{ disabled: isDisabled }}
          disabled={isDisabled}
          onPress={onSend}
          style={[styles.send, { backgroundColor: isDisabled ? colors.surfaceMuted : colors.coral }]}
        >
          <Icon name="arrow-up" size={17} color={isDisabled ? colors.textSubtle : colors.background} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emojis: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs },
  emoji: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  emojiPressed: { backgroundColor: colors.surfaceMuted, transform: [{ scale: 0.9 }] },
  emojiText: { fontSize: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingTop: spacing.xs },
  avatar: {
    width: 30,
    height: 30,
    marginBottom: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.seaMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 11, fontFamily: nativeFonts.semibold, color: colors.tealInk },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    color: colors.ink,
    fontFamily: nativeFonts.regular,
    fontSize: 13,
    lineHeight: 17,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  send: { width: 44, height: 44, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
});
