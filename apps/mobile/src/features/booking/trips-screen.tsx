import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { commerceApi, useApiSession } from '@tripflix/api-client';
import type { TripDto } from '@tripflix/api-client/core-api/model/index';
import { holdCountdown } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { ApiErrorNotice } from '@/components/api-state';
import { Button, copy, Empty, formatDate, Icon, money, Screen, Txt, ui } from '@/components/mobile-ui';
import { CommerceError, useRefreshOnOpen } from './commerce-state';
import { NotificationBell } from '@/features/account/notification-bell';
import { LoadingDots } from '@/components/loading-dots';

const text = vi.commerce;
const labels = text.tripList;
const tabs = [labels.actionTab, labels.upcomingTab, labels.completedTab, labels.cancelledTab];
function getTripStatus(trip: TripDto, now: Date) {
  // Only pending holds expire locally; a payment in progress must be checked with the server.
  return trip.status === 'pending' &&
    Number.isFinite(Date.parse(trip.holdExpiresAt)) &&
    holdCountdown(trip.holdExpiresAt, now).expired
    ? 'expired'
    : trip.status;
}
function getTripTab(trip: TripDto, now: Date) {
  const status = getTripStatus(trip, now);
  if (status === 'cancelled' || status === 'expired') return 3;
  if (status === 'pending' || status === 'paying') return 0;
  // TF37: server tính theo giờ Việt Nam, không theo giờ máy.
  return trip.tripStatus === 'completed' ? 2 : 1;
}
export function CommerceTripsScreen() {
  const { user, isReady, error, session } = useApiSession();
  const [tab, setTab] = useState(0);
  return (
    <Screen
      compact
      background={colors.surface}
      title={copy.profile.myTrips}
      scroll={!user}
      right={<NotificationBell />}
    >
      <View style={styles.intro}>
        <Txt style={styles.title} accessibilityRole="header">
          {labels.title}
        </Txt>
        <Txt style={styles.body}>{labels.body}</Txt>
        <View style={styles.tabs}>
          {tabs.map((label, index) => (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === index }}
              onPress={() => setTab(index)}
              style={({ pressed }) => [
                styles.tab,
                tab === index && styles.selectedTab,
                pressed && ui.pressed,
              ]}
            >
              <Txt style={[styles.tabLabel, tab === index && styles.selectedLabel]}>{label}</Txt>
            </Pressable>
          ))}
        </View>
      </View>
      <ApiErrorNotice
        error={error}
        retry={() => {
          void session.initialize();
        }}
      />
      {!isReady ? (
        <LoadingDots />
      ) : user ? (
        <BookedTrips key={user.id} tab={tab} />
      ) : (
        <View style={ui.flex}>
          <Empty
            title={copy.trips.emptyTitle}
            body={copy.profile.body}
            compact
            action={copy.profile.login}
            onAction={() => router.push({ pathname: '/login', params: { returnTo: '/my-trips' } })}
          />
        </View>
      )}
    </Screen>
  );
}
function BookedTrips({ tab }: { tab: number }) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const query = useInfiniteQuery({
    queryKey: ['commerce', 'trips', user?.id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => commerceApi.listTrips(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
  });
  const { refetch } = query;
  const refresh = useCallback(
    () => Promise.all([refetch(), client.invalidateQueries({ queryKey: ['commerce', 'order', user?.id] })]),
    [refetch, client, user?.id],
  );
  useRefreshOnOpen(refresh);
  const trips = query.data?.pages
    .flatMap((page) => page.trips)
    .filter((trip) => getTripTab(trip, now) === tab);
  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      data={trips ?? []}
      keyExtractor={(trip) => trip.orderId}
      style={ui.flex}
      contentContainerStyle={ui.content}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => {
            void refresh();
          }}
        />
      }
      ListHeaderComponent={
        <>
          <CommerceError
            error={query.error}
            retry={() => {
              void refresh();
            }}
          />
          {query.isPending && <LoadingDots />}
        </>
      }
      ListEmptyComponent={
        !query.isPending && !query.error && !query.hasNextPage ? (
          <Empty
            compact
            title={
              tab === 3
                ? labels.emptyCancelled
                : tab === 2
                  ? copy.trips.completedEmpty
                  : tab === 1
                    ? labels.emptyUpcoming
                    : labels.emptyAction
            }
            body={
              tab === 3
                ? labels.emptyCancelledBody
                : tab === 2
                  ? copy.trips.completedBody
                  : tab === 1
                    ? labels.emptyUpcomingBody
                    : labels.emptyActionBody
            }
            action={tab === 0 ? copy.trips.find : undefined}
            onAction={() => router.navigate('/(tabs)')}
          />
        ) : undefined
      }
      renderItem={({ item: trip }) => <TripCard trip={trip} now={now} />}
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            style={styles.button}
            disabled={query.isFetching}
            onPress={() => {
              void query.fetchNextPage();
            }}
          >
            {labels.more}
          </Button>
        ) : undefined
      }
    />
  );
}

