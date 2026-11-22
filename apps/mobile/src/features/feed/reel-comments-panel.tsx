import { getReelCommentsSheetHeight } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { router, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useEffectEvent, useRef, type ComponentRef, type ReactNode } from 'react';
import { BackHandler, Keyboard, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  type PanGestureActiveEvent,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { IconButton, Notice, Txt } from '@/components/mobile-ui';
import { SHEET_CLOSE_SPRING, SHEET_OPEN_SPRING } from '@/components/motion';
import { useSheetListDrag } from '@/components/use-sheet-list-drag';
import { ReelCommentComposer } from './reel-comment-composer';
import { LiveComments } from './live-comments';

export function ReelCommentsPanel({
  visible,
  openProgress,
  postId,
  commentCount,
  draft,
  onDraftChange,
  comments,
  onSend,
  onClose,
  hasBackdrop = false,
  inline = false,
  viewportHeight,
  loginReturnTo = '/(tabs)',
  showSummary = false,
  focusCommentId,
  focusThreadId,
}: {
  visible: boolean;
  /** 0 when closed, 1 when fully open; follows the finger so the video can move with the sheet. */
  openProgress: SharedValue<number>;
  postId?: string;
  commentCount?: number;
  draft: string;
  onDraftChange: (value: string) => void;
  comments: readonly { id: number; body: string }[];
  onSend: () => void;
  onClose: () => void;
  /** Over a video the sheet needs no dimming; over a white page it would otherwise blend in. */
  hasBackdrop?: boolean;
  /** Reels keep the sheet in their screen so it participates in stack navigation. */
  inline?: boolean;
  /** Actual reel bounds, excluding navigation below the screen. */
  viewportHeight?: number;
  loginReturnTo?: string;
  /** Chỉ reel bật; trang chi tiết bài dùng chung khung này nhưng không có AI summary. */
  showSummary?: boolean;
  /** Bình luận cần nhảy tới khi mở từ thông báo, và bình luận gốc của luồng nếu đó là trả lời. */
  focusCommentId?: string;
  focusThreadId?: string;
}) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { height: windowHeight } = useWindowDimensions();
  const height = inline ? Math.min(viewportHeight ?? windowHeight, windowHeight) : windowHeight;
  const viewportBottomGap = inline ? Math.max(0, windowHeight - height) : 0;
  const sheetHeight = getReelCommentsSheetHeight(height);
  const translateY = useSharedValue(height);
  const startOffset = useSharedValue(0);
  const closing = useSharedValue(false);
  const afterClose = useRef<(() => void) | undefined>(undefined);
  const canDrag = useDerivedValue(() => !closing.get());
  const finishClose = () => {
    Keyboard.dismiss();
    onClose();
    const navigate = afterClose.current;
    afterClose.current = undefined;
    if (navigate) requestAnimationFrame(navigate);
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
  const onHardwareBack = useEffectEvent(() => {
    close();
    return true;
  });
  useEffect(() => {
    if (!inline || !visible || !isFocused) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => subscription.remove();
  }, [inline, visible, isFocused]);
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
  // Danh sách cuộn dở thì cuộn lên trước, chạm đỉnh thì cùng ngón tay đó kéo sheet.
  const {
    pan: listPan,
    scroll: nativeScroll,
    onScroll,
    scrollY,
  } = useSheetListDrag({
    enabled: canDrag,
    activateAfter: 12,
    onActivate: (event) => {
      'worklet';
      // Activation happens a few points in; subtracting that keeps the sheet from jumping.
      startOffset.set(translateY.get() - event.translationY);
    },
    onUpdate: move,
    onDeactivate: settle,
  });
  useEffect(() => {
    if (visible) {
      scrollY.set(0);
      closing.set(false);
      translateY.set(withSpring(0, SHEET_OPEN_SPRING));
    }
  }, [visible, translateY, scrollY, closing]);
  // Khung đứng yên; chỉ phần đáy dãn theo bàn phím từng khung hình, nên ô nhập nằm ngay trên bàn phím
  // còn danh sách bình luận thấp lại. Lúc bàn phím mở, nó đã che thanh Home nên không cần đệm cho thanh đó.
  const keyboard = useAnimatedKeyboard();
  // An inline reel ends above the tab bar, which already contains the bottom safe area.
  const restingPadding = inline ? spacing.sm : Math.max(insets.bottom, spacing.sm);
  const title = t('mobile.reelComments.title', {
    count: new Intl.NumberFormat('vi-VN').format(commentCount ?? comments.length),
  });
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
    paddingBottom: Math.max(keyboard.height.get() - viewportBottomGap + spacing.sm, restingPadding),
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, sheetHeight], [1, 0], Extrapolation.CLAMP),
  }));
  useAnimatedReaction(
    () => interpolate(translateY.get(), [0, sheetHeight], [1, 0], Extrapolation.CLAMP),
    (progress) => openProgress.set(progress),
  );
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
            showsVerticalScrollIndicator={false}
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
  const panel = (
      <GestureHandlerRootView style={inline ? styles.inlineRoot : styles.root}>
        {hasBackdrop && <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        <View pointerEvents="box-none" style={styles.keyboard}>
          <Animated.View
            style={[styles.sheet, { height: sheetHeight }, sheetStyle]}
            accessibilityViewIsModal
            accessibilityLabel={title}
            onAccessibilityEscape={close}
          >
            <GestureDetector gesture={headerPan}>
              <View testID="reel-comments-header" collapsable={false} style={styles.heading}>
                <Txt accessibilityRole="header" variant="label" style={styles.title}>
                  {title}
                </Txt>
                <View style={styles.close}>
                  <IconButton name="close" size={17} label={vi.mobile.reelComments.close} onPress={close} />
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
                showSummary={showSummary}
                focusCommentId={focusCommentId}
                focusThreadId={focusThreadId}
                onLoginRequired={() => {
                  close();
                  router.push({ pathname: '/login', params: { returnTo: loginReturnTo } });
                }}
                onOpenProfile={(authorId) => {
                  if (closing.get()) return;
                  const openProfile = () => router.push({ pathname: '/user/[id]', params: { id: authorId } });
                  if (inline) {
                    Keyboard.dismiss();
                    openProfile();
                  } else {
                    afterClose.current = openProfile;
                    close();
                  }
                }}
                onModerationDetails={() => {
                  close();
                  router.push('/moderation-status');
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
                          <Txt variant="caption">{vi.mobile.reelComments.yourInitials}</Txt>
                        </View>
                        <View style={styles.body}>
                          <Txt variant="caption" style={styles.muted}>
                            {vi.mobile.reels.sampleCommentAuthor}
                          </Txt>
                          <Txt variant="small" style={styles.message}>
                            {comment.body}
                          </Txt>
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
  );
  return inline ? panel : (
    <Modal transparent visible animationType="none" onRequestClose={close}>{panel}</Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inlineRoot: { ...StyleSheet.absoluteFill, zIndex: 10 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: mobileLayout.contentWidth,
    maxHeight: '100%',
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  heading: {
    minHeight: mobileLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: mobileLayout.touchTarget,
  },
  title: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  close: { position: 'absolute', right: spacing.xs, top: 0 },
  list: { flex: 1 },
  composer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  comment: { flexDirection: 'row', gap: spacing.sm },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.seaMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  message: { fontSize: 15, lineHeight: 21 },
  muted: { color: colors.textMuted },
});
