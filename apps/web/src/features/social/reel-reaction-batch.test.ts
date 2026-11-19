import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createReactionBatcher,
  invalidateAfterReelEngagement,
  REEL_REACTION_DEBOUNCE_MS,
  resolveMediaErrorOnPostChange,
} from './reel-reaction-batch';

describe('reel-reaction-batch (TF25 5a/5b/5c)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('gộp 5 lần bấm tim trong 400 ms thành đúng 1 request với trạng thái cuối', () => {
    const onCommit = vi.fn();
    const onSkip = vi.fn();
    const batcher = createReactionBatcher({ onCommit, onSkip });

    // Server đang false; bấm lẻ 5 lần: true -> false -> true -> false -> true
    const states = [true, false, true, false, true];
    for (const nextSelected of states) {
      batcher.schedule({
        postId: 'p1',
        type: 'like',
        nextSelected,
        serverSelected: false,
      });
      vi.advanceTimersByTime(60);
    }

    expect(onCommit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REEL_REACTION_DEBOUNCE_MS);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({
      postId: 'p1',
      type: 'like',
      nextSelected: true,
      rollbackCache: undefined,
    });
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('bấm số chẵn lần quay về trạng thái server thì không gửi request và dọn optimistic', () => {
    const onCommit = vi.fn();
    const onSkip = vi.fn();
    const batcher = createReactionBatcher({ onCommit, onSkip });

    batcher.schedule({ postId: 'p1', type: 'save', nextSelected: true, serverSelected: false });
    vi.advanceTimersByTime(100);
    batcher.schedule({ postId: 'p1', type: 'save', nextSelected: false, serverSelected: false });

    vi.advanceTimersByTime(REEL_REACTION_DEBOUNCE_MS);

    expect(onCommit).not.toHaveBeenCalled();
    expect(onSkip).toHaveBeenCalledWith({ postId: 'p1', type: 'save' });
    expect(batcher.hasPending('p1', 'save')).toBe(false);
  });

  it('chỉ xoá optimistic và invalidate khi không còn lần bấm hoặc request nào của bài đó đang chờ', () => {
    const onCommit = vi.fn();
    const batcher = createReactionBatcher({ onCommit });

    // Lần bấm 1 gửi lên server
    batcher.schedule({ postId: 'p1', type: 'like', nextSelected: true, serverSelected: false });
    vi.advanceTimersByTime(REEL_REACTION_DEBOUNCE_MS);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(batcher.hasPending('p1', 'like')).toBe(true);

    // Trong lúc request 1 đang chạy, người dùng bấm tiếp lần 2 (bỏ tim)
    batcher.schedule({ postId: 'p1', type: 'like', nextSelected: false, serverSelected: false });

    // Request 1 xong nhưng vẫn còn lần bấm 2 đang chờ debounce -> KHÔNG được xoá optimistic
    const afterFirst = batcher.markSettled('p1', 'like', true, true);
    expect(afterFirst).toEqual({
      shouldClearOptimistic: false,
      shouldInvalidatePost: false,
    });

    // Hết 400ms, request 2 (nextSelected = false) được gửi và hoàn tất -> mới cho xoá optimistic & invalidate
    vi.advanceTimersByTime(REEL_REACTION_DEBOUNCE_MS);
    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(onCommit).toHaveBeenLastCalledWith({
      postId: 'p1',
      type: 'like',
      nextSelected: false,
      rollbackCache: undefined,
    });

    const afterSecond = batcher.markSettled('p1', 'like', true, false);
    expect(afterSecond).toEqual({
      shouldClearOptimistic: true,
      shouldInvalidatePost: true,
    });
    expect(batcher.hasPendingForPost('p1')).toBe(false);
  });

  it('rollback khi lỗi không ghi đè các lần bấm sau và tự gửi lại khi request trước lỗi', () => {
    const onCommit = vi.fn();
    const batcher = createReactionBatcher({ onCommit });

    // Request 1 gửi (true)
    batcher.schedule({ postId: 'p1', type: 'like', nextSelected: true, serverSelected: false });
    vi.advanceTimersByTime(REEL_REACTION_DEBOUNCE_MS);

    // Trong lúc request 1 đang chạy, người dùng bấm false -> true (muốn giữ true)
    batcher.schedule({ postId: 'p1', type: 'like', nextSelected: false, serverSelected: false });
    batcher.schedule({ postId: 'p1', type: 'like', nextSelected: true, serverSelected: false });

    // Request 1 lỗi -> KHÔNG được rollback đè lên lần bấm sau
    expect(batcher.shouldRollbackOnError('p1', 'like')).toBe(false);
    const settledFailed = batcher.markSettled('p1', 'like', false, true);
    expect(settledFailed.shouldClearOptimistic).toBe(false);

    // Vì request 1 lỗi nên server thật vẫn là false; hết debounce vẫn phải gửi lại request 2 với true
    vi.advanceTimersByTime(REEL_REACTION_DEBOUNCE_MS);
    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(onCommit).toHaveBeenLastCalledWith({
      postId: 'p1',
      type: 'like',
      nextSelected: true,
      rollbackCache: undefined,
    });

    // Request 2 là request cuối cùng: nếu lỗi thì được phép rollback
    expect(batcher.shouldRollbackOnError('p1', 'like')).toBe(true);
  });

  it('flushAll gửi nốt thao tác đang chờ khi unmount / rời trang', () => {
    const onCommit = vi.fn();
    const batcher = createReactionBatcher({ onCommit });

    batcher.schedule({ postId: 'p1', type: 'like', nextSelected: true, serverSelected: false });
    batcher.schedule({ postId: 'p2', type: 'save', nextSelected: true, serverSelected: false });
    expect(onCommit).not.toHaveBeenCalled();

    batcher.flushAll();
    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(onCommit).toHaveBeenNthCalledWith(1, {
      postId: 'p1',
      type: 'like',
      nextSelected: true,
      rollbackCache: undefined,
    });
    expect(onCommit).toHaveBeenNthCalledWith(2, {
      postId: 'p2',
      type: 'save',
      nextSelected: true,
      rollbackCache: undefined,
    });
  });

  it('invalidateAfterReelEngagement chỉ làm mới bài viết đó và feed(refetchType: none), không invalidate bình luận hay tóm tắt AI', async () => {
    const client = new QueryClient();
    client.setQueryData(['social', 'post', 'p1', 'u1'], { id: 'p1' });
    client.setQueryData(['social', 'post', 'p2', 'u1'], { id: 'p2' });
    client.setQueryData(['social', 'comments', 'p1', undefined, 'u1'], { pages: [] });
    client.setQueryData(['social', 'summary', 'p1'], { summary: 'ok' });
    client.setQueryData(['social', 'comment-permissions', 'p1'], { enabled: true });
    client.setQueryData(['feed', 'trending', 'u1'], { pages: [] });

    const spy = vi.spyOn(client, 'invalidateQueries');
    await invalidateAfterReelEngagement(client, 'p1');

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['social', 'post', 'p1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['feed'], refetchType: 'none' });
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ['social'] });

    expect(client.getQueryState(['social', 'post', 'p1', 'u1'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['feed', 'trending', 'u1'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['social', 'post', 'p2', 'u1'])?.isInvalidated).toBe(false);
    expect(client.getQueryState(['social', 'comments', 'p1', undefined, 'u1'])?.isInvalidated).toBe(false);
    expect(client.getQueryState(['social', 'summary', 'p1'])?.isInvalidated).toBe(false);
    expect(client.getQueryState(['social', 'comment-permissions', 'p1'])?.isInvalidated).toBe(false);
  });

  it('5c: reset mediaErrorPostId khi đổi bài và màn lỗi có nút Thử lại gắn lại nguồn (retryNonce)', () => {
    expect(resolveMediaErrorOnPostChange('p1', 'p2')).toBeNull();
    expect(resolveMediaErrorOnPostChange('p1', 'p1')).toBe('p1');
    expect(resolveMediaErrorOnPostChange(null, 'p2')).toBeNull();

    const livePostsPath = resolve(dirname(fileURLToPath(import.meta.url)), 'live-posts.tsx');
    const source = readFileSync(livePostsPath, 'utf8');
    expect(source).toContain('onRetryMedia(post.id)');
    expect(source).toContain('{vi.api.retry}');
    expect(source).toContain('retryNonce');
    expect(source).toContain('resolveMediaErrorOnPostChange(mediaErrorPostId, activePost?.id)');
  });
});
