// Render menu contents with native presentation stubs; device interaction is checked separately.
import { createElement, type ReactNode } from '../apps/mobile/node_modules/react';
import { renderToStaticMarkup } from '../apps/web/node_modules/react-dom/server';
import {
  QueryClient,
  QueryClientProvider,
} from '../apps/mobile/node_modules/@tanstack/react-query/build/modern/index.js';
import { PostOptionsMenu } from '../apps/mobile/src/features/feed/post-options-menu';

const state = vi.hoisted(() => ({ user: { id: 'viewer' } as { id: string } | null }));
vi.mock('../apps/mobile/node_modules/@tripflix/api-client', () => ({
  useApiSession: () => ({ user: state.user }),
  socialApi: {},
  evictPostFromCache: vi.fn(),
}));
vi.mock('../apps/mobile/node_modules/expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('../apps/mobile/node_modules/react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  Pressable: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) =>
    createElement('button', { disabled }, children),
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
vi.mock('../apps/mobile/src/components/mobile-ui', () => ({
  Txt: ({ children }: { children: ReactNode }) => createElement('span', null, children),
  Icon: () => null,
  IconButton: ({ label }: { label: string }) => createElement('button', null, label),
  Button: ({ children }: { children: ReactNode }) => createElement('button', null, children),
}));
vi.mock('../apps/mobile/src/components/api-state', () => ({ ApiErrorNotice: () => null }));
vi.mock('../apps/mobile/src/components/bottom-sheet', () => ({
  BottomSheet: ({ children }: { children: ReactNode }) => createElement('section', null, children),
}));
vi.mock('../apps/mobile/src/features/feed/report-button', () => ({
  ReportButton: ({ trigger }: { trigger: (open: () => void) => ReactNode }) => trigger(vi.fn()),
}));
vi.mock('../apps/mobile/src/features/feed/creator-comment-controls', () => ({
  CreatorCommentControls: () => null,
}));

function render(authorId: string, saved = false) {
  const client = new QueryClient();
  client.setQueryData(['social', 'post', 'post', state.user?.id], {
    post: { title: 'Bài viết', visibility: 'public' },
    viewerContext: { isBookmarked: saved },
  });
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PostOptionsMenu, { postId: 'post', authorId }),
    ),
  );
}
describe('Mobile post options', () => {
  it('bài của mình chỉ có lưu, sửa, quyền xem và xóa; không có báo cáo hay mục chưa hỗ trợ', () => {
    state.user = { id: 'viewer' };
    const html = render('viewer');
    for (const label of [
      'Lưu bài viết',
      'Quản lý bình luận',
      'Chỉnh sửa bài viết',
      'Chỉnh sửa quyền xem',
      'Xóa bài viết',
    ])
      expect(html).toContain(label);
    for (const label of ['Báo cáo bài viết', 'Ghim bài viết', 'kho lưu trữ', 'quảng cáo', 'Quan tâm'])
      expect(html).not.toContain(label);
  });
  it('người khác, kể cả khách, không có thao tác tác giả; trạng thái đã lưu được phản ánh', () => {
    state.user = { id: 'viewer' };
    const saved = render('other', true);
    expect(saved).toContain('Bỏ lưu bài viết');
    expect(saved).toContain('Báo cáo bài viết');
    for (const label of ['Chỉnh sửa bài viết', 'Chỉnh sửa quyền xem', 'Xóa bài viết'])
      expect(saved).not.toContain(label);
    state.user = null;
    const guest = render('other');
    expect(guest).toContain('Báo cáo bài viết');
    expect(guest).not.toContain('Chỉnh sửa bài viết');
  });
});
