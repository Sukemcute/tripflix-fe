import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, getFutureDate, useApiSession } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon, money, Notice, Row, Screen, Txt } from '@/components/mobile-ui';
import { CommerceError } from './commerce-state';
import { CartLink } from './cart-ui';
import { HotelInfoSections, HotelReviewsSection } from './hotel-detail-sections';
import { PhotoGallery } from './hotel-parts';

const text = vi.commerce;
const hotelText = vi.hotel;

function FloatingButton({
  children,
  label,
  onPress,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.floating, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function CommerceHotelScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    infants?: string;
  }>();
  const { isReady, user } = useApiSession();
  const { width, height } = useWindowDimensions();
  const today = getFutureDate(0);
  const stay = {
    checkIn: params.checkIn && params.checkIn >= today ? params.checkIn : getFutureDate(1),
    checkOut: params.checkOut ?? getFutureDate(3),
    adults: Number(params.adults ?? 2) || 2,
  };
  const query = useQuery({
    queryKey: ['commerce', 'hotel', params.id, stay],
    enabled: isReady && !!params.id,
    queryFn: ({ signal }) => commerceApi.getHotel(params.id!, stay, signal),
  });
  const hotel = query.data;
  const heroHeight = height < 700 ? 180 : Math.min(230, Math.round(width * 0.6));
  const openRooms = () =>
    router.push({
      pathname: '/hotel-rooms',
      params: {
        id: params.id ?? '',
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults: String(stay.adults),
        children: params.children ?? '0',
        infants: params.infants ?? '0',
      },
    });
  const photos = hotel ? (hotel.images.length ? hotel.images : hotel.thumbnail ? [hotel.thumbnail] : []) : [];
  const footer =
    hotel?.priceFrom != null ? (
      <View style={styles.footer}>
        <Row style={styles.priceRow}>
          <Txt style={styles.secondary}>{hotelText.from}</Txt>
          <Txt style={styles.price}>{money(hotel.priceFrom)}</Txt>
          <Txt style={styles.secondary}>{hotelText.perNightShort}</Txt>
        </Row>
        <Pressable
          accessibilityRole="button"
          onPress={openRooms}
          style={({ pressed }) => [styles.chooseRoom, pressed && styles.pressed]}
        >
          <Txt style={styles.chooseRoomLabel}>{hotelText.chooseRoom}</Txt>
          <Icon name="arrow-forward" size={20} color={colors.background} />
        </Pressable>
      </View>
    ) : undefined;

  return (
    <Screen header={null} scroll={false} padded={false} footer={footer}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View>
          <PhotoGallery
            key={photos.join('|')}
            images={photos}
            name={hotel?.name ?? text.hotel}
            rounded={0}
            height={heroHeight}
            isLoading={!!params.id && query.isPending}
          />
          <Row style={styles.toolbar}>
            <FloatingButton
              label={vi.mobile.common.back}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            >
              <Icon name="arrow-back" size={22} />
            </FloatingButton>
            <View style={user ? styles.cart : undefined}>
              <CartLink />
            </View>
          </Row>
        </View>
        <View style={styles.identity}>
          {!params.id && <Notice>{text.noHotel}</Notice>}
          {hotel && (
            <>
              <Txt style={styles.province}>{hotel.province.name}</Txt>
              <Txt style={styles.name}>{hotel.name}</Txt>
              <Row style={styles.starRow}>
                <Icon name="star-outline" size={18} color={colors.textMuted} />
                <Txt style={styles.secondary}>
                  {hotel.stars ? t('hotel.starClass', { count: hotel.stars }) : hotelText.noStarClass}
                </Txt>
              </Row>
              {!!hotel.address && <Txt style={styles.address}>{hotel.address}</Txt>}
              {hotel.location && (
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${hotel.location!.lat},${hotel.location!.lng}`,
                    )
                  }
                  style={({ pressed }) => [styles.map, pressed && styles.pressed]}
                >
                  <Icon name="location-outline" size={18} color={colors.tealInk} />
                  <Txt style={styles.mapLabel}>{hotelText.map}</Txt>
                  <Icon name="open-outline" size={17} color={colors.tealInk} />
                </Pressable>
              )}
              {hotel.rating && hotel.rating.count > 0 ? (
                <View style={styles.rating}>
                  <Txt style={styles.secondary}>{hotelText.guestScore}</Txt>
                  <Row style={styles.ratingRow}>
                    <View style={styles.score}>
                      <Txt style={styles.scoreLabel}>
                        {hotel.rating.average.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} / 5
                      </Txt>
                    </View>
                    <View style={styles.reviewText}>
                      <Txt style={styles.secondary}>
                        {t('hotel.reviewCount', { count: hotel.rating.count })}
                      </Txt>
                      {!!hotel.rating.source && (
                        <Txt style={styles.secondary}>
                          {hotelText.ratingSource}: {hotel.rating.source}
                        </Txt>
                      )}
                    </View>
                  </Row>
                </View>
              ) : (
                <Txt style={styles.secondary}>{hotelText.noGuestReviews}</Txt>
              )}
            </>
          )}
        </View>
        <View style={styles.sections}>
          <CommerceError
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
          {query.isPending && !!params.id && <Txt style={styles.loading}>{hotelText.loading}</Txt>}
          {hotel && <HotelInfoSections hotel={hotel} />}
          {params.id && <HotelReviewsSection id={params.id} />}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  identity: { padding: mobileLayout.gutter, gap: spacing.md, backgroundColor: colors.background },
  province: { fontSize: 13, lineHeight: 22, color: colors.tealInk, fontFamily: nativeFonts.semibold },
  name: { fontSize: 26, lineHeight: 36, color: colors.navy, fontFamily: nativeFonts.bold },
  secondary: { fontSize: 13, lineHeight: 22, color: colors.textMuted, flexShrink: 1 },
  address: { fontSize: 14, lineHeight: 23, color: colors.textMuted },
  starRow: { gap: spacing.sm, alignItems: 'center' },
  toolbar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  floating: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cart: { borderRadius: radius.sm, backgroundColor: colors.background, padding: spacing.xs },
  pressed: { opacity: 0.75 },
  map: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
  },
  mapLabel: { fontSize: 14, lineHeight: 23, fontFamily: nativeFonts.semibold, color: colors.tealInk },
  rating: { gap: spacing.sm },
  ratingRow: { alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  score: {
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.seaMist,
  },
  scoreLabel: { fontSize: 18, lineHeight: 28, fontFamily: nativeFonts.semibold, color: colors.tealInk },
  reviewText: { gap: spacing.xs, flexShrink: 1 },
  footer: { gap: spacing.md },
  chooseRoom: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.coralInk,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  chooseRoomLabel: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.background,
    fontFamily: nativeFonts.semibold,
    flexShrink: 1,
    textAlign: 'center',
  },
  priceRow: { alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  price: { fontSize: 24, lineHeight: 34, color: colors.navy, fontFamily: nativeFonts.semibold },
  sections: { paddingHorizontal: mobileLayout.gutter },
  loading: { paddingVertical: spacing.lg, color: colors.textMuted, fontSize: 14, lineHeight: 23 },
});
