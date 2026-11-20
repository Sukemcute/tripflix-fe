import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { primePasswordKeyCache } from './password-encryption';
import { decideCacheAction, readSessionCacheState, type SessionCacheState } from './session-cache';
import { SessionClient, type SessionState } from './session-client';

vi.mock('./browser-session-proof', () => ({
  BROWSER_PROOF_HEADER: 'X-Tripflix-Session-Proof',
  signBrowserProof: async () => 'signed-proof',
}));

const guestLoading: SessionCacheState = { userId: null, isReady: false };
const guestReady: SessionCacheState = { userId: null, isReady: true };
const userA = (isReady: boolean): SessionCacheState => ({ userId: 'user-a', isReady });
const userB: SessionCacheState = { userId: 'user-b', isReady: true };

/** Chạy lần lượt các trạng thái phiên được publish, trả về các việc làm với cache (bỏ 'none'). */
function replay(states: SessionCacheState[]): string[] {
  const actions: string[] = [];
  for (let index = 1; index < states.length; index += 1) {
    const action = decideCacheAction(states[index - 1]!, states[index]!);
    if (action !== 'none') actions.push(action);
  }
  return actions;
}

describe('decideCacheAction', () => {
  it('khôi phục phiên lúc mở app: không xoá, không tải lại', () => {
    // restore(): reloadUser publish người dùng khi isReady còn false, rồi mới publish isReady.
    expect(decideCacheAction(guestLoading, userA(false))).toBe('none');
    expect(decideCacheAction(userA(false), userA(true))).toBe('none');
    expect(replay([guestLoading, userA(false), userA(true)])).toEqual([]);
  });

  it('mở app chưa có phiên: không làm gì', () => {
    expect(replay([guestLoading, guestReady])).toEqual([]);
  });

  it('khách đăng nhập: tải lại ngầm, giữ dữ liệu đang hiện', () => {
    expect(decideCacheAction(guestReady, userA(true))).toBe('invalidate');
  });

  it('đăng xuất hoặc mất phiên (401, refresh hỏng): xoá cache', () => {
    expect(decideCacheAction(userA(true), guestReady)).toBe('clear');
  });

  it('đổi tài khoản: xoá cache', () => {
    expect(decideCacheAction(userA(true), userB)).toBe('clear');
  });

  it('publish nhiều lần mà người dùng không đổi: không làm gì', () => {
    expect(replay([userA(true), userA(true), userA(true)])).toEqual([]);
    expect(replay([guestReady, guestReady])).toEqual([]);
  });

  it('StrictMode chạy effect hai lần: lần đăng ký thứ hai bắt đầu từ trạng thái hiện tại, không xoá thừa', () => {
    // Lần đăng ký 1 bị huỷ ngay; lần 2 lấy snapshot lúc đăng ký (vẫn đang khôi phục) rồi nhận cùng chuỗi publish.
    const firstMount = replay([guestLoading]);
    const secondMount = replay([guestLoading, userA(false), userA(true)]);
    expect([...firstMount, ...secondMount]).toEqual([]);
  });

  it('cả vòng: mở app có phiên → đăng xuất → đăng nhập lại → đổi tài khoản', () => {
    expect(replay([guestLoading, userA(false), userA(true), guestReady, userA(true), userB])).toEqual([
      'clear',
      'invalidate',
      'clear',
    ]);
  });
});

describe('readSessionCacheState', () => {
  it('chỉ lấy id người dùng và isReady', () => {
    const state = { user: { id: 'user-a' }, isReady: true, error: null } as unknown as SessionState;
    expect(readSessionCacheState(state)).toEqual({ userId: 'user-a', isReady: true });
    expect(readSessionCacheState({ user: null, isReady: false, error: null })).toEqual(guestLoading);
  });
});

describe('SessionClient thật + decideCacheAction (như ApiSessionProvider)', () => {
  const member = { id: 'member-1', email: 'member@example.test', displayName: 'Member', role: 'member' };
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  beforeEach(() => {
    primePasswordKeyCache({ keyId: 'test', publicKey: Buffer.from([9, ...new Uint8Array(31)]).toString('base64url') });
  });
  afterEach(() => vi.restoreAllMocks());

  /**
   * Đăng ký giống effect của ApiSessionProvider, ghi lại các việc làm với cache. legacyClears đếm số lần logic cũ
   * (clear() mỗi khi id người dùng đổi) sẽ xoá cache, để thấy lỗi được tái hiện.
   */
  function watch(session: SessionClient): { actions: string[]; legacyClears: () => number } {
    const actions: string[] = [];
    let legacyCount = 0;
    let previous = readSessionCacheState(session.getSnapshot());
    session.subscribe(() => {
      const next = readSessionCacheState(session.getSnapshot());
      if (next.userId !== previous.userId) legacyCount += 1;
      const action = decideCacheAction(previous, next);
      previous = next;
      if (action !== 'none') actions.push(action);
    });
    return { actions, legacyClears: () => legacyCount };
  }

  it('mở app đã có phiên: khôi phục không xoá cache; đăng xuất xoá; đăng nhập lại chỉ tải lại ngầm', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).endsWith('/auth/me') ? json(200, member) : new Response(null, { status: 204 }),
    );
    const session = new SessionClient({ baseUrl: '/bff', client: 'web', serverSession: true });
    const { actions, legacyClears } = watch(session);

    await session.initialize();
    expect(session.getSnapshot()).toMatchObject({ user: { id: 'member-1' }, isReady: true });
    // Logic cũ xoá cache ngay khi khôi phục xong (lỗi gọi đúp, chớp trắng); logic mới thì không.
    expect(legacyClears()).toBe(1);
    expect(actions).toEqual([]);

    await session.logout();
    expect(actions).toEqual(['clear']);

    await session.login({ email: member.email, password: 'example-password' });
    expect(actions).toEqual(['clear', 'invalidate']);
  });

  it('mở app chưa có phiên (refresh 401): không đụng cache', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(401, { message: 'Unauthorized' }));
    const session = new SessionClient({ baseUrl: 'https://api.test', client: 'web' });
    const { actions } = watch(session);

    await session.initialize();
    expect(session.getSnapshot()).toMatchObject({ user: null, isReady: true });
    expect(actions).toEqual([]);
  });
});
