import { getApiErrorKind } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { explorer as x, colors as c, nativeFonts as fonts } from '@tripflix/tokens';
import {
  useRef,
  useState,
  useEffect,
  useId,
  type ComponentProps,
  type ComponentRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Txt, type IconName } from '@/components/mobile-ui';

export function AuthButton({
  children,
  onPress,
  disabled = false,
  icon,
  tone = 'primary',
  busy = false,
}: PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName;
  tone?: 'primary' | 'secondary' | 'text';
  busy?: boolean;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' ? styles.primary : tone === 'secondary' ? styles.secondary : styles.textButton,
        disabled && tone !== 'text' && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Txt style={[styles.buttonLabel, tone === 'primary' && styles.light, disabled && styles.disabledText]}>
        {children}
      </Txt>
      {icon && (
        <Icon
          name={icon}
          size={20}
          color={disabled ? x.day.textSecondary : tone === 'primary' ? x.action.onPrimary : x.day.text}
        />
      )}
    </Pressable>
  );
}

export function AuthField({
  label,
  trailing,
  error,
  focusOnError = false,
  style,
  onFocus,
  onBlur,
  ...props
}: Omit<ComponentProps<typeof TextInput>, 'style'> & {
  label: string;
  error?: string;
  focusOnError?: boolean;
  trailing?: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const errorId = useId();
  useEffect(() => {
    if (error && focusOnError) input.current?.focus();
  }, [error, focusOnError]);
  return (
    <View style={styles.field}>
      <Txt style={styles.label}>{label} *</Txt>
      <View style={[styles.inputFrame, focused && styles.focused, !!error && styles.invalid]}>
        <TextInput
          {...props}
          ref={input}
          accessibilityLabel={label}
          accessibilityHint={[vi.api.mobileAuthRequired, error].filter(Boolean).join('. ')}
          aria-required={true}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          placeholderTextColor={x.day.textSecondary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, style]}
        />
        {trailing}
      </View>
      {error && (
        <Txt nativeID={errorId} accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Txt>
      )}
    </View>
  );
}

export function AuthNotice({
  children,
  tone = 'info',
}: PropsWithChildren<{ tone?: 'info' | 'warning' | 'error' }>) {
  const error = tone === 'error';
  return (
    <View
      accessibilityRole={error ? 'alert' : undefined}
      style={[styles.notice, error && styles.errorNotice]}
    >
      <Icon
        name={error ? 'alert-circle-outline' : 'information-circle-outline'}
        size={20}
        color={error ? x.day.text : x.day.textSecondary}
      />
      <Txt style={[styles.noticeText, error && styles.errorText]}>{children}</Txt>
    </View>
  );
}

export function AuthErrorNotice({ error }: { error: unknown }) {
  return error ? <AuthNotice tone="error">{vi.api[getApiErrorKind(error)]}</AuthNotice> : null;
}

export function AuthChoice({
  children,
  selected = false,
  onPress,
  disabled = false,
  onBlur,
}: PropsWithChildren<{
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  onBlur?: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      aria-pressed={selected}
      disabled={disabled}
      onPress={onPress}
      onBlur={onBlur}
      style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}
    >
      <Txt style={[styles.choiceLabel, selected && styles.selectedLabel]}>{children}</Txt>
      <View style={styles.choiceCheck}>
        {selected && <Icon name="checkmark" size={18} color={x.day.link} />}
      </View>
    </Pressable>
  );
}

export function AuthSheet({
  children,
  visible,
  title,
  onClose,
}: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  const insets = useSafeAreaInsets();
  const panel = useRef<ComponentRef<typeof View>>(null);
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => panel.current?.focus()}
    >
      <View style={styles.backdrop}>
        <Pressable accessible={false} aria-hidden onPress={onClose} style={StyleSheet.absoluteFill} />
        <View
          ref={panel}
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <View style={styles.sheetHeader}>
            <Txt variant="heading" style={styles.sheetTitle}>
              {title}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={vi.mobile.common.close}
              onPress={onClose}
              style={styles.close}
            >
              <Icon name="close" size={24} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export const authInputFrame = {
  minHeight: 54,
  borderRadius: x.radius.md,
  backgroundColor: x.day.surface,
  borderWidth: 1,
  borderColor: x.day.input,
} as const;

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: x.radius.md,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  primary: { backgroundColor: x.action.primary },
  secondary: { backgroundColor: x.day.surface, borderWidth: 1, borderColor: x.day.line },
  textButton: { backgroundColor: c.transparent, minHeight: 48 },
  buttonLabel: {
    color: x.day.text,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    flexShrink: 1,
  },
  light: { color: x.action.onPrimary },
  disabled: { backgroundColor: x.day.line },
  disabledText: { color: x.day.textSecondary },
  pressed: { opacity: 0.8 },
  field: { gap: 8 },
  label: { fontSize: 14, lineHeight: 22, fontFamily: fonts.medium, color: x.day.text },
  inputFrame: { ...authInputFrame, flexDirection: 'row', alignItems: 'center' },
  focused: { borderColor: x.day.link },
  invalid: { borderColor: x.day.text },
  fieldError: { color: x.day.text, fontSize: 13, lineHeight: 22 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: fonts.regular,
    color: x.day.text,
    borderRadius: 8,
  },
  notice: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: x.day.canvas,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  errorNotice: { backgroundColor: x.day.tintWarm },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 22, color: x.day.textSecondary },
  errorText: { color: x.day.text },
  choice: {
    minHeight: 46,
    minWidth: 80,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: x.day.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexGrow: 1,
  },
  choiceSelected: { backgroundColor: x.day.tintExplore },
  choiceLabel: { fontSize: 14, lineHeight: 23, color: x.day.text, flexShrink: 1 },
  selectedLabel: { color: x.day.link, fontFamily: fonts.semibold },
  choiceCheck: { width: 18 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
  sheet: {
    backgroundColor: x.day.surface,
    width: '100%',
    maxWidth: 430,
    maxHeight: '82%',
    borderRadius: 10,
    alignSelf: 'center',
    padding: 20,
    gap: 12,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sheetTitle: { color: x.day.text, flex: 1 },
  sheetContent: { gap: 10 },
  close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
