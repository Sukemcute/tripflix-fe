import { vi } from '@tripflix/i18n';
import { explorer as x, colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { StyleSheet, View } from 'react-native';
import { compactType } from '@/components/mobile-scale';
import { Icon, Txt } from '@/components/mobile-ui';

/** Tích "Đã đi" (TF105): lộ trình lấy từ chuyến đã đi xong của chính người đăng, server xác thực lúc đăng. */
export function VerifiedTripBadge({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const color = tone === 'light' ? x.day.surface : x.day.link;
  return (
    <View
      style={[styles.badge, tone === 'light' ? styles.light : styles.dark]}
      accessible
      accessibilityLabel={vi.mobile.tripPlan.verifiedLabel}
    >
      <Icon name="checkmark-circle" size={12} color={color} />
      <Txt style={[styles.text, { color }]}>{vi.mobile.tripPlan.verified}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    // Ôm vừa chữ, không kéo dài theo khung cha (khối tác giả xếp dọc).
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  light: { backgroundColor: colors.overlay },
  dark: { backgroundColor: x.day.tintExplore },
  text: { ...compactType.label, fontFamily: nativeFonts.semibold },
});
