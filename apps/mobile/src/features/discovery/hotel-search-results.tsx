import { useInfiniteQuery } from '@tanstack/react-query';
import { commerceApi, getAvailableStays, getFutureDate, readPage, useApiSession } from '@tripflix/api-client';
import { suggestControllerSuggest } from '@tripflix/api-client/core-api/discovery/discovery';
import { t, vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Badge, Button, Icon, money, Notice, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';
import { saveTripHotel } from '@/features/booking/trip-booking-store';
import { formatDay } from '@/features/booking/trip-plan-parts';

const HOTEL_LIMIT = 6;
type HotelHit = {
  hotelId: string;
  name: string;
  place: string;
  stars?: number | null;
  thumbnail?: string | null;
  price?: number;
  rating?: { average: number; count: number } | null;
};
type TripHotelPick = { key: string; checkIn: string; checkOut: string; adults: string };
type HotelPage = { items: HotelHit[]; nextCursor?: string | null };

/** Dùng lại thẻ kết quả tìm kiếm; kỳ ở và số khách luôn lấy từ lộ trình. */
export function TripHotelSearchScreen({ q, pick }: { q: string; pick: TripHotelPick }) {
  const [text, setText] = useState(q);
  const [query, setQuery] = useState(q.trim());
  const submit = () => setQuery(text.trim());
  return (
    <Screen title={vi.mobile.tripPlan.pickHotelTitle} compact>
      <Notice>{vi.mobile.tripPlan.pickNotice}</Notice>
      <Txt variant="small" style={ui.muted}>
        {formatDay(pick.checkIn)} → {formatDay(pick.checkOut)} ·{' '}
        {t('mobile.tripPlan.forAdults', { adults: Number(pick.adults) })}
      </Txt>
      <Row style={{ gap: spacing.sm }}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="search"
          maxLength={100}
          placeholder={vi.mobile.tripPlan.hotelSearch}
          accessibilityLabel={vi.mobile.tripPlan.hotelSearch}
          placeholderTextColor={colors.textMuted}
          style={[ui.input, { flex: 1, minWidth: 0 }]}
        />
        <Button compact onPress={submit}>
          {vi.api.search}
        </Button>
      </Row>
      <HotelSearchResults q={query} pick={pick} />
    </Screen>
  );
}

/** Kết quả khách sạn cho ô tìm ở Khám phá: gợi ý điểm đến rồi lấy khách sạn còn phòng, giống web. */
export function HotelSearchResults({ q, pick }: { q: string; pick?: TripHotelPick }) {
  const { isReady } = useApiSession();
  const query = useInfiniteQuery({
    queryKey: ['discovery', 'hotel-search', q, pick],
    enabled: isReady && q.length >= 2,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: HotelPage) => lastPage.nextCursor ?? undefined,
    queryFn: async ({ signal, pageParam }): Promise<HotelPage> => {
      const suggestions = readPage(
        (await suggestControllerSuggest({ q, types: 'place,hotel' }, { signal })).data,
      ).items;
      const place = suggestions.find((item) => item.type === 'place');
      if (place) {
        const stays = await getAvailableStays(
          {
            placeId: place.refId,
            checkIn: pick?.checkIn ?? getFutureDate(1),
            checkOut: pick?.checkOut ?? getFutureDate(3),
            adults: pick?.adults ?? '2',
            rooms: '',
            minStars: '',
            priceMin: '',
            priceMax: '',
            sort: 'price',
          },
          { signal, limit: pick ? 20 : HOTEL_LIMIT, cursor: pageParam },
        );
        if (stays.items.length)
          return {
            nextCursor: stays.nextCursor,
            items: stays.items.map((stay) => ({
              hotelId: stay.hotelId,
              name: stay.name,
              place: stay.province.name,
              stars: stay.stars,
              thumbnail: stay.thumbnail,
              price: stay.unitPrice,
              rating: stay.rating,
            })),
          };
      }
      if (pick) {
        const hotels = await Promise.all(
          suggestions
            .filter((item) => item.type === 'hotel')
            .slice(0, HOTEL_LIMIT)
            .map((item) =>
              commerceApi.getHotel(
                item.refId,
                { checkIn: pick.checkIn, checkOut: pick.checkOut, adults: Number(pick.adults) },
                signal,
              ),
            ),
        );
        return {
          items: hotels
            .filter((hotel) => hotel.isAvailable && hotel.priceFrom !== null)
            .map((hotel) => ({
              hotelId: hotel.id,
              name: hotel.name,
              place: hotel.city ?? hotel.province.name,
              stars: hotel.stars,
              thumbnail: hotel.thumbnail ?? hotel.images[0],
              price: hotel.priceFrom ?? undefined,
              rating: hotel.rating,
            })),
        };
      }
      // Gõ đúng tên khách sạn thì gợi ý trả thẳng khách sạn.
      return {
        items: suggestions
          .filter((item) => item.type === 'hotel')
          .slice(0, HOTEL_LIMIT)
          .map((item) => ({ hotelId: item.refId, name: item.name, place: item.subtitle ?? '' })),
      };
    },
  });
  const hotels = [
    ...new Map(
      (query.data?.pages.flatMap((page) => page.items) ?? []).map((hotel) => [hotel.hotelId, hotel]),
    ).values(),
  ];
  if (!pick && !hotels.length) return null;
  const openHotel = (hotel: HotelHit) => {
    if (pick) {
      saveTripHotel(pick.key, { id: hotel.hotelId, name: hotel.name });
      router.back();
      return;
    }
    router.push({ pathname: '/hotel/[id]', params: { id: hotel.hotelId } });
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="heading">{vi.mobile.explore.hotelResults}</Txt>
        <Badge tone="coral" icon="bed-outline">{`${hotels.length}`}</Badge>
      </Row>
      {pick && (
        <>
          {query.isFetching && !query.isFetchingNextPage && <Txt style={ui.muted}>{vi.api.loading}</Txt>}
          <ApiErrorNotice
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
          {q.length < 2 || (query.isSuccess && !hotels.length) ? (
            <Notice>{vi.mobile.tripPlan.hotelEmpty}</Notice>
          ) : null}
        </>
      )}
      <ScrollView
        horizontal={!pick}
        scrollEnabled={!pick}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {hotels.map((hotel) => (
          <Pressable
            key={hotel.hotelId}
            accessibilityRole="button"
            accessibilityLabel={pick ? `${vi.mobile.tripPlan.pickHotel}: ${hotel.name}` : hotel.name}
            onPress={() => openHotel(hotel)}
            style={{
              width: pick ? '100%' : 220,
              borderRadius: radius.lg,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            {hotel.thumbnail ? (
              <Image
                source={hotel.thumbnail}
                style={pick ? { width: '100%', aspectRatio: 16 / 9 } : { height: 120 }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  height: 120,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.seaMist,
                }}
              >
                <Icon name="bed-outline" size={32} color={colors.tealInk} />
              </View>
            )}
            <View style={{ padding: spacing.sm, gap: 2 }}>
              <Txt variant="label" numberOfLines={pick ? 2 : 1}>
                {hotel.name}
              </Txt>
              {pick && hotel.rating && (
                <Txt variant="small" style={{ color: colors.tealInk }}>
                  {hotel.rating.average.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} / 5 ·{' '}
                  {t('hotel.reviewCount', { count: hotel.rating.count })}
                </Txt>
              )}
              <Txt variant="small" style={ui.muted} numberOfLines={1}>
                {hotel.place}
                {hotel.stars ? ` · ${hotel.stars} ★` : ''}
              </Txt>
              {hotel.price !== undefined && (
                <Txt variant="label" style={{ color: colors.coralInk }}>
                  {vi.hotel.from} {money(hotel.price)}
                  {pick ? ` ${vi.hotel.perNightShort}` : ''}
                </Txt>
              )}
              {pick && (
                <View style={[ui.button, { backgroundColor: colors.teal, marginTop: spacing.sm }]}>
                  <Txt variant="label" style={{ color: colors.background }}>
                    {vi.mobile.tripPlan.pickHotel}
                  </Txt>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {pick && query.hasNextPage && (
        <Button
          tone="text"
          disabled={query.isFetchingNextPage}
          onPress={() => {
            void query.fetchNextPage();
          }}
        >
          {vi.api.next}
        </Button>
      )}
    </View>
  );
}
