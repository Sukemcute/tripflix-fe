import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { socialApi, updateCommentLikeCache, useApiSession } from '@tripflix/api-client';
import { t } from '@tripflix/i18n';
import { colors, mobileLayout, spacing } from '@tripflix/tokens';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Icon, Txt } from '@/components/mobile-ui';
import { HEART_POP_SETTLE, HEART_POP_UP } from '@/components/motion';

const HEART_POP_SCALE = 1.3;
const countFormat = new Intl.NumberFormat('vi-VN');

export function CommentLikeButton({
  commentId,
  isLiked,
  likeCount,
  authorName,
  queryKey,
  compact,
  onLoginRequired,
}: {
  commentId: string;
  isLiked: boolean;
  likeCount: number;
  authorName: string;
  queryKey: QueryKey;
  compact: boolean;
  onLoginRequired: () => void;
}) {
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const scale = useSharedValue(1);
  const mutation = useMutation({
    // Requests for one comment run in order, so quick taps cannot finish on the wrong state.
    scope: { id: `comment-like-${commentId}` },
    mutationFn: (nextIsLiked: boolean) => socialApi.setCommentReaction(commentId, nextIsLiked),
    onMutate: async (nextIsLiked) => {
      await client.cancelQueries({ queryKey, exact: true });
      return updateCommentLikeCache(client, queryKey, commentId, nextIsLiked);
    },
    onError: (_error, _nextIsLiked, rollback) => rollback?.(),
  });
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const toggle = () => {
    if (!isReady) return;
    if (!user) {
      onLoginRequired();
      return;
    }
    if (!isLiked) {
      scale.set(withSequence(withTiming(HEART_POP_SCALE, HEART_POP_UP), withSpring(1, HEART_POP_SETTLE)));
    }
    mutation.mutate(!isLiked);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(isLiked ? 'mobile.reelComments.unlike' : 'mobile.reelComments.like', {
        name: authorName,
      })}
      accessibilityState={{ selected: isLiked }}
      onPress={toggle}
      style={({ pressed }) => [styles.inline, compact && styles.compact, pressed && styles.pressed]}
    >
      <Animated.View style={heartStyle}>
        <Icon
          name={isLiked ? 'heart' : 'heart-outline'}
          size={compact ? 15 : 20}
          color={isLiked ? colors.coral : colors.textMuted}
        />
      </Animated.View>
      {likeCount > 0 && (
        <Txt variant="caption" style={[isLiked ? styles.countLiked : styles.count, compact && styles.compactCount]}>
          {countFormat.format(likeCount)}
        </Txt>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inline: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: mobileLayout.touchTarget,
    minHeight: mobileLayout.touchTarget,
  },
  compact: {
    alignSelf: 'center',
    justifyContent: 'flex-end',
    minHeight: 26,
    marginLeft: 'auto',
  },
  compactCount: { fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.6 },
  count: { color: colors.textMuted },
  countLiked: { color: colors.coralInk },
});
