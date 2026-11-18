import { View } from 'react-native';
import { vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { Button, Txt } from '../../components/mobile-ui';

export function ModeratedComment({
  onLearnMore,
  onDelete,
  isDeleting = false,
}: {
  onLearnMore: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <View
        style={{
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.md,
          padding: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Txt style={{ color: colors.textMuted }}>{vi.api.commentModerationHidden}</Txt>
        <Button tone="text" onPress={onLearnMore}>
          {vi.api.commentModerationLearnMore}
        </Button>
      </View>
      {onDelete && (
        <Button tone="text" disabled={isDeleting} onPress={onDelete}>
          {vi.api.remove}
        </Button>
      )}
    </View>
  );
}

export function HeldComment({
  body,
  creatorReview,
  onDelete,
  isDeleting = false,
}: {
  body: string;
  creatorReview?: 'pending' | 'approved' | 'rejected';
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Txt variant="label">{vi.moderation.heldTitle}</Txt>
      <Txt>{body}</Txt>
      <Txt variant="caption">
        {creatorReview === 'pending'
          ? vi.moderation.creatorHeld
          : creatorReview === 'rejected'
            ? vi.moderation.creatorRejected
            : vi.moderation.heldComment}
      </Txt>
      {onDelete && (
        <Button tone="text" disabled={isDeleting} onPress={onDelete}>
          {vi.api.remove}
        </Button>
      )}
    </View>
  );
}
