import { vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, nativeFonts as f, spacing as s } from '@tripflix/tokens';
import { useRef, useState, type ComponentRef, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Icon, IconButton, Mascot, Txt, type IconName } from '@/components/mobile-ui';
import { SHEET_CLOSE_SPRING } from '@/components/motion';
import { BUBBLE_MASCOT_SIZE, BUBBLE_SIZE, useAssistant } from './assistant-provider';
import { AssistantCards } from './assistant-cards';

const copy = vi.assistant;

export function AssistantChat({
  onMinimize,
  keyboardOffset = 0,
  wrapHeader = (header) => header,
  wrapList,
  onListScroll,
}: {
  onMinimize: () => void;
  /** Bọc phần đầu khung chat, ví dụ để gắn cử chỉ vuốt xuống đóng. */
  wrapHeader?: (header: ReactNode) => ReactNode;
  /** Bọc danh sách tin nhắn, ví dụ để vuốt xuống đóng khi đang ở trên cùng. */
  wrapList?: (list: ReactElement) => ReactNode;
  onListScroll?: ReturnType<typeof useAnimatedScrollHandler>;
  /** Khoảng cách từ đỉnh màn hình tới đỉnh khung chat. KeyboardAvoidingView chỉ biết vị trí trong khung cha, thiếu số này thì bàn phím vẫn che ô soạn tin. */
  keyboardOffset?: number;
}) {
  const chat = useAssistant();
  const insets = useSafeAreaInsets();
  const composerBottom = Math.max(s.md, insets.bottom);
  const list = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const isDisabled = !chat.draft.trim() || chat.isPending || chat.hasError;
  function close() {
    Keyboard.dismiss();
    onMinimize();
  }
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // Khi bàn phím mở, phần đệm cho thanh Home nằm sau bàn phím; trừ ra để ô soạn tin sát bàn phím.
      keyboardVerticalOffset={keyboardOffset - (composerBottom - s.md)}
    >
      {wrapHeader(
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Mascot size={48} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="heading">{copy.name}</Txt>
            <Txt variant="caption" style={{ color: c.tealInk }}>
              {copy.subtitle}
            </Txt>
          </View>
          <IconButton
            name="create-outline"
            label={copy.reset}
            onPress={() => {
              if (chat.messages.length || chat.draft.trim()) setIsConfirming(true);
              else input.current?.focus();
            }}
          />
          <IconButton name="remove-outline" label={copy.minimize} onPress={close} />
        </View>,
      )}
      {chat.isPreview && (
        <View style={styles.preview}>
          <Icon name="flask-outline" size={14} color={c.coralInk} />
          <Txt variant="caption" style={{ color: c.coralInk }}>
            {copy.preview}
          </Txt>
        </View>
      )}
      {(wrapList ?? ((element: ReactElement) => element))(
        <Animated.ScrollView
          ref={list}
          style={{ flex: 1 }}
          onScroll={onListScroll}
          scrollEventThrottle={16}
          // Kéo khung thay cho nảy ở đầu danh sách, nếu không hai chuyển động chồng lên nhau.
          bounces={!wrapList}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => {
            if (chat.messages.length) list.current?.scrollToEnd({ animated: false });
          }}
          // Bàn phím mở làm khung danh sách thấp lại; cuộn xuống để tin mới nhất vẫn nằm ngay trên ô soạn tin.
          onLayout={() => {
            if (chat.messages.length) list.current?.scrollToEnd({ animated: true });
          }}
        >
          {!chat.messages.length ? (
            <View style={styles.welcome}>
              <View style={styles.hero}>
                <Mascot pose="welcome" size={100} />
              </View>
              <Txt variant="caption" style={styles.eyebrow}>
                {copy.eyebrow}
              </Txt>
              <Txt variant="title" style={styles.title}>
                {copy.title}
              </Txt>
              <Txt style={styles.description}>{copy.body}</Txt>
              <View style={styles.prompts}>
                {copy.prompts.map((prompt) => (
                  <Pressable
                    key={prompt.label}
                    accessibilityRole="button"
                    accessibilityLabel={prompt.label}
                    onPress={() => {
                      chat.setDraft(prompt.text);
                      input.current?.focus();
                    }}
                    style={({ pressed }) => [styles.prompt, pressed && { backgroundColor: c.warmMist }]}
                  >
                    <View style={styles.promptIcon}>
                      <Icon name={prompt.icon as IconName} color={c.coralInk} size={21} />
                    </View>
                    <View style={{ flex: 1, gap: s.xs }}>
                      <Txt variant="label">{prompt.label}</Txt>
                      <Txt variant="small" style={{ color: c.textMuted }}>
                        {prompt.caption}
                      </Txt>
                    </View>
                    <Icon name="arrow-up-outline" size={18} color={c.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            chat.messages.map((message) => (
              <View
                key={message.id}
                style={[styles.messageRow, message.role === 'user' && { justifyContent: 'flex-end' }]}
              >
                {message.role === 'assistant' && (
                  <View style={styles.messageAvatar}>
                    <Mascot size={30} />
                  </View>
                )}
                <View
                  style={[
                    styles.message,
                    message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                  ]}
                >
                  {message.role === 'assistant' && (
                    <Txt variant="caption" style={styles.author}>
                      {copy.name}
                    </Txt>
                  )}
                  <Txt selectable style={{ color: message.role === 'user' ? c.background : c.ink }}>
                    {message.text}
                  </Txt>
                  {!!message.cards?.length && <AssistantCards cards={message.cards} onOpen={close} />}
                </View>
              </View>
            ))
          )}
          {chat.isPending && (
            <View accessibilityLiveRegion="polite" style={styles.pending}>
              <ActivityIndicator size="small" color={c.tealInk} />
              <Txt variant="small">{copy.thinking}</Txt>
            </View>
          )}
          {chat.hasError && (
            <View accessibilityRole="alert" style={styles.error}>
              <Txt variant="small">{copy.error}</Txt>
              <Pressable
                accessibilityRole="button"
                onPress={() => void chat.send(chat.messages.at(-1)?.text, true)}
                style={styles.retry}
              >
                <Icon name="refresh" size={18} color={c.coralInk} />
                <Txt variant="label" style={{ color: c.coralInk }}>
                  {copy.retry}
                </Txt>
              </Pressable>
            </View>
          )}
        </Animated.ScrollView>,
      )}
      <View style={[styles.composerArea, { paddingBottom: composerBottom }]}>
        <View style={styles.composer}>
          <TextInput
            ref={input}
            accessibilityLabel={copy.placeholder}
            placeholder={copy.placeholder}
            placeholderTextColor={c.textMuted}
            value={chat.draft}
            onChangeText={chat.setDraft}
            multiline
            maxLength={4000}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.send}
            disabled={isDisabled}
            accessibilityState={{ disabled: isDisabled }}
            onPress={() => void chat.send()}
            style={[styles.send, isDisabled && { backgroundColor: c.surfaceMuted }]}
          >
            <Icon name="arrow-up" color={isDisabled ? c.textMuted : c.background} />
          </Pressable>
        </View>
        <Txt variant="caption" style={styles.footnote}>
          {copy.footer}
        </Txt>
      </View>
      {isConfirming && (
        <View style={styles.confirmBackdrop} accessibilityViewIsModal>
          <View style={styles.confirm}>
            <Txt variant="heading">{copy.resetTitle}</Txt>
            <Txt style={{ color: c.textMuted }}>{copy.resetBody}</Txt>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                chat.reset();
                setIsConfirming(false);
              }}
              style={styles.confirmAction}
            >
              <Txt variant="label" style={{ color: c.coralInk }}>
                {copy.confirm}
              </Txt>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsConfirming(false)}
              style={styles.confirmAction}
            >
              <Txt variant="label">{copy.cancel}</Txt>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export function AssistantDialog() {
  const chat = useAssistant();
  // Initialize the animated frame from the latest measured bubble, never a previous opening.
  return chat.isOpen ? <AssistantModal /> : null;
}

function AssistantModal() {
  const chat = useAssistant();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const viewport = useWindowDimensions();
  const panelWidth = Math.min(viewport.width, mobileLayout.contentWidth);
  // Chừa khoảng trống phía trên: ngón cái với tới phần đầu khung để vuốt xuống, và thấy rõ đây là khung nổi.
  const panelHeight = (viewport.height - insets.top - s.lg) * 0.8;
  const targetX = (viewport.width - panelWidth) / 2;
  const targetY = viewport.height - panelHeight;
  const origin = chat.origin ?? {
    x: targetX + panelWidth - 76,
    y: viewport.height - 168,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
  };
  const progress = useSharedValue(0);
  // Khoảng kéo xuống của khung chat; đóng thì trở về 0 cùng lúc thu về bong bóng.
  const dragY = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const closing = useSharedValue(false);
  const backdropMotion = useAnimatedStyle(() => ({
    opacity: progress.get() * (1 - Math.min(1, dragY.get() / panelHeight)),
  }));
  // Resize only this floating clipping frame. The full-sized chat inside never reflows or stretches.
  const dialogMotion = useAnimatedStyle(() => {
    const p = reducedMotion ? 1 : progress.get();
    return {
      left: origin.x + (targetX - origin.x) * p,
      top: origin.y + (targetY - origin.y) * p + dragY.get(),
      width: origin.width + (panelWidth - origin.width) * p,
      height: origin.height + (panelHeight - origin.height) * p,
      borderTopLeftRadius: 32 + (28 - 32) * p,
      borderTopRightRadius: 32 + (28 - 32) * p,
      borderBottomLeftRadius: 32 * (1 - p),
      borderBottomRightRadius: 32 * (1 - p),
      borderWidth: 2 * (1 - p),
      backgroundColor: interpolateColor(p, [0, 1], [c.warmMist, c.background]),
      opacity: reducedMotion ? progress.get() : 1,
    };
  });
  const contentMotion = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : Math.max(0, Math.min(1, (progress.get() - 0.18) / 0.55)),
  }));
  const mascotMotion = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0 : Math.max(0, 1 - progress.get() / 0.22),
  }));
  function finishClose() {
    chat.setIsOpen(false);
  }
  function open() {
    closing.set(false);
    progress.set(0);
    progress.set(
      reducedMotion
        ? withTiming(1, { duration: 100, reduceMotion: ReduceMotion.Never })
        : withTiming(1, {
            duration: 360,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
            reduceMotion: ReduceMotion.Never,
          }),
    );
  }
  const close = () => {
    if (closing.get()) return;
    closing.set(true);
    Keyboard.dismiss();
    const exit = {
      duration: reducedMotion ? 100 : 280,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      reduceMotion: ReduceMotion.Never,
    };
    dragY.set(withTiming(0, exit));
    // Keep the native modal mounted until its exit finishes; otherwise it disappears abruptly.
    progress.set(
      withTiming(0, exit, (finished) => {
        if (finished) scheduleOnRN(finishClose);
      }),
    );
  };
  // Keyboard chỉ có ở luồng JS; worklet phải gọi qua hàm này, không đọc Keyboard.dismiss trực tiếp.
  const dismissKeyboard = () => Keyboard.dismiss();
  const listTop = useSharedValue(0);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const startDrag = (translationY: number) => {
    'worklet';
    // Cử chỉ chỉ nhận sau vài điểm; trừ đoạn đó để khung không nhảy.
    dragStart.set(dragY.get() - translationY);
    scheduleOnRN(dismissKeyboard);
  };
  const moveDrag = (event: PanGestureActiveEvent) => {
    'worklet';
    dragY.set(Math.max(0, dragStart.get() + event.translationY));
  };
  const settleDrag = (event: PanGestureActiveEvent & { canceled: boolean }) => {
    'worklet';
    const shouldClose = !event.canceled && (dragY.get() > 100 || (event.velocityY > 800 && dragY.get() > 12));
    if (shouldClose) scheduleOnRN(close);
    else dragY.set(withSpring(0, { ...SHEET_CLOSE_SPRING, velocity: event.velocityY }));
  };
  // Vuốt xuống ở phần đầu khung để đóng.
  const headerDrag = usePanGesture({
    activeOffsetY: 12,
    failOffsetX: [-20, 20],
    onActivate: (event) => startDrag(event.translationY),
    onUpdate: moveDrag,
    onDeactivate: settleDrag,
  });
  // Danh sách đang ở trên cùng thì vuốt xuống là kéo khung; còn lại vẫn cuộn tin nhắn như thường.
  const listScroll = useNativeGesture();
  const listDrag = usePanGesture({
    manualActivation: true,
    simultaneousWith: listScroll,
    onTouchesDown: (event) => {
      const touch = event.allTouches[0];
      if (!touch || listTop.get() > 1 || event.numberOfTouches !== 1) {
        GestureStateManager.fail(event.handlerTag);
        return;
      }
      touchX.set(touch.absoluteX);
      touchY.set(touch.absoluteY);
    },
    onTouchesMove: (event) => {
      const touch = event.allTouches[0];
      if (!touch) return;
      const dy = touch.absoluteY - touchY.get();
      const dx = Math.abs(touch.absoluteX - touchX.get());
      if (dy < -8 || dx > 20 || event.numberOfTouches !== 1) GestureStateManager.fail(event.handlerTag);
      else if (dy > 12 && dy > dx && listTop.get() <= 1) GestureStateManager.activate(event.handlerTag);
    },
    onActivate: (event) => startDrag(event.translationY),
    onUpdate: moveDrag,
    onDeactivate: settleDrag,
  });
  const onListScroll = useAnimatedScrollHandler((event) => {
    listTop.set(event.contentOffset.y);
  });
  return (
    <Modal
      visible={chat.isOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={open}
      onRequestClose={close}
    >
      <GestureHandlerRootView style={styles.backdrop}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }, backdropMotion]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.minimize}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          testID="assistant-morph-frame"
          style={[styles.dialog, dialogMotion]}
          accessibilityViewIsModal
        >
          <Animated.View style={[{ width: panelWidth, height: panelHeight }, contentMotion]}>
            <AssistantChat
              onMinimize={close}
              keyboardOffset={targetY}
              wrapHeader={(header) => (
                <GestureDetector gesture={headerDrag}>
                  <View>
                    <View style={styles.handle} />
                    {header}
                  </View>
                </GestureDetector>
              )}
              onListScroll={onListScroll}
              wrapList={(scroll) => (
                <GestureDetector gesture={listDrag}>
                  <Animated.View style={{ flex: 1 }}>
                    <GestureDetector gesture={listScroll}>{scroll}</GestureDetector>
                  </Animated.View>
                </GestureDetector>
              )}
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.morphMascot, mascotMotion]}
          >
            <Mascot size={BUBBLE_MASCOT_SIZE} />
            <View style={styles.morphBadge}>
              <Icon name="sparkles" size={10} color={c.background} />
            </View>
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export function AssistantScreen() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <AssistantChat
        keyboardOffset={insets.top}
        onMinimize={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  dialog: {
    position: 'absolute',
    overflow: 'hidden',
    borderColor: c.background,
    boxShadow: `0 4px 16px ${c.overlay}`,
  },
  morphMascot: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  morphBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.coral,
    borderWidth: 2,
    borderColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginTop: s.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    padding: s.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.warmMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: s.sm,
    padding: s.sm,
    backgroundColor: c.warmMist,
  },
  messages: { padding: s.lg, gap: s.lg, flexGrow: 1 },
  welcome: { alignItems: 'center', gap: s.sm },
  hero: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: c.warmMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { color: c.coralInk, fontFamily: f.semibold, letterSpacing: 1.5, marginTop: s.sm },
  title: { textAlign: 'center', fontSize: 24, lineHeight: 32 },
  description: { textAlign: 'center', color: c.textMuted, maxWidth: 310, fontSize: 13, lineHeight: 21 },
  prompts: { width: '100%', gap: s.sm, paddingTop: s.md },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.md,
    padding: s.md,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
  },
  promptIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.warmMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: s.sm },
  messageAvatar: { width: 32, height: 32, backgroundColor: c.warmMist, borderRadius: 16 },
  message: { maxWidth: '85%', padding: s.md, borderRadius: 18, gap: s.xs },
  userMessage: { backgroundColor: c.navy, borderBottomRightRadius: 4 },
  assistantMessage: { flexShrink: 1, backgroundColor: c.surface, borderBottomLeftRadius: 4 },
  author: { color: c.tealInk, fontFamily: f.semibold },
  pending: { flexDirection: 'row', alignItems: 'center', gap: s.sm, padding: s.md },
  error: { backgroundColor: c.coralTint, padding: s.md, borderRadius: 16, gap: s.sm },
  retry: { flexDirection: 'row', alignItems: 'center', gap: s.sm, minHeight: 48 },
  composerArea: { borderTopWidth: 1, borderTopColor: c.border, padding: s.md, gap: s.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 24,
    padding: s.xs,
    backgroundColor: c.surface,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    // Ô nhiều dòng trên iOS bỏ qua cạnh trên của `padding` gộp, nên ghi riêng từng cạnh: (48 - 22) / 2 = 13 để một dòng nằm giữa.
    paddingHorizontal: s.md,
    paddingTop: 13,
    paddingBottom: 13,
    textAlignVertical: 'center',
    fontFamily: f.regular,
    color: c.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { textAlign: 'center', color: c.textMuted, fontSize: 10 },
  confirmBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s.xl,
  },
  confirm: { backgroundColor: c.background, borderRadius: 24, padding: s.xl, gap: s.md, maxWidth: 340 },
  confirmAction: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: c.surface,
  },
});
