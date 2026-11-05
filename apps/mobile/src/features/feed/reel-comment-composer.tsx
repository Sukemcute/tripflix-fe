import { vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/mobile-ui';

export function ReelCommentComposer({
  value,
  label = vi.api.commentBody,
  onChange,
  onSend,
  isPending = false,
}: {
  value: string;
  label?: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isPending?: boolean;
}) {
  const isDisabled = isPending || !value.trim();
  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel={label}
        placeholder={vi.mobile.reelComments.placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChange}
        multiline
        maxLength={2000}
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
        <Icon name="arrow-up" size={22} color={isDisabled ? colors.textSubtle : colors.background} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingTop: spacing.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    color: colors.ink,
    fontFamily: nativeFonts.regular,
    fontSize: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  send: { width: 44, height: 44, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
});
