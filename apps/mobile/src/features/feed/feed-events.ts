import { FeedEventQueue, ReelViewClock, sendFeedEvents, type NewFeedEvent } from '@tripflix/api-client';
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

/** Gửi lô sự kiện hành vi mỗi chừng này, dù chưa đủ 20 (docs/architecture/10-nghiep-vu-kien-truc-feed.md mục 3.3). */
const FLUSH_INTERVAL_MS = 10_000;
const ANON_ID_KEY = 'tripflix.anon-id';

let anonId: Promise<string | null> | null = null;

/** Mã khách (X-Anon-Id) cố định theo máy, sinh một lần. Web chưa lưu được thì không gửi. */
function getAnonId(): Promise<string | null> {
  if (Platform.OS === 'web') return Promise.resolve(null);
  anonId ??= SecureStore.getItemAsync(ANON_ID_KEY)
    .then(async (saved) => {
      if (saved) return saved;
      const created = randomUUID();
      await SecureStore.setItemAsync(ANON_ID_KEY, created);
      return created;
    })
    .catch(() => null);
  return anonId;
}

let queue: FeedEventQueue | null = null;

/** Một hàng đợi cho cả app; tạo lúc có sự kiện đầu tiên, từ đó gửi định kỳ và khi app vào nền. */
function getQueue(): FeedEventQueue {
  if (queue) return queue;
  const created = new FeedEventQueue(async (events) => sendFeedEvents(events, await getAnonId()), randomUUID);
  setInterval(() => void created.flush(), FLUSH_INTERVAL_MS);
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') void created.flush();
  });
  queue = created;
  return created;
}

export function trackFeedEvent(event: NewFeedEvent): void {
  getQueue().push(event);
}

/**
 * Đếm thời gian xem thật của reel đang mở (TF23). `isPlaying` chỉ đúng khi video đang phát cho người xem thấy:
 * màn đang mở, app ở nền trước, không tạm dừng. App vào nền thì chốt lượt xem và gửi luôn.
 */
export function useReelViewTracking(postId: string | null, isPlaying: boolean): void {
  const clock = useRef<ReelViewClock | null>(null);
  clock.current ??= new ReelViewClock((viewedPostId, watchedMs) =>
    trackFeedEvent({ type: 'view', postId: viewedPostId, watchedMs, surface: 'reels' }),
  );

  useEffect(() => {
    clock.current?.update(postId, isPlaying);
  }, [postId, isPlaying]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') clock.current?.finish();
    });
    return () => {
      subscription.remove();
      clock.current?.finish();
    };
  }, []);
}
