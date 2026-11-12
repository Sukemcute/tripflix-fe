import {
  findCachedFeedCard,
  HttpError,
  REEL_FEED_TABS,
  removeUnavailablePost,
  socialApi,
  updateReelSocialCache,
  useApiSession,
} from '@tripflix/api-client';
import type { TripAttachmentDto } from '@tripflix/api-client/core-api/model/index';
import { isBackSwipeComplete } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  type PanGestureActiveEvent,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ApiErrorNotice } from '@/components/api-state';
import { Button, Icon, IconButton, money, Notice, Screen, Txt } from '@/components/mobile-ui';
import { SHEET_CLOSE_SPRING } from '@/components/motion';
import { PostActionBar } from './post-action-bar';
import { ReelCommentsPanel } from './reel-comments-panel';
import { ReportButton } from './report-button';

const copy = vi.mobile.postDetail;
const NO_COMMENTS: readonly { id: number; body: string }[] = [];
const ignoreDraft = () => undefined;
const SWIPE_START_DISTANCE = 16;
/** iOS already handles a swipe to the right natively, following the finger with the feed behind it. */
const SWIPE_ACTIVE_OFFSET_X: [number, number] =
  Platform.OS === 'ios'
    ? [-SWIPE_START_DISTANCE, Number.MAX_SAFE_INTEGER]
    : [-SWIPE_START_DISTANCE, SWIPE_START_DISTANCE];

