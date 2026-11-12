import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, spacing } from '@tripflix/tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Icon, Txt, type IconName } from '@/components/mobile-ui';
import { HEART_POP_SETTLE, HEART_POP_UP } from '@/components/motion';

const HEART_POP_SCALE = 1.25;
const countFormat = new Intl.NumberFormat('vi-VN');

function PostAction({
  icon,
  label,
  count,
  isSelected = false,
  shouldPop = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  count: number;
  isSelected?: boolean;
  shouldPop?: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      onPress={() => {
        if (shouldPop && !isSelected) {
          scale.set(withSequence(withTiming(HEART_POP_SCALE, HEART_POP_UP), withSpring(1, HEART_POP_SETTLE)));
        }
        onPress();
      }}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Animated.View style={iconStyle}>
        <Icon name={icon} size={24} color={isSelected ? colors.coral : colors.ink} />
      </Animated.View>
      <Txt variant="small" style={isSelected ? styles.countSelected : styles.count}>
        {countFormat.format(count)}
      </Txt>
    </Pressable>
  );
}

export function PostActionBar({
  isLiked,
  isSaved,
  likeCount,
  commentCount,
  saveCount,
  shareCount,
  onLike,
  onComments,
  onSave,
  onShare,
}: {
  isLiked: boolean;
  isSaved: boolean;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  shareCount: number;
  onLike: () => void;
  onComments: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  return (
    <View style={styles.bar}>
      <PostAction
        icon={isLiked ? 'heart' : 'heart-outline'}
        label={isLiked ? vi.api.unlike : vi.api.like}
        count={likeCount}
        isSelected={isLiked}
        shouldPop
        onPress={onLike}
      />
      <PostAction
        icon="chatbubble-ellipses-outline"
        label={vi.api.comments}
        count={commentCount}
        onPress={onComments}
      />
      <PostAction
        icon={isSaved ? 'bookmark' : 'bookmark-outline'}
        label={isSaved ? vi.api.unbookmark : vi.api.bookmark}
        count={saveCount}
        isSelected={isSaved}
        onPress={onSave}
      />
      <PostAction icon="paper-plane-outline" label={vi.api.share} count={shareCount} onPress={onShare} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The screen footer's padding suits full-size buttons; icons sit tighter so the bar stays slim.
  bar: { flexDirection: 'row', marginVertical: -spacing.sm },
  action: {
    flex: 1,
    minHeight: mobileLayout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pressed: { opacity: 0.6 },
  count: { color: colors.ink },
  countSelected: { color: colors.coralInk },
});
