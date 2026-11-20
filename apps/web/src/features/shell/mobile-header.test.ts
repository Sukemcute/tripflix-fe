import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const directory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(directory, 'mobile-header.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const layout = readFileSync(resolve(directory, '../../app/layout.tsx'), 'utf8');

function readRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

describe('mobile header CSS', () => {
  it('only styles phones so the desktop header stays unchanged', () => {
    const topLevelBlocks = css.trim().split(/\n(?=\S)/).filter((block) => block.trim() !== '}');
    expect(topLevelBlocks.length).toBeGreaterThan(0);
    for (const block of topLevelBlocks) {
      expect(block.trimStart()).toMatch(/^@media \(max-width: 767px\)/);
    }
  });

  it('keeps one 56px row: hides the menu and the cart, keeps the action buttons', () => {
    expect(readRule('.ota-header .header-content nav')).toMatch(/display:\s*none/);
    expect(readRule(".ota-header .header-actions > a[href='/cart']")).toMatch(/display:\s*none/);
    const content = readRule('.ota-header .header-content');
    expect(content).toMatch(/min-height:\s*56px/);
    expect(content).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  });

  it('turns the login text button into a round person icon without removing its text', () => {
    const login = readRule('.ota-header .header-actions > .header-login');
    expect(login).toMatch(/width:\s*36px/);
    expect(login).toMatch(/height:\s*36px/);
    expect(login).toMatch(/font-size:\s*0/);
    expect(readRule('.ota-header .header-actions > .header-login::after')).toMatch(/mask:/);
  });

  it('sticks to the top and slides away with translate when the header is hidden', () => {
    expect(css).toMatch(/\.ota-header\s*\{[^}]*position:\s*sticky/);
    expect(readRule('.ota-header[data-header-hidden]')).toMatch(/translate:\s*0 -100%/);
  });

  it('is imported after globals.css so it wins over the older header rules', () => {
    const globalsAt = layout.indexOf("import './globals.css'");
    const mobileAt = layout.indexOf("import '@/features/shell/mobile-header.css'");
    expect(globalsAt).toBeGreaterThan(-1);
    expect(mobileAt).toBeGreaterThan(globalsAt);
    expect(layout).toMatch(/viewportFit:\s*'cover'/);
  });
});
