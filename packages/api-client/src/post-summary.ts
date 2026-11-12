import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { postSummaryControllerGetSummary } from './generated/core-api/social-ai-summary/social-ai-summary';
import { commentsControllerListComments } from './generated/core-api/social-comments/social-comments';
import { readPage } from './response';
import { HttpError } from './http';
import { useApiSession } from './session';

export type PostSummaryStatus = 'no_comments' | 'insufficient_data' | 'ready' | 'failed';
export interface SummaryPoint {
  text: string;
  people: number | null;
  commentIds: string[];
}
export interface PostSummary {
  status: PostSummaryStatus;
  summary: string | null;
  keyTakeaways: string[];
  commentCount: number;
  people: number | null;
  needed: number | null;
  generatedAt: string | null;
  pros: SummaryPoint[];
  cons: SummaryPoint[];
  realityGaps: (SummaryPoint & { claim: string })[];
  topics: (SummaryPoint & { label: string })[];
  hasSafetyWarnings: boolean;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Unexpected AI summary response');
  }
  return value as Record<string, unknown>;
}
function count(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('Unexpected AI summary count');
  }
  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Unexpected AI summary text');
  return value.trim();
}
function list<T>(value: unknown, parse: (value: unknown) => T): T[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('Unexpected AI summary list');
  return value.map(parse);
}
function point(value: unknown): SummaryPoint {
  const entry = record(value);
  return {
    text: text(entry.text),
    people: count(entry.people),
    commentIds: [...new Set(list(entry.commentIds, text))],
  };
}

// Core's generated GET response is currently void. Validate its payload here until
// the backend publishes a response DTO; keep generated files untouched.
export function readPostSummary(value: unknown): PostSummary {
  const payload = record(value);
  const status = payload.status ?? 'ready';
  if (
    typeof status !== 'string' ||
    !['no_comments', 'insufficient_data', 'ready', 'failed'].includes(status)
  ) {
    throw new Error('Unexpected AI summary status');
  }
  const content = payload.content == null ? {} : record(payload.content);
  const counts = content.counts == null ? {} : record(content.counts);
  const safety = payload.safety == null ? {} : record(payload.safety);
  const generatedAt = payload.generatedAt ?? payload.updatedAt;
  if (generatedAt != null && (typeof generatedAt !== 'string' || !Number.isFinite(Date.parse(generatedAt)))) {
    throw new Error('Unexpected AI summary date');
  }
  return {
    status: status as PostSummaryStatus,
    summary: status === 'ready' ? text(payload.summary) : null,
    keyTakeaways: list(payload.keyTakeaways, text),
    commentCount:
      count(payload.commentCountAtSummary) ?? count(payload.commentCount) ?? count(counts.comments) ?? 0,
    people: count(counts.people),
    needed: count(content.needed),
    generatedAt: generatedAt == null ? null : String(generatedAt),
    pros: list(content.pros, point),
    cons: list(content.cons, point),
    realityGaps: list(content.realityGaps, (value) => {
      const gap = record(value);
      return { ...point({ ...gap, text: gap.reality }), claim: text(gap.claim) };
    }),
    topics: list(content.topics, (value) => {
      const topic = record(value);
      return { ...point({ ...topic, text: topic.summary }), label: text(topic.label) };
    }),
    hasSafetyWarnings: list(safety.warnings, record).length > 0,
  };
}

export async function getPostSummary(postId: string, signal?: AbortSignal): Promise<PostSummary | null> {
  try {
    const response = await postSummaryControllerGetSummary(encodeURIComponent(postId), { signal });
    // Core giữ metadata cho worker, nhưng tạm ngừng trả văn bản có nguồn đã bị ẩn/xoá.
    if (
      response.data &&
      response.data.status === 'ready' &&
      response.data.summary === null &&
      response.data.isStale === true
    )
      return null;
    return readPostSummary(response.data);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export function usePostSummary(postId: string) {
  return useQuery({
    queryKey: ['social', 'summary', postId],
    queryFn: ({ signal }) => getPostSummary(postId, signal),
    // Summary reads are explicit; opening comments, focus and invalidation do not fetch.
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });
}

export type SummaryFilter = 'all' | 'pros' | 'cons';
export function useSummaryExperience(postId: string) {
  const query = usePostSummary(postId);
  const client = useQueryClient();
  const { isReady } = useApiSession();
  const [isOpen, setOpen] = useState(query.data !== undefined);
  const cancel = () => {
    void client.cancelQueries({ queryKey: ['social', 'summary', postId], exact: true });
    setOpen(query.data !== undefined);
  };
  const open = () => {
    if (!isReady) return;
    setOpen(true);
    if (query.data === undefined && !query.isFetching) void query.refetch();
  };
  return {
    query,
    isReady,
    isOpen,
    isLoading: isOpen && (query.isFetching || query.fetchStatus === 'paused'),
    open,
    cancel,
    close: () => {
      cancel();
      setOpen(false);
    },
    refresh: () => {
      void query.refetch();
    },
  };
}

export async function listSummaryEvidence(postId: string, cursor?: string, signal?: AbortSignal) {
  const response = await commentsControllerListComments(
    encodeURIComponent(postId),
    { flat: true, limit: 200, cursor },
    { signal },
  );
  return readPage(response.data);
}

export function useSummaryEvidence(postId: string, commentIds: readonly string[]) {
  const { isReady } = useApiSession();
  const query = useInfiniteQuery({
    queryKey: ['social', 'summary-evidence', postId],
    queryFn: ({ pageParam, signal }) => listSummaryEvidence(postId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: isReady && !!postId && commentIds.length > 0,
    staleTime: 0,
    retry: false,
  });
  const available = new Map(
    query.data?.pages
      .flatMap((page) => page.items)
      .filter((comment) => !comment.deletedAt)
      .map((comment) => [comment.id, comment]),
  );
  const comments = commentIds.flatMap((id) => {
    const comment = available.get(id);
    return comment ? [comment] : [];
  });
  return { ...query, comments, missingCount: commentIds.length - comments.length };
}