function TripPlan({ trip }: { trip: TripAttachmentDto }) {
  const items = trip.items ?? [];
  const { hotelId, hotelName } = trip;
  return (
    <>
      {items.length > 0 && (
        <View style={styles.section}>
          <Txt variant="label">{copy.itinerary}</Txt>
          <View style={styles.panel}>
            {items.map((item, index) => (
              <View key={`${item.day}-${index}`} style={styles.stop}>
                <View style={styles.rail}>
                  <View style={styles.dayBadge}>
                    <Txt variant="caption" style={styles.dayText}>
                      {t('mobile.postDetail.dayShort', { day: item.day })}
                    </Txt>
                  </View>
                  {index < items.length - 1 && <View style={styles.railLine} />}
                </View>
                <View style={[styles.stopBody, index < items.length - 1 && styles.stopGap]}>
                  <Txt variant="label">{item.title}</Txt>
                  {!!item.location && (
                    <Txt variant="small" style={styles.muted}>
                      {item.location}
                    </Txt>
                  )}
                  {!!item.notes && <Txt variant="small">{item.notes}</Txt>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
      {!!hotelName && (
        <Pressable
          accessibilityRole={hotelId ? 'button' : undefined}
          accessibilityLabel={hotelId ? t('mobile.postDetail.openHotel', { name: hotelName }) : undefined}
          disabled={!hotelId}
          onPress={() => {
            if (hotelId) router.push({ pathname: '/hotel/[id]', params: { id: hotelId } });
          }}
          style={({ pressed }) => [styles.panel, styles.hotel, pressed && styles.pressed]}
        >
          <View style={styles.hotelIcon}>
            <Icon name="bed-outline" size={20} color={colors.tealInk} />
          </View>
          <View style={styles.hotelBody}>
            <Txt variant="caption" style={styles.muted}>
              {copy.stay}
            </Txt>
            <Txt variant="label" numberOfLines={1}>
              {hotelName}
            </Txt>
          </View>
          {!!hotelId && <Icon name="chevron-forward" size={18} color={colors.textMuted} />}
        </Pressable>
      )}
    </>
  );
}

export function LivePostDetailScreen() {
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const [hasComments, setHasComments] = useState(false);
  const commentsProgress = useSharedValue(0);
  const navigation = useNavigation();
  const swipeX = useSharedValue(0);
  const swipeStartOffset = useSharedValue(0);
  const goBackFromSwipe = (isLeftward: boolean) => {
    // The screen leaves the way the finger went, rather than sliding back against it.
    if (isLeftward) navigation.setOptions({ animation: 'slide_from_left' });
    requestAnimationFrame(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    });
  };
  const backSwipe = usePanGesture({
    activeOffsetX: SWIPE_ACTIVE_OFFSET_X,
    failOffsetY: [-12, 12],
    onActivate: (event: PanGestureActiveEvent) => {
      // Activation happens a few points in; subtracting that keeps the screen from jumping.
      swipeStartOffset.set(-event.translationX);
    },
    onUpdate: (event: PanGestureActiveEvent) => {
      swipeX.set(swipeStartOffset.get() + event.translationX);
    },
    onDeactivate: (event: PanGestureActiveEvent & { canceled: boolean }) => {
      const translationX = swipeX.get();
      if (!event.canceled && isBackSwipeComplete({ translationX, velocityX: event.velocityX })) {
        scheduleOnRN(goBackFromSwipe, translationX < 0);
        return;
      }
      swipeX.set(withSpring(0, { ...SHEET_CLOSE_SPRING, velocity: event.velocityX }));
    },
  });
  const swipeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: swipeX.get() }] }));
  const cachedCard = findCachedFeedCard(client, slug);
  const query = useQuery({
    queryKey: ['social', 'post', slug, user?.id],
    enabled: isReady && !!slug,
    retry: (count, error) => !(error instanceof HttpError && error.status === 404) && count < 2,
    queryFn: ({ signal }) => socialApi.getPost(slug, signal),
  });
  const missing = query.error instanceof HttpError && query.error.status === 404;
  useEffect(() => {
    if (missing) removeUnavailablePost(client, slug);
  }, [missing, client, slug]);
  const post = missing ? undefined : query.data?.post;
  const viewer = query.data?.viewerContext;
  const isLiked = !!viewer?.myReaction;
  const isSaved = !!viewer?.isBookmarked;
  const social = useMutation({
    mutationFn: async (action: { type: 'like' | 'save'; isSelected: boolean }) => {
      if (action.type === 'like') await socialApi.setReaction(slug, action.isSelected ? 'like' : null);
      else await socialApi.setBookmark(slug, action.isSelected);
    },
    onMutate: async (action) => {
      if (!user) return;
      await Promise.all([
        ...REEL_FEED_TABS.map((tab) =>
          client.cancelQueries({ queryKey: ['feed', tab, user.id], exact: true }),
        ),
        client.cancelQueries({ queryKey: ['social', 'post', slug, user.id], exact: true }),
      ]);
      return updateReelSocialCache(client, user.id, slug, action.type, action.isSelected);
    },
    onError: (_error, _action, rollback) => rollback?.(),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social', 'post', slug, user?.id], exact: true }),
        client.invalidateQueries({ queryKey: ['social', 'bookmarks', user?.id] }),
      ]);
    },
  });
  const share = useMutation({
    mutationFn: async () => {
      const result = await Share.share({
        title: post?.title,
        message: query.data?.shareUrl || Linking.createURL(`/trip/${encodeURIComponent(slug)}`),
      });
      if (result.action === Share.sharedAction) await socialApi.sharePost(slug);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['social', 'post', slug, user?.id], exact: true }),
  });
  const manage = useMutation({
    mutationFn: async (action: 'publish' | 'delete') => {
      if (action === 'publish') await socialApi.publishPost(slug);
      else await socialApi.deletePost(slug);
    },
    onSuccess: async (_, action) => {
      await client.invalidateQueries({ queryKey: ['social'] });
      if (action === 'delete') router.replace('/(tabs)');
    },
  });
  const interact = (type: 'like' | 'save') => {
    if (!user) {
      router.push({ pathname: '/login', params: { returnTo: `/trip/${slug}` } });
      return;
    }
    if (social.isPending) return;
    social.mutate({ type, isSelected: type === 'like' ? !isLiked : !isSaved });
  };
  const confirmDelete = () =>
    Alert.alert(vi.api.confirmDelete, post?.title, [
      { text: vi.api.cancel, style: 'cancel' },
      { text: vi.api.remove, style: 'destructive', onPress: () => manage.mutate('delete') },
    ]);
  const edit = () => router.push({ pathname: '/create', params: { postId: slug } });
  const openOwnerMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [vi.api.edit, vi.api.remove, vi.api.cancel],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) edit();
          if (index === 1) confirmDelete();
        },
      );
      return;
    }
    Alert.alert(copy.more, undefined, [
      { text: vi.api.cancel, style: 'cancel' },
      { text: vi.api.remove, onPress: confirmDelete },
      { text: vi.api.edit, onPress: edit },
    ]);
  };
  const trip = post?.tripAttachment;
  const authorName =
    post?.authorId === user?.id ? user?.displayName : post?.authorName || cachedCard?.author.name;
  const tripFacts = [
    trip?.destinationName,
    trip?.daysCount ? t('api.postDays', { count: trip.daysCount }) : null,
    trip?.estimatedCostPerPerson
      ? t('mobile.postDetail.pricePerPerson', { price: money(trip.estimatedCostPerPerson) })
      : null,
  ].filter(Boolean);
  const title = post?.title ?? cachedCard?.title;
  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={backSwipe}>
        <Animated.View style={[styles.root, swipeStyle]}>
          <Screen
            title={vi.api.posts}
            right={
              post && post.authorId === user?.id ? (
                <IconButton name="ellipsis-horizontal" label={copy.more} onPress={openOwnerMenu} />
              ) : post ? (
                <ReportButton targetType="post" targetId={post.id} compact />
              ) : undefined
            }
            footer={
              post && (
                <PostActionBar
                  isLiked={isLiked}
                  isSaved={isSaved}
                  likeCount={post.reactionTotal}
                  commentCount={post.commentCount}
                  saveCount={post.bookmarkCount}
                  shareCount={post.shareCount}
                  onLike={() => interact('like')}
                  onComments={() => setHasComments(true)}
                  onSave={() => interact('save')}
                  onShare={() => share.mutate()}
                />
              )
            }
          >
            {missing && <Notice>{vi.moderation.unavailable}</Notice>}
            <ApiErrorNotice
              error={missing ? null : query.error}
              retry={() => {
                void query.refetch();
              }}
            />
            {!missing && !!cachedCard && (
              <Image
                source={cachedCard.video.posters.w720}
                cachePolicy="memory-disk"
                contentFit="cover"
                style={styles.poster}
                accessible={false}
              />
            )}
            {(!!title || !!authorName) && (
              <View style={styles.intro}>
                {!!title && <Txt variant="heading">{title}</Txt>}
                {!!authorName && (
                  <Txt variant="small" style={styles.muted}>
                    {authorName}
                  </Txt>
                )}
                {tripFacts.length > 0 && <Txt variant="small">{tripFacts.join(' · ')}</Txt>}
                {!!trip?.estimatedCostPerPerson && !!trip.priceDisclaimer && (
                  <Txt variant="caption" style={styles.muted}>
                    {trip.priceDisclaimer}
                  </Txt>
                )}
              </View>
            )}
            {(!isReady || query.isPending) && <Txt style={styles.muted}>{vi.api.loading}</Txt>}
            {post && (
              <>
                {!!post.body && (
                  <View style={styles.intro}>
                    <Txt>{post.body}</Txt>
                    {post.hashtags.length > 0 && (
                      <Txt variant="small" style={styles.hashtags}>
                        {post.hashtags.map((tag) => `#${tag}`).join(' ')}
                      </Txt>
                    )}
                  </View>
                )}
                {!!trip && <TripPlan trip={trip} />}
                <ApiErrorNotice error={social.error ?? share.error ?? manage.error} />
                {post.authorId === user?.id && post.status === 'draft' && (
                  <Button
                    disabled={manage.isPending || (!post.body.trim() && post.mediaIds.length === 0)}
                    onPress={() => manage.mutate('publish')}
                  >
                    {vi.api.publish}
                  </Button>
                )}
              </>
            )}
            <ReelCommentsPanel
              visible={hasComments}
              openProgress={commentsProgress}
              postId={slug}
              draft=""
              onDraftChange={ignoreDraft}
              comments={NO_COMMENTS}
              onSend={ignoreDraft}
              onClose={() => setHasComments(false)}
              hasBackdrop
              loginReturnTo={`/trip/${slug}`}
            />
          </Screen>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  poster: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: mobileLayout.cardRadius,
    backgroundColor: colors.seaMist,
  },
  intro: { gap: spacing.xs },
  muted: { color: colors.textMuted },
  hashtags: { color: colors.tealInk, marginTop: spacing.xs },
  section: { gap: spacing.sm },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: mobileLayout.cardRadius,
    padding: spacing.md,
  },
  stop: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center' },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.seaMist,
  },
  dayText: { color: colors.tealInk },
  railLine: { flex: 1, width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  stopBody: { flex: 1, minHeight: 32, justifyContent: 'center' },
  stopGap: { paddingBottom: spacing.lg },
  hotel: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hotelIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.seaMist,
  },
  hotelBody: { flex: 1 },
  pressed: { opacity: 0.7 },
});
