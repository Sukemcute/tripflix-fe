import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Field, Icon, Notice, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';
import { router } from 'expo-router';
import { CommentLikeButton } from './comment-like-button';
import { ReelCommentComposer } from './reel-comment-composer';
import { CommunitySummary } from './post-summary';

function CommentAction({
  compact,
  disabled = false,
  onPress,
  children,
}: PropsWithChildren<{
  compact: boolean;
  disabled?: boolean;
  onPress: () => void;
}>) {
  if (!compact)
    return (
      <Button tone="text" disabled={disabled} onPress={onPress}>
        {children}
      </Button>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
    >
      <Txt variant="caption" style={styles.muted}>
        {children}
      </Txt>
    </Pressable>
  );
}

export function LiveComments({
  postId,
  parentCommentId,
  showHeading = true,
  compact = false,
  renderContent,
  onLoginRequired,
}: {
  postId: string;
  parentCommentId?: string;
  showHeading?: boolean;
  compact?: boolean;
  renderContent?: (content: ReactNode) => ReactNode;
  /** A sheet in a Modal must close first, because the login screen would open behind it. */
  onLoginRequired?: () => void;
}) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | undefined>();
  const goToLogin =
    onLoginRequired ?? (() => router.push({ pathname: '/login', params: { returnTo: `/trip/${postId}` } }));
  // Whether a comment is liked depends on who is viewing, so each viewer keeps a separate list.
  const queryKey = ['social', 'comments', postId, parentCommentId, user?.id];
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => socialApi.listComments(postId, pageParam, parentCommentId, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const mutation = useMutation({
    mutationFn: async (action: 'save' | string) =>
      action !== 'save'
        ? socialApi.deleteComment(action)
        : editing
          ? socialApi.editComment(editing, body.trim())
          : socialApi.addComment(postId, body.trim(), parentCommentId),
    onSuccess: async (_, action) => {
      if (action === 'save') {
        setBody('');
        setEditing(null);
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social', 'comments', postId] }),
        client.invalidateQueries({ queryKey: ['social', 'post', postId] }),
        client.invalidateQueries({ queryKey: ['social', 'summary', postId] }),
        client.invalidateQueries({ queryKey: ['feed'], refetchType: 'none' }),
      ]);
    },
  });
  const content = (
    <>
      {!parentCommentId && <CommunitySummary key={postId} postId={postId} />}
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Txt>{vi.api.loading}</Txt>}
      {query.data?.pages[0]?.items.length === 0 && <Notice>{vi.api.noComments}</Notice>}
      {query.data?.pages
        .flatMap((page) => page.items)
        .map((comment) => {
          const authorName = comment.authorId === user?.id ? user.displayName : comment.authorId.slice(0, 8);
          const likeButton = !comment.deletedAt && (
            <CommentLikeButton
              commentId={comment.id}
              isLiked={comment.isLiked}
              likeCount={comment.likeCount}
              authorName={authorName}
              queryKey={queryKey}
              isStacked={compact}
              onLoginRequired={goToLogin}
            />
          );
          return (
            <View key={comment.id} style={compact ? styles.comment : undefined}>
              {compact && (
                <View style={styles.avatar}>
                  <Icon name="person-outline" size={18} color={colors.tealInk} />
                </View>
              )}
              <Card style={compact ? styles.commentBody : undefined}>
                <Txt variant="caption">
                  {authorName} · {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                </Txt>
                <Txt>{comment.body}</Txt>
                {!compact && likeButton}
                <View style={compact ? styles.actions : undefined}>
                  {comment.authorId === user?.id && (
                    <>
                      <CommentAction
                        compact={compact}
                        disabled={mutation.isPending}
                        onPress={() => {
                          setEditing(comment.id);
                          setBody(comment.body);
                        }}
                      >
                        {vi.api.edit}
                      </CommentAction>
                      <CommentAction
                        compact={compact}
                        disabled={mutation.isPending}
                        onPress={() => mutation.mutate(comment.id)}
                      >
                        {vi.api.remove}
                      </CommentAction>
                    </>
                  )}
                  {!parentCommentId && (
                    <CommentAction
                      compact={compact}
                      onPress={() => setReplying(replying === comment.id ? undefined : comment.id)}
                    >
                      {vi.api.replies}
                    </CommentAction>
                  )}
                </View>
                {!parentCommentId && replying === comment.id && (
                  <LiveComments
                    postId={postId}
                    parentCommentId={comment.id}
                    showHeading={!compact}
                    compact={compact}
                    onLoginRequired={onLoginRequired}
                  />
                )}
              </Card>
              {compact && likeButton}
            </View>
          );
        })}
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
    </>
  );
  return (
    <>
      {showHeading && <Txt variant="heading">{vi.api.comments}</Txt>}
      {renderContent ? renderContent(content) : content}
      <View style={renderContent ? styles.composer : compact ? undefined : styles.inlineComposer}>
        <ApiErrorNotice error={mutation.error} />
        {user ? (
          <>
            {compact ? (
              <ReelCommentComposer
                label={editing ? vi.api.edit : parentCommentId ? vi.api.reply : vi.api.commentBody}
                value={body}
                onChange={setBody}
                onSend={() => mutation.mutate('save')}
                isPending={mutation.isPending}
              />
            ) : (
              <>
                <Field
                  label={editing ? vi.api.edit : parentCommentId ? vi.api.reply : vi.api.commentBody}
                  value={body}
                  onChangeText={setBody}
                  multiline
                  maxLength={10000}
                />
                <Button disabled={mutation.isPending || !body.trim()} onPress={() => mutation.mutate('save')}>
                  {mutation.isPending ? vi.api.saving : vi.api.send}
                </Button>
              </>
            )}
            {editing && (
              <Button
                tone="text"
                onPress={() => {
                  setEditing(null);
                  setBody('');
                }}
              >
                {vi.api.cancel}
              </Button>
            )}
          </>
        ) : (
          <Button onPress={goToLogin}>{vi.api.login}</Button>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inlineComposer: { gap: spacing.lg },
  composer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.seaMist,
  },
  commentBody: { flex: 1, borderWidth: 0, backgroundColor: colors.transparent, padding: 0, gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  action: { minHeight: 32, justifyContent: 'center' },
  muted: { color: colors.textMuted },
});
