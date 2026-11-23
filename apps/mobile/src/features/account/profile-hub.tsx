import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, socialApi, useApiSession } from '@tripflix/api-client';
import { formatProfileCount, getNameInitials, holdCountdown } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
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
    <View style={styles.group}>
      <View style={styles.hero}>
        <Image
          source={assets.vietnam}
          contentFit="cover"
          accessible={false}
          aria-hidden
          style={styles.photo}
        />
        <LinearGradient
          colors={[colors.sun, colors.sun, colors.transparent]}
          locations={[0, 0.48, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <Txt style={styles.eyebrow}>{text.eyebrow}</Txt>
        {!isGuest && (
          <View style={styles.initials}>
            <Txt style={styles.initialsText} accessible={false} aria-hidden allowFontScaling={false}>
              {getNameInitials(name) || 'TF'}
            </Txt>
          </View>
        )}
        <Txt accessibilityRole="header" style={styles.name}>
          {name}
        </Txt>
      </View>
      {!!stats.length && (
        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Txt style={styles.number}>{formatProfileCount(stat.value)}</Txt>
              <Txt style={styles.meta}>{stat.label}</Txt>
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
              <Txt style={styles.number}>{money(pending.total)}</Txt>
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
                <Txt style={styles.actionText}>
                  {pending.status === 'pending' ? text.continuePayment : text.checkPayment}
                </Txt>
                <Icon name="arrow-forward" size={20} color={colors.background} />
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
                <Icon name="arrow-forward" size={20} color={colors.background} />
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
          <Icon name="bag-handle-outline" size={24} color={colors.tealInk} />
          <Txt style={styles.shortcutTitle}>{text.trips}</Txt>
          <Txt style={styles.meta}>{text.tripHint}</Txt>
          <Icon name="arrow-forward" size={20} color={colors.tealInk} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.viewSaved}
          onPress={() => open('/saved')}
          style={({ pressed }) => [styles.shortcut, styles.yellow, pressed && styles.pressed]}
        >
          <Icon name="bookmark-outline" size={24} color={colors.ink} />
          <Txt style={styles.shortcutTitle}>{text.saved}</Txt>
          <Txt style={styles.meta}>{text.savedHint}</Txt>
          <Icon name="arrow-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.lg },
  hero: {
    minHeight: 180,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.sun,
  },
  photo: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '60%' },
  eyebrow: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: nativeFonts.semibold,
    letterSpacing: 1,
    color: colors.navy,
    maxWidth: '65%',
  },
  initials: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.navy,
  },
  initialsText: { fontSize: 18, lineHeight: 28, fontFamily: nativeFonts.semibold, color: colors.background },
  name: { fontSize: 28, lineHeight: 38, fontFamily: nativeFonts.bold, color: colors.navy, maxWidth: '65%' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, gap: spacing.xs, alignItems: 'center' },
  number: { fontSize: 22, lineHeight: 32, fontFamily: nativeFonts.semibold, color: colors.navy },
  meta: { fontSize: 13, lineHeight: 22, color: colors.ink },
  section: { fontSize: 22, lineHeight: 32, fontFamily: nativeFonts.semibold, color: colors.navy },
  panel: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.md },
  shortcuts: { flexDirection: 'row', gap: spacing.md },
  shortcut: { flex: 1, padding: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  shortcutTitle: { fontSize: 18, lineHeight: 27, fontFamily: nativeFonts.semibold, color: colors.navy },
  panelTitle: { fontSize: 20, lineHeight: 30, fontFamily: nativeFonts.semibold, color: colors.navy },
  coral: { backgroundColor: colors.coralTint },
  yellow: { backgroundColor: colors.sunSoft },
  sea: { backgroundColor: colors.seaMist },
  action: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.navy,
    marginTop: spacing.xs,
  },
  pay: { backgroundColor: colors.coralInk },
  actionText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: nativeFonts.semibold,
    color: colors.background,
    flexShrink: 1,
  },
  pressed: { opacity: 0.8 },
  error: { gap: spacing.xs },
  retry: {
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  retryText: { fontSize: 14, lineHeight: 23, color: colors.coralInk, fontFamily: nativeFonts.semibold },
});
