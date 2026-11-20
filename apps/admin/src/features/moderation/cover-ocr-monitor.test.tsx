import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CoverOcrMonitor } from './cover-ocr-monitor';

vi.mock('@tripflix/api-client', () => ({
  moderationApi: {},
  useApiSession: () => ({ user: { id: 'staff' } }),
}));
vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => ({
    data: { pages: [{
      counts: { all: 2, flagged: 1, failed: 0, inProgress: 1, passed: 0 },
      items: [{
        id: 'scan-1', postId: 'post-1', postTitle: 'Video thử nghiệm', authorId: 'author-1',
        assetId: 'asset-1', status: 'flagged', attempts: 1, extractedText: 'Chữ cần xem lại',
        errorCode: null, updatedAt: '2026-11-20T00:00:00.000Z',
      }], nextCursor: null,
    }] },
    isPending: false, error: null, hasNextPage: false, refetch: () => {},
  }),
  useMutation: () => ({ isSuccess: false, error: null, isPending: false, mutate: () => {} }),
  useQueryClient: () => ({ invalidateQueries: () => {} }),
}));
vi.mock('./moderation-parts', () => ({ ModerationParts: () => null }));

it('hiển thị tổng quan OCR, bài gắn cờ và chữ đã đọc', () => {
  const html = renderToStaticMarkup(<CoverOcrMonitor />);
  expect(html).toContain('OCR ảnh bìa video');
  expect(html).toMatch(/Đang xử lý<span[^>]*>1<\/span>/);
  expect(html).toContain('Video thử nghiệm');
  expect(html).toContain('Chữ cần xem lại');
  expect(html).toContain('Cần xem xét');
});
