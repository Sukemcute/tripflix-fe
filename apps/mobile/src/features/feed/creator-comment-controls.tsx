import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentControlsApi } from '@tripflix/api-client';
import type { CommentSettingsDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { Button, Card, Field, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';

const text = vi.moderation;
export function CreatorCommentControls({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: ['creator-comments', postId, 'settings'],
    enabled: open,
    queryFn: ({ signal }) => commentControlsApi.settings(postId, signal),
  });
  const queue = useInfiniteQuery({
    queryKey: ['creator-comments', postId, 'queue'],
    enabled: open,
    staleTime: 0,
    refetchInterval: 10000,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => commentControlsApi.queue(postId, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      commentControlsApi.decide(id, action),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['creator-comments', postId, 'queue'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
      ]);
    },
  });
  const items = queue.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
      <Button tone="text" onPress={() => setOpen(!open)}>
        {open ? `${text.creatorSettings} · Thu gọn` : text.creatorSettings}
      </Button>
      {open && (
        <Card style={{ gap: spacing.md }}>
          <Txt variant="caption">{text.creatorSettingsHint}</Txt>
          <ApiErrorNotice error={settings.error ?? queue.error ?? decide.error} />
          {settings.isPending && <Txt>{vi.api.loading}</Txt>}
          {settings.data && <SettingsForm key={postId} initial={settings.data} postId={postId} />}
          <Txt variant="heading">{text.creatorQueue}</Txt>
          {queue.isPending && <Txt>{vi.api.loading}</Txt>}
          {!queue.isPending && !queue.error && !items.length && <Txt>{text.creatorEmpty}</Txt>}
          {items.map((item) => (
            <Card key={item.id} style={{ gap: spacing.sm }}>
              <Txt variant="caption">
                {item.authorId.slice(0, 8)} · {new Date(item.createdAt).toLocaleString('vi-VN')}
              </Txt>
              <Txt>{item.body || text.platformBlocked}</Txt>
              {item.platformBlocked && !!item.body && <Txt variant="caption">{text.platformBlocked}</Txt>}
              <Button
                tone="secondary"
                disabled={decide.isPending}
                onPress={() => decide.mutate({ id: item.id, action: 'reject' })}
              >
                {text.creatorReject}
              </Button>
              <Button
                disabled={decide.isPending}
                onPress={() => decide.mutate({ id: item.id, action: 'approve' })}
              >
                {text.creatorApprove}
              </Button>
            </Card>
          ))}
          {queue.hasNextPage && (
            <Button
              tone="secondary"
              disabled={queue.isFetchingNextPage}
              onPress={() => void queue.fetchNextPage()}
            >
              {vi.api.next}
            </Button>
          )}
        </Card>
      )}
    </View>
  );
}

function SettingsForm({ postId, initial }: { postId: string; initial: CommentSettingsDto }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [keywords, setKeywords] = useState(initial.keywords.join('\n'));
  const client = useQueryClient();
  const lines = keywords
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const invalid = lines.length > 50 || lines.some((line) => line.length > 80);
  const save = useMutation({
    mutationFn: () => commentControlsApi.update(postId, { enabled, keywords: lines }),
    onSuccess: async (data) => {
      client.setQueryData(['creator-comments', postId, 'settings'], data);
      await client.invalidateQueries({ queryKey: ['social', 'comment-permissions', postId] });
    },
  });
  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <Txt style={{ flex: 1 }}>{text.commentsEnabled}</Txt>
        <Switch
          accessibilityLabel={text.commentsEnabled}
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ true: colors.tealInk }}
        />
      </View>
      <Field label={text.keywords} value={keywords} onChangeText={setKeywords} multiline maxLength={4100} />
      <Txt variant="caption">{text.keywordHint}</Txt>
      {invalid && <Txt>Tối đa 50 dòng, mỗi dòng 80 ký tự.</Txt>}
      <ApiErrorNotice error={save.error} />
      {save.isSuccess && <Txt accessibilityLiveRegion="polite">{text.settingsSaved}</Txt>}
      <Button disabled={save.isPending || invalid} onPress={() => save.mutate()}>
        {save.isPending ? vi.api.saving : vi.api.save}
      </Button>
    </View>
  );
}
