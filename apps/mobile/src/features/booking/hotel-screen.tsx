import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, getFutureDate, useApiSession } from '@tripflix/api-client';
import { isValidAssistantStay } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, mobileLayout, nativeFonts, spacing } from '@tripflix/tokens';
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
    fromTripi?: string;
  }>();
  const { isReady, user } = useApiSession();
  const { width, height } = useWindowDimensions();
  const today = getFutureDate(0);
  const isTripi = params.fromTripi === '1';
  const stay = {
    checkIn: isTripi
      ? (params.checkIn ?? '')
      : params.checkIn && params.checkIn >= today
        ? params.checkIn
        : getFutureDate(1),
    checkOut: params.checkOut ?? (isTripi ? '' : getFutureDate(3)),
    adults: isTripi ? Number(params.adults) : Number(params.adults ?? 2) || 2,
  };
  const isStayValid =
    !isTripi ||
    isValidAssistantStay(
      { ...stay, children: Number(params.children), infants: Number(params.infants) },
      today,
    );
  const editStay = () => router.push({ pathname: '/tripi-stay', params: { ...params, name: hotel?.name } });
  const query = useQuery({
    queryKey: ['commerce', 'hotel', params.id, stay],
    enabled: isReady && !!params.id && isStayValid,
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
        ...(isTripi ? { fromTripi: '1' } : {}),
      },
    });
  const photos = hotel ? (hotel.images.length ? hotel.images : hotel.thumbnail ? [hotel.thumbnail] : []) : [];
  const footer =
    hotel?.priceFrom != null && isStayValid ? (
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
          <Icon name="arrow-forward" size={20} color={x.action.onPrimary} />
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
            isLoading={!!params.id && isStayValid && query.isPending}
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
          {isTripi && (
            <View style={styles.tripContext}>
              <Txt style={styles.mapLabel}>{vi.assistant.stayReview.confirmed}</Txt>
              {isStayValid ? (
                <Txt style={styles.address}>
                  {stay.checkIn.split('-').reverse().join('/')} →{' '}
                  {stay.checkOut.split('-').reverse().join('/')} · {stay.adults}{' '}
                  {hotelText.adultsLabel.toLowerCase()}
                  {Number(params.children) > 0
                    ? ` · ${params.children} ${hotelText.childrenLabel.toLowerCase()}`
                    : ''}
                  {Number(params.infants) > 0
                    ? ` · ${params.infants} ${hotelText.infantsLabel.toLowerCase()}`
                    : ''}
                </Txt>
              ) : (
                <Notice tone="error">{vi.assistant.stayReview.invalidStay}</Notice>
              )}
              <Pressable accessibilityRole="button" onPress={editStay} style={styles.map}>
                <Icon name="calendar-outline" size={18} color={x.day.link} />
                <Txt style={styles.mapLabel}>{vi.assistant.stayReview.edit}</Txt>
              </Pressable>
            </View>
          )}
          {!params.id && <Notice>{text.noHotel}</Notice>}
          {hotel && (
            <>
              <View style={styles.provinceChip}>
                <Icon name="location" size={14} color={x.day.link} />
                <Txt style={styles.province}>{hotel.province.name}</Txt>
              </View>
              <Txt style={styles.name}>{hotel.name}</Txt>
              <Row style={styles.starRow}>
                <Icon name="star" size={18} color={x.day.text} />
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
                  <Icon name="location-outline" size={18} color={x.day.link} />
                  <Txt style={styles.mapLabel}>{hotelText.map}</Txt>
                  <Icon name="open-outline" size={17} color={x.day.link} />
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
          {query.isPending && !!params.id && isStayValid && (
            <Txt style={styles.loading}>{hotelText.loading}</Txt>
          )}
          {hotel && <HotelInfoSections hotel={hotel} />}
          {params.id && <HotelReviewsSection id={params.id} />}
        </View>
      </ScrollView>
    </Screen>
  );
}

const lift = {
  shadowColor: x.shadow,
  shadowOffset: { width: 0, height: x.elevation.floating.offsetY },
  shadowRadius: x.elevation.floating.blur,
  shadowOpacity: 0.12,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  tripContext: {
    backgroundColor: x.day.tintExplore,
    borderRadius: x.radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  content: { paddingBottom: spacing.xl },
  // Khối thông tin chồng lên ảnh với góc trên bo lớn, như thẻ trượt trong thiết kế Stitch.
  identity: {
    marginTop: -x.space.xl,
    padding: mobileLayout.gutter,
    gap: spacing.md,
    backgroundColor: x.day.canvas,
    borderTopLeftRadius: x.radius.xl,
    borderTopRightRadius: x.radius.xl,
  },
  provinceChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.tintExplore,
  },
  province: { fontSize: 13, lineHeight: 18, color: x.day.link, fontFamily: nativeFonts.semibold },
  name: {
    fontSize: x.type.title.fontSize,
    lineHeight: 34,
    color: x.day.text,
    fontFamily: nativeFonts.extraBold,
    letterSpacing: x.type.title.letterSpacing,
  },
  secondary: { fontSize: 14, lineHeight: 21, color: x.day.textSecondary, flexShrink: 1 },
  address: { fontSize: 14, lineHeight: 22, color: x.day.textSecondary },
  starRow: { gap: spacing.xs, alignItems: 'center' },
  toolbar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  floating: {
    ...lift,
    width: 44,
    height: 44,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cart: { ...lift, borderRadius: x.radius.pill, backgroundColor: x.day.surface, padding: spacing.xs },
  pressed: { opacity: 0.75 },
  map: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: x.day.tintExplore,
    borderRadius: x.radius.pill,
  },
  mapLabel: { fontSize: 14, lineHeight: 22, fontFamily: nativeFonts.semibold, color: x.day.link },
  rating: { gap: spacing.sm },
  ratingRow: { alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  score: {
    borderRadius: x.radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: x.brand.sun,
  },
  scoreLabel: { fontSize: 18, lineHeight: 26, fontFamily: nativeFonts.extraBold, color: x.brand.ink },
  reviewText: { gap: spacing.xs, flexShrink: 1 },
  footer: { gap: spacing.sm },
  chooseRoom: {
    minHeight: x.control.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: x.radius.pill,
    backgroundColor: x.action.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  chooseRoomLabel: {
    fontSize: 16,
    lineHeight: 24,
    color: x.action.onPrimary,
    fontFamily: nativeFonts.bold,
    flexShrink: 1,
    textAlign: 'center',
  },
  priceRow: { alignItems: 'baseline', gap: spacing.xs, flexWrap: 'wrap' },
  price: {
    fontSize: 24,
    lineHeight: 32,
    color: x.day.text,
    fontFamily: nativeFonts.extraBold,
    fontVariant: ['tabular-nums'],
  },
  sections: { gap: spacing.sm, paddingHorizontal: mobileLayout.gutter, backgroundColor: x.day.canvas },
  loading: { paddingVertical: spacing.lg, color: x.day.textSecondary, fontSize: 14, lineHeight: 23 },
});
