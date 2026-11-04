import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { colors, cssVar, type ColorToken } from './index';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

describe('tokens', () => {
  it('tokens.css có đủ mọi màu trong index.ts, đúng giá trị', () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(css).toContain(`${cssVar(name as ColorToken)}: ${value};`);
    }
  });
});
