import { getReelCommentsSheetHeight } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  GestureStateManager,
  useNativeGesture,
  usePanGesture,
  type PanGestureActiveEvent,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { IconButton, Notice, Txt } from '@/components/mobile-ui';
import { SHEET_CLOSE_SPRING, SHEET_OPEN_SPRING } from '@/components/motion';
import { ReelCommentComposer } from './reel-comment-composer';
import { LiveComments } from './live-comments';

export function ReelCommentsPanel({
  visible,
  openProgress,
  postId,
  draft,
  onDraftChange,
  comments,
  onSend,
  onClose,
  hasBackdrop = false,
  loginReturnTo = '/(tabs)',
}: {
  visible: boolean;
  /** 0 when closed, 1 when fully open; follows the finger so the video can move with the sheet. */
  openProgress: SharedValue<number>;
  postId?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  comments: readonly { id: number; body: string }[];
  onSend: () => void;
  onClose: () => void;
  /** Over a video the sheet needs no dimming; over a white page it would otherwise blend in. */
  hasBackdrop?: boolean;
  loginReturnTo?: string;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = getReelCommentsSheetHeight(height);
  const translateY = useSharedValue(height);
  const scrollY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startOffset = useSharedValue(0);
  const closing = useSharedValue(false);
  const canDrag = useDerivedValue(() => !closing.get());
  const finishClose = () => {
    Keyboard.dismiss();
    onClose();
  };
  // Every way of closing shares this path, so the modal only unmounts once the sheet has left.
  const animateOut = (velocity: number) => {
    'worklet';
    closing.set(true);
    translateY.set(
      withSpring(height, { ...SHEET_CLOSE_SPRING, velocity }, (finished) => {
        if (finished) scheduleOnRN(finishClose);
      }),
    );
  };
  const close = () => {
    if (closing.get()) return;
    Keyboard.dismiss();
    animateOut(0);
  };
  useEffect(() => {
    if (visible) {
      scrollY.set(0);
      closing.set(false);
      translateY.set(withSpring(0, SHEET_OPEN_SPRING));
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
    if (dismiss) animateOut(event.velocityY);
    else translateY.set(withSpring(0, { ...SHEET_CLOSE_SPRING, velocity: event.velocityY }));
  };
  const headerPan = usePanGesture({
    enabled: canDrag,
    activeOffsetY: 12,
    failOffsetX: [-20, 20],
    onActivate: (event) => {
      // Activation happens a few points in; subtracting that keeps the sheet from jumping.
      startOffset.set(translateY.get() - event.translationY);
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
    onActivate: (event) => {
      // Activation happens a few points in; subtracting that keeps the sheet from jumping.
      startOffset.set(translateY.get() - event.translationY);
    },
    onUpdate: move,
    onDeactivate: settle,
  });
  // Khung đứng yên; chỉ phần đáy dãn theo bàn phím từng khung hình, nên ô nhập nằm ngay trên bàn phím
  // còn danh sách bình luận thấp lại. Lúc bàn phím mở, nó đã che thanh Home nên không cần đệm cho thanh đó.
  const keyboard = useAnimatedKeyboard();
  const restingPadding = Math.max(insets.bottom, spacing.md);
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
    paddingBottom: Math.max(keyboard.height.get() + spacing.sm, restingPadding),
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, sheetHeight], [1, 0], Extrapolation.CLAMP),
  }));
  useAnimatedReaction(
    () => interpolate(translateY.get(), [0, sheetHeight], [1, 0], Extrapolation.CLAMP),
    (progress) => openProgress.set(progress),
  );
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const list = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const revealComment = useCallback((y: number) => list.current?.scrollTo({ y, animated: true }), []);
  const renderContent = (content: ReactNode) => (
    <GestureDetector gesture={listPan}>
      <Animated.View style={styles.list}>
        <GestureDetector gesture={nativeScroll}>
          <Animated.ScrollView
            ref={list}
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
    <Modal transparent visible animationType="none" onRequestClose={close}>
      <GestureHandlerRootView style={styles.root}>
        {hasBackdrop && <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        <View pointerEvents="box-none" style={styles.keyboard}>
          <Animated.View
            style={[styles.sheet, { height: sheetHeight }, sheetStyle]}
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
              <LiveComments
                postId={postId}
                showHeading={false}
                compact
                renderContent={renderContent}
                onRevealComment={revealComment}
                onLoginRequired={() => {
                  close();
                  router.push({ pathname: '/login', params: { returnTo: loginReturnTo } });
                }}
              />
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
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
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
