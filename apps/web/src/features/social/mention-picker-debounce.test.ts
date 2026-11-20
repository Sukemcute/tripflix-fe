import { afterEach, beforeEach, describe, expect, it, vi as vitestVi } from 'vitest';
import { configureHttp, normalizeUserSearchQuery, searchUsers } from '@tripflix/api-client';
import { scheduleDebouncedCommit } from '../shared/use-debounced-value';
import { MENTION_SEARCH_DEBOUNCE_MS, resolveMentionSearchInput } from './mention-picker';

beforeEach(() => {
  configureHttp({ baseUrl: 'https://gateway.example' });
});

afterEach(() => {
  vitestVi.useRealTimers();
  vitestVi.restoreAllMocks();
});

function runTypingSession(keystrokes: readonly string[], intervalMs: number) {
  let debounced = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSearched: string | null = null;
  const fetchSpy = vitestVi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(JSON.stringify({ items: [], page: 1, hasMore: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );

  const dispatchIfReady = (live: string) => {
    const { effectiveQuery } = resolveMentionSearchInput(live, debounced);
    const { query, isSearchable } = normalizeUserSearchQuery(effectiveQuery);
    if (isSearchable && query !== lastSearched) {
      lastSearched = query;
      void searchUsers(query, 1);
    }
  };

  for (const keystroke of keystrokes) {
    vitestVi.advanceTimersByTime(intervalMs);
    timer = scheduleDebouncedCommit(timer, keystroke, MENTION_SEARCH_DEBOUNCE_MS, (committed) => {
      debounced = committed;
      dispatchIfReady(keystroke);
    });
    dispatchIfReady(keystroke);
  }

  return { fetchSpy };
}

describe('MentionPicker debounce giảm gọi searchUsers', () => {
  it('dùng độ trễ 1000ms cho MENTION_SEARCH_DEBOUNCE_MS', () => {
    expect(MENTION_SEARCH_DEBOUNCE_MS).toBe(1000);
  });

  it('gõ 5 phím nhanh liên tiếp chỉ gọi searchUsers 1 lần sau 1000ms', async () => {
    vitestVi.useFakeTimers();
    const { fetchSpy } = runTypingSession(['ng', 'ngu', 'nguy', 'nguye', 'nguyen'], 50);

    expect(fetchSpy).not.toHaveBeenCalled();

    await vitestVi.advanceTimersByTimeAsync(999);
    expect(fetchSpy).not.toHaveBeenCalled();

    await vitestVi.advanceTimersByTimeAsync(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(String(fetchSpy.mock.calls[0]![0]));
    expect(calledUrl.searchParams.get('q')).toBe('nguyen');
  });

  it('gõ nhanh "@nguyen van a" chỉ gọi searchUsers 1 lần với query cuối thay vì mỗi phím 1 request', async () => {
    vitestVi.useFakeTimers();
    const full = 'nguyen van a';
    const keystrokes = Array.from({ length: full.length }, (_, index) => full.slice(0, index + 1));

    const { fetchSpy } = runTypingSession(keystrokes, 60);
    expect(fetchSpy).not.toHaveBeenCalled();

    await vitestVi.advanceTimersByTimeAsync(MENTION_SEARCH_DEBOUNCE_MS);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(String(fetchSpy.mock.calls[0]![0]));
    expect(calledUrl.searchParams.get('q')).toBe('nguyen van a');
  });

  it('xoá xuống dưới 2 ký tự trả isSearchable=false ngay lập tức không chờ debounce', () => {
    const { liveNormalized, effectiveQuery, isDebouncing } = resolveMentionSearchInput('a', 'nguyen');
    expect(liveNormalized.isSearchable).toBe(false);
    expect(effectiveQuery).toBe('');
    expect(isDebouncing).toBe(false);
  });
});
