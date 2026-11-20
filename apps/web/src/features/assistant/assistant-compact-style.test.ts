import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('Assistant compact layout', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'assistant.module.css'), 'utf8');
  const rule = (name: string) => css.match(new RegExp(`^\\.${name}\\s*\\{([^}]*)\\}`, 'm'))?.[1] ?? '';

  it('keeps three equal video columns without horizontal scrolling', () => {
    expect(rule('videos')).toMatch(/display:\s*grid/);
    expect(rule('videos')).toMatch(/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(rule('cards')).toMatch(/grid-column:\s*2/);
    expect(rule('cards')).toMatch(/contain:\s*inline-size/);
    expect(rule('videos')).toMatch(/width:\s*100%/);
    expect(rule('videos')).not.toMatch(/overflow-x:\s*auto/);
    expect(rule('video')).toMatch(/aspect-ratio:\s*2\s*\/\s*3/);
    expect(rule('video')).toMatch(/min-width:\s*0/);
  });

  it('uses compact, readable message typography', () => {
    expect(rule('panel')).toMatch(/--assistant-font-body:\s*14px/);
    expect(rule('panel')).toMatch(/--assistant-font-meta:\s*12px/);
    expect(rule('message')).toMatch(/font-size:\s*var\(--assistant-font-body\)/);
    expect(rule('message')).toMatch(/line-height:\s*1\.45/);
    expect(rule('message')).toMatch(/padding:\s*10px\s+14px/);
  });
});
