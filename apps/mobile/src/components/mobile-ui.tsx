import Ionicons from '@expo/vector-icons/Ionicons';
import { vi } from '@tripflix/i18n';
import {
  colors as c,
  explorer as x,
  mobileLayout as layout,
  nativeFonts as f,
  spacing as s,
} from '@tripflix/tokens';
import { Image, type ImageSource } from 'expo-image';
import { router } from 'expo-router';
import {
  createContext,
  useContext,
  useRef,
  useState,
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
import { mobileIconSize } from './mobile-scale';

const d = x.day;

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
// Màn "gọn" vẫn dùng thang chữ explorer, chỉ hạ một bậc so với màn thường; không còn chữ 10–12px của compactType
// (audit UI/UX: chữ tối thiểu 12px, tiêu đề không bé hơn nhãn).
const compactText = {
  title: { fontSize: x.type.headline.fontSize, lineHeight: x.type.headline.lineHeight },
  heading: { fontSize: x.type.subhead.fontSize, lineHeight: x.type.subhead.lineHeight },
  label: { fontSize: x.type.label.fontSize, lineHeight: x.type.label.lineHeight },
  body: { fontSize: x.type.label.fontSize, lineHeight: 21 },
  small: { fontSize: x.type.caption.fontSize, lineHeight: 19 },
  caption: { fontSize: x.type.micro.fontSize, lineHeight: x.type.micro.lineHeight },
};

export function Icon({ name, size, color = d.text }: { name: IconName; size?: number; color?: string }) {
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
  disabledHint,
}: PropsWithChildren<{
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'teal' | 'text';
  disabled?: boolean;
  /** Vì sao nút đang tắt, hiện ngay dưới nút: nút mờ mà không giải thích thì người dùng không biết thiếu gì. */
  disabledHint?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  compact?: boolean;
}>) {
  const compactScreen = useContext(CompactScreenContext);
  const compact = compactOverride ?? compactScreen;
  const foreground =
    tone === 'primary' ? x.action.onPrimary : tone === 'teal' || tone === 'text' ? d.link : d.text;
  const hint = disabled && disabledHint ? disabledHint : undefined;
  const button = (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        compact && ui.compactButton,
        ui[tone],
        disabled && ui.disabled,
        pressed && (tone === 'primary' ? ui.primaryPressed : ui.pressed),
        style,
      ]}
    >
      <Txt
        variant="label"
        // Chữ trắng trên coral chỉ đọc được khi đậm và đủ lớn: nút chính không thu nhãn về 11px như nút gọn khác.
        style={[
          { color: foreground, flexShrink: 1, textAlign: 'center' },
          compact && tone !== 'primary' && ui.compactLabel,
        ]}
      >
        {children}
      </Txt>
      {icon && <Icon name={icon} color={foreground} size={compact ? mobileIconSize.control : 20} />}
    </Pressable>
  );
  if (!hint) return button;
  return (
    <View style={ui.hintedButton}>
      {button}
      <Row style={ui.buttonHint}>
        <Icon name="information-circle-outline" size={16} color={d.textSecondary} />
        <Txt variant="small" style={[ui.muted, { flex: 1 }]}>
          {hint}
        </Txt>
      </Row>
    </View>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  light = false,
  color = d.text,
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
        light && { backgroundColor: d.surface },
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
  const foreground = tone === 'teal' ? d.link : tone === 'coral' ? c.coralInk : d.text;
  return (
    <View
      style={[
        ui.badge,
        { backgroundColor: tone === 'teal' ? d.tintExplore : tone === 'sun' ? d.tintSun : d.tintWarm },
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
        { backgroundColor: tone === 'info' ? d.tintExplore : tone === 'warning' ? d.tintSun : d.tintWarm },
      ]}
    >
      <Icon
        name={
          tone === 'error'
            ? 'alert-circle-outline'
            : tone === 'warning'
              ? 'warning-outline'
              : 'information-circle-outline'
        }
        color={tone === 'error' ? d.error : d.link}
        size={compact ? mobileIconSize.control : 20}
      />
      <Txt variant="small" style={{ flex: 1, color: tone === 'error' ? d.error : d.text }}>
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
  hideLabel = false,
  onFocus,
  onBlur,
  ...props
}: ComponentProps<typeof TextInput> & {
  label: string;
  error?: string;
  compact?: boolean;
  /** Ẩn nhãn nhìn thấy khi màn đã có tiêu đề riêng; nhãn vẫn đọc được bằng trình đọc màn hình. */
  hideLabel?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const compactScreen = useContext(CompactScreenContext);
  const compact = compactOverride ?? compactScreen;
  // Viền xanh khi đang gõ, như ô ở màn đăng nhập: thấy ngay ô nào đang nhận chữ.
  const [isFocused, setFocused] = useState(false);
  return (
    <View style={{ gap: compact ? s.xs : s.sm }}>
      {!hideLabel && (
        <Txt variant="label" style={compact && ui.compactLabel}>
          {label}
        </Txt>
      )}
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={d.textSecondary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          ui.input,
          compact && ui.compactInput,
          isFocused && ui.inputFocused,
          error && { borderColor: d.error },
          style,
        ]}
      />
      {error && (
        <Txt accessibilityRole="alert" variant="small" style={{ color: d.error }}>
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
      style={({ pressed }) => [ui.chip, selected && ui.chipSelected, pressed && ui.pressed]}
    >
      <Txt variant="small" style={{ color: selected ? x.brand.white : d.text, fontFamily: f.semibold }}>
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
          style={[ui.segment, selected === index && ui.segmentSelected]}
        >
          <Txt
            variant="small"
            style={{
              color: selected === index ? d.text : d.textSecondary,
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
/**
 * true khi màn nằm trong thanh tab dưới: thanh tab đã chừa vùng vuốt về nhà của máy, nên màn không chừa thêm
 * lần nữa (chừa hai lần thì máy có vùng vuốt như iPhone bị hở một dải trống trên thanh tab).
 */
export const InsideTabBarContext = createContext(false);

export function Screen({
  children,
  title,
  back = true,
  footer,
  right,
  header,
  padded = true,
  scroll = true,
  background = d.canvas,
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
  const isInsideTabBar = useContext(InsideTabBarContext);
  return (
    <CompactScreenContext.Provider value={compact}>
      <SafeAreaView
        edges={isInsideTabBar ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}
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
      <Txt variant={total ? 'label' : 'small'} style={{ flex: 1, color: total ? d.text : d.textSecondary }}>
        {label}
      </Txt>
      <Txt variant={total ? 'heading' : 'label'}>{amount}</Txt>
    </Row>
  );
}

const lift = {
  shadowColor: x.shadow,
  shadowOffset: { width: 0, height: -x.elevation.floating.offsetY },
  shadowRadius: x.elevation.floating.blur,
  shadowOpacity: x.elevation.floating.opacity,
  elevation: x.elevation.floating.android,
} as const;

export const ui = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: s.md },
  content: { flexGrow: 1, gap: x.space.xl, paddingBottom: x.space.xxl },
  pad: { paddingHorizontal: x.gutter, paddingTop: x.space.sm },
  typography: { color: d.text, fontFamily: f.regular },
  body: { fontSize: x.type.body.fontSize, lineHeight: x.type.body.lineHeight },
  title: {
    fontSize: x.type.title.fontSize,
    lineHeight: x.type.title.lineHeight,
    fontFamily: f.extraBold,
    letterSpacing: x.type.title.letterSpacing,
  },
  heading: {
    fontSize: x.type.headline.fontSize,
    lineHeight: x.type.headline.lineHeight,
    fontFamily: f.bold,
    letterSpacing: x.type.headline.letterSpacing,
  },
  small: { fontSize: 14, lineHeight: 21 },
  caption: { fontSize: x.type.caption.fontSize, lineHeight: x.type.caption.lineHeight },
  label: { fontSize: x.type.label.fontSize, lineHeight: 22, fontFamily: f.semibold },
  muted: { color: d.textSecondary },
  center: { textAlign: 'center' },
  button: {
    minHeight: x.control.primary,
    borderRadius: x.radius.pill,
    paddingHorizontal: x.space.lg,
    paddingVertical: x.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.sm,
  },
  compactButton: { minHeight: x.control.compact, paddingVertical: s.sm, paddingHorizontal: s.lg, gap: s.xs },
  compactLabel: { fontSize: x.type.label.fontSize, lineHeight: x.type.label.lineHeight },
  primary: { backgroundColor: x.action.primary },
  primaryPressed: { backgroundColor: x.action.primaryPressed },
  secondary: { backgroundColor: d.surface, borderWidth: 1, borderColor: d.line },
  teal: { backgroundColor: d.tintExplore },
  text: { backgroundColor: c.transparent },
  disabled: { opacity: 0.45 },
  hintedButton: { gap: s.xs },
  buttonHint: { gap: s.xs, alignItems: 'flex-start' },
  pressed: { opacity: 0.78 },
  iconButton: {
    width: x.control.touch,
    height: x.control.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: x.radius.pill,
  },
  card: {
    padding: x.space.md,
    borderRadius: x.radius.lg,
    gap: s.md,
    backgroundColor: d.surface,
  },
  compactCard: { padding: s.md, gap: s.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: s.xs,
    paddingVertical: s.xs,
    paddingHorizontal: x.space.sm,
    borderRadius: x.radius.pill,
  },
  notice: {
    padding: x.space.md,
    borderRadius: x.radius.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s.sm,
  },
  inputFocused: { borderColor: d.link },
  input: {
    minHeight: x.control.primary,
    borderWidth: 1,
    borderColor: d.input,
    borderRadius: x.radius.md,
    paddingHorizontal: x.space.md,
    paddingVertical: s.md,
    fontFamily: f.regular,
    fontSize: x.type.body.fontSize,
    color: d.text,
    backgroundColor: d.surface,
  },
  compactInput: {
    minHeight: layout.touchTarget,
    fontSize: x.type.label.fontSize,
    lineHeight: 21,
    paddingVertical: s.sm,
    paddingHorizontal: s.md,
  },
  chip: {
    minHeight: layout.touchTarget,
    paddingHorizontal: x.space.md,
    paddingVertical: s.sm,
    borderWidth: 1,
    borderColor: d.line,
    borderRadius: x.radius.pill,
    backgroundColor: d.surface,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: d.link, borderColor: d.link },
  segments: { gap: s.lg, borderBottomWidth: 1, borderBottomColor: d.line, flexWrap: 'wrap' },
  segment: {
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: c.transparent,
    paddingVertical: s.md,
  },
  segmentSelected: { borderBottomColor: x.action.primary },
  header: { minHeight: 56, paddingHorizontal: x.space.xs, paddingVertical: s.xs },
  footer: {
    paddingHorizontal: x.gutter,
    paddingTop: x.space.sm,
    paddingBottom: x.space.sm,
    gap: s.sm,
    backgroundColor: d.surface,
    ...lift,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: x.backdrop },
  sheet: {
    backgroundColor: d.surface,
    padding: x.gutter,
    borderTopLeftRadius: x.radius.xl,
    borderTopRightRadius: x.radius.xl,
    maxHeight: '85%',
    gap: s.lg,
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: s.xxl, gap: s.lg },
  emptyInset: { marginHorizontal: s.lg },
  priceRow: { justifyContent: 'space-between', paddingVertical: s.sm },
  total: { borderTopWidth: 1, borderTopColor: d.line, paddingTop: s.lg, marginTop: s.sm },
});
