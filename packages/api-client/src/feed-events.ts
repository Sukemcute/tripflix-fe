import { feedEventsControllerRecord } from './generated/core-api/feed/feed';
import type { FeedEventDto } from './generated/core-api/model/feedEventDto';
import { HttpError } from './http';

/** BE nhận tối đa 50 sự kiện mỗi lô (FEED_EVENTS_MAX). */
export const FEED_EVENTS_BATCH_MAX = 50;
/** Đủ chừng này sự kiện thì gửi luôn, không đợi hẹn giờ (docs/architecture/10-nghiep-vu-kien-truc-feed.md mục 3.3). */
export const FEED_EVENTS_FLUSH_AT = 20;
/** Mất mạng lâu thì chỉ giữ chừng này sự kiện mới nhất, bỏ bớt cái cũ. */
export const FEED_EVENTS_BUFFER_MAX = 200;
/** Lướt qua dưới 1 giây không tính là một lượt xem. */
export const MIN_REPORTED_VIEW_MS = 1_000;
/** Khớp MAX_WATCHED_MS của BE: quá mức này thì gửi đúng mức này. */
export const MAX_REPORTED_VIEW_MS = 10 * 60 * 1000;

export type FeedEvent = FeedEventDto;
export type NewFeedEvent = Omit<FeedEventDto, 'eventId'>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Gửi một lô lên POST /api/v1/feed/events. anonId là X-Anon-Id của khách. */
export async function sendFeedEvents(events: FeedEvent[], anonId?: string | null): Promise<void> {
  await feedEventsControllerRecord({ events }, anonId ? { headers: { 'X-Anon-Id': anonId } } : undefined);
}

/** 4xx (trừ 408, 429) là lô sai, gửi lại vẫn sai; lỗi mạng hay 5xx thì gửi lại sau. */
function isWorthRetrying(error: unknown): boolean {
  if (!(error instanceof HttpError)) return true;
  return error.status >= 500 || error.status === 408 || error.status === 429;
}

/**
 * Hàng đợi sự kiện hành vi (TF23): gom rồi gửi theo lô. Gửi lỗi vì mạng thì giữ lại cho lần sau,
 * bị BE từ chối (lô sai) thì bỏ để không gửi lại mãi. Chỉ giữ trong bộ nhớ, tắt app thì mất phần chưa gửi.
 */
export class FeedEventQueue {
  private buffer: FeedEvent[] = [];
  private sending: Promise<void> | null = null;

  constructor(
    private readonly send: (events: FeedEvent[]) => Promise<void>,
    private readonly newId: () => string,
  ) {}

  get size(): number {
    return this.buffer.length;
  }

  push(event: NewFeedEvent): void {
    // Id lạ (Reels mẫu) làm BE trả 400 cho cả lô.
    if (!UUID.test(event.postId)) return;
    this.buffer.push({ ...event, eventId: this.newId() });
    this.dropOldest();
    if (this.buffer.length >= FEED_EVENTS_FLUSH_AT) void this.flush();
  }

  /** Gửi một lô; đang gửi thì chờ lần đang gửi. Không bao giờ ném lỗi. */
  flush(): Promise<void> {
    if (this.sending) return this.sending;
    if (this.buffer.length === 0) return Promise.resolve();
    const batch = this.buffer.splice(0, FEED_EVENTS_BATCH_MAX);
    this.sending = this.send(batch)
      .catch((error: unknown) => {
        if (!isWorthRetrying(error)) return;
        this.buffer = [...batch, ...this.buffer];
        this.dropOldest();
      })
      .finally(() => {
        this.sending = null;
      });
    return this.sending;
  }

  private dropOldest(): void {
    if (this.buffer.length > FEED_EVENTS_BUFFER_MAX) this.buffer.splice(0, this.buffer.length - FEED_EVENTS_BUFFER_MAX);
  }
}

/**
 * Đếm thời gian xem thật của reel đang mở: chỉ cộng lúc đang phát. Rời bài (đổi bài, rời màn, app vào nền)
 * thì báo một lượt xem nếu đủ MIN_REPORTED_VIEW_MS.
 */
export class ReelViewClock {
  private postId: string | null = null;
  private watchedMs = 0;
  private playingSince: number | null = null;

  constructor(
    private readonly onView: (postId: string, watchedMs: number) => void,
    private readonly now: () => number = Date.now,
  ) {}

  /** Gọi mỗi khi bài đang mở hoặc trạng thái đang phát đổi. */
  update(postId: string | null, isPlaying: boolean): void {
    this.pause();
    if (postId !== this.postId) {
      this.finish();
      this.postId = postId;
    }
    if (isPlaying && postId) this.playingSince = this.now();
  }

  /** Chốt lượt xem hiện tại; vẫn giữ bài đang mở, xem tiếp thì tính là lượt mới. */
  finish(): void {
    this.pause();
    if (this.postId && this.watchedMs >= MIN_REPORTED_VIEW_MS) {
      this.onView(this.postId, Math.min(Math.round(this.watchedMs), MAX_REPORTED_VIEW_MS));
    }
    this.watchedMs = 0;
  }

  private pause(): void {
    if (this.playingSince === null) return;
    this.watchedMs += this.now() - this.playingSince;
    this.playingSince = null;
  }
}
