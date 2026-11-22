import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const directory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(directory, 'social-feed.module.css'), 'utf8');

function readPhoneBlock(): string {
  const start = css.indexOf('@media (max-width: 767px)');
  if (start < 0) return '';
  let depth = 0;
  for (let index = css.indexOf('{', start); index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(start, index + 1);
  }
  return '';
}

function readRule(block: string, selector: string): string {
  return block.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

describe('Inspiration dock on phones', () => {
  const phone = readPhoneBlock();

  it('becomes a row at the top of the page instead of a second bottom bar', () => {
    const dock = readRule(phone, '.instagramDock');
    expect(dock).toMatch(/position:\s*relative/);
    expect(dock).not.toMatch(/position:\s*fixed/);
    expect(dock).toMatch(/flex-direction:\s*row/);
  });

  it('hides its create button because the shared tab bar has one', () => {
    expect(readRule(phone, '.dockCreateBtn')).toMatch(/display:\s*none/);
  });

  it('leaves room for the shared tab bar', () => {
    expect(phone).toMatch(/padding-bottom:\s*var\(--mobile-tab-bar-space, 0px\)/);
    expect(readRule(phone, '.dockSearchDrawer')).toMatch(/bottom:\s*calc\(var\(--mobile-tab-bar-space, 0px\) \+ 12px\)/);
  });

  it('keeps the left dock on desktop', () => {
    const desktopDock = css.match(/^\.instagramDock\s*\{([^}]*)\}/m)?.[1] ?? '';
    expect(desktopDock).toMatch(/position:\s*absolute/);
    expect(desktopDock).toMatch(/width:\s*64px/);
  });
});
