import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupItineraryDays, toTripAttachment } from '@tripflix/app-core';
import { itineraryApi, SAVED_ITINERARIES_QUERY_KEY, useApiSession } from '@tripflix/api-client';
import type { SavedItineraryDto, SavedItineraryItemDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { LoadingDots } from '@/components/loading-dots';
import { Badge, Button, Empty, Icon, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { ACTIVITY_ICONS } from '@/features/booking/activity-card';
import { styles as timeline } from '@/features/booking/trip-plan-parts';
import { saveTripBooking } from '@/features/booking/trip-booking-store';

const copy = vi.mobile.savedItinerary;
const HOME_LIMIT = 3;

function useSavedItineraries() {
  const { user, isReady } = useApiSession();
  return {
    user,
    query: useQuery({
      queryKey: [...SAVED_ITINERARIES_QUERY_KEY, user?.id, 'all'],
      enabled: isReady && !!user,
      staleTime: 30_000,
      queryFn: ({ signal }) => itineraryApi.list(undefined, signal),
    }),
  };
}

function ItineraryRow({ itinerary }: { itinerary: SavedItineraryDto }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/saved-itinerary/[id]', params: { id: itinerary.id } })}
      style={({ pressed }) => [layout.row, pressed && { opacity: 0.7 }]}
    >
      <View style={layout.rowIcon}>
        <Icon name="map-outline" size={20} color={colors.tealInk} />
      </View>
      <View style={ui.flex}>
        <Txt style={layout.rowTitle} numberOfLines={2}>
          {itinerary.title}
        </Txt>
        <Txt variant="small" style={ui.muted}>
          {t('mobile.savedItinerary.days', { days: itinerary.daysCount, stops: itinerary.items.length })}
        </Txt>
      </View>
      <Badge tone="teal">{copy.sources[itinerary.source]}</Badge>
    </Pressable>
  );
}

/** Mục "Lộ trình đã lưu" ở tab Đặt, thay cho "Chuyến sắp tới"; đơn đã đặt xem qua nút Chuyến đã đặt. */
export function SavedItinerariesSection() {
  const { user, query } = useSavedItineraries();
  if (!user) return null;
  const itineraries = query.data ?? [];
  return (
    <View style={{ gap: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="title">{copy.listTitle}</Txt>
        {itineraries.length > HOME_LIMIT && (
          <Button tone="text" icon="arrow-forward" onPress={() => router.push('/saved-itineraries')}>
            {copy.viewAll}
          </Button>
        )}
      </Row>
      {query.isPending && <LoadingDots />}
      {!query.isPending && itineraries.length === 0 && (
        <Txt variant="small" style={ui.muted}>
          {copy.empty}
        </Txt>
      )}
      {itineraries.slice(0, HOME_LIMIT).map((itinerary) => (
        <ItineraryRow key={itinerary.id} itinerary={itinerary} />
      ))}
      <Button tone="text" icon="bag-handle-outline" onPress={() => router.push('/my-trips')}>
        {copy.booked}
      </Button>
    </View>
  );
}

export function SavedItinerariesScreen() {
  const { user, query } = useSavedItineraries();
  return (
    <Screen title={copy.listTitle}>
      {!user && (
        <Empty
          title={copy.listTitle}
          body={copy.loginHint}
          action={vi.api.login}
          onAction={() => router.push('/login')}
        />
      )}
      {user && query.isPending && <LoadingDots />}
      {user && !query.isPending && !query.data?.length && <Empty title={copy.listTitle} body={copy.empty} />}
      <View style={{ gap: spacing.sm }}>
        {(query.data ?? []).map((itinerary) => (
          <ItineraryRow key={itinerary.id} itinerary={itinerary} />
        ))}
      </View>
    </Screen>
  );
}

function StopRow({ item, onRemove }: { item: SavedItineraryItemDto; onRemove: () => void }) {
  const icon = item.hotel
    ? 'bed-outline'
    : item.transport
      ? 'airplane-outline'
      : item.category
        ? ACTIVITY_ICONS[item.category]
        : 'location-outline';
  const when = item.time ?? (item.slot ? copy.slots[item.slot] : null);
  const detail = [
    item.location,
    item.nights ? t('mobile.savedItinerary.nights', { nights: item.nights }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Row style={layout.stop}>
      {!!when && (
        <Txt variant="label" style={layout.stopTime}>{when}</Txt>
      )}
      <Row style={layout.stopCard}>
        <View style={[layout.stopIcon, item.hotel && layout.hotelIcon]}>
          <Icon name={icon} size={18} color={item.hotel ? colors.background : colors.ink} />
        </View>
        <View style={layout.stopBody}>
          <Txt variant="label">{item.title}</Txt>
          {!!detail && (
            <Txt variant="small" style={ui.muted}>{detail}</Txt>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.removeStop}
          hitSlop={8}
          onPress={onRemove}
          style={layout.removeStop}
        >
          <Icon name="close" size={18} color={colors.ink} />
        </Pressable>
      </Row>
    </Row>
  );
}

/** Chi tiết lộ trình đã lưu: xem theo Ngày 1..N, bỏ điểm, xoá, đặt (chọn ngày khởi hành ở tab Đặt). */
export function SavedItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isReady } = useApiSession();
  const pathname = usePathname();
  const client = useQueryClient();
  const queryKey = [...SAVED_ITINERARIES_QUERY_KEY, user?.id, 'one', id];
  const query = useQuery({
    queryKey,
    enabled: isReady && !!user && !!id,
    queryFn: ({ signal }) => itineraryApi.get(id, signal),
  });
  const refresh = (next?: SavedItineraryDto) => {
    if (next) client.setQueryData(queryKey, next);
    void client.invalidateQueries({ queryKey: [...SAVED_ITINERARIES_QUERY_KEY, user?.id, 'all'] });
  };
  const update = useMutation({
    mutationFn: (items: SavedItineraryItemDto[]) => itineraryApi.update(id, { items }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => itineraryApi.remove(id),
    onSuccess: () => {
      refresh();
      router.back();
    },
  });
  const itinerary = query.data;
  if (!itinerary) {
    return (
      <Screen title={copy.listTitle}>
        {query.isError ? <Empty title={copy.listTitle} body={copy.notFound} /> : <LoadingDots />}
      </Screen>
    );
  }
  const removeStop = (index: number) => {
    const items = itinerary.items.filter((_, i) => i !== index);
    // Bỏ điểm cuối cùng thì xoá luôn lộ trình: lộ trình rỗng không lưu được.
    if (items.length) update.mutate(items);
    else confirmDelete();
  };
  const confirmDelete = () =>
    Alert.alert(copy.delete, t('mobile.savedItinerary.deleteConfirm', { title: itinerary.title }), [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.delete, style: 'destructive', onPress: () => remove.mutate() },
    ]);
  const book = () => {
    saveTripBooking({
      postId: itinerary.sourcePostId ?? itinerary.id,
      postTitle: itinerary.title,
      authorName: copy.sources[itinerary.source],
      trip: toTripAttachment(itinerary),
      origin: pathname,
    });
    router.navigate('/(tabs)/book');
  };
  const days = groupItineraryDays(
    itinerary.daysCount,
    itinerary.items.map((item, index) => ({ ...item, index })),
  );
  return (
    <Screen
      title={itinerary.title}
      background={colors.surfaceMuted}
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button
            tone="secondary"
            icon="share-social-outline"
            onPress={() => router.navigate({ pathname: '/create', params: { itineraryId: itinerary.id } })}
          >
            {copy.shareToReels}
          </Button>
          <Button icon="bag-handle-outline" onPress={book}>
            {copy.book}
          </Button>
        </View>
      }
    >
      <View style={{ gap: spacing.md }}>
        <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Badge tone="teal">{copy.sources[itinerary.source]}</Badge>
          <Txt variant="small" style={ui.muted}>
            {t('mobile.savedItinerary.days', { days: itinerary.daysCount, stops: itinerary.items.length })}
          </Txt>
        </Row>
        <Txt variant="small" style={ui.muted}>
          {copy.bookHint}
        </Txt>
        <View style={timeline.timeline}>
          {days.map(({ day, items }, dayIndex) => (
            <View key={day} style={timeline.day}>
              {dayIndex < days.length - 1 && <View style={timeline.rail} />}
              <View style={timeline.dayDot} />
              <View style={timeline.dayContent}>
                <Txt style={timeline.dayLabel}>{t('mobile.savedItinerary.day', { day })}</Txt>
                {items.length === 0 && (
                  <Txt variant="small" style={ui.muted}>{copy.emptyDay}</Txt>
                )}
                {items.map(({ index, ...item }) => (
                  <StopRow key={index} item={item} onRemove={() => removeStop(index)} />
                ))}
              </View>
            </View>
          ))}
        </View>
        {!!itinerary.sourcePostId && (
          <Button
            tone="secondary"
            icon="play-circle-outline"
            onPress={() =>
              router.push({ pathname: '/saved-itinerary-reels', params: { reel: itinerary.sourcePostId! } })
            }
          >
            {copy.openReel}
          </Button>
        )}
        <Button tone="text" icon="trash-outline" disabled={remove.isPending} onPress={confirmDelete}>
          {copy.delete}
        </Button>
      </View>
    </Screen>
  );
}

const layout = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.seaMist,
  },
  rowTitle: { fontWeight: '700' },
  stop: { gap: spacing.sm, alignItems: 'flex-start' },
  stopTime: { width: 49, paddingTop: spacing.md },
  stopCard: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  stopIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  hotelIcon: { backgroundColor: colors.coral },
  stopBody: { flex: 1, minWidth: 0, gap: 2 },
  removeStop: { padding: spacing.xs },
});
