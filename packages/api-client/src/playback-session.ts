import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { mediaPlaybackControllerCreateSession } from './generated/core-api/media/media';
import { readEntity } from './response';

/** Xin cookie mới trước khi cookie cũ hết hạn 30 phút, để video đang mở không bị CloudFront trả 403. */
export const PLAYBACK_SESSION_REFRESH_MARGIN_MS = 30 * 60 * 1000;
/** Không xin lại dày hơn mức này, kể cả khi BE cấp cookie hạn rất ngắn. */
const MIN_REFRESH_DELAY_MS = 60 * 1000;

export interface PlaybackSession {
  cookies: Record<string, string>;
  /** ISO 8601; null khi BE chưa bật ký cookie. */
  expiresAt: string | null;
}

/** Ghép thành header Cookie cho player. Không có cookie (BE chưa bật ký) thì không gắn header. */
export function buildPlaybackCookieHeader(cookies: Record<string, string>): string | null {
  const pairs = Object.entries(cookies).map(([name, value]) => `${name}=${value}`);
  return pairs.length > 0 ? pairs.join('; ') : null;
}

/** Bao lâu nữa thì xin cookie mới; null khi cookie không có hạn (BE chưa bật ký), không cần xin lại. */
export function getPlaybackSessionRefreshDelayMs(expiresAt: string | null, nowMs: number): number | null {
  if (!expiresAt) return null;
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return MIN_REFRESH_DELAY_MS;
  return Math.max(MIN_REFRESH_DELAY_MS, expiresAtMs - PLAYBACK_SESSION_REFRESH_MARGIN_MS - nowMs);
}

export const playbackSessionApi = {
  async create(signal?: AbortSignal): Promise<PlaybackSession> {
    return readEntity((await mediaPlaybackControllerCreateSession({ signal })).data, ['cookies', 'expiresAt']);
  },
};

/**
 * Cookie CloudFront để mở video Reels (TF82). Gọi ngay khi vào màn Reels, song song với tải feed, nên không
 * làm chậm video đầu. Dùng chung một cookie cho mọi video tới gần hết hạn rồi tự xin lại.
 * `isSettled`: đã có kết quả (kể cả lỗi). Lỗi thì phát không kèm cookie, như khi BE chưa bật ký.
 */
export function usePlaybackSession({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useQuery({
    queryKey: ['media', 'playback-session'],
    enabled,
    queryFn: ({ signal }) => playbackSessionApi.create(signal),
    staleTime: ({ state }) => getPlaybackSessionRefreshDelayMs(state.data?.expiresAt ?? null, Date.now()) ?? Infinity,
    refetchInterval: ({ state }) => getPlaybackSessionRefreshDelayMs(state.data?.expiresAt ?? null, Date.now()) ?? false,
    // Chỉ thử lại một lần cho nhanh: video đầu chờ cookie, chờ lâu còn tệ hơn phát không cookie.
    retry: 1,
    retryDelay: 500,
  });
  const { refetch } = query;
  // Xin cookie mới ngay, khi player gặp lỗi có thể do cookie hết hạn (403).
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  return {
    cookieHeader: query.data ? buildPlaybackCookieHeader(query.data.cookies) : null,
    isSettled: !enabled || query.isSuccess || query.isError,
    refresh,
  };
}