function TripCard({ trip, now }: { trip: TripDto; now: Date }) {
  const { user } = useApiSession();
  const status = getTripStatus(trip, now);
  // List snapshots omit refund data. Hydrate only paid-then-cancelled cards that are mounted.
  const shouldLoadRefund = trip.status === 'cancelled' && !!trip.confirmationCode;
  const details = useQuery({
    queryKey: ['commerce', 'order', user?.id, trip.orderId],
    queryFn: ({ signal }) => commerceApi.getCheckout(trip.orderId, signal),
    enabled: shouldLoadRefund,
    staleTime: 0,
    retry: false,
  });
  const refund = shouldLoadRefund ? details.data?.refund : undefined;
  const flights = trip.items.filter((item) => item.productType === 'flight');
  const stays = [
    ...new Set(
      trip.items
        .filter((item) => item.productType === 'room')
        .map((item) => item.propertyName)
        .filter(Boolean),
    ),
  ];
  const firstFlight = flights[0];
  const title =
    firstFlight?.fromAirport && firstFlight.toAirport
      ? `${firstFlight.fromAirport} → ${firstFlight.toAirport}`
      : stays[0] || labels.unnamed;
  const validDeadline = Number.isFinite(Date.parse(trip.holdExpiresAt));
  const countdown = validDeadline ? holdCountdown(trip.holdExpiresAt, now) : undefined;
  const canContinue = status === 'pending' && countdown && !countdown.expired;
  const isPaid = status === 'paid';
  const statusLabel =
    refund?.status === 'refunded'
      ? labels.refunded
      : refund?.status === 'processing'
        ? labels.refundProcessing
        : refund?.status === 'needs_review'
          ? labels.refundReview
          : status === 'pending'
            ? labels.pending
            : status === 'expired'
              ? labels.expired
              : isPaid && trip.tripStatus === 'completed'
                ? text.tripCompleted
                : text.status[status];
  const action = canContinue
    ? labels.continuePayment
    : status === 'paying'
      ? labels.checkPayment
      : isPaid
        ? labels.viewBooking
        : status === 'expired'
          ? labels.viewExpired
          : refund
            ? labels.viewRefund
            : status === 'cancelled'
              ? labels.viewCancelled
              : copy.trips.viewOrder;
  return (
    <View testID={`trip-${trip.orderId}`} style={styles.card}>
      <View
        style={[
          styles.status,
          isPaid || refund?.status === 'refunded'
            ? styles.success
            : status === 'pending' || status === 'paying'
              ? styles.waiting
              : styles.neutral,
        ]}
      >
        <Txt style={[styles.statusText, (isPaid || refund?.status === 'refunded') && styles.successText]}>
          {statusLabel}
        </Txt>
      </View>
      <View style={styles.group}>
        <Txt style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Txt>
        {firstFlight && !!stays[0] && <Txt style={styles.body}>{stays[0]}</Txt>}
        {stays.length > 1 && (
          <Txt style={styles.secondary}>{t('commerce.tripList.moreStays', { count: stays.length - 1 })}</Txt>
        )}
        <View style={styles.dateRow}>
          <Icon name="calendar-outline" size={18} color={colors.textMuted} />
          <Txt style={[styles.body, ui.flex]}>
            {trip.startDate
              ? `${formatDate(trip.startDate.slice(0, 10))}${trip.endDate && trip.endDate !== trip.startDate ? ' → ' + formatDate(trip.endDate.slice(0, 10)) : ''}`
              : labels.noDates}
          </Txt>
        </View>
        <Txt style={styles.secondary}>
          {t('commerce.tripList.services', {
            count: trip.items.length,
            guests: trip.adults + trip.children + trip.infants,
          })}
        </Txt>
      </View>
      {canContinue && (
        <View style={styles.hold}>
          <Txt style={styles.secondary}>{labels.remaining}</Txt>
          <Txt style={styles.countdown}>
            {Math.floor(countdown.secondsLeft / 60)}:{String(countdown.secondsLeft % 60).padStart(2, '0')}
          </Txt>
          <Txt style={styles.secondary}>
            {t('commerce.tripList.deadline', {
              time: new Date(trip.holdExpiresAt).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }),
            })}
          </Txt>
          <Txt style={styles.body}>{labels.pendingHint}</Txt>
        </View>
      )}
      {status === 'pending' && !validDeadline && <Txt style={styles.secondary}>{labels.unknownDeadline}</Txt>}
      {status === 'paying' && <Txt style={styles.body}>{labels.payingHint}</Txt>}
      {status === 'expired' && <Txt style={styles.body}>{labels.expiredHint}</Txt>}
      {isPaid && trip.confirmationCode && (
        <View style={styles.group}>
          <Txt style={styles.secondary}>{text.confirmation}</Txt>
          <Txt selectable style={styles.code}>
            {trip.confirmationCode}
          </Txt>
        </View>
      )}
      {shouldLoadRefund && !refund && (
        <Txt style={styles.secondary}>
          {details.isPending
            ? labels.refundLoading
            : details.error
              ? labels.refundError
              : labels.refundUnknown}
        </Txt>
      )}
      <View style={styles.group}>
        <Txt style={styles.secondary}>
          {refund?.status === 'refunded'
            ? labels.refundedAmount
            : refund
              ? text.refundAmount
              : isPaid
                ? labels.paidTotal
                : labels.total}
        </Txt>
        <Txt style={styles.amount}>{money(refund?.amount ?? trip.total)}</Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          canContinue ? styles.payButton : styles.viewButton,
          pressed && ui.pressed,
        ]}
        onPress={() =>
          router.push({ pathname: canContinue ? '/checkout' : '/booking/[id]', params: { id: trip.orderId } })
        }
      >
        <Txt style={[styles.actionLabel, canContinue && styles.payLabel]}>{action}</Txt>
        <Icon name="arrow-forward" size={20} color={canContinue ? colors.background : colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.md, paddingBottom: spacing.lg },
  title: { fontSize: 28, lineHeight: 38, fontFamily: nativeFonts.semibold, color: colors.navy },
  body: { fontSize: 15, lineHeight: 24, color: colors.ink },
  secondary: { fontSize: 13, lineHeight: 22, color: colors.textMuted },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  tab: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 48,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  selectedTab: { backgroundColor: colors.seaMist },
  tabLabel: { fontSize: 14, lineHeight: 23, fontFamily: nativeFonts.medium, color: colors.textMuted },
  selectedLabel: { color: colors.tealInk, fontFamily: nativeFonts.semibold },
  card: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background },
  group: { gap: spacing.xs },
  status: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusText: { fontSize: 13, lineHeight: 22, fontFamily: nativeFonts.semibold, color: colors.ink },
  success: { backgroundColor: colors.seaMist },
  successText: { color: colors.tealInk },
  waiting: { backgroundColor: colors.sunSoft },
  neutral: { backgroundColor: colors.surfaceMuted },
  cardTitle: { fontSize: 20, lineHeight: 30, fontFamily: nativeFonts.semibold, color: colors.navy },
  dateRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  hold: { gap: spacing.xs, backgroundColor: colors.sunSoft, padding: spacing.md, borderRadius: radius.sm },
  countdown: {
    fontSize: 24,
    lineHeight: 34,
    fontFamily: nativeFonts.semibold,
    fontVariant: ['tabular-nums'],
    color: colors.navy,
  },
  code: { fontSize: 17, lineHeight: 27, fontFamily: nativeFonts.semibold, color: colors.tealInk },
  amount: { fontSize: 22, lineHeight: 32, fontFamily: nativeFonts.semibold, color: colors.navy },
  button: {
    minHeight: 52,
    borderRadius: radius.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  payButton: { backgroundColor: colors.coralInk },
  viewButton: { backgroundColor: colors.surfaceMuted },
  actionLabel: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: nativeFonts.semibold,
    color: colors.ink,
    textAlign: 'center',
  },
  payLabel: { color: colors.background },
});
