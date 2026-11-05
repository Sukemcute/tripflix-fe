import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { commerceApi, useApiSession, useSocialPosts } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { RequireAccount } from '@/components/api-state';
import { Button, Card, money, Notice, Screen, Segments, Txt, ui } from '@/components/mobile-ui';
import { LivePostCard } from '@/features/feed/live-feed-screen';
import { CommerceError, useRefreshOnOpen } from './commerce-state';

const text = vi.commerce;
export function CommerceTripsScreen() {
  const { user, isReady } = useApiSession();
  const [tab, setTab] = useState(0);
  if (!isReady || !user) return <RequireAccount />;
  return (
    <Screen title={vi.tabs.trips} back={false} scroll={false}>
      <View style={{ paddingBottom: spacing.md }}>
        <Segments options={[text.booked, text.bookmarks, text.posts]} selected={tab} onSelect={setTab} />
      </View>
      {tab === 0 ? (
        <BookedTrips key={user.id} />
      ) : (
        <TripPosts key={`${user.id}:${tab}`} kind={tab === 1 ? 'bookmarks' : 'mine'} />
      )}
    </Screen>
  );
}
function BookedTrips() {
  const { user } = useApiSession();
  const query = useInfiniteQuery({
    queryKey: ['commerce', 'trips', user?.id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => commerceApi.listTrips(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
  });
  useRefreshOnOpen(query.refetch);
  const trips = query.data?.pages.flatMap((page) => page.trips);
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
      ListEmptyComponent={!query.isPending && !query.error ? <Notice>{text.noTrips}</Notice> : undefined}
      renderItem={({ item: trip }) => (
        <Card>
          <Txt variant="heading">{trip.items.map((item) => item.productName).join(' · ')}</Txt>
          <Txt>
            {trip.startDate} → {trip.endDate}
          </Txt>
          <Txt>{text.status[trip.status]}</Txt>
          <Txt>{money(trip.total)}</Txt>
          {trip.confirmationCode && (
            <Txt>
              {text.confirmation}: {trip.confirmationCode}
            </Txt>
          )}
          <Button onPress={() => router.push({ pathname: '/booking/[id]', params: { id: trip.orderId } })}>
            {text.detail}
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
function TripPosts({ kind }: { kind: 'bookmarks' | 'mine' }) {
  const query = useSocialPosts(kind);
  useRefreshOnOpen(query.refetch);
  const posts = query.data?.pages.flatMap((page) => page.items);
  return (
    <FlatList
      data={posts ?? []}
      keyExtractor={(post) => post.id}
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
        !query.isPending && !query.error ? (
          <Notice>{kind === 'bookmarks' ? vi.api.noBookmarks : vi.api.noPosts}</Notice>
        ) : undefined
      }
      renderItem={({ item: post }) => <LivePostCard post={post} />}
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
