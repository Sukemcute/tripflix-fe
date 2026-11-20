import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMENT_DRAFT_SAVE_DELAY_MS, createCommentDraftStore, isMentionNavigationKey, sameMentionQuery } from './comment-draft-store';

afterEach(() => vi.useRealTimers());

describe('comment draft store', () => {
  it('đọc một lần, gộp nhiều lần gõ và flush khi cần', () => {
    vi.useFakeTimers();
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() } as unknown as Storage;
    const store = createCommentDraftStore(() => storage);
    store.get('p1');
    store.save('p1', { body: 'a', replyTarget: null });
    store.save('p1', { body: 'ab', replyTarget: null });
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(COMMENT_DRAFT_SAVE_DELAY_MS - 1);
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(storage.setItem).mock.calls[0]![1])).toEqual({ p1: { body: 'ab', replyTarget: null } });
    store.save('p1', null);
    store.flush();
    expect(JSON.parse(vi.mocked(storage.setItem).mock.calls[1]![1])).toEqual({});
    vi.runAllTimers();
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });
  it('giữ nháp trong bộ nhớ nếu storage thất bại', () => {
    const store = createCommentDraftStore(() => { throw new Error('denied'); });
    store.save('p', { body: 'hello', replyTarget: null });
    store.flush();
    expect(store.get('p')?.body).toBe('hello');
  });
  it('lùi hạn debounce khi gõ liên tục, bỏ qua khi huỷ khoá chưa có nháp và tách biệt khoá sửa', () => {
    vi.useFakeTimers();
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() } as unknown as Storage;
    const store = createCommentDraftStore(() => storage);

    store.save('edit:p1:c1', null);
    store.flush();
    expect(storage.setItem).not.toHaveBeenCalled();

    store.save('p1', { body: 'a', replyTarget: null });
    vi.advanceTimersByTime(COMMENT_DRAFT_SAVE_DELAY_MS - 100);
    store.save('edit:p1:c1', { body: 'sửa', replyTarget: null });
    vi.advanceTimersByTime(100);
    expect(storage.setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(COMMENT_DRAFT_SAVE_DELAY_MS - 100);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(storage.setItem).mock.calls[0]![1])).toEqual({
      p1: { body: 'a', replyTarget: null },
      'edit:p1:c1': { body: 'sửa', replyTarget: null },
    });

    store.save('p1', { body: '   ', replyTarget: { id: 'c2', authorName: 'An' } });
    store.flush();
    expect(store.get('p1')?.replyTarget?.id).toBe('c2');
  });
});

describe('mention query', () => {
  it('chỉ coi cùng query và vị trí là không đổi', () => {
    expect(sameMentionQuery(null, null)).toBe(true);
    expect(sameMentionQuery({ query: 'an', atIndex: 1 }, { query: 'an', atIndex: 1 })).toBe(true);
    expect(sameMentionQuery({ query: 'an', atIndex: 1 }, { query: 'an', atIndex: 2 })).toBe(false);
    expect(sameMentionQuery({ query: 'an', atIndex: 1 }, { query: 'anh', atIndex: 1 })).toBe(false);
    expect(sameMentionQuery(null, { query: '', atIndex: 0 })).toBe(false);
    for (const key of ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape']) expect(isMentionNavigationKey(key)).toBe(true);
    expect(isMentionNavigationKey('a')).toBe(false);
  });
});
