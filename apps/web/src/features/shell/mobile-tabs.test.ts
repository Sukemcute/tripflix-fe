import { describe, expect, it } from 'vitest';
import { readSafeReturnTo } from '../auth/auth-return';
import {
  buildComposeHref,
  buildMeHref,
  findActiveMobileTab,
  isMobileTabBarHidden,
  readComposeType,
  removeComposeParam,
} from './mobile-tabs';

const ME = 'user-1';

describe('findActiveMobileTab', () => {
  it.each([
    ['/', 'home'],
    ['/search', 'booking'],
    ['/hotels/abc', 'booking'],
    ['/flights', 'booking'],
    ['/flights/abc', 'booking'],
    ['/cart', 'booking'],
    ['/bookings', 'booking'],
    ['/inspiration', 'inspiration'],
    ['/trips/abc', 'inspiration'],
    ['/trip-plans/abc', 'inspiration'],
    ['/u/someone-else', 'inspiration'],
    [`/u/${ME}`, 'me'],
    ['/account', 'me'],
    ['/account/moderation', 'me'],
  ] as const)('%s → %s', (pathname, tab) => {
    expect(findActiveMobileTab(pathname, ME)).toBe(tab);
  });

  it('treats every profile as Inspiration when signed out', () => {
    expect(findActiveMobileTab(`/u/${ME}`, null)).toBe('inspiration');
  });

  it('returns null for pages outside the five tabs', () => {
    expect(findActiveMobileTab('/dieu-khoan-su-dung', ME)).toBeNull();
    expect(findActiveMobileTab('/searching', ME)).toBeNull();
  });
});

describe('isMobileTabBarHidden', () => {
  it.each([
    '/login',
    '/register',
    '/forgot-password',
    '/dat-lai-mat-khau',
    '/xac-thuc-email',
    '/onboarding',
    '/checkout/abc',
    '/payments/abc/return',
  ])('hides on %s', (pathname) => {
    expect(isMobileTabBarHidden(pathname)).toBe(true);
  });

  it.each(['/', '/search', '/flights', '/inspiration', '/u/abc', '/account', '/cart', '/bookings', '/loginx'])(
    'shows on %s',
    (pathname) => {
      expect(isMobileTabBarHidden(pathname)).toBe(false);
    },
  );
});

describe('buildComposeHref', () => {
  it('opens the post composer from any page', () => {
    expect(buildComposeHref({ pathname: '/', search: '', isSignedIn: true })).toBe('/inspiration?compose=vlog');
    expect(buildComposeHref({ pathname: '/inspiration', search: '?q=hue', isSignedIn: true })).toBe(
      '/inspiration?compose=vlog',
    );
  });

  it('opens the video composer from Reels', () => {
    expect(buildComposeHref({ pathname: '/inspiration', search: '?view=reels', isSignedIn: true })).toBe(
      '/inspiration?view=reels&compose=video',
    );
  });

  it('goes through login with a return path the login page accepts', () => {
    const href = buildComposeHref({ pathname: '/inspiration', search: '?view=reels', isSignedIn: false });
    const returnTo = new URLSearchParams(href.split('?')[1]).get('returnTo') ?? '';
    expect(href.startsWith('/login?returnTo=')).toBe(true);
    expect(returnTo).toBe('/inspiration?view=reels&compose=video');
    expect(readSafeReturnTo(returnTo)).toBe(returnTo);
  });
});

describe('buildMeHref', () => {
  it('links to the own profile when signed in', () => {
    expect(buildMeHref({ userId: ME, pathname: '/search' })).toBe(`/u/${ME}`);
  });

  it('logs in and returns to the current page when that page is allowed', () => {
    expect(buildMeHref({ userId: null, pathname: '/flights' })).toBe('/login?returnTo=%2Fflights');
    expect(buildMeHref({ userId: null, pathname: '/u/someone' })).toBe('/login');
    expect(buildMeHref({ userId: null, pathname: '/' })).toBe('/login');
  });
});

describe('compose param', () => {
  it('reads only known composer types', () => {
    expect(readComposeType('vlog')).toBe('vlog');
    expect(readComposeType('video')).toBe('video');
    expect(readComposeType('other')).toBeNull();
    expect(readComposeType(null)).toBeNull();
  });

  it('removes compose and keeps the other params', () => {
    expect(removeComposeParam('/inspiration', 'view=reels&compose=video')).toBe('/inspiration?view=reels');
    expect(removeComposeParam('/inspiration', 'compose=vlog')).toBe('/inspiration');
  });
});
