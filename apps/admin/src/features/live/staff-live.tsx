'use client';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  moderationApi,
  useStaffRealtime,
  type StaffModerationSignal,
  type StaffRealtimeStatus,
} from '@tripflix/api-client';
import { createContext, useContext, useState, type ReactNode } from 'react';

/** Socket sống thì polling chỉ là lưới an toàn; mất socket thì quay về nhịp cũ 5 giây. */
export const LIVE_POLL_MS = 30_000;
export const FALLBACK_POLL_MS = 5_000;
const MAX_SAMPLES = 120;
const MAX_FEED = 20;
// Socket đi thẳng tới gateway (/ws), không qua BFF. Rỗng thì admin chỉ dùng polling.
const SOCKET_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? process.env.NEXT_PUBLIC_API_URL;

type ModerationStats = Awaited<ReturnType<typeof moderationApi.stats>>;

export interface QueueSample {
  at: number;
  pending: number;
  urgent: number;
}

export interface LiveFeedEntry extends StaffModerationSignal {
  id: string;
}

interface StaffLiveValue {
  status: StaffRealtimeStatus;
  pollMs: number;
  stats: UseQueryResult<ModerationStats>;
  samples: QueueSample[];
  feed: LiveFeedEntry[];
}

const StaffLiveContext = createContext<StaffLiveValue | null>(null);

/** Thêm mẫu khi số liệu server đổi thời điểm tính; giữ tối đa 120 mẫu gần nhất. */
export function appendSample(samples: QueueSample[], stats: ModerationStats): QueueSample[] {
  const at = new Date(stats.generatedAt).getTime();
  if (samples.at(-1)?.at === at) return samples;
  return [...samples, { at, pending: stats.pendingTotal, urgent: stats.pendingUrgent }].slice(-MAX_SAMPLES);
}

export function StaffLiveProvider({ children }: { children: ReactNode }) {
  const { status, lastSignal } = useStaffRealtime(SOCKET_URL);
  const pollMs = status === 'live' ? LIVE_POLL_MS : FALLBACK_POLL_MS;
  const stats = useQuery({
    queryKey: ['moderation', 'stats'],
    queryFn: ({ signal }) => moderationApi.stats(signal),
    refetchInterval: pollMs,
  });
  const [samples, setSamples] = useState<QueueSample[]>([]);
  const [feed, setFeed] = useState<LiveFeedEntry[]>([]);

  // Cập nhật ngay trong lúc render khi dữ liệu nguồn đổi (mẫu "điều chỉnh state khi prop đổi" của React).
  const [sampledStats, setSampledStats] = useState(stats.data);
  if (stats.data !== sampledStats) {
    setSampledStats(stats.data);
    if (stats.data) setSamples(appendSample(samples, stats.data));
  }
  const [recordedSignal, setRecordedSignal] = useState(lastSignal);
  if (lastSignal !== recordedSignal) {
    setRecordedSignal(lastSignal);
    if (lastSignal) setFeed([{ ...lastSignal, id: `${lastSignal.at}-${feed.length}` }, ...feed].slice(0, MAX_FEED));
  }

  return (
    <StaffLiveContext.Provider value={{ status, pollMs, stats, samples, feed }}>{children}</StaffLiveContext.Provider>
  );
}

export function useStaffLive(): StaffLiveValue {
  const value = useContext(StaffLiveContext);
  if (!value) throw new Error('useStaffLive phải nằm trong StaffLiveProvider');
  return value;
}
