import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const features = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readPhoneRule(file: string, selector: string): string {
  const css = readFileSync(resolve(features, file), 'utf8');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blocks = css.split('@media (max-width: 767px)').slice(1);
  return blocks.map((block) => block.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '').join('');
}

describe('overlays pinned to the bottom stay above the mobile tab bar', () => {
  it.each([
    ['social/composer/publish-toast.module.css', '.toast'],
    ['notifications/web-notifications.css', '.notification-toasts'],
    ['checkout/cart.module.css', '.bar'],
  ])('%s %s', (file, selector) => {
    expect(readPhoneRule(file, selector)).toMatch(/bottom:[^;]*var\(--mobile-tab-bar-space, 0px\)/);
  });
});
