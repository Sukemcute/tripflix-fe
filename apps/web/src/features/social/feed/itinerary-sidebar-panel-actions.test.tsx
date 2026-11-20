import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { vi as viText } from '@tripflix/i18n';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: <T,>(initial: T): [T, (next: T) => void] => [initial, vi.fn()],
  };
});

vi.mock('next/image', () => ({
  default: () => null,
}));

vi.mock('next/link', () => ({
  default: () => null,
}));

vi.mock('../live-posts', () => ({
  SocialIcon: () => null,
}));

vi.mock('./social-feed.module.css', () => ({
  default: new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    },
  ),
}));

import { ItinerarySidebarPanel } from './itinerary-sidebar-panel';

function findButtons(node: ReactNode, matches: ReactElement<Record<string, unknown>>[] = []) {
  if (Array.isArray(node)) {
    for (const child of node) findButtons(child, matches);
    return matches;
  }
  if (!isValidElement(node)) return matches;
  const props = node.props as Record<string, unknown>;
  if (node.type === 'button') {
    matches.push(node as ReactElement<Record<string, unknown>>);
  }
  if (props.children !== undefined) {
    findButtons(props.children as ReactNode, matches);
  }
  return matches;
}

describe('ItinerarySidebarPanel callbacks ở trạng thái trống', () => {
  it('bấm nút Xem các bài có lịch trình gọi onBrowseTripPosts và bấm thẻ liên quan gọi onSelectSuggestedTrip', () => {
    const onBrowseTripPosts = vi.fn();
    const onSelectSuggestedTrip = vi.fn();

    const tree = ItinerarySidebarPanel({
      isOpen: true,
      trip: null,
      onClose: vi.fn(),
      onBrowseTripPosts,
      suggestedTripPost: {
        title: 'Phú Quốc 4N3Đ',
        trip: { destinationName: 'Phú Quốc', daysCount: 4, items: [] },
      },
      onSelectSuggestedTrip,
    });

    const buttons = findButtons(tree);
    const browseBtn = buttons.find((btn) => btn.props.children === viText.api.itineraryBrowseTripPosts);
    expect(browseBtn).toBeDefined();
    (browseBtn!.props.onClick as () => void)();
    expect(onBrowseTripPosts).toHaveBeenCalledTimes(1);

    const suggestedBtn = buttons.find((btn) => btn.props.className === 'itinerarySuggestedCard');
    expect(suggestedBtn).toBeDefined();
    (suggestedBtn!.props.onClick as () => void)();
    expect(onSelectSuggestedTrip).toHaveBeenCalledTimes(1);
  });
});
