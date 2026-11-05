import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { Button, Card, Field, Notice, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';
import { router } from 'expo-router';

export function LiveComments({ postId, parentCommentId }: { postId: string; parentCommentId?: string }) {
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
    },
  });
  return (
    <>
      <Txt variant="heading">{vi.api.comments}</Txt>
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
          <Card key={comment.id}>
            <Txt variant="caption">
              {comment.authorId.slice(0, 8)} · {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
            </Txt>
            <Txt>{comment.body}</Txt>
            {comment.authorId === user?.id && (
              <>
                <Button
                  tone="text"
                  disabled={mutation.isPending}
                  onPress={() => {
                    setEditing(comment.id);
                    setBody(comment.body);
                  }}
                >
                  {vi.api.edit}
                </Button>
                <Button tone="text" disabled={mutation.isPending} onPress={() => mutation.mutate(comment.id)}>
                  {vi.api.remove}
                </Button>
              </>
            )}
            {!parentCommentId && (
              <>
                <Button
                  tone="text"
                  onPress={() => setReplying(replying === comment.id ? undefined : comment.id)}
                >
                  {vi.api.replies}
                </Button>
                {replying === comment.id && <LiveComments postId={postId} parentCommentId={comment.id} />}
              </>
            )}
          </Card>
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
