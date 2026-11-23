import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { vi as viText } from '@tripflix/i18n';

import { ItinerarySidebarPanel } from './itinerary-sidebar-panel';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) =>
    createElement('img', {
      src: String(props.src ?? ''),
      alt: String(props.alt ?? ''),
    }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) =>
    createElement('a', { href, className }, children),
}));

vi.mock('../live-posts', () => ({
  SocialIcon: ({ name }: { name: string }) =>
    createElement('span', { 'data-icon': name }),
}));

vi.mock('./social-feed.module.css', () => ({
  default: new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    },
  ),
}));

describe('ItinerarySidebarPanel trạng thái chưa có lịch trình', () => {
  it('khi chưa có trip và không có onBrowseTripPosts: hiện tiêu đề, mô tả i18n và không hiện nút duyệt lịch trình', () => {
    const html = renderToStaticMarkup(
      createElement(ItinerarySidebarPanel, {
        isOpen: true,
        trip: null,
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain(viText.api.itineraryNoTripTitle);
    expect(html).toContain(viText.api.itineraryNoTripDesc);
    expect(html).not.toContain(viText.api.itineraryBrowseTripPosts);
    expect(html).not.toContain(viText.api.itinerarySuggestedHeading);
  });

  it('khi có onBrowseTripPosts: hiện nút Xem các bài có lịch trình', () => {
    const html = renderToStaticMarkup(
      createElement(ItinerarySidebarPanel, {
        isOpen: true,
        trip: null,
        onClose: vi.fn(),
        onBrowseTripPosts: vi.fn(),
      }),
    );

    expect(html).toContain(viText.api.itineraryBrowseTripPosts);
    expect(html).toContain('itineraryNoTripBrowseBtn');
  });

  it('khi có suggestedTripPost: hiện ô Lịch trình liên quan và tiêu đề gợi ý', () => {
    const html = renderToStaticMarkup(
      createElement(ItinerarySidebarPanel, {
        isOpen: true,
        trip: null,
        onClose: vi.fn(),
        suggestedTripPost: {
          title: 'Đà Lạt 3N2Đ cuối tuần',
          trip: {
            destinationName: 'Đà Lạt',
            daysCount: 3,
            items: [],
          },
        },
        onSelectSuggestedTrip: vi.fn(),
      }),
    );

    expect(html).toContain(viText.api.itinerarySuggestedHeading);
    expect(html).toContain('Đà Lạt 3N2Đ cuối tuần');
    expect(html).toContain(viText.api.itinerarySuggestedAction);
  });

  it('khi có trip: giữ nguyên giao diện có lịch trình và không hiện khối trống', () => {
    const html = renderToStaticMarkup(
      createElement(ItinerarySidebarPanel, {
        isOpen: true,
        postId: 'post-1',
        postTitle: 'Hà Giang mùa hoa',
        trip: {
          destinationName: 'Hà Giang',
          daysCount: 4,
          estimatedCostPerPerson: 3500000,
          items: [],
        },
        onClose: vi.fn(),
        onBrowseTripPosts: vi.fn(),
      }),
    );

    expect(html).toContain('Hà Giang mùa hoa');
    expect(html).toContain(viText.api.immersiveViewTripDetail);
    expect(html).toContain(viText.api.immersiveTabSchedule);
    expect(html).toContain(viText.api.immersiveTabCost);
    expect(html).not.toContain(viText.api.itineraryNoTripTitle);
    expect(html).not.toContain(viText.api.itineraryBrowseTripPosts);
  });

  it('CSS trạng thái trống dùng token thiết kế và canh dọc gọn phía trên', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(resolve(here, 'social-feed.module.css'), 'utf8');

    expect(css).toContain('.itineraryNoTripBrowseBtn');
    expect(css).toContain('justify-content: flex-start;');
    expect(css).toContain('width: 38px;');
    expect(css).toContain('var(--color-navy)');
    expect(css).toContain('var(--color-text-muted)');
    expect(css).toContain('var(--color-border)');
  });
});
