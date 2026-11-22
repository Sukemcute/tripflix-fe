import {
  getNotificationPostTarget,
  readCreatedNotification,
  useMarkNotificationRead,
  useNotificationsRealtime,
  type InboxNotification,
} from '@tripflix/api-client';
import { colors as c, spacing as s } from '@tripflix/tokens';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Txt, ui } from '@/components/mobile-ui';

const BANNER_MS = 5_000;

/** Đoạn trích bình luận BE lưu trong data (TF46E); thông báo cũ không có. */
export function getNotificationExcerpt(item: InboxNotification): string | null {
  return typeof item.data.excerpt === 'string' && item.data.excerpt ? item.data.excerpt : null;
}

/** Bấm thông báo (banner hay danh sách): đánh dấu đã đọc rồi mở bài, nhảy tới bình luận nếu có. */
export function openNotification(item: InboxNotification, markRead: (id: string) => void): void {
  if (!item.readAt) markRead(item.id);
  if (item.type.startsWith('moderation.')) {
    router.push('/moderation-status' as Href);
    return;
  }
  const target = getNotificationPostTarget(item);
  if (!target) return;
  router.push({
    pathname: '/trip/[slug]',
    params: {
      slug: target.postId,
      ...(target.commentId && { comment: target.commentId }),
      ...(target.threadId && { thread: target.threadId }),
    },
  });
}

/** Nối socket /ws khi app đang mở; có thông báo mới thì trượt banner từ trên xuống vài giây. */
export function NotificationBanner() {
  const insets = useSafeAreaInsets();
  const markRead = useMarkNotificationRead();
  const [item, setItem] = useState<InboxNotification | null>(null);
  useNotificationsRealtime((payload) => {
    const next = readCreatedNotification(payload);
    if (next) setItem(next);
  });
  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => setItem(null), BANNER_MS);
    return () => clearTimeout(timer);
  }, [item]);
  if (!item) return null;
  const excerpt = getNotificationExcerpt(item);
  return (
    <Animated.View
      key={item.id}
      entering={FadeInUp}
      exiting={FadeOutUp}
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + s.sm }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        onPress={() => {
          setItem(null);
          openNotification(item, markRead.mutate);
        }}
        style={styles.banner}
      >
        <View style={styles.icon}>
          <Icon name="chatbubble-ellipses-outline" color={c.tealInk} size={18} />
        </View>
        <View style={ui.flex}>
          <Txt variant="label" numberOfLines={1}>
            {item.title}
          </Txt>
          <Txt variant="small" style={ui.muted} numberOfLines={1}>
            {item.body}
          </Txt>
          {!!excerpt && (
            <Txt variant="small" numberOfLines={2}>
              “{excerpt}”
            </Txt>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: s.md, right: s.md, zIndex: 10 },
  banner: {
    flexDirection: 'row',
    gap: s.md,
    padding: s.md,
    borderRadius: 16,
    backgroundColor: c.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    shadowColor: c.ink,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.seaMist,
  },
});
