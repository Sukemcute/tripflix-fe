import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { usePostCommentsRealtime } from './post-comments-realtime';

let client: QueryClient;
let cleanup: (() => void) | void;
const stop = vi.fn();
const watch = vi.fn((_postId: string, _reload: () => void) => stop);
vi.mock('react', () => ({ useEffect: (effect: () => (() => void) | void) => { cleanup = effect(); } }));
vi.mock('@tanstack/react-query', async (original) => ({
  ...await original<typeof import('@tanstack/react-query')>(), useQueryClient: () => client,
}));
vi.mock('./session', () => ({ useApiSession: () => ({ user: { id: 'viewer' } }) }));
vi.mock('./notifications-realtime', () => ({ watchPostComments: (id: string, reload: () => void) => watch(id, reload) }));

beforeEach(() => { client = new QueryClient(); vi.clearAllMocks(); cleanup = undefined; });

describe('usePostCommentsRealtime', () => {
  it('tín hiệu làm stale danh sách gốc, trả lời và số đếm; giữ cache và bài khác', () => {
    const keys = [
      ['social', 'comments', 'p1'], ['social', 'comments', 'p1', 'root'],
      ['social', 'post', 'p1'], ['social', 'public', 'viewer'], ['feed', 'for_you', 'viewer'],
    ];
    keys.forEach((key) => client.setQueryData(key, { cached: true }));
    client.setQueryData(['social', 'comments', 'p2'], { cached: true });
    usePostCommentsRealtime('p1');
    expect(watch).toHaveBeenCalledWith('p1', expect.any(Function));

    watch.mock.calls[0]![1]();

    for (const key of keys) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
      expect(client.getQueryData(key)).toEqual({ cached: true });
    }
    expect(client.getQueryState(['social', 'comments', 'p2'])?.isInvalidated).toBe(false);
    cleanup?.();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('danh sách trả lời không mở thêm watcher cho cùng bài', () => {
    usePostCommentsRealtime('p1', false);
    expect(watch).not.toHaveBeenCalled();
  });
});
