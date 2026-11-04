import { t, type MessageKey } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Màn hình tạm cho tab chưa làm. Thay bằng component trong src/features/<tính năng>/. */
export function PlaceholderScreen({ title }: { title: MessageKey }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <Text style={styles.brand}>{t('app.name')}</Text>
        <Text style={styles.title}>{t(title)}</Text>
        <Text style={styles.note}>{t('common.comingSoon')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  brand: { color: colors.coral, fontWeight: '700' },
  title: { color: colors.navy, fontSize: 28, fontWeight: '800' },
  note: { color: colors.textMuted },
});
