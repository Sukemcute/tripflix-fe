import { createElement, type ReactNode } from '../apps/mobile/node_modules/react';
import { renderToStaticMarkup } from '../apps/web/node_modules/react-dom/server';
import {
  QueryClient,
  QueryClientProvider,
} from '../apps/mobile/node_modules/@tanstack/react-query/build/modern/index.js';
import { CreatorCommentControls } from '../apps/mobile/src/features/feed/creator-comment-controls';

vi.mock('../apps/mobile/node_modules/@tripflix/api-client', () => ({ commentControlsApi: {} }));
vi.mock('../apps/mobile/node_modules/react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  Switch: () => null,
}));
vi.mock('../apps/mobile/src/components/mobile-ui', () => ({
  Card: ({ children }: { children: ReactNode }) => createElement('section', null, children),
  Txt: ({ children }: { children: ReactNode }) => createElement('span', null, children),
  Button: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) =>
    createElement('button', { disabled }, children),
  Field: () => null,
}));
vi.mock('../apps/mobile/src/components/api-state', () => ({ ApiErrorNotice: () => null }));

function render(blocked: boolean) {
  const client = new QueryClient();
  client.setQueryData(['creator-comments', 'post', 'settings'], { enabled: true, keywords: ['lọc'] });
  client.setQueryData(['creator-comments', 'post', 'queue'], {
    pageParams: [undefined],
    pages: [
      {
        nextCursor: null,
        items: [
          {
            id: 'comment',
            postId: 'post',
            authorId: 'writer',
            authorName: 'Ngọc',
            body: 'Nội dung cần duyệt',
            createdAt: '2026-11-18T00:00:00Z',
            platformBlocked: true,
            willPublish: false,
            canApprove: !blocked,
            approvalBlockReason: blocked ? 'parent_unavailable' : null,
            parentContext: {
              id: 'target',
              kind: 'reply',
              authorName: 'Bình',
              body: 'Nội dung bí mật',
              unavailable: blocked,
            },
          },
        ],
      },
    ],
  });
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CreatorCommentControls, { postId: 'post', initialOpen: true }),
    ),
  );
}
describe('TF92 Mobile queue presentation', () => {
  it('cho biết người được trả lời và không hứa công khai khi nền tảng còn chặn', () => {
    const html = render(false);
    expect(html).toContain('Ngọc');
    expect(html).toContain('Đang trả lời');
    expect(html).toContain('Bình');
    expect(html).toContain('Chấp nhận qua bộ lọc');
    expect(html).not.toContain('>Cho hiển thị<');
  });
  it('không render nội dung context bị ẩn và khóa duyệt theo capability server', () => {
    const html = render(true);
    expect(html).not.toContain('Nội dung bí mật');
    expect(html).toContain('Bình luận liên quan đã bị ẩn, gỡ hoặc xóa.');
    expect(html).toContain('disabled="">Chấp nhận qua bộ lọc');
    expect(html).toContain('Bình luận gốc chưa hiển thị.');
  });
});
