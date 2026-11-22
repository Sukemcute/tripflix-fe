import type { QueryClient } from '@tanstack/react-query';

/** Khoảng gộp các lần bấm tim/lưu liên tiếp cho cùng một Reel (ms). */
export const REEL_REACTION_DEBOUNCE_MS = 400;

export type ReelReactionKind = 'like' | 'save';

export interface ReactionToggleInput {
  postId: string;
  type: ReelReactionKind;
  nextSelected: boolean;
  /** Trạng thái server hiện có tại thời điểm bắt đầu chuỗi bấm. */
  serverSelected: boolean;
  /** Hàm khôi phục cache về trước chuỗi bấm nếu request cuối lỗi. */
  rollbackCache?: () => void;
}

export interface QueuedReactionCommit {
  postId: string;
  type: ReelReactionKind;
  nextSelected: boolean;
  rollbackCache?: () => void;
}

export interface ReactionBatcherOptions {
  debounceMs?: number;
  onCommit: (commit: QueuedReactionCommit) => void;
  onSkip?: (skipped: { postId: string; type: ReelReactionKind }) => void;
}

interface PendingDebounce {
  baselineServer: boolean;
  targetSelected: boolean;
  rollbackCache?: () => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ReactionEntry {
  postId: string;
  type: ReelReactionKind;
  confirmedServerSelected: boolean;
  pending: PendingDebounce | null;
  inFlightCount: number;
  lastCommittedTarget?: boolean;
}

/**
 * Chỉ làm mới chi tiết bài viết vừa tương tác và đánh dấu stale feed (không refetch).
 * Không invalidate toàn bộ `['social']` để tránh tải lại bình luận, reply hay tóm tắt AI.
 */
export async function invalidateAfterReelEngagement(
  client: QueryClient,
  postId: string,
): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: ['social', 'post', postId] }),
    client.invalidateQueries({ queryKey: ['feed'], refetchType: 'none' }),
  ]);
}

/** Xoá lỗi video cũ khi người xem chuyển sang Reel khác. */
export function resolveMediaErrorOnPostChange(
  mediaErrorPostId: string | null,
  activePostId: string | undefined,
): string | null {
  if (!mediaErrorPostId) return null;
  return mediaErrorPostId !== activePostId ? null : mediaErrorPostId;
}

/**
 * Bộ gộp các lần bấm tim/lưu theo `(type, postId)` trong cửa sổ debounce:
 * - Optimistic đổi ngay ở UI;
 * - Hết thời gian gộp chỉ gửi 1 request với trạng thái cuối (bỏ qua nếu trùng trạng thái server);
 * - Theo dõi `inFlightCount` và `pending` để không xoá optimistic hay rollback đè lên lần bấm sau.
 */
export function createReactionBatcher({
  debounceMs = REEL_REACTION_DEBOUNCE_MS,
  onCommit,
  onSkip,
}: ReactionBatcherOptions) {
  const entries = new Map<string, ReactionEntry>();
  const keyOf = (postId: string, type: ReelReactionKind) => `${type}:${postId}`;

  const flushKey = (key: string) => {
    const entry = entries.get(key);
    if (!entry?.pending) return;

    const { baselineServer, targetSelected, rollbackCache } = entry.pending;
    entry.pending = null;

    if (targetSelected === baselineServer) {
      if (entry.inFlightCount === 0) {
        entries.delete(key);
        onSkip?.({ postId: entry.postId, type: entry.type });
      }
      return;
    }

    entry.inFlightCount += 1;
    entry.lastCommittedTarget = targetSelected;
    onCommit({
      postId: entry.postId,
      type: entry.type,
      nextSelected: targetSelected,
      rollbackCache,
    });
  };

  const hasPending = (postId: string, type: ReelReactionKind): boolean => {
    const entry = entries.get(keyOf(postId, type));
    return Boolean(entry && (entry.pending !== null || entry.inFlightCount > 0));
  };

  const hasPendingForPost = (postId: string): boolean =>
    hasPending(postId, 'like') || hasPending(postId, 'save');

  return {
    schedule(input: ReactionToggleInput): void {
      const key = keyOf(input.postId, input.type);
      const existing = entries.get(key);
      if (existing?.pending) {
        clearTimeout(existing.pending.timer);
        existing.pending.targetSelected = input.nextSelected;
        existing.pending.timer = setTimeout(() => flushKey(key), debounceMs);
        return;
      }

      const entry: ReactionEntry = existing ?? {
        postId: input.postId,
        type: input.type,
        confirmedServerSelected: input.serverSelected,
        pending: null,
        inFlightCount: 0,
      };
      const baselineServer =
        entry.inFlightCount > 0 && entry.lastCommittedTarget !== undefined
          ? entry.lastCommittedTarget
          : entry.confirmedServerSelected;

      entry.pending = {
        baselineServer,
        targetSelected: input.nextSelected,
        rollbackCache: input.rollbackCache,
        timer: setTimeout(() => flushKey(key), debounceMs),
      };
      entries.set(key, entry);
    },

    /** Gửi nốt các lần bấm đang chờ debounce khi rời trang / unmount để không mất thao tác người dùng. */
    flushAll(): void {
      for (const [key, entry] of Array.from(entries.entries())) {
        if (!entry.pending) continue;
        clearTimeout(entry.pending.timer);
        flushKey(key);
      }
    },

    /** Chỉ cho phép rollback nếu không có lần bấm hoặc request nào khác xếp sau request đang lỗi. */
    shouldRollbackOnError(postId: string, type: ReelReactionKind): boolean {
      const entry = entries.get(keyOf(postId, type));
      if (!entry) return true;
      return entry.pending === null && entry.inFlightCount <= 1;
    },

    /** Cập nhật bộ đếm khi request kết thúc; trả về cờ quyết định có được xoá optimistic / invalidate chưa. */
    markSettled(
      postId: string,
      type: ReelReactionKind,
      succeeded = true,
      committedSelected?: boolean,
    ): { shouldClearOptimistic: boolean; shouldInvalidatePost: boolean } {
      const key = keyOf(postId, type);
      const entry = entries.get(key);
      if (entry) {
        if (succeeded && committedSelected !== undefined) {
          entry.confirmedServerSelected = committedSelected;
        }
        entry.inFlightCount = Math.max(0, entry.inFlightCount - 1);
        // Nếu request trước lỗi và còn lần bấm kế đang chờ debounce, cập nhật baseline về trạng thái server thật cuối cùng
        if (!succeeded && entry.inFlightCount === 0 && entry.pending) {
          entry.pending.baselineServer = entry.confirmedServerSelected;
        }
        if (entry.pending === null && entry.inFlightCount === 0) {
          entries.delete(key);
        }
      }
      return {
        shouldClearOptimistic: !hasPending(postId, type),
        shouldInvalidatePost: !hasPendingForPost(postId),
      };
    },

    hasPending,
    hasPendingForPost,
  };
}
