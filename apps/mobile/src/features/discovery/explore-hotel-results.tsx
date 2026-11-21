import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAvailableStays, getFutureDate, readPage, useApiSession } from '@tripflix/api-client';
import { suggestControllerSuggest } from '@tripflix/api-client/core-api/discovery/discovery';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import { LoadingDots } from '@/components/loading-dots';
import { compactType } from '@/components/mobile-scale';
import { Icon, money, Notice, Row, Txt, ui } from '@/components/mobile-ui';
import { StayPhoto } from './stay-photo';

const PAGE_SIZE = 10;
/** Số nút trang hiện cùng lúc quanh trang đang xem. */
const PAGE_WINDOW = 5;
const text = vi.mobile.explore;

/**
 * Kết quả tìm khách sạn ở tab Khám phá: danh sách dọc có nút số trang như trang tìm khách sạn trên web.
 * API chỉ trả con trỏ trang sau nên nhớ con trỏ từng trang; bấm trang chưa tải thì tải lần lượt tới đó.
 */
export function ExploreHotelResults({ q }: { q: string }) {
  const { isReady } = useApiSession();
  const queryClient = useQueryClient();
  const [checkIn] = useState(() => getFutureDate(1));
  const [checkOut] = useState(() => getFutureDate(3));
  const place = useQuery({
    queryKey: ['discovery', 'explore-hotel-place', q],
    enabled: isReady && q.length >= 2,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const suggestions = readPage(
        (await suggestControllerSuggest({ q, types: 'place' }, { signal })).data,
      ).items;
      return suggestions.find((item) => item.type === 'place') ?? null;
    },
  });
  const placeId = place.data?.refId;
  const [page, setPage] = useState(1);
  // cursors[n] là con trỏ của trang n + 1; trang 1 không cần con trỏ.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [isJumping, setIsJumping] = useState(false);
  const pageQuery = (cursor: string | undefined) => ({
    queryKey: ['discovery', 'explore-hotels', placeId, checkIn, checkOut, cursor],
    staleTime: 60_000,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      getAvailableStays(
        {
          placeId: placeId!,
          checkIn,
          checkOut,
          adults: '2',
          rooms: '',
          minStars: '',
          priceMin: '',
          priceMax: '',
          sort: 'price',
        },
        { signal, limit: PAGE_SIZE, cursor },
      ),
  });
  const stays = useQuery({
    ...pageQuery(cursors[page - 1]),
    enabled: !!placeId && (page === 1 || cursors[page - 1] !== undefined),
  });
  // Con trỏ trang sau suy ra từ trang đang xem, khỏi lưu state riêng.
  const knownCursors = [...cursors];
  if (stays.data?.nextCursor && knownCursors[page] === undefined) knownCursors[page] = stays.data.nextCursor;
  const total = stays.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goTo = async (target: number) => {
    if (target === page || target < 1 || target > pageCount || isJumping) return;
    if (target === 1 || knownCursors[target - 1] !== undefined) {
      setCursors(knownCursors);
      setPage(target);
      return;
    }
    // Tải lần lượt các trang ở giữa để có con trỏ của trang muốn tới.
    setIsJumping(true);
    try {
      const known = [...knownCursors];
      for (let index = known.length - 1; index < target - 1; index += 1) {
        const data = await queryClient.fetchQuery(pageQuery(known[index]));
        if (!data.nextCursor) break;
        known[index + 1] = data.nextCursor;
      }
      setCursors(known);
      if (known[target - 1] !== undefined) setPage(target);
    } finally {
      setIsJumping(false);
    }
  };

  const isLoading = place.isPending || stays.isPending || isJumping;
  const hotels = stays.data?.items ?? [];
  const firstPage = Math.max(1, Math.min(page - Math.floor(PAGE_WINDOW / 2), pageCount - PAGE_WINDOW + 1));
  const pages = Array.from({ length: Math.min(PAGE_WINDOW, pageCount) }, (_, index) => firstPage + index);
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <Txt variant="heading">{place.data?.name ?? text.hotelResults}</Txt>
        {total > 0 && (
          <Txt variant="small" style={ui.muted}>
            {t('mobile.explore.hotelTotal', { count: total })}
          </Txt>
        )}
      </View>
      <ApiErrorNotice
        error={place.error ?? stays.error}
        retry={() => void (place.error ? place.refetch() : stays.refetch())}
      />
      {isLoading && <LoadingDots />}
      {!isLoading && !hotels.length && <Notice>{vi.mobile.tripPlan.hotelEmpty}</Notice>}
      {!isJumping &&
        hotels.map((hotel) => (
          <Pressable
            key={hotel.hotelId}
            accessibilityRole="button"
            accessibilityLabel={hotel.name}
            onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: hotel.hotelId } })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <StayPhoto uri={hotel.thumbnail} style={styles.photo} />
            <View style={styles.body}>
              <Txt style={styles.name} numberOfLines={2}>
                {hotel.name}
              </Txt>
              <Row style={{ gap: 4, alignItems: 'center' }}>
                <Icon name="location-outline" size={13} color={x.day.textSecondary} />
                <Txt variant="small" style={ui.muted} numberOfLines={1}>
                  {[
                    hotel.province.name,
                    hotel.stars ? t('mobile.explore.hotelClass', { stars: hotel.stars }) : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Txt>
              </Row>
              {!!hotel.rating?.count && (
                <Row style={{ gap: spacing.xs, alignItems: 'center' }}>
                  <Txt style={styles.score}>
                    {hotel.rating.average.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                  </Txt>
                  <Txt variant="small" style={ui.muted}>
                    {t('hotel.reviewCount', { count: hotel.rating.count })}
                  </Txt>
                </Row>
              )}
              <View style={styles.priceRow}>
                <Txt variant="small" style={ui.muted}>
                  {vi.hotel.from}
                </Txt>
                <Txt style={styles.price}>
                  {money(hotel.unitPrice)}
                  <Txt variant="small" style={ui.muted}>
                    {' ' + vi.hotel.perNightShort}
                  </Txt>
                </Txt>
              </View>
            </View>
          </Pressable>
        ))}
      {pageCount > 1 && (
        <Row style={styles.pager}>
          <PageButton icon="chevron-back" isDisabled={page === 1} onPress={() => void goTo(page - 1)} />
          {pages[0]! > 1 && <Txt style={styles.ellipsis}>…</Txt>}
          {pages.map((number) => (
            <PageButton
              key={number}
              label={String(number)}
              isSelected={number === page}
              onPress={() => void goTo(number)}
            />
          ))}
          {pages.at(-1)! < pageCount && <Txt style={styles.ellipsis}>…</Txt>}
          <PageButton
            icon="chevron-forward"
            isDisabled={page === pageCount}
            onPress={() => void goTo(page + 1)}
          />
        </Row>
      )}
    </View>
  );
}

