import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileTabBar } from './mobile-tab-bar';

const navigation = vi.hoisted(() => ({ pathname: '/' }));
const session = vi.hoisted(() => ({ user: null as { id: string } | null }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: () => {} }),
}));
vi.mock('@tripflix/api-client', () => ({ useApiSession: () => ({ user: session.user, isReady: true }) }));

function renderBar(pathname: string) {
  navigation.pathname = pathname;
  return renderToStaticMarkup(<MobileTabBar />);
}

function readItems(html: string) {
  return [...html.matchAll(/<(a|button)\b([^>]*)>(.*?)<\/\1>/g)].map(([, tag, attributes = '', inner = '']) => ({
    tag,
    label: attributes.match(/aria-label="([^"]+)"/)?.[1] ?? inner.replace(/<[^>]+>/g, ''),
    href: attributes.match(/href="([^"]+)"/)?.[1],
    // Mục Đặt chỗ là nút mở bảng nên đánh dấu bằng class; các mục link dùng aria-current.
    isCurrent: attributes.includes('aria-current="page"') || /class="[^"]*tabActive/.test(attributes),
  }));
}

describe('MobileTabBar', () => {
  beforeEach(() => {
    session.user = null;
  });

  it('renders five items in order with the create button in the middle', () => {
    const html = renderBar('/');
    expect(html).toContain('data-mobile-tab-bar=""');
    expect(html).toContain('aria-label="Điều hướng chính"');
    const items = readItems(html);
    expect(items.map((item) => item.label)).toEqual(['Trang chủ', 'Đặt chỗ', 'Đăng bài mới', 'Cảm hứng', 'Tôi']);
    expect(items[1]).toMatchObject({ tag: 'button' });
    expect(items[2]?.tag).toBe('button');
    expect(html).toContain('aria-controls="mobile-booking-sheet"');
  });

  it.each([
    ['/', 'Trang chủ'],
    ['/hotels/abc', 'Đặt chỗ'],
    ['/inspiration', 'Cảm hứng'],
    ['/u/user-1', 'Tôi'],
  ])('marks the current item on %s', (pathname, label) => {
    session.user = { id: 'user-1' };
    const current = readItems(renderBar(pathname)).filter((item) => item.isCurrent);
    expect(current.map((item) => item.label)).toEqual([label]);
  });

  it('links "Tôi" to the own profile when signed in and to login otherwise', () => {
    expect(readItems(renderBar('/flights')).at(-1)?.href).toBe('/login?returnTo=%2Fflights');
    session.user = { id: 'user-1' };
    expect(readItems(renderBar('/flights')).at(-1)?.href).toBe('/u/user-1');
  });

  it('is not rendered on full-screen pages', () => {
    expect(renderBar('/login')).toBe('');
    expect(renderBar('/checkout/abc')).toBe('');
  });
});

describe('mobile tab bar CSS', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'mobile-tab-bar.module.css'), 'utf8');

  it('is hidden by default and only shown below 768px', () => {
    const [beforeMedia = '', phoneBlock = ''] = css.split('@media (max-width: 767px)');
    expect(beforeMedia).toMatch(/\.bar\s*\{\s*display:\s*none;\s*\}/);
    expect(phoneBlock).toMatch(/\.bar\s*\{[^}]*position:\s*fixed[^}]*display:\s*grid/);
    expect(phoneBlock).toMatch(/padding-bottom:\s*env\(safe-area-inset-bottom\)/);
  });
});
