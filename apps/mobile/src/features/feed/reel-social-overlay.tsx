import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCollapsedCaptionLength, getReelScale, hasTripPlan } from '@tripflix/app-core';
import {
  HttpError,
  REEL_FEED_TABS,
  removeUnavailablePost,
  socialApi,
  updateReelSocialCache,
  useApiSession,
} from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Icon, Txt, type IconName } from '@/components/mobile-ui';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { AssistantTrigger } from '@/features/assistant/assistant-bubble';
import {
  HEART_POP_SETTLE,
  HEART_POP_UP,
  PRESS_DOWN,
  SHEET_CLOSE_SPRING,
  SHEET_OPEN_SPRING,
  SNAP_SPRING,
} from '@/components/motion';
import { ReelCommentsPanel } from './reel-comments-panel';
import type { ReelItem } from './reel-types';
import { ReportButton } from './report-button';
import { TripPlanSheet } from './trip-plan-sheet';

const copy = vi.mobile.reels;
const number = (value: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value);
const DETAIL_HEIGHT = 24;
const CAPTION_LINES = 2;
const CAPTION_MAX_HEIGHT = 180;
const SHOW_MORE_SUFFIX = `… ${copy.showMore}`;
// Measured by characters, so keep a little extra room for wide letters in the removed text.
const SHOW_MORE_RESERVED_CHARS = SHOW_MORE_SUFFIX.length + 4;
const DETAIL_HIT_SLOP = (mobileLayout.touchTarget - DETAIL_HEIGHT) / 2;
const TEXT_SHADOW = {
  textShadowColor: colors.overlayHeavy,
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
};

// Tim nảy lên một chút rồi rơi về, như nút thích trên màn chi tiết bài.
const HEART_POP_SCALE = 1.25;
const HEART_POP_LIFT = -6;
const PRESSED_SCALE = 0.88;
const RAIL_ACTION_SIZE = mobileLayout.touchTarget;

function RailAction({
  icon,
  label,
  count,
  iconSize,
  selected = false,
  disabled = false,
  shouldPop = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  iconSize: number;
  selected?: boolean;
  disabled?: boolean;
  /** Nảy khi chuyển sang trạng thái chọn (thả tim). */
  shouldPop?: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.get() }, { scale: scale.get() }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      // Thu nhỏ ngay lúc chạm để biết đã bấm, không đợi thả tay.
      onPressIn={() => scale.set(withTiming(PRESSED_SCALE, PRESS_DOWN))}
      onPressOut={() => {
        // Chỉ thả tim mới nảy; các nút khác trở về êm.
        if (!(shouldPop && !selected)) scale.set(withSpring(1, SNAP_SPRING));
      }}
      onPress={() => {
        if (shouldPop && !selected) {
          scale.set(withSequence(withTiming(HEART_POP_SCALE, HEART_POP_UP), withSpring(1, HEART_POP_SETTLE)));
          lift.set(withSequence(withTiming(HEART_POP_LIFT, HEART_POP_UP), withSpring(0, HEART_POP_SETTLE)));
        }
        onPress();
      }}
      style={[styles.railAction, disabled && { opacity: 0.5 }]}
    >
      <Animated.View style={iconStyle}>
        <Icon
          name={icon}
          size={iconSize}
          color={selected ? colors.coral : colors.background}
        />
      </Animated.View>
      {count !== undefined && (
        <Txt variant="caption" style={styles.railCount}>
          {number(count)}
        </Txt>
      )}
    </Pressable>
  );
}

