import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi, useApiSession } from '@tripflix/api-client';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Chip, Field, Notice, Row, Screen, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice, RequireAccount } from '@/components/api-state';

export function LiveCreateScreen() {
  const { user, isReady } = useApiSession();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const query = useQuery({
    queryKey: ['social', 'edit', postId, user?.id],
    enabled: isReady && !!user && !!postId,
    queryFn: ({ signal }) => socialApi.getPost(postId!, signal),
  });
  if (!isReady || !user) return <RequireAccount />;
  if (postId && !query.data)
    return (
      <Screen title={vi.api.create}>
        <ApiErrorNotice
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
        {query.isPending && <Txt>{vi.api.loading}</Txt>}
      </Screen>
    );
  return <DraftEditor key={postId ?? 'new'} post={query.data?.post} />;
}
function DraftEditor({ post }: { post?: SocialPostDto }) {
  const client = useQueryClient();
  const [id, setId] = useState(post?.id);
  const [title, setTitle] = useState(post?.title ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [hashtags, setHashtags] = useState(post?.hashtags.join(', ') ?? '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    post?.visibility === 'private' ? 'private' : 'public',
  );
  const mutation = useMutation({
    mutationFn: async (action: 'save' | 'publish') => {
      const draft = {
        title: title.trim(),
        body,
        hashtags: hashtags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        visibility,
      };
      const savedPost = await (id
        ? socialApi.updatePost(id, draft)
        : socialApi.createDraft({ ...draft, post_type: 'vlog' }));
      setId(savedPost.id);
      if (action === 'publish' && savedPost.status === 'draft') await socialApi.publishPost(savedPost.id);
      return savedPost;
    },
    onSuccess: async (savedPost) => {
      setId(savedPost.id);
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });
  return (
    <Screen title={vi.api.create}>
      <Notice>{vi.api.mediaUnavailable}</Notice>
      <Field label={vi.api.title} value={title} onChangeText={setTitle} maxLength={255} />
      <Field label={vi.api.body} value={body} onChangeText={setBody} multiline />
      <Field label={vi.api.hashtags} value={hashtags} onChangeText={setHashtags} />
      <Row>
        <Chip selected={visibility === 'public'} onPress={() => setVisibility('public')}>
          {vi.api.public}
        </Chip>
        <Chip selected={visibility === 'private'} onPress={() => setVisibility('private')}>
          {vi.api.private}
        </Chip>
      </Row>
      <ApiErrorNotice error={mutation.error} />
      {mutation.isSuccess && (
        <Notice>{mutation.variables === 'publish' ? vi.api.published : vi.api.draftSaved}</Notice>
      )}
      <Button disabled={mutation.isPending || !title.trim()} onPress={() => mutation.mutate('save')}>
        {mutation.isPending ? vi.api.saving : id ? vi.api.save : vi.api.saveDraft}
      </Button>
      <Button
        tone="secondary"
        disabled={mutation.isPending || !title.trim() || !body.trim()}
        onPress={() => mutation.mutate('publish')}
      >
        {vi.api.publish}
      </Button>
      {id && (
        <Button
          tone="secondary"
          onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: id } })}
        >
          {vi.api.detail}
        </Button>
      )}
    </Screen>
  );
}
