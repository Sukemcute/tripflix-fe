import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Notice, Txt } from '@/components/mobile-ui';
import { ReelCommentComposer } from './reel-comment-composer';
import { LiveComments } from './live-comments';

export function ReelCommentsPanel({
  visible,
  postId,
  draft,
  onDraftChange,
  comments,
  onSend,
  onClose,
}: {
  visible: boolean;
  postId?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  comments: readonly { id: number; body: string }[];
  onSend: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          style={styles.keyboard}
        >
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
            accessibilityViewIsModal
          >
            <View style={styles.handle} />
            <View style={styles.heading}>
              <Txt variant="heading">{vi.api.comments}</Txt>
              <IconButton name="close" label={vi.mobile.reelComments.close} onPress={onClose} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              {postId ? (
                <LiveComments postId={postId} showHeading={false} compact />
              ) : (
                <>
                  <Notice>{vi.mobile.reels.sampleComments}</Notice>
                  {comments.length === 0 && <Txt style={styles.muted}>{vi.api.noComments}</Txt>}
                  {comments.map((comment) => (
                    <View key={comment.id} style={styles.comment}>
                      <View style={styles.avatar}>
                        <Txt variant="label">{vi.mobile.reelComments.yourInitials}</Txt>
                      </View>
                      <View style={styles.body}>
                        <Txt variant="label">{vi.mobile.reels.sampleCommentAuthor}</Txt>
                        <Txt>{comment.body}</Txt>
                        <Txt variant="caption" style={styles.muted}>
                          {vi.mobile.reelComments.justNow}
                        </Txt>
                      </View>
                    </View>
                  ))}
                  <ReelCommentComposer value={draft} onChange={onDraftChange} onSend={onSend} />
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: mobileLayout.contentWidth,
    height: '75%',
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderTopLeftRadius: mobileLayout.sheetRadius,
    borderTopRightRadius: mobileLayout.sheetRadius,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  content: { padding: spacing.lg, gap: spacing.lg },
  comment: { flexDirection: 'row', gap: spacing.md },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.seaMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xs },
  muted: { color: colors.textMuted },
});
