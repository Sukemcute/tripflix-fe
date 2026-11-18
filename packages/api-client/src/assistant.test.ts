import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantError, parseSseEvents, readAssistantCards, sendAssistantMessage } from './assistant';
import { configureHttp } from './http';

const stream = [
  'event: status\ndata: {"step":"understanding"}\n\n',
  'event: text\ndata: {"delta":"Gợi ý cho bạn"}\n\n',
  'event: cards\ndata: {"items":[{"ref":"r1","id":"P-1","kind":"stay","title":"Khách sạn A"}]}\n\n',
  'event: suggestions\ndata: {"items":["Cần mang gì?"]}\n\n',
  'event: trip\ndata: {"v":1,"place":"Đà Nẵng","adults":2}\n\n',
  'event: done\ndata: {"kind":"answer","usage":{},"degraded":["llm"]}\n\n',
].join('');

afterEach(() => vi.restoreAllMocks());

async function cardsAnswer(actions: unknown) {
  configureHttp({ baseUrl: '' });
  const card = {
    ref: 'r1',
    id: 'booking',
    kind: 'booking',
    title: 'Chốt chuyến Đà Nẵng',
    lines: [{ label: 'Khách sạn A' }],
    actions,
  };
  const body =
    `event: text\ndata: {"delta":"Chốt chuyến nè"}\n\n` +
    `event: cards\ndata: ${JSON.stringify({ items: [card] })}\n\n`;
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body));
  return sendAssistantMessage({ conversationId: 'x', message: 'chốt và đặt' }, { baseUrl: '/ai' });
}

describe('parseSseEvents', () => {
  it('reads event names and JSON data, CRLF included', () => {
    expect(parseSseEvents('event: text\r\ndata: {"delta":"a"}\r\n\r\n: ping\n\n')).toEqual([
      { event: 'text', data: { delta: 'a' } },
    ]);
  });
});

describe('readAssistantCards', () => {
  it('filters restored cards and actions the same way as server cards', async () => {
    const actions = [
      { type: 'select', label: 'Chọn', ref: 'o1' },
      { type: 'book', label: 'Đặt', path: '/trip-builder', params: { hotelId: 'h1' } },
      { type: 'book', label: 'Lạ', path: 'https://evil.test', params: {} },
      { type: 'book', label: 'Lạ', path: '/checkout', params: {} },
    ];
    const server = await cardsAnswer(actions);
    const restored = readAssistantCards([
      null,
      false,
      [],
      {
        ref: 'r1',
        id: 'booking',
        kind: 'booking',
        title: 'Chốt chuyến Đà Nẵng',
        lines: [{ label: 'Khách sạn A' }],
        actions,
      },
    ]);
    expect(restored).toEqual(server.cards);
    expect(restored[0]?.actions).toEqual(actions.slice(0, 2));
  });
  it.each([null, undefined, {}, 'invalid'])('ignores non-array stored cards: %j', (value) => {
    expect(readAssistantCards(value)).toEqual([]);
  });
});

