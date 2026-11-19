import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('Reel volume slider CSS', () => {
  it('keeps a horizontal slider and uses a round coral thumb in both engines', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(resolve(directory, 'live-posts.module.css'), 'utf8');
    const slider = css.match(/\.volumeRangeInput\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(slider).toMatch(/width:\s*66px/);
    expect(slider).toMatch(/height:\s*4px/);
    for (const engine of ['webkit-slider-thumb', 'moz-range-thumb']) {
      const rule = css.match(new RegExp(`\\.volumeRangeInput::-${engine}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
      expect(rule).toMatch(/width:\s*12px/);
      expect(rule).toMatch(/height:\s*12px/);
      expect(rule).toMatch(/border-radius:\s*50%/);
      expect(rule).toMatch(/background:\s*var\(--color-coral\)/);
      expect(rule).toMatch(/box-shadow:\s*none/);
      expect(rule).not.toMatch(/transition|animation/);
    }
    expect(css).toMatch(/\.volumeRangeInput::-webkit-slider-runnable-track\s*\{[^}]*var\(--volume-progress\)/);
    expect(css).toContain('.volumeRangeInput::-moz-range-progress');
  });
});
