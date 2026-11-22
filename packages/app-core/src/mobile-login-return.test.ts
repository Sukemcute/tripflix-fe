import { describe, expect, it } from 'vitest';
import { resolveMobileLoginReturn } from './mobile-login-return';

describe('mobile login return', () => {
  it.each(['/assistant', '/(tabs)/saved', '/trip/da-lat/checkout', '/flights?from=SGN', '/trip-builder'])(
    'returns to %s after signing in',
    (target) => expect(resolveMobileLoginReturn(target)).toBe(target),
  );

  it.each([[undefined], [['/assistant']], ['/assistant-other'], ['/trip-builder-x'], ['https://example.com/assistant']])(
    'uses the account tab for an unsupported target %j',
    (target) => expect(resolveMobileLoginReturn(target)).toBe('/(tabs)/me'),
  );
});
