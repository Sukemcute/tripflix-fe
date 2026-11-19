import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ModerationAuthor } from './moderation-author';
vi.stubGlobal('React', React);

describe('moderation author details', () => {
  it('shows comment author name, full registered email and complete account ID', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const html = renderToStaticMarkup(
      <ModerationAuthor
        authorId={id}
        targetType="comment"
        author={{ displayName: 'Nguyễn Bình', email: 'nguyen.binh@example.com' }}
      />,
    );
    for (const value of [
      'Người bình luận',
      'Tên hiển thị',
      'Email đăng ký',
      'Nguyễn Bình',
      'nguyen.binh@example.com',
      id,
    ])
      expect(html).toContain(value);
  });
  it('keeps the ID and an honest fallback when the account is missing', () => {
    const html = renderToStaticMarkup(
      <ModerationAuthor authorId="missing-id" targetType="post" author={null} />,
    );
    expect(html).toContain('Người đăng bài');
    expect(html).toContain('Không tìm thấy thông tin tài khoản');
    expect(html).toContain('Không có thông tin');
    expect(html).toContain('missing-id');
  });
});
