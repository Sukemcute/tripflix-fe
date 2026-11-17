// Chạy với Vitest của api-client và --globals; không thêm dependency cho Mobile.
import { createElement, type ReactNode } from '../apps/mobile/node_modules/react';
import { renderToStaticMarkup } from '../apps/web/node_modules/react-dom/server';
import { ModeratedComment } from '../apps/mobile/src/features/feed/moderated-comment';

vi.mock('../apps/mobile/node_modules/react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));
vi.mock('../apps/mobile/src/components/mobile-ui', () => ({
  Txt: ({ children }: { children: ReactNode }) => createElement('span', null, children),
  Button: ({ children, onPress, disabled }: { children: ReactNode; onPress: () => void; disabled?: boolean }) =>
    createElement('button', { onClick: onPress, disabled }, children),
}));

describe('Mobile ModeratedComment', () => {
  it('hiện câu vi phạm, link tìm hiểu và chỉ cho tác giả xóa; ẩn sửa/thích/trả lời', () => {
    const html = renderToStaticMarkup(createElement(ModeratedComment, { onLearnMore: vi.fn(), onDelete: vi.fn() }));
    expect(html).toContain('Bình luận này vi phạm Tiêu chuẩn cộng đồng');
    expect(html).toContain('Tìm hiểu thêm');
    expect(html).toContain('Xóa');
    expect(html).not.toContain('Sửa');
    expect(html).not.toContain('Trả lời');
    expect(html).not.toContain('Thích');
  });

  it('ẩn nút xóa nếu không có quyền và vô hiệu hóa khi đang xóa', () => {
    const html = renderToStaticMarkup(createElement(ModeratedComment, { onLearnMore: vi.fn() }));
    expect(html).not.toContain('Xóa');
    const pending = renderToStaticMarkup(createElement(ModeratedComment, {
      onLearnMore: vi.fn(), onDelete: vi.fn(), isDeleting: true,
    }));
    expect(pending).toContain('disabled');
  });
});
