import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import { Txt } from '@/components/mobile-ui';

export function ReplyQuote({
  replyToCommentId,
  replyToName,
  replyToExcerpt,
  onJump,
}: {
  replyToCommentId: string;
  replyToName?: string | null;
  replyToExcerpt: string | null;
  onJump: (id: string) => void;
}) {
  const available = typeof replyToExcerpt === 'string' && replyToExcerpt.length > 0;
  const content = (
    <>
      <Txt variant="caption" numberOfLines={1} style={styles.title}>
        {t('api.commentReplyQuoteTitle', { name: replyToName?.trim() || vi.api.commentMember })}
      </Txt>
      <Txt variant="caption" numberOfLines={1} ellipsizeMode="tail"
        style={[styles.excerpt, !available && styles.unavailable]}>
        {available ? replyToExcerpt : vi.api.commentQuoteUnavailable}
      </Txt>
    </>
  );
  return available ? (
    <Pressable accessibilityRole="button" onPress={() => onJump(replyToCommentId)} style={styles.card}>
      {content}
    </Pressable>
  ) : <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
  },
  title: { color: colors.textMuted, fontFamily: nativeFonts.semibold },
  excerpt: { color: colors.textMuted },
  unavailable: { fontStyle: 'italic' },
});