export function ReelSocialOverlay({
  item,
  isActive,
  isSample,
  isHidden = false,
  commentsProgress,
  onCommentsVisibilityChange,
}: {
  item: ReelItem;
  isActive: boolean;
  isSample: boolean;
  isHidden?: boolean;
  commentsProgress: SharedValue<number>;
  onCommentsVisibilityChange: (visible: boolean) => void;
}) {
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const { width } = useWindowDimensions();
  const reelScale = getReelScale(Math.min(width, mobileLayout.contentWidth));
  const railIconSize = Math.round(mobileIconSize.reel * reelScale);
  const tripiSize = Math.round(mobileIconSize.reelTripi * reelScale);
  const [hasComments, setHasComments] = useState(false);
  const [isTripPlanOpen, setIsTripPlanOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [collapsedLength, setCollapsedLength] = useState<number | null>(null);
  const [collapsedHeight, setCollapsedHeight] = useState(CAPTION_LINES * compactType.body.lineHeight);
  const [expandedContentHeight, setExpandedContentHeight] = useState(0);
  const expandedScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const expansion = useSharedValue(0);
  const [draft, setDraft] = useState('');
  const [sampleComments, setSampleComments] = useState<{ id: number; body: string }[]>([]);
  const nextCommentId = useRef(0);
  const [sampleLiked, setSampleLiked] = useState(false);
  const [sampleSaved, setSampleSaved] = useState(false);
  const postId = item.postId;
  const detail = useQuery({
    queryKey: ['social', 'post', postId, user?.id],
    enabled: isReady && isActive && !!postId,
    retry: (count, error) => !(error instanceof HttpError && error.status === 404) && count < 2,
    queryFn: ({ signal }) => socialApi.getPost(postId!, signal),
  });
  const missing = detail.error instanceof HttpError && detail.error.status === 404;
  useEffect(() => {
    if (missing && postId) removeUnavailablePost(client, postId);
  }, [missing, client, postId]);
  const isLiked = isSample
    ? sampleLiked
    : detail.data
      ? detail.data.viewerContext.myReaction !== null
      : !!item.social?.viewerState?.liked;
  const isSaved = isSample
    ? sampleSaved
    : (detail.data?.viewerContext.isBookmarked ?? item.social?.viewerState?.saved ?? false);
  const counts = {
    likes: isSample
      ? Number(sampleLiked)
      : (detail.data?.post.reactionTotal ?? item.social?.counts.likes ?? 0),
    comments: isSample
      ? sampleComments.length
      : (detail.data?.post.commentCount ?? item.social?.counts.comments ?? 0),
    saves: isSample
      ? Number(sampleSaved)
      : (detail.data?.post.bookmarkCount ?? item.social?.counts.saves ?? 0),
    shares: isSample ? undefined : (detail.data?.post.shareCount ?? item.social?.counts.shares ?? 0),
  };
  const mutation = useMutation({
    mutationFn: async (action: { type: 'like' | 'save' | 'share'; selected?: boolean }) => {
      if (action.type === 'share') {
        const result = await Share.share({
          title: item.title,
          message:
            detail.data?.shareUrl ||
            (postId ? Linking.createURL(`/trip/${encodeURIComponent(postId)}`) : item.playback.hlsUrl),
        });
        if (result.action === Share.sharedAction && postId) await socialApi.sharePost(postId);
        return result.action === Share.sharedAction;
      }
      if (!postId) throw new Error('Missing post');
      if (action.type === 'like') await socialApi.setReaction(postId, action.selected ? 'like' : null);
      else await socialApi.setBookmark(postId, !!action.selected);
    },
    onMutate: async (action) => {
      if (action.type === 'share' || !postId || !user) return;
      await Promise.all([
        ...REEL_FEED_TABS.map((tab) =>
          client.cancelQueries({ queryKey: ['feed', tab, user.id], exact: true }),
        ),
        client.cancelQueries({ queryKey: ['social', 'post', postId, user.id], exact: true }),
      ]);
      return updateReelSocialCache(client, user.id, postId, action.type, !!action.selected);
    },
    onError: (_error, _action, rollback) => rollback?.(),
    onSuccess: async (shared, action) => {
      if (!postId) return;
      if (action.type === 'share' && !shared) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social', 'post', postId, user?.id], exact: true }),
        client.invalidateQueries({ queryKey: ['social', 'bookmarks', user?.id] }),
      ]);
    },
  });
  const interact = (action: 'like' | 'save') => {
    if (isSample) {
      if (action === 'like') setSampleLiked((value) => !value);
      else setSampleSaved((value) => !value);
      return;
    }
    if (!isReady) return;
    if (!user) {
      router.push({ pathname: '/login', params: { returnTo: '/(tabs)' } });
      return;
    }
    if (mutation.isPending) return;
    mutation.mutate({ type: action, selected: action === 'like' ? !isLiked : !isSaved });
  };
  const closeComments = () => {
    setHasComments(false);
  };
  // Only the slide holding open comments reports, so a neighbour leaving the list window cannot resume playback.
  useEffect(() => {
    if (!hasComments) return;
    onCommentsVisibilityChange(true);
    return () => onCommentsVisibilityChange(false);
  }, [hasComments, onCommentsVisibilityChange]);
  const author = isSample ? copy.sampleAuthor : item.social?.author.name || vi.api.author;
  const title = isSample ? copy.sample : item.title;
  const tripAttachment = detail.data?.post.tripAttachment;
  const tripPlan = !isSample && tripAttachment && hasTripPlan(tripAttachment) ? tripAttachment : null;
  const caption = isSample ? copy.sampleCaption : item.body;
  const fullCaption = caption ? `${title} · ${caption}` : title;
  const visibleCaption =
    collapsedLength === null ? fullCaption : fullCaption.slice(0, collapsedLength).trimEnd();
  const expandedHeight = Math.min(CAPTION_MAX_HEIGHT, Math.max(collapsedHeight, expandedContentHeight));
  const toggleExpanded = (shouldExpand: boolean) => {
    setIsExpanded(shouldExpand);
    if (!shouldExpand) expandedScroll.current?.scrollTo({ y: 0, animated: true });
    expansion.set(withSpring(shouldExpand ? 1 : 0, shouldExpand ? SHEET_OPEN_SPRING : SHEET_CLOSE_SPRING));
  };
  const captionTextStyle = useAnimatedStyle(() => ({
    height: interpolate(expansion.get(), [0, 1], [collapsedHeight, expandedHeight]),
  }));
  // Both layers start with the same words, so fading between them reads as one text growing.
  const collapsedLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expansion.get(), [0, 0.6], [1, 0], Extrapolation.CLAMP),
  }));
  const expandedLayerStyle = useAnimatedStyle(() => ({ opacity: expansion.get() }));
  // Clears out early so the shrinking video is not covered by the rail and caption.
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: isHidden ? 0 : interpolate(commentsProgress.get(), [0, 0.4], [1, 0], Extrapolation.CLAMP),
  }));
  const expandedScrimStyle = useAnimatedStyle(() => ({
    opacity: isHidden
      ? 0
      : expansion.get() * interpolate(commentsProgress.get(), [0, 0.4], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <>
      {/* The caption has no card, so this keeps white text readable over bright video. */}
      <Animated.View pointerEvents="none" style={[styles.scrim, chromeStyle]}>
        <LinearGradient colors={[colors.transparent, colors.overlay]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.scrim, styles.expandedScrim, expandedScrimStyle]}>
        <LinearGradient colors={[colors.transparent, colors.overlayHeavy]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        style={[styles.rail, chromeStyle]}
        pointerEvents={isHidden || hasComments ? 'none' : 'auto'}
        accessibilityElementsHidden={isHidden || hasComments}
        aria-hidden={isHidden || hasComments}
        importantForAccessibility={isHidden || hasComments ? 'no-hide-descendants' : 'auto'}
      >
        <AssistantTrigger size={tripiSize} />
        <RailAction
          icon={isLiked ? 'heart' : 'heart-outline'}
          iconSize={railIconSize}
          label={isLiked ? vi.api.unlike : vi.api.like}
          count={counts.likes}
          selected={isLiked}
          shouldPop
          onPress={() => interact('like')}
        />
        <RailAction
          icon="chatbubble-ellipses-outline"
          iconSize={railIconSize}
          label={vi.api.comments}
          count={counts.comments}
          onPress={() => {
            setHasComments(true);
          }}
        />
        <RailAction
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          iconSize={railIconSize}
          label={isSaved ? vi.api.unbookmark : vi.api.bookmark}
          count={counts.saves}
          selected={isSaved}
          onPress={() => interact('save')}
        />
        <RailAction
          icon="paper-plane-outline"
          iconSize={railIconSize}
          label={vi.api.share}
          count={counts.shares}
          // Không làm mờ nút khi tim, lưu đang gửi; chỉ bỏ qua lần bấm lúc đó.
          onPress={() => {
            if (!mutation.isPending) mutation.mutate({ type: 'share' });
          }}
        />
        {/* Cuối cột như TikTok: hành động ít dùng, không lẫn với tim, bình luận. */}
        {!isSample && postId && (
          <ReportButton
            targetType="post"
            targetId={postId}
            trigger={(open) => (
              <RailAction
                icon="flag-outline"
                iconSize={mobileIconSize.control}
                label={vi.moderation.reportTitle}
                onPress={open}
              />
            )}
          />
        )}
      </Animated.View>
      <Animated.View
        style={[styles.caption, { right: RAIL_ACTION_SIZE + spacing.lg }, chromeStyle]}
        pointerEvents={isHidden ? 'none' : 'box-none'}
        accessibilityElementsHidden={isHidden}
        aria-hidden={isHidden}
        importantForAccessibility={isHidden ? 'no-hide-descendants' : 'auto'}
      >
        {isSample && (
          <Txt variant="caption" style={styles.sampleBadge}>
            {copy.sample}
          </Txt>
        )}
        <View style={styles.authorRow}>
          {item.social?.author.avatarUrl ? (
            <Image source={item.social.author.avatarUrl} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Icon name="person-outline" color={colors.background} size={mobileIconSize.inline} />
            </View>
          )}
          <Txt variant="label" style={styles.author} numberOfLines={1}>
            {author}
          </Txt>
        </View>
        {/* Lays out the full text unseen: RN cannot place inline text after its own truncation. */}
        <View
          style={styles.captionMeasure}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Txt
            style={styles.captionBody}
            onTextLayout={({ nativeEvent }) =>
              setCollapsedLength(
                getCollapsedCaptionLength(
                  nativeEvent.lines.map((line) => line.text),
                  CAPTION_LINES,
                  SHOW_MORE_RESERVED_CHARS,
                ),
              )
            }
          >
            <Txt style={styles.captionTitle}>{title}</Txt>
            {fullCaption.slice(title.length)}
          </Txt>
        </View>
        <Animated.View style={[styles.captionText, captionTextStyle]}>
          <Animated.View
            style={[styles.collapsedLayer, collapsedLayerStyle]}
            pointerEvents={isExpanded ? 'none' : 'auto'}
            accessibilityElementsHidden={isExpanded}
            importantForAccessibility={isExpanded ? 'no-hide-descendants' : 'auto'}
            onLayout={({ nativeEvent }) => setCollapsedHeight(nativeEvent.layout.height)}
          >
            <Pressable
              accessibilityRole={collapsedLength === null ? undefined : 'button'}
              accessibilityState={collapsedLength === null ? undefined : { expanded: false }}
              disabled={collapsedLength === null}
              onPress={() => toggleExpanded(true)}
              style={({ pressed }) => pressed && styles.captionPressed}
            >
              <Txt style={styles.captionBody} numberOfLines={CAPTION_LINES}>
                <Txt style={styles.captionTitle}>{visibleCaption.slice(0, title.length)}</Txt>
                {visibleCaption.slice(title.length)}
                {collapsedLength !== null && <Txt style={styles.captionTitle}>{SHOW_MORE_SUFFIX}</Txt>}
              </Txt>
            </Pressable>
          </Animated.View>
          <Animated.View
            style={[StyleSheet.absoluteFill, expandedLayerStyle]}
            pointerEvents={isExpanded ? 'auto' : 'none'}
            accessibilityElementsHidden={!isExpanded}
            importantForAccessibility={isExpanded ? 'auto' : 'no-hide-descendants'}
          >
            <ScrollView
              ref={expandedScroll}
              nestedScrollEnabled
              scrollEnabled={expandedContentHeight > CAPTION_MAX_HEIGHT}
              onContentSizeChange={(_width, contentHeight) => setExpandedContentHeight(contentHeight)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: true }}
                onPress={() => toggleExpanded(false)}
                style={({ pressed }) => pressed && styles.captionPressed}
              >
                <Txt style={styles.captionBody}>
                  <Txt style={styles.captionTitle}>{title}</Txt>
                  {`${fullCaption.slice(title.length)} `}
                  <Txt style={styles.captionTitle}>{copy.showLess}</Txt>
                </Txt>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </Animated.View>
        {/* Chỉ bài người đăng có chia sẻ lộ trình mới có nút: mở lộ trình để đặt y chang. */}
        {postId && tripPlan && (
          <Pressable
            style={styles.detail}
            accessibilityRole="button"
            hitSlop={{ top: DETAIL_HIT_SLOP, bottom: DETAIL_HIT_SLOP }}
            onPress={() => setIsTripPlanOpen(true)}
          >
            <Icon name="location-outline" size={mobileIconSize.inline} color={colors.coralInk} />
            <Txt variant="label" style={styles.detailText}>
              {vi.mobile.tripPlan.view}
            </Txt>
          </Pressable>
        )}
        {!!mutation.error && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.socialRetry}
            onPress={() => {
              if (mutation.variables) mutation.mutate(mutation.variables);
            }}
            style={styles.errorAction}
          >
            <Icon name="alert-circle-outline" color={colors.sunSoft} size={18} />
            <Txt variant="caption" style={{ color: colors.sunSoft, flex: 1 }}>
              {copy.socialRetry}
            </Txt>
          </Pressable>
        )}
      </Animated.View>
      {postId && tripPlan && (
        <TripPlanSheet
          visible={isTripPlanOpen}
          onClose={() => setIsTripPlanOpen(false)}
          postId={postId}
          postTitle={title}
          authorName={author}
          trip={tripPlan}
        />
      )}
      <ReelCommentsPanel
        visible={hasComments}
        openProgress={commentsProgress}
        postId={postId}
        commentCount={counts.comments}
        showSummary
        draft={draft}
        onDraftChange={setDraft}
        comments={sampleComments}
        onSend={() => {
          if (!draft.trim()) return;
          setSampleComments((comments) => [...comments, { id: ++nextCommentId.current, body: draft.trim() }]);
          setDraft('');
        }}
        onClose={closeComments}
      />
    </>
  );
}

