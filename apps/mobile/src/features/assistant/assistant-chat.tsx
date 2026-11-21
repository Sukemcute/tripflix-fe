import { vi } from '@tripflix/i18n';
import {
  explorer as x,
  colors as c,
  mobileLayout,
  nativeFonts as f,
  radius,
  spacing as s,
} from '@tripflix/tokens';
import { useCallback, useRef, useState, type ComponentRef, type ReactElement, type ReactNode } from 'react';
import {
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
  usePanGesture,
  type PanGestureActiveEvent,
} from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import Animated, {
  Easing,
  FadeInDown,
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
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { SHEET_CLOSE_SPRING } from '@/components/motion';
import { useSheetListDrag } from '@/components/use-sheet-list-drag';
import { BUBBLE_MASCOT_SIZE, BUBBLE_SIZE, useAssistant } from './assistant-provider';
import { AssistantCards } from './assistant-cards';
import { AssistantThinking, chatType, TripiFace } from './assistant-visuals';

const copy = vi.assistant;
const COMPOSER_INPUT_PADDING = (mobileLayout.touchTarget - chatType.body.lineHeight) / 2;
// Tin mới trượt nhẹ lên; người dùng chọn giảm chuyển động thì hiện ngay.
const enter = FadeInDown.duration(260).reduceMotion(ReduceMotion.System);

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
  // Lỗi không khoá ô nhập: người dùng sửa câu rồi gửi lại, hoặc bấm "Thử gửi lại".
  const isDisabled = !chat.draft.trim() || chat.isPending;
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
            <Mascot size={34} />
            <View style={[styles.statusDot, chat.isPending && { backgroundColor: x.brand.sun }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="heading" style={[chatType.title, { fontFamily: f.bold }]}>
              {copy.name}
            </Txt>
            <Txt variant="caption" style={styles.subtitle}>
              {chat.isPending ? copy.thinkingOnline : copy.subtitle}
            </Txt>
          </View>
          <IconButton
            name="create-outline"
            size={mobileIconSize.control}
            label={copy.reset}
            onPress={() => {
              if (chat.messages.length || chat.draft.trim()) setIsConfirming(true);
              else input.current?.focus();
            }}
          />
          <IconButton
            name="remove-outline"
            size={mobileIconSize.control}
            label={copy.minimize}
            onPress={close}
          />
        </View>,
      )}
      {chat.isPreview && (
        <View style={styles.preview}>
          <Icon name="flask-outline" size={mobileIconSize.inline} color={x.day.link} />
          <Txt variant="caption" style={styles.previewText}>
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
            <Animated.View entering={enter} style={styles.welcome}>
              {/* Lời chào gọn (SCRUM-167): một Tripi, một câu hỏi, ba gợi ý. */}
              <View style={styles.welcomeHead}>
                <TripiFace animation="greeting" size={92} />
                <View style={styles.welcomeBubble}>
                  <Txt style={styles.welcomeHello}>{copy.greeting}</Txt>
                  <Txt variant="title" style={styles.title}>
                    {copy.title}
                  </Txt>
                </View>
              </View>
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
                    style={({ pressed }) => [styles.prompt, pressed && { backgroundColor: x.day.canvas }]}
                  >
                    <View style={styles.promptIcon}>
                      <Icon name={prompt.icon as IconName} color={x.day.link} size={20} />
                    </View>
                    <View style={styles.promptText}>
                      <Txt variant="label" style={styles.promptLabel}>
                        {prompt.label}
                      </Txt>
                      <Txt variant="caption" style={styles.promptCaption}>
                        {prompt.caption}
                      </Txt>
                    </View>
                    <Icon name="arrow-forward" size={18} color={x.day.link} />
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          ) : (
            chat.messages.map((message, index) => {
              const isAssistant = message.role === 'assistant';
              const isLatest = message.id === chat.messages.at(-1)?.id;
              // Avatar chỉ ở tin đầu của một lượt Tripi, tránh lặp mặt Tripi mỗi bong bóng.
              const startsGroup = isAssistant && chat.messages[index - 1]?.role !== 'assistant';
              return (
                <Animated.View key={message.id} entering={enter} style={styles.turn}>
                  <View style={[styles.messageRow, !isAssistant && { justifyContent: 'flex-end' }]}>
                    {isAssistant &&
                      (startsGroup ? (
                        <TripiFace pose="expr-happy" size={34} />
                      ) : (
                        <View style={styles.avatarSpacer} />
                      ))}
                    <View
                      style={[styles.message, isAssistant ? styles.assistantMessage : styles.userMessage]}
                    >
                      <Txt selectable style={[styles.messageText, !isAssistant && styles.userText]}>
                        {message.text}
                      </Txt>
                    </View>
                  </View>
                  {/* Thẻ và gợi ý là khối riêng dưới lời giải thích, không ép vào bong bóng hẹp. */}
                  {isAssistant && (!!message.cards?.length || message.action === 'login') && (
                    <View style={styles.attachments}>
                      {!!message.cards?.length && (
                        <AssistantCards
                          bookingTrip={chat.trip}
                          cards={message.cards}
                          onOpen={close}
                          actions={
                            isLatest && !chat.isPending
                              ? {
                                  act: (label, action) => void chat.act(label, action),
                                  canUndo: !!chat.trip?.ops?.length,
                                  trip: chat.trip,
                                }
                              : undefined
                          }
                        />
                      )}
                      {message.action === 'login' && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            close();
                            // Phiên chat nằm ở provider gốc nên vẫn còn khi đăng nhập xong quay lại.
                            router.push({ pathname: '/login', params: { returnTo: '/assistant' } });
                          }}
                          style={({ pressed }) => [styles.loginButton, pressed && { opacity: 0.85 }]}
                        >
                          <Icon name="log-in-outline" size={18} color={x.brand.white} />
                          <Txt style={styles.loginText}>{copy.login}</Txt>
                        </Pressable>
                      )}
                    </View>
                  )}
                  {isAssistant && isLatest && !chat.isPending && !!message.suggestions?.length && (
                    <View style={styles.attachments}>
                      <Txt style={styles.suggestionsLabel}>{copy.suggestionsLabel}</Txt>
                      <View style={styles.chips}>
                        {message.suggestions.map((suggestion) => (
                          <Pressable
                            key={suggestion}
                            accessibilityRole="button"
                            onPress={() => void chat.send(suggestion)}
                            style={({ pressed }) => [
                              styles.chip,
                              pressed && { backgroundColor: x.day.tintWarm },
                            ]}
                          >
                            <Icon name="sparkles-outline" size={14} color={x.day.link} />
                            <Txt variant="label" style={styles.chipText}>
                              {suggestion}
                            </Txt>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </Animated.View>
              );
            })
          )}
          {chat.isPending && (
            <Animated.View entering={enter}>
              <AssistantThinking />
            </Animated.View>
          )}
          {chat.hasError && (
            <View accessibilityRole="alert" style={styles.error}>
              <Txt style={[chatType.body, { color: x.day.text }]}>{copy.error}</Txt>
              <Pressable
                accessibilityRole="button"
                onPress={() => void chat.send(chat.messages.at(-1)?.text, true)}
                style={styles.retry}
              >
                <Icon name="refresh" size={mobileIconSize.control} color={x.day.link} />
                <Txt variant="label" style={styles.actionText}>
                  {copy.retry}
                </Txt>
              </Pressable>
            </View>
          )}
        </Animated.ScrollView>,
      )}
      <View style={[styles.composerArea, { paddingBottom: composerBottom }]}>
        {chat.hasStorageError && (
          <Txt variant="caption" accessibilityRole="alert" style={styles.footnote}>
            {copy.storageError}
          </Txt>
        )}
        <View style={styles.composer}>
          <TextInput
            ref={input}
            accessibilityLabel={copy.placeholder}
            placeholder={copy.placeholder}
            placeholderTextColor={x.day.textSecondary}
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
            style={[styles.send, isDisabled && { backgroundColor: x.day.canvas }]}
          >
            <Icon
              name="arrow-up"
              size={mobileIconSize.control}
              color={isDisabled ? x.day.textSecondary : x.day.surface}
            />
          </Pressable>
        </View>
        <Txt variant="caption" style={styles.footnote}>
          {copy.footer}
        </Txt>
      </View>
      {isConfirming && (
        <View style={styles.confirmBackdrop} accessibilityViewIsModal>
          <View style={styles.confirm}>
            <Txt variant="heading" style={compactType.heading}>
              {copy.resetTitle}
            </Txt>
            <Txt style={styles.mutedBody}>{copy.resetBody}</Txt>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                chat.reset();
                setIsConfirming(false);
              }}
              style={styles.confirmAction}
            >
              <Txt variant="label" style={styles.actionText}>
                {copy.confirm}
              </Txt>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsConfirming(false)}
              style={styles.confirmAction}
            >
              <Txt variant="label" style={compactType.label}>
                {copy.cancel}
              </Txt>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export function AssistantDialog() {
  const { isOpen, closeDialog } = useAssistant();
  const isFocused = useIsFocused();
  useFocusEffect(useCallback(() => closeDialog, [closeDialog]));
  return isFocused && isOpen ? <AssistantModal /> : null;
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
      backgroundColor: interpolateColor(p, [0, 1], [x.day.canvas, x.day.surface]),
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
    chat.closeDialog();
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
  // Danh sách cuộn dở (chat tự cuộn xuống tin mới nhất) thì cuộn lên trước, chạm đỉnh thì cùng ngón tay đó kéo khung.
  const {
    pan: listDrag,
    scroll: listScroll,
    onScroll: onListScroll,
  } = useSheetListDrag({
    activateAfter: 12,
    onActivate: (event) => {
      'worklet';
      startDrag(event.translationY);
    },
    onUpdate: moveDrag,
    onDeactivate: settleDrag,
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
              <Icon name="sparkles" size={10} color={x.brand.white} />
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
  container: { flex: 1, backgroundColor: x.day.canvas },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  dialog: {
    position: 'absolute',
    overflow: 'hidden',
    borderColor: x.day.surface,
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
    backgroundColor: x.action.primary,
    borderWidth: 2,
    borderColor: x.day.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: x.day.line,
    marginTop: s.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    paddingHorizontal: s.md,
    paddingVertical: s.xs,
    borderBottomWidth: 1,
    borderBottomColor: x.day.line,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: x.day.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: x.day.surface,
    backgroundColor: x.day.link,
  },
  subtitle: { ...chatType.meta, color: x.day.link, fontFamily: f.medium },
  preview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: s.sm,
    padding: s.sm,
    backgroundColor: x.day.canvas,
  },
  previewText: { ...compactType.meta, color: x.day.link },
  messages: { padding: s.lg, gap: s.lg, flexGrow: 1 },
  welcome: { gap: s.lg, paddingTop: s.sm },
  welcomeHead: { flexDirection: 'row', alignItems: 'flex-end', gap: s.sm },
  welcomeBubble: {
    flex: 1,
    gap: s.xs,
    padding: s.lg,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    backgroundColor: x.day.canvas,
  },
  welcomeHello: { ...chatType.small, fontFamily: f.semibold, color: x.day.link },
  title: {
    ...chatType.title,
    fontSize: 19,
    lineHeight: 26,
    fontFamily: f.bold,
    color: x.day.text,
    letterSpacing: 0,
  },
  prompts: { width: '100%', gap: s.sm },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.md,
    paddingVertical: s.md,
    paddingHorizontal: s.md,
    borderWidth: 1,
    borderColor: x.day.line,
    borderRadius: 18,
    backgroundColor: x.day.surface,
    boxShadow: `0 4px 14px -10px ${c.overlay}`,
  },
  promptIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: x.day.tintWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: { flex: 1, gap: 2 },
  promptLabel: { ...chatType.body, fontFamily: f.semibold, color: x.day.text },
  promptCaption: { ...chatType.small, color: x.day.textSecondary },
  turn: { gap: s.sm },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: s.sm },
  avatarSpacer: { width: 34 },
  message: { maxWidth: '82%', paddingVertical: s.md, paddingHorizontal: s.lg, borderRadius: 22 },
  userMessage: { backgroundColor: x.day.text, borderBottomRightRadius: 6 },
  assistantMessage: { flexShrink: 1, backgroundColor: x.day.canvas, borderBottomLeftRadius: 6 },
  messageText: { ...chatType.body, color: x.day.text },
  userText: { color: x.brand.white },
  attachments: { gap: s.sm, marginLeft: 34 + s.sm },
  suggestionsLabel: { ...chatType.meta, fontFamily: f.semibold, color: x.day.textSecondary },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: s.sm,
    minHeight: mobileLayout.touchTarget,
    paddingHorizontal: s.lg,
    borderRadius: radius.pill,
    backgroundColor: x.action.primary,
  },
  loginText: { ...chatType.small, fontFamily: f.semibold, color: x.action.onPrimary },
  error: { backgroundColor: x.day.tintWarm, padding: s.lg, borderRadius: 18, gap: s.sm },
  retry: { flexDirection: 'row', alignItems: 'center', gap: s.sm, minHeight: mobileLayout.touchTarget },
  actionText: { ...chatType.small, fontFamily: f.semibold, color: x.day.link },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: mobileLayout.touchTarget,
    alignSelf: 'flex-start',
    paddingHorizontal: s.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: x.day.link,
    backgroundColor: x.day.surface,
  },
  chipText: { ...chatType.small, fontFamily: f.semibold, color: x.day.link },
  composerArea: { borderTopWidth: 1, borderTopColor: x.day.line, padding: s.md, gap: s.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: x.day.line,
    borderRadius: 24,
    padding: s.xs,
    backgroundColor: x.day.canvas,
  },
  input: {
    flex: 1,
    minHeight: mobileLayout.touchTarget,
    maxHeight: 120,
    // Ô nhiều dòng trên iOS cần đặt riêng đệm trên và dưới để căn giữa dòng đầu.
    paddingHorizontal: s.md,
    paddingTop: COMPOSER_INPUT_PADDING,
    paddingBottom: COMPOSER_INPUT_PADDING,
    textAlignVertical: 'center',
    fontFamily: f.regular,
    color: x.day.text,
    ...chatType.body,
  },
  send: {
    width: mobileLayout.touchTarget,
    height: mobileLayout.touchTarget,
    borderRadius: mobileLayout.touchTarget / 2,
    backgroundColor: x.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { ...compactType.meta, textAlign: 'center', color: x.day.textSecondary },
  confirmBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s.xl,
  },
  confirm: { backgroundColor: x.day.surface, borderRadius: 24, padding: s.xl, gap: s.md, maxWidth: 340 },
  mutedBody: { ...compactType.body, color: x.day.textSecondary },
  confirmAction: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: x.day.canvas,
  },
});
