import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  GestureStateManager,
  useNativeGesture,
  usePanGesture,
  type PanGestureActiveEvent,
} from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
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
  const { height } = useWindowDimensions();
  const translateY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startOffset = useSharedValue(0);
  const closing = useSharedValue(false);
  const canDrag = useDerivedValue(() => !closing.get());
  const close = () => {
    Keyboard.dismiss();
    onClose();
  };
  useEffect(() => {
    if (visible) {
      translateY.set(0);
      scrollY.set(0);
      closing.set(false);
    }
  }, [visible, translateY, scrollY, closing]);
  const move = (event: PanGestureActiveEvent) => {
    'worklet';
    translateY.set(Math.max(0, startOffset.get() + event.translationY));
  };
  const settle = (event: PanGestureActiveEvent & { canceled: boolean }) => {
    'worklet';
    const dismiss =
      !event.canceled && (translateY.get() > 100 || (event.velocityY > 800 && translateY.get() > 12));
    closing.set(dismiss);
    translateY.set(
      withSpring(
        dismiss ? height : 0,
        {
          duration: 300,
          dampingRatio: 0.8,
          velocity: event.velocityY,
          overshootClamping: true,
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished && dismiss) scheduleOnRN(close);
        },
      ),
    );
  };
  const headerPan = usePanGesture({
    enabled: canDrag,
    activeOffsetY: 12,
    failOffsetX: [-20, 20],
    onActivate: () => {
      startOffset.set(translateY.get());
    },
    onUpdate: move,
    onDeactivate: settle,
  });
  const nativeScroll = useNativeGesture();
  const listPan = usePanGesture({
    enabled: canDrag,
    manualActivation: true,
    simultaneousWith: nativeScroll,
    onTouchesDown: (event) => {
      const touch = event.allTouches[0];
      if (!touch || scrollY.get() > 1 || event.numberOfTouches !== 1) {
        GestureStateManager.fail(event.handlerTag);
        return;
      }
      startX.set(touch.absoluteX);
      startY.set(touch.absoluteY);
    },
    onTouchesMove: (event) => {
      const touch = event.allTouches[0];
      if (!touch) return;
      const dy = touch.absoluteY - startY.get();
      const dx = Math.abs(touch.absoluteX - startX.get());
      if (dy < -8 || dx > 20 || event.numberOfTouches !== 1) GestureStateManager.fail(event.handlerTag);
      else if (dy > 12 && dy > dx && scrollY.get() <= 1) GestureStateManager.activate(event.handlerTag);
    },
    onActivate: () => {
      startOffset.set(translateY.get());
    },
    onUpdate: move,
    onDeactivate: settle,
  });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const renderContent = (content: ReactNode) => (
    <GestureDetector gesture={listPan}>
      <Animated.View style={styles.list}>
        <GestureDetector gesture={nativeScroll}>
          <Animated.ScrollView
            testID="reel-comments-list"
            style={styles.list}
            bounces={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.content}
          >
            {content}
          </Animated.ScrollView>
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
  if (!visible) return null;
  return (
    <Modal transparent visible animationType="slide" onRequestClose={close}>
      <GestureHandlerRootView style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          style={styles.keyboard}
        >
          <Animated.View
            style={[
              styles.sheet,
              { height: Math.min(720, height * 0.78), paddingBottom: Math.max(insets.bottom, spacing.md) },
              sheetStyle,
            ]}
            accessibilityViewIsModal
            accessibilityLabel={vi.api.comments}
            onAccessibilityEscape={close}
          >
            <GestureDetector gesture={headerPan}>
              <View testID="reel-comments-header" collapsable={false}>
                <View style={styles.handle} />
                <View style={styles.heading}>
                  <View style={styles.headingSpacer} />
                  <Txt variant="label">{vi.api.comments}</Txt>
                  <IconButton name="close" label={vi.mobile.reelComments.close} onPress={close} />
                </View>
              </View>
            </GestureDetector>
            {postId ? (
              <LiveComments postId={postId} showHeading={false} compact renderContent={renderContent} />
            ) : (
              <>
                {renderContent(
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
                  </>,
                )}
                <View style={styles.composer}>
                  <ReelCommentComposer value={draft} onChange={onDraftChange} onSend={onSend} />
                </View>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: mobileLayout.contentWidth,
    maxHeight: '100%',
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headingSpacer: { width: mobileLayout.touchTarget },
  list: { flex: 1 },
  composer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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