describe('sendAssistantMessage', () => {
  it('keeps booking lines and valid server actions for selecting and booking', async () => {
    const actions = [
      { type: 'select', label: 'Chọn chuyến này', ref: 'r2' },
      { type: 'select', label: 'Chọn', ref: 'o1' },
      {
        type: 'book',
        label: 'Đặt theo lộ trình',
        path: '/trip-builder',
        params: {
          destination: 'Đà Nẵng',
          adults: '2',
          startDate: '2026-11-21',
          days: '3',
          hotelId: 'h1',
          hotelName: 'Khách sạn A',
          checkIn: '2026-11-21',
          nights: '2',
          flightFrom: 'SGN',
          flightTo: 'DAD',
          flightDate: '2026-11-21',
        },
      },
    ];
    const answer = await cardsAnswer(actions);
    expect(answer.cards[0]).toMatchObject({
      kind: 'booking',
      title: 'Chốt chuyến Đà Nẵng',
      lines: [{ label: 'Khách sạn A' }],
      actions,
    });
  });

  it.each([
    null,
    'Đặt vé',
    [],
    {},
    { type: 'unknown', label: 'Đặt' },
    { type: 'select', label: 'Chọn' },
    { type: 'select', label: 'Chọn', ref: '' },
    { type: 'select', label: 'Chọn', ref: '   ' },
    { type: 'select', label: 'Chọn', ref: 'too-long' },
    { type: 'select', label: 'Chọn', ref: 1 },
    { type: 'select', label: 'Chọn', ref: 'r1', path: '/trip-builder' },
    { type: 'book', label: 'Đặt', path: '/hotel-rooms', params: {} },
    { type: 'book', label: 'Đặt', path: '/flights', params: {} },
    { type: 'book', label: 'Đặt', path: '/checkout', params: {} },
    { type: 'book', label: 'Đặt', path: 'https://evil.test', params: {} },
    { type: 'book', label: 'Đặt', path: '//evil.test', params: {} },
    { type: 'book', label: 'Đặt', path: '/flights/../checkout', params: {} },
    { type: 'book', label: 'Đặt', params: {} },
    { type: 'book', label: 'Đặt', path: '/trip-builder' },
    { type: 'book', label: 'Đặt', path: '/trip-builder', params: [] },
    { type: 'book', label: 'Đặt', path: '/trip-builder', params: { passengers: 2 } },
    { type: 'book', label: 'Đặt', path: '/trip-builder', params: {}, ref: 'r1' },
    { type: 'book', label: '', path: '/trip-builder', params: {} },
    { type: 'book', label: '  ', path: '/trip-builder', params: {} },
    { type: 'book', label: 'x'.repeat(41), path: '/trip-builder', params: {} },
    { type: 'book', label: 2, path: '/trip-builder', params: {} },
  ])('drops malformed action %# without dropping the card or valid actions', async (malformed) => {
    const valid = { type: 'book', label: 'Đặt vé', path: '/trip-builder', params: { from: 'SGN' } };
    const answer = await cardsAnswer([malformed, valid]);
    expect(answer.cards).toHaveLength(1);
    expect(answer.cards[0]?.actions).toEqual([valid]);
  });

  it.each([null, 'invalid', {}])('ignores a non-array actions value %#', async (actions) => {
    const answer = await cardsAnswer(actions);
    expect(answer.cards[0]?.actions).toEqual([]);
  });

  it('posts to the AI base URL with the token and collects text and cards', async () => {
    configureHttp({ baseUrl: 'http://gateway', getAccessToken: () => 'token' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream, { status: 200 }));
    const answer = await sendAssistantMessage(
      { conversationId: '00000000-0000-4000-8000-000000000000', message: 'Đà Nẵng' },
      { baseUrl: '/ai' },
    );
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/ai/chat');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer token');
    expect(answer).toEqual({
      kind: 'answer',
      text: 'Gợi ý cho bạn',
      cards: [{ ref: 'r1', id: 'P-1', kind: 'stay', title: 'Khách sạn A' }],
      suggestions: ['Cần mang gì?'],
      trip: { v: 1, place: 'Đà Nẵng', adults: 2 },
      degraded: ['llm'],
    });
  });

  it('turns a refused turn into an AssistantError with its code', async () => {
    configureHttp({ baseUrl: '' });
    const refusal = {
      code: 'GUEST_LIMIT_REACHED',
      message: 'x',
      retryAfterSeconds: 3600,
      loginRequired: true,
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(refusal), { status: 429 }));
    const error = await sendAssistantMessage(
      { conversationId: 'x', message: 'hi' },
      { baseUrl: '/ai' },
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AssistantError);
    expect(error).toMatchObject({
      status: 429,
      code: 'GUEST_LIMIT_REACHED',
      retryAfterSeconds: 3600,
      isLoginRequired: true,
    });
  });

  it('throws when the stream reports an error', async () => {
    configureHttp({ baseUrl: '' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('event: error\ndata: {"code":"DEPENDENCY_UNAVAILABLE"}\n\n', { status: 200 }),
    );
    await expect(
      sendAssistantMessage({ conversationId: 'x', message: 'hi' }, { baseUrl: '/ai' }),
    ).rejects.toThrow('HTTP 503');
  });
});
