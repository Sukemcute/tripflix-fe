import { useReelsFeed } from '@tripflix/api-client';
import { getBookableTripPlan } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import { LoadingDots } from '@/components/loading-dots';
import { typeStyle } from '@/components/type-scale';
import { Button, Icon, Row, Txt } from '@/components/mobile-ui';
import { saveTripBooking } from './trip-booking-store';
import { ChoiceChip, styles } from './trip-plan-parts';

const copy = vi.mobile.tripPlan;

/**
 * Lưới "Lộ trình nổi bật": bài có lộ trình đặt được trong feed, lọc theo điểm đến. Chọn một bài thì lưu làm
 * lộ trình đang đặt; tab Khám phá dùng `onPicked` để chuyển sang tab Đặt.
 */
export function FeaturedTrips({
  excludePostId,
  isDisabled = false,
  onPicked,
}: {
  excludePostId?: string;
  isDisabled?: boolean;
  onPicked?: () => void;
}) {
  // Xếp theo độ Hot (tương tác gần đây, nửa đời 48 giờ) thay vì thứ tự ngẫu nhiên của Dành cho bạn.
  const feed = useReelsFeed({ tab: 'hot' });
  const pathname = usePathname();
  const origin = pathname;
  const [destination, setDestination] = useState<string | null>(null);
  // Ô tính bằng điểm ảnh theo bề ngang lưới đo được: trên điện thoại ô 48,5% kèm aspectRatio bị co về 0 nên lưới trắng.
  const [gridWidth, setGridWidth] = useState(0);
  const tileWidth = Math.floor((gridWidth - spacing.sm) / 2);
  const tileSize = gridWidth > 0 ? { width: tileWidth, height: Math.round((tileWidth * 4.2) / 3) } : null;
  const posts = [
    ...new Map(
      (feed.data?.pages.flatMap((page) => page.items) ?? []).map((post) => [post.postId, post]),
    ).values(),
  ].filter(
    (post) =>
      post.postId !== excludePostId && post.tripAttachment && getBookableTripPlan(post.tripAttachment),
  );
  const destinations = [
    ...new Set(
      posts.map((post) => post.tripAttachment!.destinationName).filter((name): name is string => !!name),
    ),
  ];
  const shownPosts = destination
    ? posts.filter((post) => post.tripAttachment!.destinationName === destination)
    : posts;
  return (
    <View style={{ gap: spacing.md }}>
      <Txt variant="heading">{copy.featured}</Txt>
      {destinations.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={layout.filters}>
          {[null, ...destinations].map((name) => (
            <ChoiceChip
              key={name ?? 'all'}
              label={name ?? copy.allDestinations}
              isSelected={destination === name}
              onPress={() => setDestination(name)}
            />
          ))}
        </ScrollView>
      )}
      <ApiErrorNotice
        error={feed.error}
        retry={() => {
          void feed.refetch();
        }}
      />
      {feed.isPending && <LoadingDots />}
      {!feed.isPending && !feed.isError && posts.length === 0 && (
        <Txt style={styles.muted}>{copy.featuredEmpty}</Txt>
      )}
      <View style={layout.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
        {shownPosts.map((post) => {
          const trip = post.tripAttachment!;
          const plan = getBookableTripPlan(trip)!;
          const days = Math.max(trip.daysCount ?? 0, ...(trip.items ?? []).map((item) => item.day), 1);
          // Poster riêng của lộ trình (TF105) trước, không có thì ảnh bìa video.
          const poster =
            trip.posterUrl || post.video.posters.w540 || post.video.posters.w360 || post.video.posters.w720;
          return (
            <Pressable
              key={post.postId}
              accessibilityRole="button"
              accessibilityLabel={post.title}
              disabled={isDisabled}
              onPress={() => {
                saveTripBooking({
                  postId: post.postId,
                  postTitle: post.title,
                  authorName: post.author.name ?? copy.communityAuthor,
                  coverUrl: poster,
                  trip,
                  origin,
                  fromFeatured: true,
                });
                onPicked?.();
              }}
              style={({ pressed }) => [layout.reel, tileSize, pressed && styles.pressed]}
            >
              {poster ? (
                <Image source={poster} contentFit="cover" style={StyleSheet.absoluteFill} />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: x.day.link }]} />
              )}
              <View style={layout.reelBadge}>
                <Txt style={layout.reelBadgeText}>{t('mobile.tripPlan.dayCount', { days })}</Txt>
              </View>
              <View style={layout.reelText}>
                <Txt style={layout.reelTitle} numberOfLines={2}>
                  {post.title}
                </Txt>
                <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
                  {!!trip.destinationName && (
                    <Txt style={layout.reelMeta} numberOfLines={1}>
                      {trip.destinationName}
                    </Txt>
                  )}
                  {plan.flights.length > 0 && (
                    <Icon name="airplane-outline" size={13} color={x.brand.white} />
                  )}
                  {plan.hotels.length > 0 && <Icon name="bed-outline" size={13} color={x.brand.white} />}
                </Row>
              </View>
            </Pressable>
          );
        })}
      </View>
      {feed.hasNextPage && (
        <Button
          tone="text"
          disabled={isDisabled || feed.isFetchingNextPage}
          onPress={() => {
            void feed.fetchNextPage();
          }}
        >
          {copy.loadMore}
        </Button>
      )}
    </View>
  );
}

const layout = StyleSheet.create({
  filters: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reel: {
    width: '48.5%',
    aspectRatio: 3 / 4.2,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: x.day.canvas,
  },
  reelBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: x.day.tintExplore,
  },
  // Chữ dùng thang explorer và phông của app như các thẻ chuyến bay, khách sạn bên dưới.
  reelBadgeText: { ...typeStyle('caption'), fontFamily: nativeFonts.semibold, color: x.day.link },
  reelText: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 2,
    padding: spacing.sm,
    backgroundColor: x.scrim[2],
  },
  reelTitle: { ...typeStyle('bodyStrong'), fontFamily: nativeFonts.semibold, color: x.brand.white },
  reelMeta: { ...typeStyle('caption'), fontFamily: nativeFonts.medium, color: x.brand.white, flexShrink: 1 },
});
