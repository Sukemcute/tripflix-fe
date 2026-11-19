import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { InstagramLeftDock } from './instagram-left-dock';

// live-posts kéo theo cả cây import dùng alias `@/` mà Vitest của web chưa cấu hình; test chỉ cần icon giả.
vi.mock('../live-posts', () => ({ SocialIcon: () => null }));

const EXPECTED_DOCK_LABELS = ['Tìm kiếm', 'Bài viết', 'Reels', 'Tạo bài viết mới', 'Đang theo dõi', 'Đã lưu'];

function renderDock(activeView: 'posts' | 'reels') {
  return renderToStaticMarkup(
    <InstagramLeftDock
      activeView={activeView}
      onSelectView={() => {}}
      searchKeyword=""
      onSearchSubmit={() => {}}
      activeFilter="all"
      onSelectFilter={() => {}}
      isItineraryOpen={false}
      onToggleItinerary={() => {}}
      onOpenComposer={() => {}}
    />,
  );
}

describe('InstagramLeftDock', () => {
  it.each(['posts', 'reels'] as const)('nút tạo bài nằm thứ 4, giữa dock (tab %s)', (activeView) => {
    const labels = [...renderDock(activeView).matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map((match) => match[1]);
    expect(labels).toEqual(EXPECTED_DOCK_LABELS);
    expect(labels.indexOf('Tạo bài viết mới')).toBe(3);
  });
});
