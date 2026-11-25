import { useApiSession, useSocialPosts } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts } from '@tripflix/tokens';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { router, useIsFocused } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Card, copy, Empty, Icon, Notice, Screen, Txt, ui } from '@/components/mobile-ui';
import { ApiErrorNotice, RequireAccount } from '@/components/api-state';
import { LoadingDots } from '@/components/loading-dots';
import { PostOptionsMenu } from './post-options-menu';

export function LivePostCard({ post }: { post: SocialPostDto }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt variant="caption" style={{ flex: 1 }}>
          {vi.api.author} · {post.authorName || post.authorId.slice(0, 8)}
        </Txt>
        <PostOptionsMenu postId={post.id} authorId={post.authorId} />
      </View>
      <Txt variant="heading">{post.title}</Txt>
      <Txt>{post.body}</Txt>
      {post.tripAttachment?.destinationName && <Txt>{post.tripAttachment.destinationName}</Txt>}
      <Txt variant="caption">
        {post.reactionTotal} {vi.api.like} · {post.commentCount} {vi.api.comments}
      </Txt>
      <Button
        tone="secondary"
        onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: post.id } })}
      >
        {vi.api.detail}
      </Button>
    </Card>
  );
}
export function LiveFeedScreen({ kind = 'public' }: { kind?: 'public' | 'mine' | 'bookmarks' }) {
  const { user, isReady } = useApiSession();
  const isFocused = useIsFocused();
  // Màn này là danh sách bài viết cho cả công khai, bài của tôi và đã lưu; Reels có màn riêng.
  const query = useSocialPosts(kind, '', 'vlog', kind === 'public' ? 'recommended' : 'latest', {
    refreshOnReturn: kind === 'public' && isFocused,
  });
  const { width } = useWindowDimensions();
  if (!isReady || (kind === 'mine' && !user)) return <RequireAccount />;
  const posts = query.data?.pages.flatMap((page) => page.items);
  const isSaved = kind === 'bookmarks';
  const savedTileWidth = Math.max(140, Math.min(196, (Math.min(width, 430) - 48) / 2));
  return (
    <Screen
      title={kind === 'mine' ? vi.api.myPosts : isSaved ? copy.profile.saved : vi.api.posts}
      back={kind !== 'public'}
    >
      {isSaved && (
        <View>
          <Txt variant="title" style={savedStyles.title}>
            {copy.profile.savedHeadline}
          </Txt>
          <Txt variant="small" style={ui.muted}>
            {copy.profile.savedBody}
          </Txt>
          <View style={savedStyles.filters}>
            <View style={savedStyles.filterActive}>
              <Txt variant="label" style={savedStyles.filterActiveText}>
                {vi.mobile.explorer.savedAll}
              </Txt>
            </View>
            {/* Thư mục tự tạo cần API bộ sưu tập; chưa có thì chỉ hiện dạng xem trước, không bấm được. */}
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={vi.mobile.explorer.savedFoldersSoonLabel}
              accessibilityState={{ disabled: true }}
              style={savedStyles.filter}
            >
              <Icon name="folder-outline" size={16} color={x.day.textSecondary} />
              <Txt variant="caption" style={savedStyles.filterText}>
                {vi.mobile.explorer.savedFolders}
              </Txt>
              <Txt variant="caption" style={savedStyles.soon}>
                {vi.mobile.explorer.comingSoon}
              </Txt>
            </View>
          </View>
        </View>
      )}
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {isSaved && !user ? (
        <Empty
          title={copy.profile.savedEmptyHeadline}
          body={copy.profile.body}
          compact
          action={copy.profile.login}
          onAction={() => router.push({ pathname: '/login', params: { returnTo: '/saved' } })}
        />
      ) : query.isPending && !query.error ? (
        <LoadingDots />
      ) : null}
      {posts?.length === 0 &&
        (isSaved ? (
          <Empty
            title={copy.profile.savedEmptyHeadline}
            body={copy.profile.emptyBody}
            compact
            action={copy.trips.find}
            onAction={() => router.navigate('/(tabs)')}
          />
        ) : (
          <Notice>{vi.api.noPosts}</Notice>
        ))}
      {isSaved && !!posts?.length ? (
        <View style={savedStyles.grid}>
          {posts.map((post) => {
            const image = post.video?.posters.w360 ?? post.images?.[0]?.url;
            return (
              <Pressable
                key={post.id}
                accessibilityRole="button"
                accessibilityLabel={post.title}
                onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: post.id } })}
                style={({ pressed }) => [savedStyles.tile, { width: savedTileWidth }, pressed && ui.pressed]}
              >
                <View style={savedStyles.poster}>
                  {image ? (
                    <Image source={image} contentFit="cover" style={StyleSheet.absoluteFill} />
                  ) : (
                    <Icon name="image-outline" size={28} color={x.day.link} />
                  )}
                  <View style={savedStyles.bookmark}>
                    <Icon name="bookmark" size={18} color={x.day.text} />
                  </View>
                  <View style={savedStyles.posterCaption}>
                    <Txt numberOfLines={2} style={savedStyles.posterTitle}>
                      {post.title}
                    </Txt>
                    <Txt numberOfLines={1} style={savedStyles.posterAuthor}>
                      {post.authorName || vi.api.author}
                    </Txt>
                  </View>
                </View>
                <Txt variant="caption" style={savedStyles.tileMeta} numberOfLines={1}>
                  {post.tripAttachment?.destinationName ??
                    post.hashtags
                      .slice(0, 2)
                      .map((tag) => `#${tag}`)
                      .join('  ')}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      ) : (
        posts?.map((post) => <LivePostCard key={post.id} post={post} />)
      )}
      {query.hasNextPage && (
        <Button
          disabled={query.isFetchingNextPage}
          onPress={() => {
            void query.fetchNextPage();
          }}
        >
          {vi.api.next}
        </Button>
      )}
    </Screen>
  );
}

const savedStyles = StyleSheet.create({
  title: { color: x.day.text },
  filters: { flexDirection: 'row', gap: 8, marginTop: 18 },
  filterActive: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.link,
  },
  filterActiveText: { color: x.brand.white },
  filter: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.surface,
  },
  filterText: { color: x.day.textSecondary },
  soon: { color: x.day.textSecondary, fontFamily: nativeFonts.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  tile: { gap: 8 },
  poster: {
    height: 252,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: x.radius.lg,
    backgroundColor: x.day.tintExplore,
  },
  bookmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.surface,
  },
  posterCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 2,
    padding: 10,
    backgroundColor: x.glass,
  },
  posterTitle: { color: x.brand.white, fontSize: 14, lineHeight: 19, fontFamily: nativeFonts.bold },
  posterAuthor: { color: x.brand.white, fontSize: 13, lineHeight: 18 },
  tileMeta: { color: x.day.textSecondary, paddingHorizontal: 2 },
});
export function LiveSavedScreen() {
  return <LiveFeedScreen kind="bookmarks" />;
}
