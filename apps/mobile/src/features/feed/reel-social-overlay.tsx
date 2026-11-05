import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiErrorNotice } from '@/components/api-state';
import { Icon, IconButton, Txt, type IconName } from '@/components/mobile-ui';
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
  isMuted,
  onMute,
  onCommentsVisibilityChange,
}: {
  item: ReelItem;
  isActive: boolean;
  isSample: boolean;
  isMuted: boolean;
  onMute: () => void;
  onCommentsVisibilityChange: (visible: boolean) => void;
}) {
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const [hasComments, setHasComments] = useState(false);
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
      ? detail.data.viewerContext.myReaction === 'like'
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
    mutationFn: async (action: 'like' | 'save' | 'share') => {
      if (action === 'share') {
        const result = await Share.share({
          title: item.title,
          message:
            detail.data?.shareUrl ||
            (postId ? Linking.createURL(`/trip/${encodeURIComponent(postId)}`) : item.playback.hlsUrl),
        });
        if (result.action === Share.sharedAction && postId) await socialApi.sharePost(postId);
        return;
      }
      if (!postId) throw new Error('Missing post');
      if (action === 'like') await socialApi.setReaction(postId, isLiked ? null : 'like');
      else await socialApi.setBookmark(postId, !isSaved);
    },
    onSuccess: async () => {
      if (!postId) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['feed'] }),
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
    mutation.mutate(action);
  };
  const closeComments = () => {
    setHasComments(false);
    onCommentsVisibilityChange(false);
  };
  useEffect(() => () => onCommentsVisibilityChange(false), [onCommentsVisibilityChange]);
  const author = isSample ? copy.sampleAuthor : item.social?.author.name || vi.api.author;

  return (
    <>
      <View style={[styles.top, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={styles.topSpacer} />
        <Txt variant="label" style={styles.topLabel}>
          {vi.mobile.feed.forYou}
        </Txt>
        <IconButton
          name={isMuted ? 'volume-mute' : 'volume-high'}
          label={isMuted ? copy.unmute : copy.mute}
          color={colors.background}
          onPress={onMute}
        />
      </View>
      <View style={styles.rail}>
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
          onPress={() => mutation.mutate('share')}
        />
      </View>
      <View style={styles.caption} pointerEvents="box-none">
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
        <Txt variant="heading" style={styles.light} numberOfLines={2}>
          {isSample ? copy.sample : item.title}
        </Txt>
        <Txt style={styles.light} numberOfLines={3}>
          {isSample ? copy.sampleCaption : item.body}
        </Txt>
        {postId && (
          <Pressable
            style={styles.detail}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: postId } })}
          >
            <Txt variant="label" style={styles.detailText}>
              {copy.detail}
            </Txt>
            <Icon name="arrow-forward" size={18} />
          </Pressable>
        )}
        <ApiErrorNotice error={mutation.error} />
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
  top: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topSpacer: { width: mobileLayout.touchTarget },
  topLabel: {
    color: colors.background,
    fontFamily: nativeFonts.bold,
    borderBottomWidth: 2,
    borderBottomColor: colors.background,
    paddingBottom: spacing.sm,
  },
  light: { color: colors.background },
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
    padding: spacing.md,
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
    padding: spacing.md,
    backgroundColor: colors.sunSoft,
    borderRadius: radius.sm,
    minHeight: mobileLayout.touchTarget,
  },
  detailText: { color: colors.ink },
});
