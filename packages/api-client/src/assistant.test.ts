import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSseEvents, sendAssistantMessage } from './assistant';
import { configureHttp } from './http';

const stream = [
  'event: status\ndata: {"step":"understanding"}\n\n',
  'event: text\ndata: {"delta":"Gợi ý cho bạn"}\n\n',
  'event: cards\ndata: {"items":[{"ref":"r1","id":"P-1","kind":"stay","title":"Khách sạn A"}]}\n\n',
  'event: done\ndata: {"kind":"answer","usage":{}}\n\n',
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
