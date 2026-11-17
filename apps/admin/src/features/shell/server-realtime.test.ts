import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { handlers, socket, io } = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  return { handlers, socket, io: vi.fn(() => socket) };
});
vi.mock('socket.io-client', () => ({ io }));
import { createAdminEventStream } from './server-realtime';

describe('admin BFF event bridge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    handlers.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('keeps tokens and incoming payloads out of SSE and cleans up after abort', async () => {
    const abort = new AbortController();
    const response = createAdminEventStream({
      url: 'http://gateway.test',
      signal: abort.signal,
      getSession: () => ({
        access: 'server-secret',
        accessExpiresAt: Date.now() + 60_000,
        expires: Date.now() + 60_000,
      }),
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    expect(decoder.decode((await reader.read()).value)).toContain('retry: 5000');
    handlers.get('moderation.ready')?.();
    expect(decoder.decode((await reader.read()).value)).toBe('event: ready\ndata: {}\n\n');
    handlers.get('moderation.changed')?.({ access: 'upstream-private-content' });
    expect(decoder.decode((await reader.read()).value)).toBe('event: moderation.changed\ndata: {}\n\n');
    abort.abort();
    expect(socket.disconnect).toHaveBeenCalledOnce();
    expect((await reader.read()).done).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('closes promptly when the session is revoked', async () => {
    let active = true;
    const response = createAdminEventStream({
      url: 'http://gateway.test',
      signal: new AbortController().signal,
      getSession: () =>
        active
          ? { access: 'secret', accessExpiresAt: Date.now() + 60_000, expires: Date.now() + 60_000 }
          : undefined,
    });
    const reader = response.body!.getReader();
    await reader.read();
    active = false;
    handlers.get('moderation.changed')?.();
    expect((await reader.read()).done).toBe(true);
    expect(socket.disconnect).toHaveBeenCalledOnce();
  });

  it('does not connect an expired session and cleans up cancellation', async () => {
    const response = createAdminEventStream({
      url: 'http://gateway.test',
      signal: new AbortController().signal,
      getSession: () => undefined,
    });
    expect(socket.connect).not.toHaveBeenCalled();
    await response.body!.cancel();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up an active stream when its reader cancels', async () => {
    const response = createAdminEventStream({
      url: 'http://gateway.test',
      signal: new AbortController().signal,
      getSession: () => ({
        access: 'secret',
        accessExpiresAt: Date.now() + 60_000,
        expires: Date.now() + 60_000,
      }),
    });
    await expect(response.body!.cancel()).resolves.toBeUndefined();
    expect(socket.disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
