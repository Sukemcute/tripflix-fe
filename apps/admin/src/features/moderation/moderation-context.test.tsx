import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { ModerationContext } from './moderation-context';
import type { ModerationPostContextDto } from '@tripflix/api-client/core-api/model/index';
vi.stubGlobal('React', React);
const post: ModerationPostContextDto = {
  id: 'post-id',
  authorId: 'post-owner',
  author: { id: 'post-owner', displayName: 'Chủ bài A', email: 'owner@example.com' },
  title: 'Bài đăng gốc A',
  excerpt: 'Nội dung nguồn',
  status: 'published',
  visibility: 'public',
  unavailable: false,
  createdAt: '2026-11-19T00:00:00Z',
};
describe('moderation comment context', () => {
  it('identifies the source post and its owner, and links to the exact flagged comment', () => {
    const html = renderToStaticMarkup(
      <ModerationContext
        postId={post.id}
        commentId="flagged-comment"
        post={post}
        parent={{
          id: 'parent-id',
          authorId: 'parent-author',
          author: { id: 'parent-author', displayName: 'Tác giả B', email: 'parent@example.com' },
          body: 'Nội dung được trả lời',
          kind: 'reply',
          status: 'visible',
          unavailable: false,
          createdAt: post.createdAt,
        }}
      />,
    );
    for (const text of [
      'Bài đăng chứa bình luận',
      'Bài đăng gốc A',
      'Chủ bài A',
      'owner@example.com',
      'Nội dung nguồn',
      'Đang trả lời bình luận',
      'Nội dung được trả lời',
      'Tác giả B',
    ])
      expect(html).toContain(text);
    expect(html).toContain('/inspiration?open=post-id&amp;comment=flagged-comment');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it('does not offer a public link for hidden/private posts but keeps staff context', () => {
    for (const patch of [{ status: 'hidden' }, { visibility: 'private' }]) {
      const html = renderToStaticMarkup(
        <ModerationContext postId={post.id} commentId="c" post={{ ...post, ...patch }} />,
      );
      expect(html).toContain('Bài không công khai');
      expect(html).toContain('Bài đăng gốc A');
      expect(html).not.toContain('target="_blank"');
    }
  });
  it('keeps the source ID for missing posts and redacts deleted content', () => {
    const missing = renderToStaticMarkup(
      <ModerationContext postId="missing-post" commentId="c" post={null} />,
    );
    expect(missing).toContain('Không tìm thấy bài đăng gốc');
    expect(missing).toContain('missing-post');
    const deleted = renderToStaticMarkup(
      <ModerationContext
        postId={post.id}
        commentId="c"
        post={{ ...post, unavailable: true, status: 'deleted' }}
      />,
    );
    expect(deleted).toContain('Bài đăng đã bị xóa');
    expect(deleted).not.toContain('Nội dung nguồn');
    expect(deleted).not.toContain('target="_blank"');
  });
});
