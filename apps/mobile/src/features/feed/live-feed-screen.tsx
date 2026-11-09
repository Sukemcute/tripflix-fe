import { socialApi, useApiSession, useSocialPosts } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { router } from 'expo-router';
import { Button, Card, copy, Empty, Notice, Screen, Txt, ui } from '@/components/mobile-ui';
import { ApiErrorNotice, RequireAccount } from '@/components/api-state';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { LiveComments } from './live-comments';
import { Share, View } from 'react-native';
import * as Linking from 'expo-linking';

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
export function LivePostDetailScreen() {
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['social', 'post', slug, user?.id],
    enabled: isReady && !!slug,
    queryFn: ({ signal }) => socialApi.getPost(slug, signal),
  });
  const mutation = useMutation({
    mutationFn: async (action: 'like' | 'love' | 'helpful' | 'save' | 'delete' | 'share' | 'publish') => {
      if (action === 'delete') return socialApi.deletePost(slug);
      if (action === 'publish') return socialApi.publishPost(slug);
      if (action === 'share') {
        const share = await Share.share({
          message: Linking.createURL(`/trip/${encodeURIComponent(slug)}`),
          title: query.data?.post.title,
        });
        if (share.action === Share.sharedAction) return socialApi.sharePost(slug);
        return;
      }
      if (action === 'save') return socialApi.setBookmark(slug, !query.data?.viewerContext.isBookmarked);
      return socialApi.setReaction(slug, query.data?.viewerContext.myReaction === action ? null : action);
    },
    onSuccess: async (_, action) => {
      await client.invalidateQueries({ queryKey: ['social'] });
      if (action === 'delete') router.replace('/(tabs)');
    },
  });
  const [isDeleting, setDeleting] = useState(false);
  const post = query.data?.post;
  const goLogin = () => router.push({ pathname: '/login', params: { returnTo: `/trip/${slug}` } });
  return (
    <Screen title={vi.api.detail}>
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {(!isReady || query.isPending) && <Txt>{vi.api.loading}</Txt>}
      {post && (
        <>
          <Txt variant="title">{post.title}</Txt>
          <Txt variant="caption">
            {vi.api.author} · {post.authorName || post.authorId.slice(0, 8)}
          </Txt>
          <Txt>{post.body}</Txt>
          <Notice>{vi.api.noPreview}</Notice>
          {post.tripAttachment?.items?.map((item, index) => (
            <Card key={index}>
              <Txt variant="label">
                {item.day} · {item.title}
              </Txt>
              <Txt>{item.location}</Txt>
              <Txt>{item.notes}</Txt>
            </Card>
          ))}
          <Txt>
            {post.reactionTotal} {vi.api.like} · {post.commentCount} {vi.api.comments} · {post.bookmarkCount}{' '}
            {vi.api.bookmarks}
          </Txt>
          <ApiErrorNotice error={mutation.error} />
          <Button
            disabled={mutation.isPending}
            tone="secondary"
            onPress={() => (user ? mutation.mutate('like') : goLogin())}
          >
            {query.data?.viewerContext.myReaction === 'like' ? vi.api.unlike : vi.api.like}
          </Button>
          <Button
            disabled={mutation.isPending}
            tone="secondary"
            onPress={() => (user ? mutation.mutate('love') : goLogin())}
          >
            {vi.api.love}
          </Button>
          <Button
            disabled={mutation.isPending}
            tone="secondary"
            onPress={() => (user ? mutation.mutate('helpful') : goLogin())}
          >
            {vi.api.helpful}
          </Button>
          <Button
            disabled={mutation.isPending}
            tone="secondary"
            onPress={() => (user ? mutation.mutate('save') : goLogin())}
          >
            {query.data?.viewerContext.isBookmarked ? vi.api.unbookmark : vi.api.bookmark}
          </Button>
          <Button disabled={mutation.isPending} tone="secondary" onPress={() => mutation.mutate('share')}>
            {vi.api.share}
          </Button>
          {post.authorId === user?.id && (
            <>
              {post.status === 'draft' && (
                <Button
                  disabled={mutation.isPending || (!post.body.trim() && post.mediaIds.length === 0)}
                  onPress={() => mutation.mutate('publish')}
                >
                  {vi.api.publish}
                </Button>
              )}
              <Button
                tone="secondary"
                onPress={() => router.push({ pathname: '/create', params: { postId: slug } })}
              >
                {vi.api.edit}
              </Button>
              <Button
                tone="text"
                disabled={mutation.isPending}
                onPress={() => (isDeleting ? mutation.mutate('delete') : setDeleting(true))}
              >
                {isDeleting ? vi.api.confirmDelete : vi.api.remove}
              </Button>
            </>
          )}
          <LiveComments postId={slug} />
        </>
      )}
    </Screen>
  );
}
export function LiveSavedScreen() {
  return <LiveFeedScreen kind="bookmarks" />;
}
