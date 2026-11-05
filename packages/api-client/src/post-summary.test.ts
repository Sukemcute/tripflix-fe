import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureHttp, HttpError } from './http';
import { getPostSummary, readPostSummary, listSummaryEvidence } from './post-summary';

const ready = {
  status: 'ready',
  summary: 'Khách thích vị trí gần biển, nhưng hồ bơi đông vào cuối tuần.',
  commentCountAtSummary: 18,
  generatedAt: '2026-11-05T08:00:00Z',
  content: {
    counts: { comments: 18, people: 7, sent: 12 },
    pros: [
      { aspect: 'vi_tri_di_lai', text: 'Đi bộ ra biển thuận tiện.', commentIds: ['c1', 'c2'], people: 2 },
    ],
    cons: [{ aspect: 'dong_duc', text: 'Hồ bơi đông vào cuối tuần.', commentIds: ['c3', 'c4'], people: 2 }],
    realityGaps: [
      {
        claim: 'Hồ bơi vắng người',
        reality: 'Đông hơn vào chiều cuối tuần.',
        commentIds: ['c3', 'c4'],
        people: 2,
      },
    ],
    topics: [{ label: 'Ăn sáng', summary: 'Nên đến trước 8 giờ.', commentIds: ['c5', 'c6'], people: 2 }],
  },
  safety: { warnings: [{ categories: ['food'], commentIds: ['c7'] }] },
};
afterEach(() => vi.restoreAllMocks());

describe('AI summary response boundary', () => {
  it('reads the real worker camelCase output without exposing internal data', () => {
    const summary = readPostSummary(ready);
    expect(summary).toMatchObject({ status: 'ready', commentCount: 18, people: 7, hasSafetyWarnings: true });
    expect(summary.pros).toEqual([
      { text: 'Đi bộ ra biển thuận tiện.', people: 2, commentIds: ['c1', 'c2'] },
    ]);
    expect(summary.realityGaps[0]).toEqual({
      claim: 'Hồ bơi vắng người',
      text: 'Đông hơn vào chiều cuối tuần.',
      people: 2,
      commentIds: ['c3', 'c4'],
    });
    expect(summary.topics[0]?.label).toBe('Ăn sáng');
    expect(summary).not.toHaveProperty('inputHash');
  });
  it.each(['no_comments', 'insufficient_data', 'failed'])('accepts %s without a summary string', (status) => {
    expect(
      readPostSummary({ status, content: { counts: { comments: 2, people: 1 }, needed: 2 } }),
    ).toMatchObject({ status, summary: null, needed: 2 });
  });
  it('keeps legacy summaries usable without fabricating the number of people', () => {
    expect(
      readPostSummary({ summary: 'Một bản tóm tắt.', keyTakeaways: ['Gần biển'], commentCount: 5 }),
    ).toMatchObject({ status: 'ready', people: null, keyTakeaways: ['Gần biển'], pros: [] });
  });
  it('reads the Core GET count field even when structured content is absent', () => {
    expect(readPostSummary({ summary: 'Một bản tóm tắt.', commentCountAtSummary: 8 }).commentCount).toBe(8);
  });
  it('deduplicates citations and keeps legacy points without evidence usable', () => {
    expect(
      readPostSummary({ ...ready, content: { pros: [{ text: 'Gần biển', commentIds: ['c1', 'c1'] }] } })
        .pros[0]?.commentIds,
    ).toEqual(['c1']);
    expect(
      readPostSummary({ ...ready, content: { pros: [{ text: 'Gần biển' }] } }).pros[0]?.commentIds,
    ).toEqual([]);
  });
  it.each([
    null,
    { status: 'unknown' },
    { status: ['ready'], summary: 'Nội dung' },
    { status: 'ready', summary: ' ' },
    { ...ready, commentCountAtSummary: -1 },
    { ...ready, generatedAt: 'invalid-date' },
    { ...ready, content: { pros: [{ text: 'Gần biển', people: 'many' }] } },
    { ...ready, content: { topics: 'invalid' } },
    { ...ready, content: { pros: [{ text: 'Gần biển', commentIds: [null] }] } },
  ])('rejects malformed response %#', (payload) => {
    expect(() => readPostSummary(payload)).toThrow();
  });
});

describe('AI summary transport', () => {
  it('loads flat evidence including replies and preserves the opaque cursor and cancellation', async () => {
    configureHttp({ baseUrl: 'http://api' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], nextCursor: 'next+/=', hasMore: true }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    const signal = new AbortController().signal;
    expect((await listSummaryEvidence('post/1', 'opaque+/=', signal)).nextCursor).toBe('next+/=');
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/api/v1/posts/post%2F1/comments');
    expect(url.searchParams.get('flat')).toBe('true');
    expect(url.searchParams.get('limit')).toBe('200');
    expect(url.searchParams.get('cursor')).toBe('opaque+/=');
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(signal);
  });
  it('uses the generated read endpoint, passes cancellation and encodes the post ID', async () => {
    configureHttp({ baseUrl: 'http://api' });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(ready), { headers: { 'content-type': 'application/json' } }),
      );
    const signal = new AbortController().signal;
    expect((await getPostSummary('post/1', signal))?.status).toBe('ready');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api/api/v1/posts/post%2F1/ai-summary');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', signal });
  });
  it('treats 404 as not generated yet and preserves service failures for retry', async () => {
    configureHttp({ baseUrl: '' });
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }));
    expect(await getPostSummary('post-1')).toBeNull();
    await expect(getPostSummary('post-1')).rejects.toBeInstanceOf(HttpError);
  });
});
