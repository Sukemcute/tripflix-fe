import { vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Txt } from '@/components/mobile-ui';

/** Ảnh khách sạn; khi chưa có hoặc tải lỗi thì hiện khung dự phòng có chữ thay vì ô trống. */
export function StayPhoto({ uri, style }: { uri?: string | null; style: StyleProp<ViewStyle> }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (!uri || uri === failedUri)
    return (
      <View style={[style, styles.fallback]}>
        <Icon name="image-outline" size={28} color={x.day.link} />
        <Txt style={styles.label}>{vi.mobile.explorer.photoUnavailable}</Txt>
      </View>
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
    backgroundColor: x.day.tintExplore,
  },
  label: { fontFamily: nativeFonts.medium, fontSize: 13, lineHeight: 18, color: x.day.textSecondary },
});
