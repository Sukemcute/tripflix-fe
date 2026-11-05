import { getDemoFeed, type DemoTripSlug } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors as c, mobileLayout as layout, nativeFonts as f, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { PanResponder, Pressable, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { assets, Badge, Button, copy, Icon, IconButton, money, Row, Txt, ui } from '@/components/mobile-ui';
import { useReview } from '@/features/review/review-provider';
import { INITIAL_COMMENT_COUNT, ReelComments } from './reel-comments';

export function FeedScreen() {
  const review = useReview();
  const { setFeedIndex } = review;
  const trips = getDemoFeed(review.feedMode);
  const index = Math.min(review.feedIndex, trips.length - 1);
  const trip = trips[index]!;
  const content = vi.demo.trips[trip.slug];
  const isBaseTrip = trip.slug === 'nha-trang';
  const isLiked = review.isTripLiked(trip.slug);
  const isSaved = review.isTripSaved(trip.slug);
  const tab = review.feedMode === 'for-you' ? 0 : 1;
  const move = (delta: number) => review.setFeedIndex(Math.max(0, Math.min(trips.length - 1, index + delta)));
  const [hasComments, setComments] = useState(false);
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !hasComments && Math.abs(gesture.dy) > 40 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.5,
        onPanResponderRelease: (_event, gesture) => {
          if (Math.abs(gesture.dy) > 65)
            setFeedIndex(Math.max(0, Math.min(trips.length - 1, index + (gesture.dy < 0 ? 1 : -1))));
        },
      }),
    [index, trips.length, setFeedIndex, hasComments],
  );
  const [commentCounts, setCommentCounts] = useState<Partial<Record<DemoTripSlug, number>>>({});
  const updateCommentCount = useCallback((slug: DemoTripSlug, count: number) => {
    setCommentCounts((previous) => (previous[slug] === count ? previous : { ...previous, [slug]: count }));
  }, []);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen} {...swipe.panHandlers}>
      <StatusBar style="light" />
      <Image source={assets[trip.image]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} />
      <Row style={styles.top}>
        {[copy.feed.forYou, copy.feed.trending].map((title, index) => (
          <Pressable
            key={title}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === tab }}
            onPress={() => {
              review.setFeedMode(index === 0 ? 'for-you' : 'trending');
              review.setFeedIndex(0);
            }}
            style={[styles.tab, index === tab && { borderBottomColor: c.background }]}
          >
            <Txt variant="label" style={{ color: c.background, opacity: tab === index ? 1 : 0.7 }}>
              {title}
            </Txt>
          </Pressable>
        ))}
        <View style={ui.flex} />
        <IconButton
          name="search-outline"
          label={copy.common.search}
          color={c.background}
          onPress={() => router.push('/search')}
        />
      </Row>
      <View style={ui.flex} />
      <View style={styles.bottom}>
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: s.md }}>
            <Badge tone="sun" icon="location-outline">
              {content.destination}
            </Badge>
            <Txt variant="title" style={styles.headline}>
              {content.headline}
            </Txt>
            <Row>
              <View style={styles.avatar}>
                <Txt variant="label">{isBaseTrip ? copy.feed.initials : vi.demo.feed.initials}</Txt>
              </View>
              <Txt variant="label" style={{ color: c.background }}>
                {isBaseTrip ? copy.feed.handle : vi.demo.feed.creator}
              </Txt>
              <Icon name="checkmark-circle-outline" color={c.background} size={20} />
            </Row>
            <Txt variant="small" style={{ color: c.background }}>
              {content.caption}
            </Txt>
          </View>
          <View style={styles.actions}>
            <View style={styles.action}>
              <IconButton
                name={isLiked ? 'heart' : 'heart-outline'}
                label={copy.common.like}
                color={isLiked ? c.coral : c.background}
                onPress={() => review.requireAccount('like', '/(tabs)', trip.slug)}
              />
              <Txt variant="caption" style={styles.white}>
                {new Intl.NumberFormat('vi-VN').format(trip.likes + (isLiked ? 1 : 0))}
              </Txt>
            </View>
            <View style={styles.action}>
              <IconButton
                name="chatbubble-ellipses-outline"
                label={copy.common.comments}
                color={c.background}
                onPress={() => setComments(true)}
              />
              <Txt variant="caption" style={styles.white}>
                {commentCounts[trip.slug] ?? INITIAL_COMMENT_COUNT}
              </Txt>
            </View>
            <View style={styles.action}>
              <IconButton
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                label={copy.common.save}
                color={c.background}
                onPress={() => review.requireAccount('save', '/(tabs)', trip.slug)}
              />
              <Txt variant="caption" style={styles.white}>
                {isSaved ? copy.common.saved : copy.common.save}
              </Txt>
            </View>
            <IconButton
              name="paper-plane-outline"
              label={copy.common.share}
              color={c.background}
              onPress={() => {
                void Share.share({ message: `${content.title} · ${content.caption}` }).catch(() => {});
              }}
            />
          </View>
        </Row>
        <View style={styles.trip}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={ui.flex}>
              <Txt variant="label">{content.title}</Txt>
              <Txt variant="caption" style={ui.muted}>
                {money(trip.pricePerGuest)}
                {copy.common.perGuest} · {copy.common.reference}
              </Txt>
            </View>
            <Icon name="arrow-up-outline" />
          </Row>
          <Button
            icon="arrow-forward"
            onPress={() =>
              router.push(
                isBaseTrip ? '/itinerary' : { pathname: '/trip/[slug]', params: { slug: trip.slug } },
              )
            }
          >
            {isBaseTrip ? copy.feed.tripCta : vi.demo.common.detail}
          </Button>
        </View>
        <Txt variant="caption" style={[styles.white, { opacity: 0.8 }]}>
          {copy.feed.coverNotice}
        </Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton
            name="chevron-up"
            label={vi.demo.feed.previous}
            color={c.background}
            onPress={() => move(-1)}
          />
          <Txt variant="caption" style={styles.white} accessibilityLiveRegion="polite">
            {t('demo.feed.position', { current: index + 1, total: trips.length })}
          </Txt>
          <IconButton
            name="chevron-down"
            label={vi.demo.feed.next}
            color={c.background}
            onPress={() => move(1)}
          />
        </Row>
      </View>
      <ReelComments
        visible={hasComments}
        tripSlug={trip.slug}
        onClose={() => setComments(false)}
        onCountChange={updateCommentCount}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  top: { paddingHorizontal: layout.gutter, paddingTop: s.md, gap: s.lg },
  tab: {
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: c.transparent,
  },
  bottom: { padding: s.lg, gap: s.sm },
  headline: { color: c.background, fontFamily: f.extraBold, fontSize: 32, lineHeight: 41 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.sunSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { alignItems: 'center', gap: s.sm },
  action: { alignItems: 'center' },
  white: { color: c.background },
  trip: { borderRadius: layout.cardRadius, backgroundColor: c.background, padding: s.md, gap: s.md },
});
