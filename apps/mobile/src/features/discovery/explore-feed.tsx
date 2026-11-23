import { useQuery } from '@tanstack/react-query';
import { getAvailableStays, getExploreResults, getFutureDate, useApiSession } from '@tripflix/api-client';
import { homeRecommendationsControllerRecommendForHome } from '@tripflix/api-client/core-api/discovery/discovery';
import { getNextWeekendDates } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LoadingDots } from '@/components/loading-dots';
import {
  assets,
  Button,
  Icon,
  IconButton,
  Logo,
  money,
  Row,
  Screen,
  Txt,
  ui,
  type IconName,
} from '@/components/mobile-ui';
import { NotificationBell } from '@/features/account/notification-bell';
import { FeaturedTrips } from '@/features/booking/featured-trips';
import { ExploreHotelResults } from './explore-hotel-results';
import { StayPhoto } from './stay-photo';

const text = vi.mobile.explore;
const explorerCopy = vi.mobile.explorer;
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
 * Tab Khám phá theo thiết kế Stitch "Khám phá & Tìm kiếm": thẻ tìm khách sạn hoặc vé máy bay, bốn dịch vụ,
 * gợi ý khách sạn theo ưu đãi, cuối tuần, đánh giá và lộ trình nổi bật đặt được.
 */
