import {
  HttpError,
  socialApi,
  useApiSession,
  useAuthorReels,
  useAuthorVlogs,
  useFollowAuthor,
  usePublicProfile,
} from '@tripflix/api-client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PostUploadCard } from '@/features/post/post-upload-card';
import { formatProfileCount, getNameInitials } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, nativeFonts, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { Button, Card, copy, Icon, IconButton, Notice, Screen, Txt, ui } from '@/components/mobile-ui';
import { ApiErrorNotice, RequireAccount } from '@/components/api-state';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { LoadingDots } from '@/components/loading-dots';

const GRID_COLUMNS = 3;
const GRID_GAP = 1;

/** Trang cá nhân công khai (TF47): mở khi bấm tên hoặc avatar một người. */
export function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileView id={id} />;
}

/** Tab Tôi (TF47B): trang cá nhân của chính mình, bánh răng mở menu cài đặt; chưa đăng nhập thì bắt đăng nhập. */
export function MyProfileScreen() {
  const { user, isReady } = useApiSession();
  if (!isReady || !user) return <RequireAccount />;
  return (
    <ProfileView
      id={user.id}
      back={false}
      right={
        <IconButton
          name="settings-outline"
          label={copy.profile.menu}
          onPress={() => router.push('/settings')}
        />
      }
    />
  );
}

function ProfileView({ id, back, right }: { id: string; back?: boolean; right?: ReactNode }) {
  const { user, isReady } = useApiSession();
  const profile = usePublicProfile(id);
  const isMine = !!user && user.id === id;
  const follow = useFollowAuthor(isMine ? undefined : id);
  const [tab, setTab] = useState<'videos' | 'posts' | 'held'>('videos');
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
    <Screen title={name || vi.api.loading} back={back} right={right}>
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
      {/* Bài đang đăng nền hiện ngay trên lưới bài của chính mình, giống TikTok (TF105). */}
      {isMine && <PostUploadCard />}
      {profile.data && (
        <>
          <View style={styles.tabs} accessibilityRole="tablist">
            {(['videos', 'posts', ...(isMine ? ['held' as const] : [])] as const).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && styles.tabActive]}
              >
                <Txt variant="label" style={tab !== key && ui.muted}>
                  {key === 'held'
                    ? vi.moderation.heldTitle
                    : key === 'videos'
                      ? vi.api.profileVideos
                      : vi.api.profilePosts}
                </Txt>
              </Pressable>
            ))}
          </View>
          {tab === 'held' && isMine ? (
            <HeldPosts userId={id} />
          ) : tab === 'videos' ? (
            <ReelGrid userId={id} />
          ) : (
            <VlogGrid userId={id} />
          )}
        </>
      )}
    </Screen>
  );
}

/**
 * Cạnh ô theo bề ngang thật của lưới (đo bằng onLayout), không theo cửa sổ: trên web app nằm trong khung hẹp
 * giữa màn hình nên tính theo cửa sổ làm mỗi ô to bằng cả khung.
 */
function useTileSize() {
  const { width } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const available = gridWidth || width;
  const size = Math.floor((available - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
  const onLayout = (event: LayoutChangeEvent) => setGridWidth(event.nativeEvent.layout.width);
  return { size, onLayout };
}

function ReelGrid({ userId }: { userId: string }) {
  const reels = useAuthorReels(userId);
  const { size, onLayout } = useTileSize();
  const items = reels.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <GridState query={reels} isEmpty={items.length === 0} emptyText={vi.api.profileNoVideos}>
      <View style={styles.grid} onLayout={onLayout}>
        {items.map((reel) => (
          <Tile
            key={reel.postId}
            size={size}
            image={reel.video.posters.w360}
            likes={reel.counts.likes}
            label={reel.title}
            onPress={() => router.push({ pathname: '/user-reels', params: { userId, reel: reel.postId } })}
          />
        ))}
      </View>
    </GridState>
  );
}

function VlogGrid({ userId }: { userId: string }) {
  const vlogs = useAuthorVlogs(userId);
  const { size, onLayout } = useTileSize();
  const items = vlogs.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <GridState query={vlogs} isEmpty={items.length === 0} emptyText={vi.api.profileNoPosts}>
      <View style={styles.grid} onLayout={onLayout}>
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

function HeldPosts({ userId }: { userId: string }) {
  const posts = useInfiniteQuery({
    queryKey: ['social', 'my-posts', userId, 'held'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      socialApi.listMyPosts({ status: 'held', cursor: pageParam, limit: 20 }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 10000,
  });
  const items = posts.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <GridState query={posts} isEmpty={!items.length} emptyText={vi.moderation.heldPostsEmpty}>
      <View style={{ gap: s.md }}>
        {items.map((post) => (
          <Card key={post.id} style={{ gap: s.sm }}>
            <Txt variant="label">{post.title}</Txt>
            <Txt variant="caption">{vi.moderation.heldPost}</Txt>
            <Txt numberOfLines={3}>{post.body}</Txt>
            <Button
              tone="secondary"
              onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: post.id } })}
            >
              {vi.api.detail}
            </Button>
          </Card>
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
  query: {
    isPending: boolean;
    error: unknown;
    refetch: () => unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
  };
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
        <Button
          tone="text"
          compact
          disabled={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        >
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
        <Image
          source={image}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessible={false}
        />
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
  tabs: {
    flexDirection: 'row',
    marginHorizontal: -mobileLayout.gutter,
    borderBottomColor: c.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    minHeight: mobileLayout.touchTarget,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: c.transparent,
  },
  tabActive: { borderBottomColor: c.text },
  // Lưới tràn hết bề ngang như TikTok: bù lại lề hai bên của màn, ô sát nhau chỉ cách 1px.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    // Màn xếp các khối cách nhau s.xl; kéo lưới lên sát gạch chân tab, chỉ chừa 1px như TikTok.
    marginTop: GRID_GAP - s.xl,
    marginHorizontal: -mobileLayout.gutter,
  },
  tile: { backgroundColor: c.seaMist, overflow: 'hidden', justifyContent: 'center' },
  tileTitle: { padding: s.sm },
  likes: {
    position: 'absolute',
    left: s.xs,
    bottom: s.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  // Bóng chữ để số vẫn đọc được trên ảnh bìa sáng.
  likesText: {
    color: c.background,
    fontFamily: nativeFonts.bold,
    textShadowColor: c.overlayHeavy,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  state: { paddingVertical: s.xl },
});
