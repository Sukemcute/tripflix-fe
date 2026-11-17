import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ModeratedComment } from './moderated-comment';

describe('ModeratedComment', () => {
  it('hiện lý do vi phạm và link tìm hiểu, không có nút tương tác', () => {
    const html = renderToStaticMarkup(<ModeratedComment />);
    expect(html).toContain('Bình luận này vi phạm Tiêu chuẩn cộng đồng');
    expect(html).toContain('Tìm hiểu thêm');
    expect(html).toContain('href="/account/moderation"');
    expect(html).not.toContain('<button');
  });
});
