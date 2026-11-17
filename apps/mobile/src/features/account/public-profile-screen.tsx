import { HttpError, useApiSession, useAuthorReels, useAuthorVlogs, useFollowAuthor, usePublicProfile } from '@tripflix/api-client';
import { formatProfileCount, getNameInitials } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, nativeFonts, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Icon, Notice, Screen, Txt, ui } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { LoadingDots } from '@/components/loading-dots';

const GRID_COLUMNS = 3;
const GRID_GAP = 2;

/** Trang cá nhân công khai (TF47): mở khi bấm tên hoặc avatar một người. */
export function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isReady } = useApiSession();
  const profile = usePublicProfile(id);
  const isMine = !!user && user.id === id;
  const follow = useFollowAuthor(isMine ? undefined : id);
  const [tab, setTab] = useState<'videos' | 'posts'>('videos');
  const isMissing = profile.error instanceof HttpError && profile.error.status === 404;
  const name = profile.data?.displayName ?? '';
  const stats = profile.data
    ? [
        { value: profile.data.followingCount, label: vi.api.profileFollowing },
        { value: profile.data.followerCount, label: vi.api.profileFollowers },
        { value: profile.data.likeCount, label: vi.api.profileLikes },
      ]
    : [];

  return (
    <Screen title={name || vi.api.loading}>
      {isMissing ? (
        <Notice>{vi.api.profileNotFound}</Notice>
      ) : (
        <ApiErrorNotice error={profile.error} retry={() => void profile.refetch()} />
      )}
      {profile.data && (
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Txt variant="title" style={styles.avatarText}>
              {getNameInitials(name) || 'TF'}
            </Txt>
          </View>
          <Txt variant="title">{name}</Txt>
          <View style={styles.stats}>
            {stats.map((item) => (
              <View key={item.label} style={styles.stat}>
                <Txt variant="label">{formatProfileCount(item.value)}</Txt>
                <Txt variant="caption" style={ui.muted}>
                  {item.label}
                </Txt>
              </View>
            ))}
          </View>
          {isReady && !isMine && (
            <Button
              tone={follow.isFollowing ? 'secondary' : 'primary'}
              compact
              disabled={!!user && !follow.canToggle}
              onPress={() => {
                if (user) follow.toggle();
                else router.push({ pathname: '/login', params: { returnTo: `/user/${id}` } });
              }}
            >
              {follow.isLoading || follow.isUpdating
                ? vi.api.loading
                : follow.isFollowing
                  ? vi.api.unfollowAuthor
                  : vi.api.followAuthor}
            </Button>
          )}
          <ApiErrorNotice error={follow.error} retry={() => void follow.retry()} />
        </View>
      )}
      {profile.data && (
        <>
          <View style={styles.tabs} accessibilityRole="tablist">
            {(['videos', 'posts'] as const).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && styles.tabActive]}
              >
                <Txt variant="label" style={tab !== key && ui.muted}>
                  {key === 'videos' ? vi.api.profileVideos : vi.api.profilePosts}
                </Txt>
              </Pressable>
            ))}
          </View>
          {tab === 'videos' ? <ReelGrid userId={id} /> : <VlogGrid userId={id} />}
        </>
      )}
    </Screen>
  );
}

function useTileSize() {
  const { width } = useWindowDimensions();
  return Math.floor((width - mobileLayout.gutter * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
}

function ReelGrid({ userId }: { userId: string }) {
  const reels = useAuthorReels(userId);
  const size = useTileSize();
  const items = reels.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <GridState query={reels} isEmpty={items.length === 0} emptyText={vi.api.profileNoVideos}>
      <View style={styles.grid}>
        {items.map((reel) => (
          <Tile
            key={reel.postId}
            size={size}
            image={reel.video.posters.w360}
            likes={reel.counts.likes}
            label={reel.title}
            onPress={() => router.navigate({ pathname: '/(tabs)', params: { reel: reel.postId } })}
          />
        ))}
      </View>
    </GridState>
  );
}

function VlogGrid({ userId }: { userId: string }) {
  const vlogs = useAuthorVlogs(userId);
  const size = useTileSize();
  const items = vlogs.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <GridState query={vlogs} isEmpty={items.length === 0} emptyText={vi.api.profileNoPosts}>
      <View style={styles.grid}>
        {items.map((post) => (
          <Tile
            key={post.id}
            size={size}
            image={post.images?.[0]?.url}
            likes={post.reactionTotal}
            label={post.title}
            onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: post.id } })}
          />
        ))}
      </View>
    </GridState>
  );
}

function GridState({
  query,
  isEmpty,
  emptyText,
  children,
}: {
  query: { isPending: boolean; error: unknown; refetch: () => unknown; hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  if (query.isPending) return <LoadingDots />;
  if (query.error) return <ApiErrorNotice error={query.error} retry={() => void query.refetch()} />;
  if (isEmpty) return <Txt style={[ui.center, ui.muted, styles.state]}>{emptyText}</Txt>;
  return (
    <>
      {children}
      {query.hasNextPage && (
        <Button tone="text" compact disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? vi.api.loading : vi.api.profileLoadMore}
        </Button>
      )}
    </>
  );
}

function Tile({
  size,
  image,
  likes,
  label,
  onPress,
}: {
  size: number;
  image?: string;
  likes: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.tile, { width: size, height: Math.round(size * 1.33) }]}
    >
      {image ? (
        <Image source={image} cachePolicy="memory-disk" contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
      ) : (
        <Txt variant="caption" numberOfLines={4} style={styles.tileTitle}>
          {label}
        </Txt>
      )}
      <View style={styles.likes}>
        <Icon name="heart" size={mobileIconSize.inline} color={c.background} />
        <Txt variant="caption" style={styles.likesText}>
          {formatProfileCount(likes)}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: s.sm, paddingBottom: s.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.sunSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...compactType.title, fontFamily: nativeFonts.bold },
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginVertical: s.sm },
  stat: { flex: 1, alignItems: 'center', gap: s.xs },
  tabs: { flexDirection: 'row', borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: {
    flex: 1,
    alignItems: 'center',
    minHeight: mobileLayout.touchTarget,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: c.transparent,
  },
  tabActive: { borderBottomColor: c.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginTop: GRID_GAP },
  tile: { backgroundColor: c.seaMist, overflow: 'hidden', justifyContent: 'center' },
  tileTitle: { padding: s.sm },
  likes: { position: 'absolute', left: s.xs, bottom: s.xs, flexDirection: 'row', alignItems: 'center', gap: 2 },
  likesText: { color: c.background, fontFamily: nativeFonts.bold },
  state: { paddingVertical: s.xl },
});
