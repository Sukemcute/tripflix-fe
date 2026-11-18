import { useQuery } from '@tanstack/react-query';
import { getAvailableStays, getFutureDate, useApiSession, useFlightRoutes } from '@tripflix/api-client';
import { homeRecommendationsControllerRecommendForHome } from '@tripflix/api-client/core-api/discovery/discovery';
import { findPlaceAirport, getNextWeekendDates } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LoadingDots } from '@/components/loading-dots';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Chip, Icon, IconButton, money, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { NotificationBell } from '@/features/account/notification-bell';
import { FeaturedTrips } from '@/features/booking/featured-trips';
import { HotelSearchResults } from './hotel-search-results';

const text = vi.mobile.explore;
type SearchKind = 'hotel' | 'flight';
/** Số tỉnh lấy từ gợi ý trang chủ để tìm phòng cuối tuần và khách sạn đánh giá cao. */
const PLACE_LIMIT = 2;
const STAY_LIMIT = 8;

interface HotelTile {
  hotelId: string;
  name: string;
  place: string;
  thumbnail: string;
  price: number;
  note?: string;
}

/**
 * Tab Khám phá: giao diện cũ (ô tìm bo tròn, chip, ảnh nổi bật) kèm tìm khách sạn hoặc vé máy bay,
 * gợi ý khách sạn theo ưu đãi, cuối tuần, đánh giá và lộ trình nổi bật đặt được.
 */
export function ExploreFeed() {
  const [kind, setKind] = useState<SearchKind>('hotel');
  const [input, setInput] = useState('');
  const [hotelQuery, setHotelQuery] = useState('');
  const routes = useFlightRoutes();
  const submit = () => {
    const value = input.trim();
    if (kind === 'hotel') {
      setHotelQuery(value.length >= 2 ? value : '');
      return;
    }
    // Vé máy bay: đoán sân bay đến theo tên nơi gõ, không đoán được thì mở màn vé để chọn tay.
    const to = value ? findPlaceAirport(routes.data ?? [], value) : null;
    router.push({ pathname: '/flights', params: to ? { to } : {} });
  };
  const clear = () => {
    setInput('');
    setHotelQuery('');
  };
  return (
    <Screen
      compact
      back={false}
      header={
        <Row style={styles.header}>
          <NotificationBell />
        </Row>
      }
    >
      <View style={{ gap: spacing.sm }}>
        <Row style={{ gap: spacing.sm }}>
          {(['hotel', 'flight'] as const).map((item) => (
            <Chip
              key={item}
              selected={kind === item}
              onPress={() => {
                setKind(item);
                setHotelQuery('');
              }}
            >
              {item === 'hotel' ? text.hotelTab : text.flightTab}
            </Chip>
          ))}
        </Row>
        <View style={styles.searchBar}>
          <Icon
            name={kind === 'hotel' ? 'bed-outline' : 'airplane-outline'}
            color={colors.textMuted}
            size={mobileIconSize.control}
          />
          <TextInput
            value={input}
            onChangeText={setInput}
            maxLength={100}
            placeholder={kind === 'hotel' ? text.hotelPlaceholder : text.flightPlaceholder}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={submit}
            accessibilityLabel={kind === 'hotel' ? text.hotelPlaceholder : text.flightPlaceholder}
            style={styles.searchInput}
          />
          {input.length > 0 && (
            <IconButton name="close-circle-outline" label={text.clearSearch} onPress={clear} />
          )}
          <IconButton name="arrow-forward-outline" label={vi.api.search} onPress={submit} />
        </View>
      </View>

      {hotelQuery ? (
        <HotelSearchResults q={hotelQuery} />
      ) : (
        <>
          <View style={{ gap: spacing.xs }}>
            <Txt variant="small" style={ui.muted}>
              {text.intro}
            </Txt>
            <Txt variant="title">{text.browseTitle}</Txt>
          </View>
          <HotelSuggestions />
          <FeaturedTrips onPicked={() => router.navigate('/(tabs)/book')} />
        </>
      )}
    </Screen>
  );
}

