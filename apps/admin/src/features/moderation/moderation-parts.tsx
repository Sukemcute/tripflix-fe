'use client';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import type { ModerationPartsDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import styles from './moderation-parts.module.css';

const text = vi.moderation.parts;
export function ModerationParts({ postId }: { postId: string }) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['moderation', 'parts', postId, user?.id],
    queryFn: ({ signal }) => moderationApi.parts(postId, signal),
    staleTime: 0,
    refetchInterval: 10_000,
  });
  const retry = useMutation({
    mutationFn: (id: string) => moderationApi.retryPart(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['moderation'] }),
  });
  return (
    <section className={styles.panel} aria-label={text.title}>
      <header className={styles.header}>
        <div>
          <h3>{text.title}</h3>
          <p>{text.policy}</p>
        </div>
        <button
          type="button"
          className={styles.button}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {text.refresh}
        </button>
      </header>
      <AdminApiError error={query.error ?? retry.error} />
      {query.isPending && <output>{text.loading}</output>}
      {retry.isSuccess && <output>{text.scheduled}</output>}
      {query.data && (
        <ModerationPartsEvidence
          data={query.data}
          onRetry={(id) => retry.mutate(id)}
          retryPending={retry.isPending}
        />
      )}
    </section>
  );
}

export function ModerationPartsEvidence({
  data,
  onRetry,
  retryPending = false,
}: {
  data: ModerationPartsDto;
  onRetry: (id: string) => void;
  retryPending?: boolean;
}) {
  return (
    <>
      <p className={styles.version}>
        {text.version}: <code title={data.contentVersion}>{data.contentVersion.slice(0, 19)}…</code>
      </p>
      <div className={styles.grid}>
        {data.items.map((part, index) => {
          const title =
            part.kind === 'caption'
              ? text.caption
              : `${part.mediaKind === 'video' ? text.poster : text.image} ${data.items.slice(0, index + 1).filter((p) => p.kind === 'image').length}`;
          const flags = Object.entries(part.categories).filter(([, flagged]) => flagged);
          return (
            <article
              key={part.id ?? part.assetId ?? 'caption'}
              className={`${styles.part} ${part.kind === 'caption' ? styles.caption : ''}`}
            >
              <div className={styles.partHeader}>
                <h4>{title}</h4>
                <span className={styles.badge} data-status={part.status}>
                  {text.statuses[part.status]}
                </span>
              </div>
              {part.kind === 'caption' ? (
                <>
                  <p className={styles.note}>{text.captionNote}</p>
                  <p className={styles.body}>{part.text?.trim() || text.noCaption}</p>
                </>
              ) : (
                <>
                  {part.previewUrl ? (
                    <Image
                      className={styles.preview}
                      src={part.previewUrl}
                      alt={title}
                      width={480}
                      height={240}
                      unoptimized
                    />
                  ) : (
                    <p className={styles.placeholder}>{text.noPreview}</p>
                  )}
                  <p className={styles.asset}>
                    {text.asset}: <code>{part.assetId}</code>
                  </p>
                  {part.mediaKind === 'video' && <p className={styles.note}>{text.posterNote}</p>}
                </>
              )}
              {!!flags.length && (
                <ul className={styles.flags}>
                  {flags.map(([key]) => (
                    <li key={key}>
                      {text.categories[key as keyof typeof text.categories] ?? key}
                      {typeof part.scores[key] === 'number' && (
                        <span> · {Math.round(part.scores[key] * 100)}%</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {part.status === 'passed' && <p className={styles.note}>{text.noFlags}</p>}
              {part.errorCode && (
                <p className={styles.error}>
                  {text.errors[part.errorCode as keyof typeof text.errors] ?? text.errors.provider_error}
                </p>
              )}
              <dl className={styles.meta}>
                <div>
                  <dt>{text.attempts}</dt>
                  <dd>{part.attempts}/8</dd>
                </div>
                {part.model && (
                  <div>
                    <dt>{text.model}</dt>
                    <dd>{part.model}</dd>
                  </div>
                )}
                {part.updatedAt && (
                  <div>
                    <dt>{text.updated}</dt>
                    <dd>{new Date(part.updatedAt).toLocaleString('vi-VN')}</dd>
                  </div>
                )}
              </dl>
              {part.id && part.status === 'failed' && part.errorCode !== 'media_failed' && (
                <button
                  type="button"
                  className={styles.button}
                  disabled={retryPending}
                  onClick={() => onRetry(part.id!)}
                >
                  {retryPending ? text.retrying : text.retry}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