export function ExploreFeed() {
  const [kind, setKind] = useState<SearchKind>('hotel');
  const [input, setInput] = useState('');
  const [hotelQuery, setHotelQuery] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const submit = async () => {
    const value = input.trim();
    if (value.length < 2 || isResolving) return;
    // Hiểu câu gõ bằng tìm kiếm của discovery (sửa lỗi gõ: "nha trag" → Nha Trang); lỗi mạng thì dùng nguyên chữ gõ.
    setIsResolving(true);
    const place = await getExploreResults(value)
      .then((result) => result.understood?.place?.trim() || value)
      .catch(() => value)
      .finally(() => setIsResolving(false));
    setHotelQuery(place);
  };
  const clear = () => {
    setInput('');
    setHotelQuery('');
  };
  return (
    <Screen
      back={false}
      header={
        <Row style={styles.header}>
          <Logo />
          <NotificationBell />
        </Row>
      }
    >
      <View style={styles.greeting}>
        <Txt variant="title">{explorerCopy.title}</Txt>
        <Txt variant="small" style={ui.muted}>
          {explorerCopy.slogan}
        </Txt>
      </View>

      <View accessibilityLabel={explorerCopy.searchCardLabel} style={styles.searchCard}>
        <View accessibilityRole="tablist" style={styles.segmented}>
          {(['hotel', 'flight'] as const).map((item) => {
            const isSelected = kind === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  setKind(item);
                  setHotelQuery('');
                }}
                style={[styles.segment, isSelected && styles.segmentSelected]}
              >
                <Icon
                  name={item === 'hotel' ? 'bed-outline' : 'airplane-outline'}
                  size={18}
                  color={isSelected ? x.day.text : x.day.textSecondary}
                />
                <Txt style={[styles.segmentLabel, isSelected && styles.segmentLabelSelected]}>
                  {item === 'hotel' ? text.hotelTab : text.flightTab}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        {kind === 'hotel' ? (
          <>
            <View style={styles.searchField}>
              <Icon name="location-outline" color={x.day.link} size={20} />
              <TextInput
                value={input}
                onChangeText={setInput}
                maxLength={100}
                placeholder={text.hotelPlaceholder}
                placeholderTextColor={x.day.textSecondary}
                returnKeyType="search"
                onSubmitEditing={() => void submit()}
                accessibilityLabel={text.hotelPlaceholder}
                style={styles.searchInput}
              />
              {input.length > 0 && (
                <IconButton
                  name="close-circle"
                  color={x.day.textSecondary}
                  label={text.clearSearch}
                  onPress={clear}
                />
              )}
            </View>
            <Button
              icon="search"
              disabled={input.trim().length < 2 || isResolving}
              onPress={() => void submit()}
            >
              {explorerCopy.searchStay}
            </Button>
          </>
        ) : (
          // Vé máy bay chọn sân bay theo danh sách ở màn vé nên không cần ô gõ (tránh gõ tên nơi không có sân bay).
          <Button icon="airplane" onPress={() => router.push('/flights')}>
            {text.bookFlight}
          </Button>
        )}
      </View>

      {isResolving && <LoadingDots />}
      {hotelQuery ? (
        <ExploreHotelResults key={hotelQuery} q={hotelQuery} />
      ) : (
        <>
          <ServiceTiles onStay={() => setKind('hotel')} />
          <HotelSuggestions />
          <AssistantPrompt />
          <FeaturedTrips onPicked={() => router.navigate('/(tabs)/book')} />
        </>
      )}
    </Screen>
  );
}

type ServiceTile = { key: string; label: string; hint?: string; icon: IconName; onPress?: () => void };

/** Bốn dịch vụ như thiết kế Stitch; xe và tour chưa có tồn kho nên hiện dạng "Sắp có", không bấm được. */
function ServiceTiles({ onStay }: { onStay: () => void }) {
  const tiles: ServiceTile[] = [
    {
      key: 'stay',
      label: explorerCopy.serviceStay,
      hint: explorerCopy.serviceStayHint,
      icon: 'bed',
      onPress: onStay,
    },
    {
      key: 'flight',
      label: explorerCopy.serviceFlight,
      hint: explorerCopy.serviceFlightHint,
      icon: 'airplane',
      onPress: () => router.push('/flights'),
    },
    { key: 'car', label: explorerCopy.serviceCar, icon: 'bus' },
    { key: 'tour', label: explorerCopy.serviceTour, icon: 'map' },
  ];
  return (
    <View accessibilityLabel={explorerCopy.servicesLabel} style={styles.services}>
      {tiles.map((tile) => {
        const isAvailable = !!tile.onPress;
        return (
          <Pressable
            key={tile.key}
            accessibilityRole="button"
            accessibilityLabel={
              isAvailable ? tile.label : t('mobile.explorer.comingSoonLabel', { name: tile.label })
            }
            accessibilityState={{ disabled: !isAvailable }}
            disabled={!isAvailable}
            onPress={tile.onPress}
            style={({ pressed }) => [styles.service, pressed && styles.pressed]}
          >
            <View style={[styles.serviceIcon, !isAvailable && styles.serviceIconMuted]}>
              <Icon name={tile.icon} size={22} color={isAvailable ? x.day.link : x.day.textSecondary} />
            </View>
            <Txt numberOfLines={1} style={[styles.serviceLabel, !isAvailable && ui.muted]}>
              {tile.label}
            </Txt>
            <Txt numberOfLines={1} style={styles.serviceHint}>
              {isAvailable ? tile.hint : explorerCopy.comingSoon}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function AssistantPrompt() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${explorerCopy.assistantCta} ${explorerCopy.assistantCtaAction}`}
      onPress={() => router.push('/assistant')}
      style={({ pressed }) => [styles.assistant, pressed && styles.pressed]}
    >
      <Image source={assets.curious} contentFit="contain" style={styles.assistantMascot} />
      <View style={styles.assistantCopy}>
        <Txt style={styles.assistantTitle}>{explorerCopy.assistantCta}</Txt>
        <Txt variant="small" style={ui.muted}>
          {explorerCopy.assistantCtaBody}
        </Txt>
      </View>
      <View style={styles.assistantAction}>
        <Txt style={styles.assistantActionLabel}>{explorerCopy.assistantCtaAction}</Txt>
      </View>
    </Pressable>
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
          // Hạng sao của khách sạn khác điểm đánh giá của khách; ghi rõ cả hai để không bị đọc nhầm.
          note:
            [
              stay.stars ? t('mobile.explore.hotelClass', { stars: stay.stars }) : '',
              stay.rating?.count
                ? t('mobile.explore.hotelRating', {
                    score: stay.rating.average.toLocaleString('vi-VN', { maximumFractionDigits: 1 }),
                    count: stay.rating.count,
                  })
                : '',
            ]
              .filter(Boolean)
              .join(' · ') || undefined,
        }));
    },
  });
  return (
    <HotelRow title={title} hotels={query.data ?? []} isLoading={places.length > 0 && query.isPending} />
  );
}

function HotelRow({ title, hotels, isLoading }: { title: string; hotels: HotelTile[]; isLoading: boolean }) {
  return (
    <View style={styles.section}>
      <Txt variant="heading">{title}</Txt>
      {isLoading && <LoadingDots />}
      {!isLoading && hotels.length === 0 && (
        <Txt variant="small" style={ui.muted}>
          {text.staysEmpty}
        </Txt>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hotelRow}
        style={styles.bleed}
      >
        {hotels.map((hotel) => (
          <Pressable
            key={hotel.hotelId}
            accessibilityRole="button"
            accessibilityLabel={`${hotel.name}, ${money(hotel.price)}${text.perNight}`}
            onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: hotel.hotelId } })}
            style={({ pressed }) => [styles.hotel, pressed && styles.pressed]}
          >
            <View>
              <StayPhoto uri={hotel.thumbnail} style={styles.hotelImage} />
              <View style={styles.placeTag}>
                <Icon name="location" size={12} color={x.brand.white} />
                <Txt numberOfLines={1} style={styles.placeTagText}>
                  {hotel.place}
                </Txt>
              </View>
            </View>
            <View style={styles.hotelText}>
              <Txt style={styles.hotelName} numberOfLines={2}>
                {hotel.name}
              </Txt>
              {hotel.note && (
                <Txt style={styles.hotelNote} numberOfLines={2}>
                  {hotel.note}
                </Txt>
              )}
              <View style={styles.priceRow}>
                <Txt style={styles.hotelPrice}>{money(hotel.price)}</Txt>
                <Txt style={styles.hotelNote}>{text.perNight}</Txt>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const card = {
  backgroundColor: x.day.surface,
  borderRadius: x.radius.xl,
  shadowColor: x.shadow,
  shadowOffset: { width: 0, height: x.elevation.floating.offsetY },
  shadowRadius: x.elevation.floating.blur,
  shadowOpacity: 0.08,
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  header: {
    justifyContent: 'space-between',
    paddingLeft: x.gutter,
    paddingRight: x.space.xs,
    paddingTop: x.space.xs,
  },
  greeting: { gap: x.space.xxs },
  pressed: { opacity: 0.85 },
  searchCard: { ...card, padding: x.space.md, gap: x.space.sm },
  segmented: {
    flexDirection: 'row',
    padding: x.space.xxs,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.canvas,
  },
  segment: {
    flex: 1,
    minHeight: x.control.compact,
    borderRadius: x.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: x.space.xs,
  },
  segmentSelected: { ...card, borderRadius: x.radius.pill, shadowOpacity: 0.1 },
  segmentLabel: { fontFamily: nativeFonts.medium, fontSize: 14, lineHeight: 20, color: x.day.textSecondary },
  segmentLabelSelected: { fontFamily: nativeFonts.bold, color: x.day.text },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: x.space.xs,
    minHeight: x.control.primary,
    borderRadius: x.radius.md,
    borderWidth: 1,
    borderColor: x.day.input,
    backgroundColor: x.day.surface,
    paddingLeft: x.space.sm,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: x.control.compact,
    fontFamily: nativeFonts.regular,
    fontSize: x.type.body.fontSize,
    color: x.day.text,
  },
  services: { flexDirection: 'row', gap: x.space.xs },
  service: {
    ...card,
    flex: 1,
    minWidth: 0,
    borderRadius: x.radius.lg,
    paddingVertical: x.space.sm,
    paddingHorizontal: x.space.xxs,
    alignItems: 'center',
    gap: x.space.xxs,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: x.radius.md,
    backgroundColor: x.day.tintExplore,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: x.space.xxs,
  },
  serviceIconMuted: { backgroundColor: x.day.canvas },
  serviceLabel: { fontFamily: nativeFonts.semibold, fontSize: 13, lineHeight: 18, color: x.day.text },
  serviceHint: { fontSize: 12, lineHeight: 16, color: x.day.textSecondary },
  section: { gap: x.space.sm },
  bleed: { marginHorizontal: -x.gutter },
  hotelRow: { gap: x.space.sm, paddingHorizontal: x.gutter, paddingBottom: x.space.xs },
  hotel: { ...card, width: 224, borderRadius: x.radius.lg, overflow: 'hidden' },
  hotelImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: x.day.tintExplore },
  placeTag: {
    position: 'absolute',
    left: x.space.xs,
    bottom: x.space.xs,
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: x.space.xxs,
    paddingHorizontal: x.space.xs,
    paddingVertical: 3,
    borderRadius: x.radius.pill,
    backgroundColor: x.glass,
  },
  placeTagText: { fontFamily: nativeFonts.semibold, fontSize: 12, lineHeight: 16, color: x.brand.white },
  hotelText: { gap: x.space.xxs, padding: x.space.sm },
  hotelName: { fontFamily: nativeFonts.semibold, fontSize: 16, lineHeight: 22, color: x.day.text },
  hotelNote: { fontSize: 13, lineHeight: 18, color: x.day.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: x.space.xxs },
  hotelPrice: {
    fontFamily: nativeFonts.extraBold,
    fontSize: 19,
    lineHeight: 24,
    color: x.day.text,
    fontVariant: ['tabular-nums'],
  },
  assistant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: x.space.sm,
    padding: x.space.md,
    borderRadius: x.radius.xl,
    backgroundColor: x.day.tintExplore,
  },
  assistantMascot: { width: 56, height: 64 },
  assistantCopy: { flex: 1, gap: 2 },
  assistantTitle: { fontFamily: nativeFonts.bold, fontSize: 16, lineHeight: 22, color: x.day.text },
  assistantAction: {
    minHeight: x.control.compact,
    paddingHorizontal: x.space.sm,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.link,
    justifyContent: 'center',
  },
  assistantActionLabel: { fontFamily: nativeFonts.bold, fontSize: 13, lineHeight: 18, color: x.brand.white },
});
