import { vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Txt } from '@/components/mobile-ui';

/** Ảnh khách sạn; khi chưa có hoặc tải lỗi thì hiện khung dự phòng có chữ thay vì ô trống. */
export function StayPhoto({ uri, style }: { uri?: string | null; style: StyleProp<ViewStyle> }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (!uri || uri === failedUri)
    return (
      // Gradient nhẹ xanh ngọc sang cam nhạt: ô thiếu ảnh vẫn hợp tông app, không thành mảng màu phẳng nổi bật.
      <LinearGradient
        colors={[x.day.tintExplore, x.day.tintWarm]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[style, styles.fallback]}
      >
        <Icon name="image-outline" size={28} color={x.day.link} />
        <Txt style={styles.label}>{vi.mobile.explorer.photoUnavailable}</Txt>
      </LinearGradient>
    );
  return (
    <Image
      source={uri}
      contentFit="cover"
      style={style as never}
      accessible={false}
      onError={() => setFailedUri(uri)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: x.space.xxs,
  },
  label: { fontFamily: nativeFonts.medium, fontSize: 13, lineHeight: 18, color: x.day.textSecondary },
});
