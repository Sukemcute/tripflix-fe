import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, socialApi, useApiSession } from '@tripflix/api-client';
import { formatProfileCount, getNameInitials, holdCountdown } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { assets, copy, Icon, money, Txt } from '@/components/mobile-ui';
import { useRefreshOnOpen } from '@/features/booking/commerce-state';

const text = copy.profile.hub;

export function OwnProfileHeading({
  name,
  stats = [],
  isGuest = false,
}: {
  name: string;
  stats?: { value: number; label: string }[];
  isGuest?: boolean;
}) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.identity}>
        <LinearGradient
          colors={x.sunset}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={styles.avatar}>
            {isGuest ? (
              <Image
                source={assets.welcome}
                contentFit="contain"
                accessible={false}
                aria-hidden
                style={styles.guestArt}
              />
            ) : (
              <Txt style={styles.initialsText} accessible={false} aria-hidden allowFontScaling={false}>
                {getNameInitials(name) || 'TF'}
              </Txt>
            )}
          </View>
        </LinearGradient>
        <View style={styles.identityCopy}>
          <Txt accessibilityRole="header" style={styles.name}>
            {name}
          </Txt>
        </View>
      </View>
      {!!stats.length && (
        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Txt style={styles.number}>{formatProfileCount(stat.value)}</Txt>
              <Txt style={styles.statLabel}>{stat.label}</Txt>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Personal shortcuts belong on Tôi; settings contains account controls, not another copy. */
export function ProfileHub() {
  const { user, isReady } = useApiSession();
  const [now, setNow] = useState(() => new Date());
  const enabled = isReady && !!user;
  const trips = useQuery({
    queryKey: ['commerce', 'trips', user?.id, 'profile-preview'],
    enabled,
    queryFn: ({ signal }) => commerceApi.listTrips(undefined, signal),
    retry: false,
    staleTime: 0,
  });
  const drafts = useQuery({
    queryKey: ['social', 'my-posts', user?.id, 'draft', 'profile-preview'],
    enabled,
    queryFn: ({ signal }) => socialApi.listMyPosts({ status: 'draft', limit: 1 }, signal),
    retry: false,
    staleTime: 0,
  });
  useRefreshOnOpen(trips.refetch, enabled);
  useRefreshOnOpen(drafts.refetch, enabled);
  // This is a preview of recent orders, never an account-wide count from a partial page.
  const pending = trips.data?.trips.find(
    (trip) =>
      trip.status === 'paying' ||
      (trip.status === 'pending' &&
        Number.isFinite(Date.parse(trip.holdExpiresAt)) &&
        !holdCountdown(trip.holdExpiresAt, now).expired),
  );
  // `now` chỉ để biết chỗ giữ đã hết hạn chưa: hẹn giờ đúng lúc hết hạn sớm nhất thay vì vẽ lại cả màn mỗi giây.
  const nextExpiryMs = Math.min(
    ...(trips.data?.trips ?? [])
      .filter((trip) => trip.status === 'pending')
      .map((trip) => Date.parse(trip.holdExpiresAt))
      .filter((at) => Number.isFinite(at) && at > now.getTime()),
  );
  useEffect(() => {
    if (!enabled || !Number.isFinite(nextExpiryMs)) return;
    const timer = setTimeout(() => setNow(new Date()), nextExpiryMs - Date.now() + 100);
    return () => clearTimeout(timer);
  }, [enabled, nextExpiryMs]);
  const draft = drafts.data?.items[0];
  const open = (target: '/my-trips' | '/saved') =>
    router.push(user ? target : { pathname: '/login', params: { returnTo: target } });
  return (
    <View style={styles.group}>
      {!!user && (pending || draft) && (
        <View style={styles.group}>
          <Txt style={styles.section} accessibilityRole="header">
            {text.resume}
          </Txt>
          {pending && (
            <View testID="profile-pending" style={[styles.panel, styles.coral]}>
              <Txt style={styles.meta}>{pending.status === 'paying' ? text.paying : text.pending}</Txt>
              <Txt style={styles.panelTitle}>
                {pending.items.find((item) => item.propertyName)?.propertyName ||
                  pending.items[0]?.productName ||
                  copy.profile.myTrips}
              </Txt>
              <Txt style={[styles.number, { color: x.day.price }]}>{money(pending.total)}</Txt>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: pending.status === 'pending' ? '/checkout' : '/booking/[id]',
                    params: { id: pending.orderId },
                  })
                }
                style={({ pressed }) => [styles.action, styles.pay, pressed && styles.pressed]}
              >
                <Txt style={[styles.actionText, styles.payText]}>
                  {pending.status === 'pending' ? text.continuePayment : text.checkPayment}
                </Txt>
                <Icon name="arrow-forward" size={20} color={x.action.onPrimary} />
              </Pressable>
            </View>
          )}
          {draft && (
            <View testID="profile-draft" style={[styles.panel, styles.yellow]}>
              <Txt style={styles.meta}>{text.latestDraft}</Txt>
              <Txt style={styles.panelTitle}>{draft.title}</Txt>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/create', params: { postId: draft.id } })}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <Txt style={styles.actionText}>{text.continueDraft}</Txt>
                <Icon name="arrow-forward" size={20} color={x.brand.white} />
              </Pressable>
            </View>
          )}
        </View>
      )}
      {!!user && (trips.isPending || drafts.isPending) && <Txt style={styles.meta}>{text.loading}</Txt>}
      {!!user && !!trips.error && (
        <View style={styles.error}>
          <Txt style={styles.meta}>{text.tripError}</Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${vi.api.retry} · ${text.tripError}`}
            onPress={() => {
              void trips.refetch();
            }}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Txt style={styles.retryText}>{vi.api.retry}</Txt>
          </Pressable>
        </View>
      )}
      {!!user && !!drafts.error && (
        <View style={styles.error}>
          <Txt style={styles.meta}>{text.draftError}</Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${vi.api.retry} · ${text.draftError}`}
            onPress={() => {
              void drafts.refetch();
            }}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Txt style={styles.retryText}>{vi.api.retry}</Txt>
          </Pressable>
        </View>
      )}
      <View style={styles.shortcuts}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.viewTrips}
          onPress={() => open('/my-trips')}
          style={({ pressed }) => [styles.shortcut, styles.sea, pressed && styles.pressed]}
        >
          <Icon name="ticket-outline" size={24} color={x.day.link} />
          <Txt style={styles.shortcutTitle}>{text.trips}</Txt>
          <Txt style={styles.meta}>{text.tripHint}</Txt>
          <Icon name="arrow-forward" size={20} color={x.day.link} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.viewSaved}
          onPress={() => open('/saved')}
          style={({ pressed }) => [styles.shortcut, styles.yellow, pressed && styles.pressed]}
        >
          <Icon name="bookmark-outline" size={24} color={x.day.text} />
          <Txt style={styles.shortcutTitle}>{text.saved}</Txt>
          <Txt style={styles.meta}>{text.savedHint}</Txt>
          <Icon name="arrow-forward" size={20} color={x.day.text} />
        </Pressable>
      </View>
    </View>
  );
}