function PageButton({
  label,
  icon,
  isSelected = false,
  isDisabled = false,
  onPress,
}: {
  label?: string;
  icon?: 'chevron-back' | 'chevron-forward';
  isSelected?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ? t('mobile.explore.pageLabel', { page: label }) : undefined}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      disabled={isDisabled || isSelected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pageButton,
        isSelected && styles.pageButtonSelected,
        isDisabled && { opacity: 0.4 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {icon ? (
        <Icon name={icon} size={16} color={x.day.text} />
      ) : (
        <Txt style={[styles.pageText, isSelected && styles.pageTextSelected]}>{label}</Txt>
      )}
    </Pressable>
  );
}

// Thẻ kết quả theo thiết kế Stitch: ảnh lớn ở trên, tên, điểm đánh giá, giá rõ đơn vị.
const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: x.radius.xl,
    backgroundColor: x.day.surface,
    shadowColor: x.shadow,
    shadowOffset: { width: 0, height: x.elevation.floating.offsetY },
    shadowRadius: x.elevation.floating.blur,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  photo: { width: '100%', aspectRatio: 16 / 10, backgroundColor: x.day.tintExplore },
  body: { gap: x.space.xxs, padding: x.space.md },
  name: { fontSize: 18, lineHeight: 24, fontFamily: nativeFonts.bold, color: x.day.text },
  score: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: nativeFonts.bold,
    color: x.brand.ink,
    backgroundColor: x.brand.sun,
    paddingHorizontal: x.space.xs,
    paddingVertical: 2,
    borderRadius: x.radius.pill,
    overflow: 'hidden',
  },
  priceRow: {
    marginTop: x.space.xs,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: x.space.xxs,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: nativeFonts.extraBold,
    color: x.day.text,
    fontVariant: ['tabular-nums'],
  },
  pager: { justifyContent: 'center', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  pageButton: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  pageButtonSelected: { backgroundColor: x.day.link, borderColor: x.day.link },
  pageText: { ...compactType.body, fontFamily: nativeFonts.semibold, color: x.day.text },
  pageTextSelected: { color: x.brand.white },
  ellipsis: { ...compactType.body, color: x.day.textSecondary },
});
