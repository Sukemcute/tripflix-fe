import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingSheet } from './booking-sheet';

const state = vi.hoisted(() => ({
  pathname: '/search',
  user: null as { id: string } | null,
  cartItems: [] as unknown[],
}));

vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('@tripflix/api-client', () => ({ useApiSession: () => ({ user: state.user, isReady: true }) }));
vi.mock('../checkout/cart-store', () => ({ useBookingCart: () => ({ items: state.cartItems }) }));
// Bảng chỉ render khi mở; giả lập trạng thái đang mở.
vi.mock('../shared/use-header-popover', () => ({
  useHeaderPopover: () => ({ isOpen: true, root: { current: null }, toggle: { current: null }, setOpen: () => {}, close: () => {} }),
}));

function readLinks(html: string) {
  return [...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/g)].map(([, attributes = '', inner = '']) => ({
    href: attributes.match(/href="([^"]+)"/)?.[1],
    label: attributes.match(/aria-label="([^"]+)"/)?.[1] ?? inner.replace(/<[^>]+>/g, ''),
    isCurrent: attributes.includes('aria-current="page"'),
  }));
}

describe('BookingSheet', () => {
  beforeEach(() => {
    state.pathname = '/search';
    state.user = null;
    state.cartItems = [];
  });

  it('offers hotels and flights to guests', () => {
    const html = renderToStaticMarkup(<BookingSheet isActive />);
    expect(html).toContain('aria-expanded="true"');
    expect(readLinks(html).map((link) => link.href)).toEqual(['/search', '/flights']);
  });

  it('adds the cart with its item count and booked trips when signed in', () => {
    state.user = { id: 'user-1' };
    state.cartItems = [{}, {}];
    const links = readLinks(renderToStaticMarkup(<BookingSheet isActive />));
    expect(links.map((link) => link.href)).toEqual(['/search', '/flights', '/cart', '/bookings']);
    expect(links[2]?.label).toBe('Giỏ đặt chỗ, 2 món');
  });

  it('marks the page being viewed', () => {
    state.pathname = '/hotels/abc';
    const links = readLinks(renderToStaticMarkup(<BookingSheet isActive />));
    expect(links.filter((link) => link.isCurrent).map((link) => link.href)).toEqual(['/search']);
  });
});
