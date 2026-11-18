'use client';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentControlsApi } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import type { CommentSettingsDto } from '@tripflix/api-client/core-api/model/index';
import { ApiErrorNotice } from '@/features/shared/api-state';
import styles from './creator-comment-controls.module.css';

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
    <details className={styles.panel} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{text.creatorSettings}</summary>
      {open && (
        <div className={styles.body}>
          <p>{text.creatorSettingsHint}</p>
          <ApiErrorNotice error={settings.error ?? queue.error ?? decide.error} />
          {settings.isPending && <output>{vi.api.loading}</output>}
          {settings.data && <SettingsForm key={postId} postId={postId} initial={settings.data} />}
          <h3>{text.creatorQueue}</h3>
          {queue.isPending && <output>{vi.api.loading}</output>}
          {!queue.isPending && !queue.error && !items.length && <p>{text.creatorEmpty}</p>}
          {items.map((item) => (
            <article key={item.id} className={styles.comment}>
              <span className={styles.meta}>
                {item.authorId.slice(0, 8)} · {new Date(item.createdAt).toLocaleString('vi-VN')}
              </span>
              <p>{item.body || text.platformBlocked}</p>
              {item.platformBlocked && item.body && <p>{text.platformBlocked}</p>}
              <div className={styles.actions}>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: item.id, action: 'reject' })}
                >
                  {text.creatorReject}
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: item.id, action: 'approve' })}
                >
                  {text.creatorApprove}
                </button>
              </div>
            </article>
          ))}
          {queue.hasNextPage && (
            <button
              type="button"
              className="secondary-button"
              disabled={queue.isFetchingNextPage}
              onClick={() => void queue.fetchNextPage()}
            >
              {vi.api.next}
            </button>
          )}
        </div>
      )}
    </details>
  );
}

function SettingsForm({ postId, initial }: { postId: string; initial: CommentSettingsDto }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [keywords, setKeywords] = useState(initial.keywords.join('\n'));
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      commentControlsApi.update(postId, {
        enabled,
        keywords: keywords
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      }),
    onSuccess: async (data) => {
      client.setQueryData(['creator-comments', postId, 'settings'], data);
      await client.invalidateQueries({ queryKey: ['social', 'comment-permissions', postId] });
    },
  });
  const lines = keywords
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const invalid = lines.length > 50 || lines.some((line) => line.length > 80);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <label className={styles.toggle}>
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        {text.commentsEnabled}
      </label>
      <label>
        {text.keywords}
        <textarea
          rows={4}
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          maxLength={4100}
        />
      </label>
      <p>{text.keywordHint}</p>
      {invalid && <p role="alert">Tối đa 50 dòng, mỗi dòng 80 ký tự.</p>}
      <ApiErrorNotice error={save.error} />
      {save.isSuccess && <output>{text.settingsSaved}</output>}
      <button type="submit" className="primary-button" disabled={save.isPending || invalid}>
        {save.isPending ? vi.api.saving : vi.api.save}
      </button>
    </form>
  );
}
