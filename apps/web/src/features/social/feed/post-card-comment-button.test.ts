import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(resolve(here, file), 'utf8');

describe('Nút bình luận trên thẻ bài khi cột Bình luận cố định', () => {
  it('PostCard có prop hideCommentButton (mặc định false) và bỏ hẳn nút khi bật', () => {
    const postCard = read('post-card.tsx');
    expect(postCard).toContain('hideCommentButton?: boolean;');
    expect(postCard).toContain('hideCommentButton = false,');
    expect(postCard).toMatch(/\{!hideCommentButton && \(\s*<button[^>]*?\s*type="button"[\s\S]*?onToggleComment\(post\.id\)/);
  });

  it('tab Bài viết chỉ ẩn nút khi cột Bình luận đang ghim (≥1200px), nơi khác giữ nút', () => {
    const feedView = read('social-feed-view.tsx');
    expect(feedView).toContain('hideCommentButton={isRightPinned}');
    expect(feedView).toContain('const isRightPinned = isItineraryPinned;');
  });
});
