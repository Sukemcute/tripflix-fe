import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Field, Icon, Notice, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';
import { router } from 'expo-router';
import { ReelCommentComposer } from './reel-comment-composer';

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
}: {
  postId: string;
  parentCommentId?: string;
  showHeading?: boolean;
  compact?: boolean;
}) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | undefined>();
  const query = useInfiniteQuery({
    queryKey: ['social', 'comments', postId, parentCommentId],
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
      await client.invalidateQueries({ queryKey: ['social'] });
      await client.invalidateQueries({ queryKey: ['feed'] });
    },
  });
  return (
    <>
      {showHeading && <Txt variant="heading">{vi.api.comments}</Txt>}
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
        .map((comment) => (
          <View key={comment.id} style={compact ? styles.comment : undefined}>
            {compact && (
              <View style={styles.avatar}>
                <Icon name="person-outline" size={18} color={colors.tealInk} />
              </View>
            )}
            <Card style={compact ? styles.commentBody : undefined}>
              <Txt variant="caption">
                {comment.authorId === user?.id ? user.displayName : comment.authorId.slice(0, 8)} ·{' '}
                {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
              </Txt>
              <Txt>{comment.body}</Txt>
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
                />
              )}
            </Card>
          </View>
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
                maxLength={2000}
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
        <Button onPress={() => router.push({ pathname: '/login', params: { returnTo: `/trip/${postId}` } })}>
          {vi.api.login}
        </Button>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