/** Ba hàng khách sạn: ưu đãi hôm nay (gợi ý trang chủ), cuối tuần này và đánh giá cao (tìm phòng ở các tỉnh gợi ý). */
function HotelSuggestions() {
  const { isReady } = useApiSession();
  const home = useQuery({
    queryKey: ['discovery', 'explore-home', STAY_LIMIT],
    enabled: isReady,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const response = await homeRecommendationsControllerRecommendForHome({ limit: STAY_LIMIT }, { signal });
      if (response.status !== 200 || !Array.isArray(response.data.items))
        throw new Error('Unexpected hotel recommendations response');
      return response.data.items;
    },
  });
  const places = (home.data ?? [])
    .map((item) => item.province.slug)
    .filter(Boolean)
    .slice(0, PLACE_LIMIT);
  // Ưu đãi "giá tốt" lên trước; khách sạn chưa có ảnh không đưa vào hàng gợi ý.
  const deals: HotelTile[] = (home.data ?? [])
    .flatMap((item) => item.hotels.map((hotel) => ({ hotel, place: item.province.name })))
    .sort((a, b) => Number(b.hotel.reason.code === 'good_deal') - Number(a.hotel.reason.code === 'good_deal'))
    .flatMap(({ hotel, place }) =>
      hotel.thumbnail
        ? [
            {
              hotelId: hotel.hotelId,
              name: hotel.name,
              place,
              thumbnail: hotel.thumbnail,
              price: hotel.priceFrom,
              note: hotel.reason.text,
            },
          ]
        : [],
    )
    .slice(0, STAY_LIMIT);
  const today = getFutureDate(0);
  const weekend = getNextWeekendDates(today);
  return (
    <>
      <HotelRow title={text.dealsTitle} hotels={deals} isLoading={home.isPending} />
      <StayRow title={text.weekendStaysTitle} places={places} dates={weekend} sort="price" />
      <StayRow
        title={text.topRatedTitle}
        places={places}
        dates={{ checkIn: getFutureDate(1), checkOut: getFutureDate(2) }}
        sort="stars"
      />
    </>
  );
}

function StayRow({
  title,
  places,
  dates,
  sort,
}: {
  title: string;
  places: string[];
  dates: { checkIn: string; checkOut: string };
  sort: 'price' | 'stars';
}) {
  const query = useQuery({
    queryKey: ['discovery', 'explore-stays', sort, places, dates.checkIn, dates.checkOut],
    enabled: places.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const pages = await Promise.all(
        places.map((placeId) =>
          getAvailableStays(
            {
              placeId,
              checkIn: dates.checkIn,
              checkOut: dates.checkOut,
              adults: '2',
              rooms: '',
              minStars: '',
              priceMin: '',
              priceMax: '',
              sort,
            },
            { signal, limit: STAY_LIMIT },
          ),
        ),
      );
      return pages
        .flatMap((page) => page.items)
        .filter((stay) => !!stay.thumbnail)
        .sort((a, b) => (sort === 'stars' ? (b.stars ?? 0) - (a.stars ?? 0) : a.unitPrice - b.unitPrice))
        .slice(0, STAY_LIMIT)
        .map((stay): HotelTile => ({
          hotelId: stay.hotelId,
          name: stay.name,
          place: stay.province.name,
          thumbnail: stay.thumbnail!,
          price: stay.unitPrice,
          note: stay.stars ? `${stay.stars}★` : undefined,
        }));
    },
  });
  return (
    <HotelRow title={title} hotels={query.data ?? []} isLoading={places.length > 0 && query.isPending} />
  );
}

function HotelRow({ title, hotels, isLoading }: { title: string; hotels: HotelTile[]; isLoading: boolean }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Txt variant="heading">{title}</Txt>
      {isLoading && <LoadingDots />}
      {!isLoading && hotels.length === 0 && (
        <Txt variant="small" style={ui.muted}>
          {text.staysEmpty}
        </Txt>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hotelRow}>
        {hotels.map((hotel) => (
          <Pressable
            key={hotel.hotelId}
            accessibilityRole="button"
            accessibilityLabel={hotel.name}
            onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: hotel.hotelId } })}
            style={({ pressed }) => [styles.hotel, pressed && { opacity: 0.85 }]}
          >
            <Image source={hotel.thumbnail} style={styles.hotelImage} contentFit="cover" />
            <View style={styles.hotelText}>
              <Txt style={styles.hotelName} numberOfLines={2}>
                {hotel.name}
              </Txt>
              <Txt variant="small" style={ui.muted} numberOfLines={1}>
                {[hotel.place, hotel.note].filter(Boolean).join(' · ')}
              </Txt>
              <Txt style={styles.hotelPrice}>
                {money(hotel.price)}
                <Txt variant="small" style={ui.muted}>
                  {text.perNight}
                </Txt>
              </Txt>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    justifyContent: 'flex-end',
    paddingHorizontal: mobileLayout.gutter,
    paddingTop: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: mobileLayout.buttonHeight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.warmMist,
    paddingLeft: spacing.md,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: mobileLayout.touchTarget,
    fontFamily: nativeFonts.regular,
    color: colors.ink,
    ...compactType.body,
  },
  hotelRow: { gap: spacing.sm },
  hotel: {
    width: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  hotelImage: { width: '100%', height: 112, backgroundColor: colors.seaMist },
  hotelText: { gap: 2, padding: spacing.sm },
  hotelName: { ...compactType.body, fontFamily: nativeFonts.semibold, color: colors.ink },
  hotelPrice: { ...compactType.body, fontFamily: nativeFonts.semibold, color: colors.coralInk },
});