const styles = StyleSheet.create({
  light: { color: colors.background },
  errorAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 },
  expandedScrim: { height: 360 },
  captionTitle: {
    color: colors.background,
    fontFamily: nativeFonts.semibold,
    ...compactType.body,
    ...TEXT_SHADOW,
  },
  captionBody: { color: colors.background, ...compactType.body, ...TEXT_SHADOW },
  captionText: { overflow: 'hidden' },
  collapsedLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
  captionPressed: { opacity: 0.7 },
  captionMeasure: { position: 'absolute', left: 0, right: 0, opacity: 0 },
  rail: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  railCount: {
    color: colors.background,
    ...compactType.label,
    fontFamily: nativeFonts.semibold,
    ...TEXT_SHADOW,
  },
  railAction: {
    minWidth: RAIL_ACTION_SIZE,
    minHeight: RAIL_ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  caption: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    gap: spacing.xs,
  },
  authorRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  author: { flex: 1, color: colors.background, ...compactType.body, ...TEXT_SHADOW },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.background,
    backgroundColor: colors.overlayHeavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBadge: {
    color: colors.ink,
    backgroundColor: colors.sun,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  detail: {
    alignSelf: 'flex-start',
    minHeight: DETAIL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.warmMist,
    borderRadius: radius.pill,
  },
  detailText: { color: colors.ink, flexShrink: 1, ...compactType.label },
});
