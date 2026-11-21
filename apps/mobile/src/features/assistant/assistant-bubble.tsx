import { vi } from '@tripflix/i18n';
import { explorer as x, colors, mobileLayout } from '@tripflix/tokens';
import { useNavigation } from 'expo-router';
import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Mascot } from '@/components/mobile-ui';
import { BUBBLE_MASCOT_SIZE, BUBBLE_SIZE, useAssistant } from './assistant-provider';

/** postId: reel đang xem, để Tripi đọc lộ trình, review và khách sạn của đúng reel đó. */
export function AssistantTrigger({ size, postId }: { size: number; postId?: string }) {
  const chat = useAssistant();
  const navigation = useNavigation();
  const bubble = useRef<ComponentRef<typeof View>>(null);
  const open = () => {
    if (!navigation.isFocused()) return;
    const anchor = bubble.current;
    if (!anchor) {
      chat.openDialog(undefined, postId);
      return;
    }
    anchor.measureInWindow((x, y, width, height) => {
      if (!navigation.isFocused() || bubble.current !== anchor) return;
      chat.openDialog(width > 0 && height > 0 ? { x, y, width, height } : undefined, postId);
    });
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={vi.assistant.open}
      accessibilityElementsHidden={chat.isOpen}
      aria-hidden={chat.isOpen}
      disabled={chat.isOpen}
      onPress={open}
      style={({ pressed }) => [styles.touch, pressed && styles.pressed, chat.isOpen && styles.hidden]}
    >
      <View
        ref={bubble}
        collapsable={false}
        pointerEvents="none"
        style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Mascot size={Math.round((size * BUBBLE_MASCOT_SIZE) / BUBBLE_SIZE)} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    width: mobileLayout.touchTarget,
    height: mobileLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.tintWarm,
    borderWidth: 2,
    borderColor: x.day.surface,
    boxShadow: `0 2px 8px ${colors.overlay}`,
  },
  pressed: { opacity: 0.75 },
  hidden: { opacity: 0 },
});
