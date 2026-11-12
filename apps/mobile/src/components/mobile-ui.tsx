import Ionicons from '@expo/vector-icons/Ionicons';
import { vi } from '@tripflix/i18n';
import { colors as c, mobileLayout as layout, nativeFonts as f, spacing as s } from '@tripflix/tokens';
import { Image, type ImageSource } from 'expo-image';
import { router } from 'expo-router';
import {
  createContext,
  useContext,
  useRef,
  type ComponentProps,
  type ComponentRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { compactType, mobileIconSize } from './mobile-scale';

export const copy = vi.mobile;
export const assets = {
  beach: require('../../assets/brand/beach.jpg'),
  sea: require('../../assets/brand/sea.jpg'),
  vietnam: require('../../assets/brand/vietnam.jpg'),
  hotel: require('../../assets/brand/hotel.jpg'),
  hoiAn: require('../../assets/brand/hoian.jpg'),
  welcome: require('../../assets/brand/tripi-welcome.png'),
  curious: require('../../assets/brand/tripi-curious.png'),
  explore: require('../../assets/brand/tripi-explore.png'),
  celebrate: require('../../assets/brand/tripi-celebrate.png'),
  logo: require('../../assets/brand/tripflix-logo.svg'),
} satisfies Record<string, ImageSource>;

export function money(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}
export function formatDate(value: string): string {
  return value.split('-').reverse().join('/');
}
export type IconName = ComponentProps<typeof Ionicons>['name'];
const CompactScreenContext = createContext(false);
const compactText = {
  title: compactType.title,
  heading: compactType.heading,
  label: compactType.label,
  body: compactType.body,
  small: compactType.body,
  caption: compactType.meta,
};

export function Icon({ name, size, color = c.ink }: { name: IconName; size?: number; color?: string }) {
  const compact = useContext(CompactScreenContext);
  return (
    <Ionicons
      name={name}
      size={size ?? (compact ? mobileIconSize.control : 22)}
      color={color}
      accessible={false}
      aria-hidden
    />
  );
}
export function Txt({
  children,
  variant = 'body',
  style,
  ...props
}: PropsWithChildren<
  {
    variant?: 'body' | 'title' | 'heading' | 'small' | 'caption' | 'label';
    style?: StyleProp<TextStyle>;
  } & Omit<ComponentProps<typeof NativeText>, 'style'>
>) {
  const compact = useContext(CompactScreenContext);
  return (
    <NativeText
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      {...props}
      style={[ui.typography, ui[variant], compact && compactText[variant], style]}
    >
      {children}
    </NativeText>
  );
}
export function Button({
  children,
  onPress,
  tone = 'primary',
  disabled,
  icon,
  style,
  testID,
  compact: compactOverride,
}: PropsWithChildren<{
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'teal' | 'text';
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  compact?: boolean;
}>) {
  const compactScreen = useContext(CompactScreenContext);
  const compact = compactOverride ?? compactScreen;
  const foreground = tone === 'primary' ? c.background : tone === 'text' ? c.coralInk : c.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [ui.button, compact && ui.compactButton, ui[tone], disabled && ui.disabled, pressed && ui.pressed, style]}
    >
      <Txt variant="label" style={[{ color: foreground, flexShrink: 1, textAlign: 'center' }, compact && ui.compactLabel]}>
        {children}
      </Txt>
      {icon && <Icon name={icon} color={foreground} size={compact ? mobileIconSize.control : 20} />}
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  light = false,
  color = c.ink,
  size,
  disabled = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  light?: boolean;
  color?: string;
  size?: number;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.iconButton,
        light && { backgroundColor: c.background },
        disabled && ui.disabled,
        pressed && ui.pressed,
      ]}
    >
      <Icon name={name} color={color} size={size} />
    </Pressable>
  );
}
export function Row({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[ui.row, style]}>{children}</View>;
}
export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const compact = useContext(CompactScreenContext);
  return <View style={[ui.card, compact && ui.compactCard, style]}>{children}</View>;
}
export function Badge({
  children,
  tone = 'teal',
  icon,
}: PropsWithChildren<{ tone?: 'teal' | 'sun' | 'coral'; icon?: IconName }>) {
  const compact = useContext(CompactScreenContext);
  const foreground = tone === 'teal' ? c.tealInk : tone === 'coral' ? c.coralInk : c.ink;
  return (
    <View
      style={[
        ui.badge,
        { backgroundColor: tone === 'teal' ? c.seaMist : tone === 'sun' ? c.sunSoft : c.coralTint },
      ]}
    >
      {icon && <Icon name={icon} size={compact ? mobileIconSize.inline : 14} color={foreground} />}
      <Txt variant="caption" style={{ color: foreground, fontFamily: f.semibold }}>
        {children}
      </Txt>
    </View>
  );
}
export function Notice({
  children,
  tone = 'info',
}: PropsWithChildren<{ tone?: 'info' | 'warning' | 'error' }>) {
  const compact = useContext(CompactScreenContext);
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[
        ui.notice,
        { backgroundColor: tone === 'info' ? c.seaMist : tone === 'warning' ? c.sunSoft : c.coralTint },
      ]}
    >
      <Icon
        name={
          tone === 'error'
            ? 'alert-circle-outline'
            : tone === 'warning'
              ? 'information-circle-outline'
              : 'shield-checkmark-outline'
        }
        color={tone === 'error' ? c.coralInk : c.tealInk}
        size={compact ? mobileIconSize.control : 20}
      />
      <Txt variant="small" style={{ flex: 1, color: tone === 'error' ? c.coralInk : c.ink }}>
        {children}
      </Txt>
    </View>
  );
}
export function Field({
  label,
  error,
  style,
  compact: compactOverride,
  ...props
}: ComponentProps<typeof TextInput> & { label: string; error?: string; compact?: boolean; style?: StyleProp<TextStyle> }) {
  const compactScreen = useContext(CompactScreenContext);
  const compact = compactOverride ?? compactScreen;
  return (
    <View style={{ gap: compact ? s.xs : s.sm }}>
      <Txt variant="label" style={compact && ui.compactLabel}>{label}</Txt>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        style={[ui.input, compact && ui.compactInput, error && { borderColor: c.danger }, style]}
      />
      {error && (
        <Txt accessibilityRole="alert" variant="small" style={{ color: c.coralInk }}>
          {error}
        </Txt>
      )}
    </View>
  );
}
export function Chip({
  children,
  selected = false,
  onPress,
}: PropsWithChildren<{ selected?: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[ui.chip, selected && { backgroundColor: c.ink, borderColor: c.ink }]}
    >
      <Txt
        variant="small"
        style={{ color: selected ? c.background : c.ink, fontFamily: selected ? f.semibold : f.regular }}
      >
        {children}
      </Txt>
    </Pressable>
  );
}
export function Segments({
  options,
  selected,
  onSelect,
}: {
  options: readonly string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <Row style={ui.segments}>
      {options.map((option, index) => (
        <Pressable
          key={option}
          accessibilityRole="tab"
          accessibilityState={{ selected: selected === index }}
          onPress={() => onSelect(index)}
          style={[ui.segment, selected === index && { borderBottomColor: c.coral }]}
        >
          <Txt
            variant="small"
            style={{
              color: selected === index ? c.ink : c.textMuted,
              fontFamily: selected === index ? f.bold : f.regular,
            }}
          >
            {option}
          </Txt>
        </Pressable>
      ))}
    </Row>
  );
}
export function Logo() {
  return (
    <Image
      source={assets.logo}
      contentFit="contain"
      style={{ width: 124, height: 40 }}
      accessibilityLabel={copy.common.logo}
    />
  );
}
export function Mascot({
  pose = 'curious',
  size = 148,
}: {
  pose?: 'curious' | 'welcome' | 'explore' | 'celebrate';
  size?: number;
}) {
  return (
    <Image
      source={assets[pose]}
      contentFit="contain"
      style={{ width: size, height: size }}
      accessibilityLabel={copy.common.mascot}
    />
  );
}
export function Header({ title, back = true, right }: { title?: string; back?: boolean; right?: ReactNode }) {
  return (
    <Row style={ui.header}>
      {back ? (
        <IconButton
          name="arrow-back"
          label={copy.common.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />
      ) : (
        <Logo />
      )}
      {title && (
        <Txt variant="label" style={{ flex: 1 }}>
          {title}
        </Txt>
      )}
      {!title && <View style={{ flex: 1 }} />}
      {right}
    </Row>
  );
}
export function Screen({
  children,
  title,
  back = true,
  footer,
  right,
  header,
  padded = true,
  scroll = true,
  background = c.background,
  compact = false,
}: PropsWithChildren<{
  title?: string;
  back?: boolean;
  footer?: ReactNode;
  right?: ReactNode;
  header?: ReactNode;
  padded?: boolean;
  scroll?: boolean;
  background?: string;
  compact?: boolean;
}>) {
  return (
    <CompactScreenContext.Provider value={compact}>
      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        style={[ui.screen, { backgroundColor: background }]}
      >
        <KeyboardAvoidingView style={ui.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {header === undefined ? <Header title={title} back={back} right={right} /> : header}
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[ui.content, padded && ui.pad]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[ui.flex, padded && ui.pad]}>{children}</View>
          )}
          {footer && <View style={ui.footer}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </CompactScreenContext.Provider>
  );
}
export function Sheet({
  title,
  visible,
  onClose,
  children,
}: PropsWithChildren<{ title: string; visible: boolean; onClose: () => void }>) {
  const dialog = useRef<ComponentRef<typeof View>>(null);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onShow={() => dialog.current?.focus()}
    >
      <View style={ui.backdrop}>
        <Pressable accessibilityLabel={copy.common.close} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View ref={dialog} accessibilityViewIsModal style={ui.sheet}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="heading" style={{ flex: 1 }}>
              {title}
            </Txt>
            <IconButton name="close" label={copy.common.close} onPress={onClose} />
          </Row>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: s.lg, paddingBottom: s.xl }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function Empty({
  title,
  body,
  action,
  onAction,
  pose = 'explore',
  compact = false,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  pose?: 'curious' | 'explore';
  compact?: boolean;
}) {
  return (
    <View style={[ui.empty, compact ? ui.emptyInset : ui.flex]}>
      <Mascot pose={pose} />
      <Txt variant="heading" style={ui.center}>
        {title}
      </Txt>
      <Txt variant="small" style={[ui.muted, ui.center]}>
        {body}
      </Txt>
      {action && onAction && (
        <Button onPress={onAction} icon="arrow-forward" style={{ alignSelf: 'stretch' }}>
          {action}
        </Button>
      )}
    </View>
  );
}
export function PriceRow({
  label,
  amount,
  total = false,
}: {
  label: string;
  amount: string;
  total?: boolean;
}) {
  return (
    <Row style={[ui.priceRow, total && ui.total]}>
      <Txt variant={total ? 'label' : 'small'} style={{ flex: 1, color: total ? c.ink : c.textMuted }}>
        {label}
      </Txt>
      <Txt variant={total ? 'heading' : 'label'}>{amount}</Txt>
    </Row>
  );
}

