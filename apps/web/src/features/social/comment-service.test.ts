import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { socialApi } from '@tripflix/api-client';
import type { SocialCommentDto, SocialCommentPageDto } from '@tripflix/api-client/core-api/model/index';
import { addCommentToCache, replaceCommentInCache } from './comment-cache';
import { createCommentWithMentions, editCommentWithMentions } from './comment-service';
import { updateMentionsOnTextChange, validateMentions } from './mention-input';

vi.mock('@tripflix/api-client', () => ({
  socialApi: {
    addComment: vi.fn(),
    editComment: vi.fn(),
    getPost: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

function makeCommentDto(overrides: Partial<SocialCommentDto> = {}): SocialCommentDto {
  return {
    id: 'c1',
    postId: 'p1',
    authorId: 'u-author',
    parentCommentId: null,
    replyToCommentId: null,
    replyToExcerpt: null,
    body: 'Chào @Nguyễn An',
    mentions: [{ userId: '018d9f00-0000-7000-8000-000000000002', offset: 5, length: 10 }],
    isEdited: false,
    likeCount: 0,
    isLiked: false,
    moderationState: null,
    status: 'visible',
    createdAt: '2026-11-19T02:00:00.000Z',
    updatedAt: '2026-11-19T02:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('comment-service (TF25)', () => {
  it('createCommentWithMentions gửi mentions (kèm chuẩn hoá trim + UTF-16) và giữ bản chuẩn từ BE', async () => {
    const canonical = makeCommentDto({
      id: 'c-new',
      body: '😀 Chào @Nguyễn An',
      mentions: [{ userId: '018d9f00-0000-7000-8000-000000000002', offset: 8, length: 10 }],
    });
    vi.mocked(socialApi.addComment).mockResolvedValue(canonical);

    const res = await createCommentWithMentions({
      postId: 'p1',
      body: '  😀 Chào @Nguyễn An  ',
      parentCommentId: 'parent-1',
      mentions: [{ userId: '018d9f00-0000-7000-8000-000000000002', offset: 10, length: 10 }],
    });

    expect(socialApi.addComment).toHaveBeenCalledWith('p1', '😀 Chào @Nguyễn An', 'parent-1', [
      { userId: '018d9f00-0000-7000-8000-000000000002', offset: 8, length: 10 },
    ]);
    expect(res).toBeDefined();
    if (!res) throw new Error('expected comment');
    expect(res.body).toBe('😀 Chào @Nguyễn An');
    expect(res.mentions).toEqual([
      { userId: '018d9f00-0000-7000-8000-000000000002', offset: 8, length: 10 },
    ]);

    const client = new QueryClient();
    client.setQueryData(['social', 'comments', 'p1'], {
      pages: [{ items: [], nextCursor: null, total: 0 } satisfies SocialCommentPageDto],
      pageParams: [undefined],
    });
    addCommentToCache(client, res);
    const cached = client.getQueryData<{ pages: SocialCommentPageDto[] }>(['social', 'comments', 'p1']);
    expect(cached?.pages[0]?.items[0]?.body).toBe('😀 Chào @Nguyễn An');
    expect(cached?.pages[0]?.items[0]?.mentions).toEqual(canonical.mentions);
  });

  it('luồng sửa giữ tag: nạp comment.mentions, sửa chữ trước tag -> gửi offset mới và cập nhật bản chuẩn BE', async () => {
    const initial = makeCommentDto();
    // Mở khung sửa: nạp từ comment.mentions
    const loadedMentions = validateMentions(initial.body, initial.mentions);
    // Bước 1: thêm chữ phía trước tag ("Mời " -> +4 UTF-16)
    const bodyAfterPrefix = 'Mời Chào @Nguyễn An';
    const mentionsAfterPrefix = updateMentionsOnTextChange(initial.body, bodyAfterPrefix, loadedMentions, 4);
    expect(mentionsAfterPrefix).toEqual([
      { userId: '018d9f00-0000-7000-8000-000000000002', offset: 9, length: 10 },
    ]);
    // Bước 2: thêm chữ phía sau tag (" nhé")
    const editedBody = 'Mời Chào @Nguyễn An nhé';
    const nextMentions = updateMentionsOnTextChange(
      bodyAfterPrefix,
      editedBody,
      mentionsAfterPrefix,
      editedBody.length,
    );
    expect(nextMentions).toEqual([
      { userId: '018d9f00-0000-7000-8000-000000000002', offset: 9, length: 10 },
    ]);

    const serverResponse = makeCommentDto({
      body: editedBody,
      mentions: nextMentions,
      isEdited: true,
    });
    vi.mocked(socialApi.editComment).mockResolvedValue(serverResponse);

    const updated = await editCommentWithMentions({
      commentId: initial.id,
      body: editedBody,
      mentions: nextMentions,
    });

    expect(socialApi.editComment).toHaveBeenCalledWith('c1', 'Mời Chào @Nguyễn An nhé', [
      { userId: '018d9f00-0000-7000-8000-000000000002', offset: 9, length: 10 },
    ]);

    const client = new QueryClient();
    client.setQueryData(['social', 'comments', 'p1'], {
      pages: [{ items: [initial], nextCursor: null, total: 1 } satisfies SocialCommentPageDto],
      pageParams: [undefined],
    });
    replaceCommentInCache(client, updated);
    const cached = client.getQueryData<{ pages: SocialCommentPageDto[] }>(['social', 'comments', 'p1']);
    expect(cached?.pages[0]?.items[0]?.body).toBe('Mời Chào @Nguyễn An nhé');
    expect(cached?.pages[0]?.items[0]?.mentions).toEqual(nextMentions);
  });

  it('luồng sửa bỏ tag: luôn gửi mentions: [] thay vì bỏ qua để BE xoá tag cũ', async () => {
    const initial = makeCommentDto();
    const loadedMentions = validateMentions(initial.body, initial.mentions);
    const editedBody = 'Chào mọi người';
    const nextMentions = updateMentionsOnTextChange(initial.body, editedBody, loadedMentions);
    expect(nextMentions).toEqual([]);

    const serverResponse = makeCommentDto({
      body: 'Chào mọi người',
      mentions: [],
      isEdited: true,
    });
    vi.mocked(socialApi.editComment).mockResolvedValue(serverResponse);

    const updated = await editCommentWithMentions({
      commentId: initial.id,
      body: editedBody,
      mentions: nextMentions,
    });

    expect(socialApi.editComment).toHaveBeenCalledWith('c1', 'Chào mọi người', []);
    expect(updated.mentions).toEqual([]);

    const client = new QueryClient();
    client.setQueryData(['social', 'comments', 'p1'], {
      pages: [{ items: [initial], nextCursor: null, total: 1 } satisfies SocialCommentPageDto],
      pageParams: [undefined],
    });
    replaceCommentInCache(client, updated);
    const cached = client.getQueryData<{ pages: SocialCommentPageDto[] }>(['social', 'comments', 'p1']);
    expect(cached?.pages[0]?.items[0]?.mentions).toEqual([]);
  });

  it('luôn gửi [] khi editCommentWithMentions được gọi không có mentions', async () => {
    const serverResponse = makeCommentDto({ body: 'Bình luận sửa', mentions: [], isEdited: true });
    vi.mocked(socialApi.editComment).mockResolvedValue(serverResponse);

    await editCommentWithMentions({ commentId: 'c1', body: 'Bình luận sửa' });
    expect(socialApi.editComment).toHaveBeenCalledWith('c1', 'Bình luận sửa', []);
  });
});
