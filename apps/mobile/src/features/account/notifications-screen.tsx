import {
  useApiSession,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type InboxNotification,
} from '@tripflix/api-client';
import { getNotificationAge, isSameLocalDay } from '@tripflix/app-core';
import { t } from '@tripflix/i18n';
import { colors as c, nativeFonts, spacing as s } from '@tripflix/tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import { ApiErrorNotice, RequireAccount } from '@/components/api-state';
import { Button, copy, Icon, type IconName, Screen, Txt, ui } from '@/components/mobile-ui';
import { getNotificationExcerpt, openNotification } from './notification-banner';

const text = copy.notifications;

/** Icon và màu theo nhóm thông báo, để nhìn lướt cũng biết là bình luận, cảm xúc, kiểm duyệt hay đơn. */
function getNotificationLook(item: InboxNotification): { icon: IconName; background: string; color: string } {
  if (item.type.startsWith('comment.')) return { icon: 'chatbubble-ellipses-outline', background: c.tealSoft, color: c.tealInk };
  if (item.type.startsWith('reaction.')) return { icon: 'heart-outline', background: c.coralTint, color: c.coralInk };
  if (item.type.startsWith('moderation.')) return { icon: 'shield-checkmark-outline', background: c.sunSoft, color: c.ink };
  if (item.type.startsWith('follow.')) return { icon: 'person-add-outline', background: c.seaMist, color: c.tealInk };
  if (typeof item.data.orderId === 'string') return { icon: 'bag-handle-outline', background: c.surfaceMuted, color: c.textMuted };
  return { icon: 'notifications-outline', background: c.surfaceMuted, color: c.textMuted };
}

function formatNotificationTime(createdAt: Date, now: Date): string {
  const age = getNotificationAge(createdAt, now);
  if (age.kind === 'justNow') return text.justNow;
  if (age.kind === 'minutes') return t('mobile.notifications.minutesAgo', { count: age.count });
  if (age.kind === 'hours') return t('mobile.notifications.hoursAgo', { count: age.count });
  if (age.kind === 'yesterday') return text.yesterday;
  return createdAt.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
}

function NotificationRow({ item, now, onPress }: { item: InboxNotification; now: Date; onPress: () => void }) {
  const look = getNotificationLook(item);
  const excerpt = getNotificationExcerpt(item);
  const isUnread = !item.readAt;
  const time = formatNotificationTime(new Date(item.createdAt), now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[isUnread && text.unreadMark, item.title, item.body, excerpt, time].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => [styles.row, isUnread && styles.unreadRow, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: look.background }]}>
        <Icon name={look.icon} color={look.color} size={19} />
      </View>
      <View style={ui.flex}>
        <Txt style={isUnread && styles.unreadTitle}>{item.title}</Txt>
        <Txt variant="small" style={ui.muted}>
          {item.body}
        </Txt>
        {!!excerpt && (
          <Txt variant="small" numberOfLines={2} style={styles.excerpt}>
            “{excerpt}”
          </Txt>
        )}
        <Txt variant="caption" style={styles.time}>
          {time}
        </Txt>
      </View>
      {isUnread && <View style={styles.dot} />}
    </Pressable>
  );
}

export function LiveNotificationsScreen() {
  const { user, isReady } = useApiSession();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  if (!isReady || !user) return <RequireAccount />;
  const items = notifications.data?.pages.flatMap((page) => page.items) ?? [];
  const unread = notifications.data?.pages[0]?.unreadCount ?? 0;
  // Mốc "bây giờ" là lúc tải danh sách: render lại không làm nhảy chữ, mỗi lần socket báo mới thì cập nhật.
  const now = new Date(notifications.dataUpdatedAt);
  const sections = [
    { title: text.today, items: items.filter((item) => isSameLocalDay(new Date(item.createdAt), now)) },
    { title: text.earlier, items: items.filter((item) => !isSameLocalDay(new Date(item.createdAt), now)) },
  ].filter((section) => section.items.length);
  return (
    <Screen
      title={text.title}
      right={
        unread > 0 && items[0] ? (
          <Button tone="text" compact disabled={markAll.isPending} onPress={() => markAll.mutate(items[0]!.id)}>
            {text.markAllRead}
          </Button>
        ) : undefined
      }
    >
      {!!items.length && (
        <Txt variant="small" style={[ui.muted, styles.summary]}>
          {unread > 0 ? t('mobile.notifications.unreadSummary', { count: unread }) : text.allRead}
        </Txt>
      )}
      {notifications.isPending && <Txt style={ui.muted}>{text.loading}</Txt>}
      <ApiErrorNotice error={notifications.error} retry={() => void notifications.refetch()} />
      <ApiErrorNotice error={markRead.error ?? markAll.error} />
      {!notifications.isPending && !notifications.error && !items.length && (
        <View style={styles.empty}>
          <View style={[styles.icon, styles.emptyIcon]}>
            <Icon name="notifications-outline" color={c.tealInk} size={28} />
          </View>
          <Txt variant="label">{text.empty}</Txt>
          <Txt variant="small" style={[ui.muted, styles.emptyBody]}>
            {text.emptyLive}
          </Txt>
        </View>
      )}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Txt variant="caption" style={styles.sectionTitle}>
            {section.title}
          </Txt>
          {section.items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              now={now}
              onPress={() => openNotification(item, markRead.mutate)}
            />
          ))}
        </View>
      ))}
      {notifications.hasNextPage && (
        <Button tone="text" disabled={notifications.isFetchingNextPage} onPress={() => void notifications.fetchNextPage()}>
          {text.loadMore}
        </Button>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginBottom: s.sm },
  section: { gap: s.xs, marginBottom: s.md },
  sectionTitle: { color: c.textMuted, fontFamily: nativeFonts.semibold, marginTop: s.sm, marginBottom: s.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: s.md, padding: s.md, borderRadius: 14 },
  unreadRow: { backgroundColor: c.coralTint },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  unreadTitle: { fontFamily: nativeFonts.semibold },
  excerpt: {
    marginTop: s.xs,
    paddingHorizontal: s.sm,
    paddingVertical: s.xs,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
    color: c.text,
  },
  time: { color: c.textSubtle, marginTop: s.xs },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.coral, marginTop: 6 },
  empty: { alignItems: 'center', gap: s.sm, paddingVertical: s.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.seaMist },
  emptyBody: { textAlign: 'center', maxWidth: 280 },
});