const card = {
  backgroundColor: x.day.surface,
  borderRadius: x.radius.xl,
  shadowColor: x.shadow,
  shadowOffset: { width: 0, height: x.elevation.floating.offsetY },
  shadowRadius: x.elevation.floating.blur,
  shadowOpacity: 0.07,
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  group: { gap: x.space.md },
  profileCard: { ...card, padding: x.space.md, gap: x.space.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: x.space.sm },
  avatarRing: { width: 72, height: 72, borderRadius: x.radius.pill, padding: 3 },
  avatar: {
    flex: 1,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.tintWarm,
    borderWidth: 2,
    borderColor: x.day.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  guestArt: { width: 58, height: 62, marginTop: 8 },
  initialsText: { fontSize: 22, lineHeight: 28, fontFamily: nativeFonts.extraBold, color: x.day.text },
  identityCopy: { flex: 1, gap: 2 },
  name: {
    fontSize: x.type.title.fontSize - 2,
    lineHeight: 30,
    fontFamily: nativeFonts.extraBold,
    letterSpacing: x.type.title.letterSpacing,
    color: x.day.text,
  },
  stats: {
    flexDirection: 'row',
    gap: x.space.xs,
    padding: x.space.sm,
    borderRadius: x.radius.lg,
    backgroundColor: x.day.tintExplore,
  },
  stat: { flex: 1, gap: 2, alignItems: 'center' },
  number: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: nativeFonts.extraBold,
    color: x.day.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 13, lineHeight: 18, color: x.day.textSecondary },
  meta: { fontSize: 14, lineHeight: 21, color: x.day.textSecondary },
  section: {
    fontSize: x.type.headline.fontSize,
    lineHeight: 28,
    fontFamily: nativeFonts.bold,
    color: x.day.text,
  },
  panel: { ...card, padding: x.space.md, gap: x.space.xs, borderRadius: x.radius.lg },
  shortcuts: { flexDirection: 'row', gap: x.space.sm },
  shortcut: { flex: 1, padding: x.space.md, borderRadius: x.radius.lg, gap: x.space.xs },
  shortcutTitle: { fontSize: 17, lineHeight: 24, fontFamily: nativeFonts.bold, color: x.day.text },
  panelTitle: { fontSize: 18, lineHeight: 26, fontFamily: nativeFonts.bold, color: x.day.text },
  coral: { backgroundColor: x.day.tintWarm },
  yellow: { backgroundColor: x.day.tintSun },
  sea: { backgroundColor: x.day.tintExplore },
  action: {
    minHeight: x.control.compact,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: x.space.xs,
    borderRadius: x.radius.pill,
    paddingVertical: x.space.xs,
    paddingHorizontal: x.space.md,
    backgroundColor: x.action.secondary,
    marginTop: x.space.xxs,
  },
  pay: { backgroundColor: x.action.primary },
  payText: { color: x.action.onPrimary },
  actionText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: nativeFonts.bold,
    color: x.action.onSecondary,
    flexShrink: 1,
  },
  pressed: { opacity: 0.8 },
  error: { gap: x.space.xxs },
  retry: {
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: x.space.md,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.surface,
    borderWidth: 1,
    borderColor: x.day.line,
  },
  retryText: { fontSize: 14, lineHeight: 20, color: x.day.link, fontFamily: nativeFonts.semibold },
});
