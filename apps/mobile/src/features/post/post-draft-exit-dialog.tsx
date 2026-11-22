import { vi } from '@tripflix/i18n';
import { colors, nativeFonts, spacing } from '@tripflix/tokens';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, type ComponentRef } from 'react';
import { Button, Icon, Notice, Txt } from '@/components/mobile-ui';

const text = vi.mobile.create.recovery;

export function PostDraftExitDialog({
  visible,
  busy,
  error,
  onKeep,
  onDiscard,
  onContinue,
}: {
  visible: boolean;
  busy: boolean;
  error: boolean;
  onKeep: () => void;
  onDiscard: () => void;
  onContinue: () => void;
}) {
  const dialog = useRef<ComponentRef<typeof View>>(null);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={() => dialog.current?.focus()}
      onRequestClose={() => {
        if (!busy) onContinue();
      }}
    >
      <SafeAreaView style={styles.backdrop}>
        <View
          ref={dialog}
          tabIndex={-1}
          role="dialog"
          accessibilityViewIsModal
          accessibilityLabel={text.leaveTitle}
          style={styles.dialog}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.icon}>
              <Icon name="document-text-outline" size={26} color={colors.navy} />
            </View>
            <Txt style={styles.title}>{text.leaveTitle}</Txt>
            <Txt style={styles.body}>{text.leaveBody}</Txt>
            {error && <Notice tone="error">{text.failed}</Notice>}
            <Button style={styles.primary} disabled={busy} onPress={onKeep}>
              {busy ? text.savingExit : text.keep}
            </Button>
            <Button style={styles.secondary} tone="secondary" disabled={busy} onPress={onContinue}>
              {text.continue}
            </Button>
            <Button style={styles.secondary} tone="text" disabled={busy} onPress={onDiscard}>
              {text.discard}
            </Button>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', padding: spacing.md, backgroundColor: colors.overlay },
  dialog: {
    backgroundColor: colors.background,
    borderRadius: 8,
    maxHeight: '95%',
  },
  content: { padding: spacing.lg, gap: spacing.md },
  icon: { alignSelf: 'flex-start', padding: spacing.md, backgroundColor: colors.sun, borderRadius: 8 },
  title: { fontSize: 23, lineHeight: 33, fontFamily: nativeFonts.bold, color: colors.navy },
  body: { fontSize: 14, lineHeight: 23, color: colors.textMuted },
  primary: { borderRadius: 8, minHeight: 48, backgroundColor: colors.coralInk },
  secondary: { borderRadius: 8, minHeight: 48 },
});
