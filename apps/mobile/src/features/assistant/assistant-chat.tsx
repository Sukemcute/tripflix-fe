import { vi } from '@tripflix/i18n';
import { colors as c, nativeFonts as f, spacing as s } from '@tripflix/tokens';
import { useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Icon, IconButton, Mascot, Txt, type IconName } from '@/components/mobile-ui';
import { useAssistant } from './assistant-provider';

const copy = vi.assistant;

export function AssistantChat({ onMinimize }: { onMinimize: () => void }) {
  const chat = useAssistant();
  const insets = useSafeAreaInsets();
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const isDisabled = !chat.draft.trim() || chat.isPending || chat.hasError;
  function close() {
    Keyboard.dismiss();
    onMinimize();
  }
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
      </View>
      {chat.isPreview && (
        <View style={styles.preview}>
          <Icon name="flask-outline" size={14} color={c.coralInk} />
          <Txt variant="caption" style={{ color: c.coralInk }}>
            {copy.preview}
          </Txt>
        </View>
      )}
      <ScrollView
        ref={list}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={() => {
          if (chat.messages.length) list.current?.scrollToEnd({ animated: false });
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
      </ScrollView>
      <View style={[styles.composerArea, { paddingBottom: Math.max(s.md, insets.bottom) }]}>
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
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const isClosing = useRef(false);
  const backdropMotion = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const dialogMotion = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      { translateY: reducedMotion ? 0 : (1 - progress.get()) * 64 },
      { scale: reducedMotion ? 1 : 0.97 + progress.get() * 0.03 },
    ],
  }));
  function finishClose() {
    chat.setIsOpen(false);
  }
  function open() {
    isClosing.current = false;
    progress.set(0);
    progress.set(
      reducedMotion
        ? withTiming(1, { duration: 100, reduceMotion: ReduceMotion.Never })
        : withSpring(1, {
            duration: 300,
            dampingRatio: 0.8,
            overshootClamping: true,
            reduceMotion: ReduceMotion.System,
          }),
    );
  }
  const close = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    Keyboard.dismiss();
    // Keep the native modal mounted until its exit finishes; otherwise it disappears abruptly.
    progress.set(
      withTiming(
        0,
        {
          duration: reducedMotion ? 100 : 200,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
          reduceMotion: ReduceMotion.Never,
        },
        (finished) => {
          if (finished) scheduleOnRN(finishClose);
        },
      ),
    );
  };
  return (
    <Modal
      visible={chat.isOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={open}
      onRequestClose={close}
    >
      <View style={[styles.backdrop, { paddingTop: insets.top + s.lg }]}>
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
        <Animated.View style={[styles.dialog, dialogMotion]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <AssistantChat onMinimize={close} />
        </Animated.View>
      </View>
    </Modal>
  );
}

export function AssistantScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <AssistantChat onMinimize={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  dialog: {
    width: '100%',
    maxWidth: 430,
    flex: 1,
    maxHeight: '94%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: c.background,
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
    padding: s.md,
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
