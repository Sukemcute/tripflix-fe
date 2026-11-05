import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi, updateReelSocialCache, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Icon, Txt, type IconName } from '@/components/mobile-ui';
import { ReelCommentsPanel } from './reel-comments-panel';
import type { ReelItem } from './reel-types';

const copy = vi.mobile.reels;
const number = (value: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value);

function RailAction({
  icon,
  label,
  count,
  selected = false,
  disabled = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.railAction, pressed && { opacity: 0.65 }, disabled && { opacity: 0.5 }]}
    >
      <Icon name={icon} size={30} color={selected ? colors.coral : colors.background} />
      {count !== undefined && (
        <Txt variant="caption" style={styles.light}>
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
  onCommentsVisibilityChange,
}: {
  item: ReelItem;
  isActive: boolean;
  isSample: boolean;
  isHidden?: boolean;
  onCommentsVisibilityChange: (visible: boolean) => void;
}) {
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const [hasComments, setHasComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const [sampleComments, setSampleComments] = useState<{ id: number; body: string }[]>([]);
  const nextCommentId = useRef(0);
  const [sampleLiked, setSampleLiked] = useState(false);
  const [sampleSaved, setSampleSaved] = useState(false);
  const postId = item.postId;
  const detail = useQuery({
    queryKey: ['social', 'post', postId, user?.id],
    enabled: isReady && isActive && !!postId,
    queryFn: ({ signal }) => socialApi.getPost(postId!, signal),
  });
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
        client.cancelQueries({ queryKey: ['feed', 'for_you', user.id], exact: true }),
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
    onCommentsVisibilityChange(false);
  };
  useEffect(() => () => onCommentsVisibilityChange(false), [onCommentsVisibilityChange]);
  const author = isSample ? copy.sampleAuthor : item.social?.author.name || vi.api.author;
  const title = isSample ? copy.sample : item.title;
  const caption = isSample ? copy.sampleCaption : item.body;

  return (
    <>
      <View
        style={[styles.rail, isHidden && styles.hidden]}
        pointerEvents={isHidden ? 'none' : 'auto'}
        accessibilityElementsHidden={isHidden}
        aria-hidden={isHidden}
        importantForAccessibility={isHidden ? 'no-hide-descendants' : 'auto'}
      >
        <RailAction
          icon={isLiked ? 'heart' : 'heart-outline'}
          label={isLiked ? vi.api.unlike : vi.api.like}
          count={counts.likes}
          selected={isLiked}
          disabled={mutation.isPending}
          onPress={() => interact('like')}
        />
        <RailAction
          icon="chatbubble-ellipses-outline"
          label={vi.api.comments}
          count={counts.comments}
          onPress={() => {
            setHasComments(true);
            onCommentsVisibilityChange(true);
          }}
        />
        <RailAction
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          label={isSaved ? vi.api.unbookmark : vi.api.bookmark}
          count={counts.saves}
          selected={isSaved}
          disabled={mutation.isPending}
          onPress={() => interact('save')}
        />
        <RailAction
          icon="paper-plane-outline"
          label={vi.api.share}
          count={counts.shares}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate({ type: 'share' })}
        />
      </View>
      <View
        style={[styles.caption, isExpanded && styles.expandedCaption, isHidden && styles.hidden]}
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
              <Icon name="person-outline" color={colors.background} size={18} />
            </View>
          )}
          <Txt variant="label" style={[styles.light, { flexShrink: 1 }]} numberOfLines={1}>
            {author}
          </Txt>
        </View>
        {isExpanded ? (
          <ScrollView
            style={styles.expandedText}
            nestedScrollEnabled
            contentContainerStyle={{ gap: spacing.sm }}
          >
            <Txt style={styles.captionTitle}>{title}</Txt>
            {!!caption && <Txt style={styles.captionBody}>{caption}</Txt>}
          </ScrollView>
        ) : (
          <Txt style={styles.captionBody} numberOfLines={2}>
            <Txt style={styles.captionTitle}>{title}</Txt>
            {caption ? ` · ${caption}` : ''}
          </Txt>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => setIsExpanded((value) => !value)}
          style={styles.expandAction}
        >
          <Txt variant="label" style={styles.light}>
            {isExpanded ? copy.showLess : copy.showMore}
          </Txt>
          <Icon name={isExpanded ? 'chevron-down' : 'chevron-up'} size={14} color={colors.background} />
        </Pressable>
        {postId && (
          <Pressable
            style={styles.detail}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: postId } })}
          >
            <Txt variant="label" style={styles.detailText}>
              {copy.detail}
            </Txt>
            <Icon name="arrow-forward" size={18} color={colors.background} />
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
      </View>
      <ReelCommentsPanel
        visible={hasComments}
        postId={postId}
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
  hidden: { opacity: 0 },
  errorAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  captionTitle: { color: colors.background, fontFamily: nativeFonts.semibold, fontSize: 14, lineHeight: 21 },
  captionBody: { color: colors.background, fontSize: 14, lineHeight: 21 },
  expandedCaption: { backgroundColor: colors.overlayHeavy },
  expandedText: { maxHeight: 180, flexShrink: 1 },
  expandAction: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rail: { position: 'absolute', right: spacing.sm, bottom: 160, alignItems: 'center', gap: spacing.md },
  railAction: {
    minWidth: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  caption: {
    position: 'absolute',
    left: spacing.lg,
    right: 80,
    bottom: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderRadius: radius.md,
  },
  authorRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  avatar: {
    width: 34,
    height: 34,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    minHeight: mobileLayout.touchTarget,
  },
  detailText: { color: colors.background, flexShrink: 1 },
});
