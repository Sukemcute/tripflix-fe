import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const directory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(directory, 'social-feed.module.css'), 'utf8');

function readNarrowRowBlock(): string {
  const start = css.indexOf('@container (max-width: 479px)');
  if (start < 0) return '';
  let depth = 0;
  for (let index = css.indexOf('{', start); index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(start, index + 1);
  }
  return '';
}

describe('composer action row CSS on narrow screens', () => {
  it('measures the row itself, so wide desktop rows keep their labels', () => {
    expect(css).toMatch(/\.composerBottomRow\s*\{[^}]*container-type:\s*inline-size/);
  });

  it('lets the button group shrink, keeps the submit button inside and hides labels for sighted users only', () => {
    const block = readNarrowRowBlock();
    expect(block).toMatch(/\.composerActionGroup\s*\{[^}]*min-width:\s*0/);
    expect(block).toMatch(/\.composerSubmitBtn\s*\{[^}]*flex-shrink:\s*0/);
    const label = block.match(/\.composerActionGroup > \.composerTagBtn > span:last-child\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(label).toMatch(/clip-path:\s*inset\(50%\)/);
    expect(label).not.toMatch(/display:\s*none/);
  });

  it('leaves the recommend tabs alone even though they reuse .composerTagBtn', () => {
    const block = readNarrowRowBlock().replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...block.matchAll(/([^{}]+)\{/g)].map((match) => (match[1] ?? '').trim());
    const tagButtonSelectors = selectors.filter((selector) => selector.includes('.composerTagBtn'));
    expect(tagButtonSelectors.length).toBeGreaterThan(0);
    for (const selector of tagButtonSelectors) {
      expect(selector.startsWith('.composerActionGroup > .composerTagBtn')).toBe(true);
    }
  });
});
