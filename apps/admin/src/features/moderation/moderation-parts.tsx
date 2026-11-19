'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type HlsPlayer from 'hls.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession, usePlaybackSession } from '@tripflix/api-client';
import type { ModerationPartsDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import styles from './moderation-parts.module.css';

const text = vi.moderation.parts;
export function frameTimestamp(ms: number) {
  return `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
function FrameVideo({ url, timestampMs }: { url: string; timestampMs: number }) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsPlayer | null>(null);
  const session = usePlaybackSession();
  useEffect(() => {
    if (!session.isSettled) return;
    const video = videoRef.current;
    if (!video) return;
    const controller = new AbortController();
    void import('hls.js')
      .then(({ default: Hls }) => {
        if (controller.signal.aborted) return;
        if (Hls.isSupported()) {
          const player = new Hls({
            maxBufferLength: 10,
            backBufferLength: 5,
            xhrSetup: (request) => {
              request.withCredentials = true;
            },
          });
          player.on(Hls.Events.ERROR, (_event, error) => {
            if (error.fatal) setFailed(true);
          });
          player.attachMedia(video);
          player.loadSource(url);
          hlsRef.current = player;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = url;
        else setFailed(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [url, session.isSettled]);
  return (
    <div className={styles.playback}>
      <p>
        {text.viewAt} <strong>{frameTimestamp(timestampMs)}</strong>
      </p>
      {session.isSettled ? (
        <video
          ref={videoRef}
          controls
          muted
          crossOrigin="use-credentials"
          preload="metadata"
          aria-label={`${text.viewAt} ${frameTimestamp(timestampMs)}`}
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = timestampMs / 1000;
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <output>{vi.api.loading}</output>
      )}
      {failed && <output>{text.playbackFailed}</output>}
    </div>
  );
}
export function VideoSamplingCoverage({ data }: { data: ModerationPartsDto }) {
  const ids = [
    ...new Set(
      data.items
        .filter((p) => p.modality === 'video_frame' || p.modality === 'video_sampling')
        .map((p) => p.assetId),
    ),
  ];
  if (!ids.length) return null;
  return (
    <section className={styles.coverage} aria-label={text.coverageTitle}>
      <h4>{text.coverageTitle}</h4>
      <p>{text.samplingNote}</p>
      {ids.map((id) => {
        const frames = data.items.filter((p) => p.assetId === id && p.modality === 'video_frame');
        const duration = frames[0]?.sampleDurationMs;
        const timestamps = frames.map((p) => p.timestampMs ?? 0).sort((a, b) => a - b);
        const gap = Math.max(
          0,
          ...timestamps.map((t, i) => (i ? t - timestamps[i - 1]! : t)),
          duration ? duration - (timestamps.at(-1) ?? 0) : 0,
        );
        const sampling = data.items.find((p) => p.assetId === id && p.modality === 'video_sampling');
        return (
          <div key={id} className={styles.coverageRow}>
            <code>{id}</code>
            <span>
              {frames.length
                ? `${frames.filter((p) => p.status === 'passed' || p.status === 'flagged').length}/${frames.length} ${text.framesChecked}`
                : sampling?.status === 'failed'
                  ? text.statuses.failed
                  : text.errors.frames_not_ready}
            </span>
            {duration != null && (
              <span>
                {text.duration}: {frameTimestamp(duration)} · {text.maxGap}: {(gap / 1000).toFixed(2)}{' '}
                {text.seconds}
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}
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
  const [selected, setSelected] = useState<{ url: string; timestampMs: number } | null>(null);
  return (
    <>
      <p className={styles.version}>
        {text.version}: <code title={data.contentVersion}>{data.contentVersion.slice(0, 19)}…</code>
      </p>
      <VideoSamplingCoverage data={data} />
      {selected &&
        data.items.some(
          (p) =>
            p.modality === 'video_frame' &&
            p.playbackUrl === selected.url &&
            p.timestampMs === selected.timestampMs,
        ) && <FrameVideo key={`${selected.url}:${selected.timestampMs}`} {...selected} />}
      <div className={styles.grid}>
        {data.items.map((part, index) => {
          const title =
            part.modality === 'video_cover_ocr'
              ? text.coverOcr
              : part.modality === 'video_frame'
                ? `${text.videoTitle} · ${frameTimestamp(part.timestampMs ?? 0)}`
                : part.modality === 'video_sampling'
                  ? text.samplingTitle
                  : part.kind === 'caption'
                    ? text.caption
                    : `${part.mediaKind === 'video' ? text.poster : text.image} ${data.items.slice(0, index + 1).filter((p) => p.kind === 'image').length}`;
          const flags = Object.entries(part.categories).filter(([, flagged]) => flagged);
          return (
            <article
              key={part.id ?? `${part.modality ?? part.kind}:${part.assetId ?? ''}:${part.timestampMs ?? ''}`}
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
                  {part.modality === 'video_cover_ocr' && (
                    <>
                      <p className={styles.note}>{text.coverOcrNote}</p>
                      {(part.status === 'passed' || part.status === 'flagged') && (
                        <p className={styles.body}>{part.text?.trim() || text.noCoverText}</p>
                      )}
                    </>
                  )}
                  {part.mediaKind === 'video' &&
                    part.modality !== 'video_frame' &&
                    part.modality !== 'video_sampling' &&
                    part.modality !== 'video_cover_ocr' && <p className={styles.note}>{text.posterNote}</p>}
                  {part.modality === 'video_frame' && part.playbackUrl && (
                    <button
                      type="button"
                      className={styles.button}
                      onClick={() =>
                        setSelected({ url: part.playbackUrl!, timestampMs: part.timestampMs ?? 0 })
                      }
                    >
                      {text.viewAt} {frameTimestamp(part.timestampMs ?? 0)}
                    </button>
                  )}
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
