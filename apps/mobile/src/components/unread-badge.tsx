import { formatUnreadBadge } from '@tripflix/app-core';
import { explorer as x, nativeFonts } from '@tripflix/tokens';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

/** Chấm đỏ có số, đặt chồng lên góc phải trên của icon; số 0 thì ẩn. */
export function UnreadBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  const text = formatUnreadBadge(count);
  if (!text) return null;
  return (
    <View pointerEvents="none" style={[styles.badge, style]}>
      <Text style={styles.text} maxFontSizeMultiplier={1.2}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.brand.coral,
    borderWidth: 1.5,
    borderColor: x.day.surface,
  },
  text: { color: x.day.surface, fontFamily: nativeFonts.semibold, fontSize: 10, lineHeight: 12 },
});
