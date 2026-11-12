import { useApiSession, useSocialPosts } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { router } from 'expo-router';
import { Button, Card, copy, Empty, Notice, Screen, Txt, ui } from '@/components/mobile-ui';
import { ApiErrorNotice, RequireAccount } from '@/components/api-state';
import { View } from 'react-native';

export function LivePostCard({ post }: { post: SocialPostDto }) {
  return (
    <Card>
      <Txt variant="caption">
        {vi.api.author} · {post.authorName || post.authorId.slice(0, 8)}
      </Txt>
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
  const query = useSocialPosts(kind);
  if (!isReady || (kind === 'mine' && !user)) return <RequireAccount />;
  const posts = query.data?.pages.flatMap((page) => page.items);
  const isSaved = kind === 'bookmarks';
  return (
    <Screen
      title={kind === 'mine' ? vi.api.myPosts : isSaved ? copy.profile.saved : vi.api.posts}
      back={kind !== 'public'}
    >
      {isSaved && (
        <View>
          <Txt variant="title">{copy.profile.savedHeadline}</Txt>
          <Txt variant="small" style={ui.muted}>
            {copy.profile.savedBody}
          </Txt>
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
        <Txt>{vi.api.loading}</Txt>
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
      {posts?.map((post) => (
        <LivePostCard key={post.id} post={post} />
      ))}
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
export function LiveSavedScreen() {
  return <LiveFeedScreen kind="bookmarks" />;
}