export const ui = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: s.md },
  content: { flexGrow: 1, gap: s.xl, paddingBottom: s.xl },
  pad: { paddingHorizontal: layout.gutter, paddingTop: s.md },
  typography: { color: c.ink, fontFamily: f.regular },
  body: { fontSize: 15, lineHeight: 24 },
  title: { fontSize: 28, lineHeight: 38, fontFamily: f.extraBold, letterSpacing: -0.8 },
  heading: { fontSize: 20, lineHeight: 29, fontFamily: f.bold, letterSpacing: -0.4 },
  small: { fontSize: 13, lineHeight: 21 },
  caption: { fontSize: 11, lineHeight: 17 },
  label: { fontSize: 14, lineHeight: 22, fontFamily: f.semibold },
  muted: { color: c.textMuted },
  center: { textAlign: 'center' },
  button: {
    minHeight: layout.buttonHeight,
    borderRadius: 14,
    paddingHorizontal: s.lg,
    paddingVertical: s.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.sm,
  },
  compactButton: { minHeight: layout.touchTarget, paddingVertical: s.sm, paddingHorizontal: s.md, gap: s.xs },
  compactLabel: compactType.label,
  primary: { backgroundColor: c.coral },
  secondary: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
  teal: { backgroundColor: c.teal },
  text: { backgroundColor: c.transparent },
  // Text buttons keep the same touch target as filled controls.
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  iconButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  card: {
    padding: s.lg,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: layout.cardRadius,
    gap: s.md,
    backgroundColor: c.background,
  },
  compactCard: { padding: s.md, gap: s.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: s.xs,
    paddingVertical: s.xs,
    paddingHorizontal: s.sm,
    borderRadius: 7,
  },
  notice: { padding: s.lg, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: s.sm },
  input: {
    minHeight: layout.buttonHeight,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: layout.inputRadius,
    paddingHorizontal: s.lg,
    paddingVertical: s.md,
    fontFamily: f.regular,
    fontSize: 14,
    color: c.ink,
    backgroundColor: c.background,
  },
  compactInput: {
    minHeight: layout.touchTarget,
    ...compactType.body,
    paddingVertical: s.sm,
    paddingHorizontal: s.md,
  },
  chip: {
    minHeight: layout.touchTarget,
    paddingHorizontal: s.lg,
    paddingVertical: s.md,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 99,
    justifyContent: 'center',
  },
  segments: { gap: s.lg, borderBottomWidth: 1, borderBottomColor: c.border, flexWrap: 'wrap' },
  segment: {
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: c.transparent,
    paddingVertical: s.md,
  },
  header: { minHeight: 60, paddingHorizontal: s.lg, paddingVertical: s.xs },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: s.md,
    paddingBottom: s.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: s.sm,
    backgroundColor: c.background,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
  sheet: {
    backgroundColor: c.background,
    padding: layout.gutter,
    borderTopLeftRadius: layout.sheetRadius,
    borderTopRightRadius: layout.sheetRadius,
    maxHeight: '85%',
    gap: s.lg,
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: s.xxl, gap: s.lg },
  emptyInset: { marginHorizontal: s.lg },
  priceRow: { justifyContent: 'space-between', paddingVertical: s.sm },
  total: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: s.lg, marginTop: s.sm },
});
