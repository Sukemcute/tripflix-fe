import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, getFutureDate, useApiSession } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Icon, Mascot, money, Notice, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { CommerceError } from './commerce-state';
import { CartLink } from './cart-ui';
import { HotelInfoSections, HotelReviewsSection } from './hotel-detail-sections';
import { PhotoGallery } from './hotel-parts';

const text = vi.commerce;
const hotelText = vi.hotel;
const HERO_OVERLAP = 24;
const MIN_HERO_HEIGHT = 200;

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
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        opacity: 0.94,
      }}
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
  const { isReady } = useApiSession();
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
  // Ảnh + thẻ thông tin vừa khít một màn hình: ảnh lấy phần chiều cao còn lại sau thẻ.
  const [viewportHeight, setViewportHeight] = useState(0);
  const [infoHeight, setInfoHeight] = useState(0);
  const heroHeight =
    viewportHeight && infoHeight
      ? Math.max(MIN_HERO_HEIGHT, viewportHeight - infoHeight + HERO_OVERLAP)
      : undefined;
  // Chọn phòng ở màn riêng (như Agoda) để màn chi tiết gọn, mang theo kỳ ở và số khách.
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
  const footer = hotel?.priceFrom ? (
    <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <View>
        <Txt variant="small" style={ui.muted}>
          {hotelText.from}
        </Txt>
        <Txt variant="heading" style={{ color: colors.coralInk }}>
          {money(hotel.priceFrom)}
          <Txt variant="small" style={ui.muted}>
            {` ${hotelText.perNightShort}`}
          </Txt>
        </Txt>
      </View>
      <Button onPress={openRooms}>{hotelText.chooseRoom}</Button>
    </Row>
  ) : undefined;

  return (
    <Screen header={null} scroll={false} padded={false} footer={footer}>
      <ScrollView
        onLayout={(event) => setViewportHeight(Math.round(event.nativeEvent.layout.height))}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <View>
          <PhotoGallery
            images={photos}
            name={hotel?.name ?? text.hotel}
            ratio={4 / 3}
            rounded={0}
            height={heroHeight}
            counterBottom={36}
          />
          <Row
            style={{
              position: 'absolute',
              top: spacing.md,
              left: spacing.md,
              right: spacing.md,
              justifyContent: 'space-between',
            }}
          >
            <FloatingButton
              label={vi.mobile.common.back}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            >
              <Icon name="arrow-back" size={20} />
            </FloatingButton>
            <View
              style={{
                borderRadius: radius.pill,
                backgroundColor: colors.background,
                opacity: 0.94,
                padding: 4,
              }}
            >
              <CartLink />
            </View>
          </Row>
        </View>

        {/* Thẻ thông tin giống băng rôn web: nền xanh nhạt, vòng vàng bên phải, linh vật Tripi. */}
        <View
          onLayout={(event) => setInfoHeight(Math.round(event.nativeEvent.layout.height))}
          style={{
            marginTop: -HERO_OVERLAP,
            borderTopLeftRadius: mobileLayout.sheetRadius,
            borderTopRightRadius: mobileLayout.sheetRadius,
            overflow: 'hidden',
            backgroundColor: colors.seaMist,
            paddingHorizontal: mobileLayout.gutter,
            paddingVertical: spacing.lg,
            gap: spacing.xs,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -140,
              top: -40,
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: colors.sunSoft,
            }}
          />
          <View pointerEvents="none" style={{ position: 'absolute', right: 4, top: 6 }}>
            <Mascot pose="explore" size={104} />
          </View>
          {!params.id && <Notice>{text.noHotel}</Notice>}
          {hotel && (
            <>
              <Txt variant="small" style={{ color: colors.tealInk, fontWeight: '700' }}>
                {hotel.province.name}
              </Txt>
              <Txt variant="title" style={{ maxWidth: '68%' }}>
                {hotel.name}
              </Txt>
              {hotel.stars ? (
                <Txt style={{ color: colors.coralInk, letterSpacing: 2 }}>{'★'.repeat(hotel.stars)}</Txt>
              ) : null}
              {hotel.address && (
                <Txt variant="small" style={[ui.muted, { maxWidth: '70%' }]}>
                  {hotel.address}
                </Txt>
              )}
              {hotel.location && (
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${hotel.location!.lat},${hotel.location!.lng}`,
                    )
                  }
                >
                  <Txt variant="small" style={{ color: colors.tealInk, fontWeight: '600' }}>
                    {hotelText.map} ↗
                  </Txt>
                </Pressable>
              )}
              {hotel.rating && (
                <Row style={{ gap: spacing.sm, alignItems: 'center', marginTop: spacing.xs }}>
                  <View
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 4,
                      borderRadius: radius.pill,
                      backgroundColor: colors.background,
                    }}
                  >
                    <Txt variant="label" style={{ color: colors.tealInk }}>
                      {hotel.rating.average.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} / 5
                    </Txt>
                  </View>
                  <Txt variant="small" style={ui.muted}>
                    {t('hotel.reviewCount', { count: hotel.rating.count })}
                    {hotel.rating.source ? ` · ${hotel.rating.source}` : ''}
                  </Txt>
                </Row>
              )}
            </>
          )}
        </View>

        <View style={{ paddingHorizontal: mobileLayout.gutter }}>
          <CommerceError
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
          {query.isPending && <Txt style={{ paddingVertical: spacing.lg }}>{hotelText.loading}</Txt>}
          {hotel && <HotelInfoSections hotel={hotel} />}
          {params.id && <HotelReviewsSection id={params.id} />}
        </View>
      </ScrollView>
    </Screen>
  );
}
