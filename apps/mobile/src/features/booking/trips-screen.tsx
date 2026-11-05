import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { commerceApi, getFutureDate, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { ApiErrorNotice } from '@/components/api-state';
import {
  Badge,
  Button,
  Card,
  copy,
  Empty,
  formatDate,
  IconButton,
  money,
  Screen,
  Segments,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { CommerceError, useRefreshOnOpen } from './commerce-state';

const text = vi.commerce;
export function CommerceTripsScreen() {
  const { user, isReady, error, session } = useApiSession();
  const [tab, setTab] = useState(0);
  return (
    <Screen
      back={false}
      scroll={!user}
      right={
        <IconButton
          name="notifications-outline"
          label={copy.common.notification}
          onPress={() => router.push('/notifications')}
        />
      }
    >
      <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        <Txt variant="title">{copy.trips.title}</Txt>
        <Txt variant="small" style={ui.muted}>
          {copy.trips.body}
        </Txt>
        <Segments
          options={[copy.trips.upcoming, copy.trips.completed, copy.trips.cancelled]}
          selected={tab}
          onSelect={setTab}
        />
      </View>
      <ApiErrorNotice
        error={error}
        retry={() => {
          void session.initialize();
        }}
      />
      {!isReady ? (
        <Txt>{vi.api.loading}</Txt>
      ) : user ? (
        <BookedTrips key={user.id} tab={tab} />
      ) : (
        <View style={ui.flex}>
          <Empty
            title={copy.trips.emptyTitle}
            body={copy.profile.body}
            compact
            action={copy.profile.login}
            onAction={() => router.push({ pathname: '/login', params: { returnTo: '/(tabs)/trips' } })}
          />
        </View>
      )}
    </Screen>
  );
}
function BookedTrips({ tab }: { tab: number }) {
  const { user } = useApiSession();
  const query = useInfiniteQuery({
    queryKey: ['commerce', 'trips', user?.id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => commerceApi.listTrips(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
  });
  useRefreshOnOpen(query.refetch);
  const today = getFutureDate(0);
  const trips = query.data?.pages
    .flatMap((page) => page.trips)
    .filter((trip) => {
      if (trip.status === 'cancelled' || trip.status === 'expired') return tab === 2;
      if (trip.status === 'paid' && trip.endDate && trip.endDate.slice(0, 10) < today) return tab === 1;
      return tab === 0;
    });
  return (
    <FlatList
      data={trips ?? []}
      keyExtractor={(trip) => trip.orderId}
      style={ui.flex}
      contentContainerStyle={ui.content}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => {
            void query.refetch();
          }}
        />
      }
      ListHeaderComponent={
        <>
          <CommerceError
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
          {query.isPending && <Txt>{vi.api.loading}</Txt>}
        </>
      }
      ListEmptyComponent={
        !query.isPending && !query.error && !query.hasNextPage ? (
          <Empty
            compact
            title={
              tab === 2
                ? copy.trips.cancelledTitle
                : tab === 1
                  ? copy.trips.completedEmpty
                  : copy.trips.emptyTitle
            }
            body={
              tab === 2
                ? copy.trips.cancelledBody
                : tab === 1
                  ? copy.trips.completedBody
                  : copy.trips.emptyBody
            }
            action={tab === 0 ? copy.trips.find : undefined}
            onAction={() => router.navigate('/(tabs)')}
          />
        ) : undefined
      }
      renderItem={({ item: trip }) => (
        <Card>
          <Badge icon="bag-handle-outline" tone={trip.status === 'paid' ? 'teal' : 'sun'}>
            {text.status[trip.status]}
          </Badge>
          <Txt variant="heading">{trip.items.map((item) => item.productName).join(' · ')}</Txt>
          {trip.startDate && trip.endDate && (
            <Txt variant="small" style={ui.muted}>
              {formatDate(trip.startDate.slice(0, 10))} → {formatDate(trip.endDate.slice(0, 10))}
            </Txt>
          )}
          <Txt variant="label">{money(trip.total)}</Txt>
          {trip.confirmationCode && (
            <Txt>
              {text.confirmation}: {trip.confirmationCode}
            </Txt>
          )}
          <Button
            tone="secondary"
            icon="arrow-forward"
            onPress={() => router.push({ pathname: '/booking/[id]', params: { id: trip.orderId } })}
          >
            {copy.trips.viewOrder}
          </Button>
        </Card>
      )}
      ListFooterComponent={
        query.hasNextPage ? (
          <Button
            disabled={query.isFetching}
            onPress={() => {
              void query.fetchNextPage();
            }}
          >
            {vi.api.next}
          </Button>
        ) : undefined
      }
    />
  );
}
