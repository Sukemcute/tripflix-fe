import { useQuery } from '@tanstack/react-query';
import { getAvailableStays, getFutureDate, readPage, useApiSession } from '@tripflix/api-client';
import { suggestControllerSuggest } from '@tripflix/api-client/core-api/discovery/discovery';
import { vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { Badge, Icon, money, Row, Txt, ui } from '@/components/mobile-ui';

const HOTEL_LIMIT = 6;
type HotelHit = { hotelId: string; name: string; place: string; stars?: number | null; thumbnail?: string | null; price?: number };

/** Kết quả khách sạn cho ô tìm ở Khám phá: gợi ý điểm đến rồi lấy khách sạn còn phòng, giống web. */
export function HotelSearchResults({ q }: { q: string }) {
  const { isReady } = useApiSession();
  const query = useQuery({
    queryKey: ['discovery', 'hotel-search', q],
    enabled: isReady && q.length >= 2,
    queryFn: async ({ signal }): Promise<HotelHit[]> => {
      const suggestions = readPage(
        (await suggestControllerSuggest({ q, types: 'place,hotel' }, { signal })).data,
      ).items;
      const place = suggestions.find((item) => item.type === 'place');
      if (place) {
        const stays = await getAvailableStays(
          {
            placeId: place.refId,
            checkIn: getFutureDate(1),
            checkOut: getFutureDate(3),
            adults: '2',
            rooms: '',
            minStars: '',
            priceMin: '',
            priceMax: '',
            sort: 'price',
          },
          { signal, limit: HOTEL_LIMIT },
        );
        if (stays.items.length)
          return stays.items.map((stay) => ({
            hotelId: stay.hotelId,
            name: stay.name,
            place: stay.province.name,
            stars: stay.stars,
            thumbnail: stay.thumbnail,
            price: stay.unitPrice,
          }));
      }
      // Gõ đúng tên khách sạn thì gợi ý trả thẳng khách sạn.
      return suggestions
        .filter((item) => item.type === 'hotel')
        .slice(0, HOTEL_LIMIT)
        .map((item) => ({ hotelId: item.refId, name: item.name, place: item.subtitle ?? '' }));
    },
  });
  if (!query.data?.length) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="heading">{vi.mobile.explore.hotelResults}</Txt>
        <Badge tone="coral" icon="bed-outline">{`${query.data.length}`}</Badge>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {query.data.map((hotel) => (
          <Pressable
            key={hotel.hotelId}
            accessibilityRole="button"
            accessibilityLabel={hotel.name}
            onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: hotel.hotelId } })}
            style={{
              width: 220,
              borderRadius: radius.lg,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            {hotel.thumbnail ? (
              <Image source={hotel.thumbnail} style={{ height: 120 }} contentFit="cover" />
            ) : (
              <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.seaMist }}>
                <Icon name="bed-outline" size={32} color={colors.tealInk} />
              </View>
            )}
            <View style={{ padding: spacing.sm, gap: 2 }}>
              <Txt variant="label" numberOfLines={1}>
                {hotel.name}
              </Txt>
              <Txt variant="small" style={ui.muted} numberOfLines={1}>
                {hotel.place}
                {hotel.stars ? ` · ${hotel.stars} ★` : ''}
              </Txt>
              {hotel.price !== undefined && (
                <Txt variant="label" style={{ color: colors.coralInk }}>
                  {vi.hotel.from} {money(hotel.price)}
                </Txt>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
