import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantError, parseSseEvents, sendAssistantMessage } from './assistant';
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

describe('parseSseEvents', () => {
  it('reads event names and JSON data, CRLF included', () => {
    expect(parseSseEvents('event: text\r\ndata: {"delta":"a"}\r\n\r\n: ping\n\n')).toEqual([
      { event: 'text', data: { delta: 'a' } },
    ]);
  });
});

describe('sendAssistantMessage', () => {
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
    const refusal = { code: 'GUEST_LIMIT_REACHED', message: 'x', retryAfterSeconds: 3600, loginRequired: true };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(refusal), { status: 429 }));
    const error = await sendAssistantMessage({ conversationId: 'x', message: 'hi' }, { baseUrl: '/ai' }).catch(
      (caught: unknown) => caught,
    );
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
