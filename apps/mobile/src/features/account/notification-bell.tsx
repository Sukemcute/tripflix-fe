import { useNotifications } from '@tripflix/api-client';
import { t } from '@tripflix/i18n';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { copy, IconButton } from '@/components/mobile-ui';
import { UnreadBadge } from '@/components/unread-badge';

/** Số thông báo chưa đọc; socket /ws (TF46E) làm mới danh sách nên số tự cập nhật. */
export function useUnreadNotificationCount(): number {
  return useNotifications().data?.pages[0]?.unreadCount ?? 0;
}

export function NotificationBell() {
  const count = useUnreadNotificationCount();
  return (
    <View>
      <IconButton
        name="notifications-outline"
        label={count ? t('mobile.notifications.bellLabel', { count }) : copy.common.notification}
        onPress={() => router.push('/notifications')}
      />
      <UnreadBadge count={count} style={styles.badge} />
    </View>
  );
}

const styles = StyleSheet.create({ badge: { top: 2, right: 0 } });
