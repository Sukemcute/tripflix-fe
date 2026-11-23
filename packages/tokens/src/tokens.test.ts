import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { colors, cssVar, explorer, type ColorToken } from './index';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

describe('tokens', () => {
  it('tokens.css có đủ mọi màu trong index.ts, đúng giá trị', () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(css).toContain(`${cssVar(name as ColorToken)}: ${value};`);
    }
  });
});

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('explorer v2 contrast (WCAG AA)', () => {
  const textPairs = (['day', 'night'] as const).flatMap((mode) => {
    const s = explorer[mode];
    return [s.text, s.textSecondary, s.link, s.error].flatMap((fg) =>
      [s.canvas, s.surface, s.tintExplore, s.tintWarm].map((bg) => [mode, fg, bg] as const),
    );
  });
  it.each(textPairs)('%s text %s trên %s đạt 4.5:1', (_mode, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each([
    [explorer.action.onSecondary, explorer.action.secondary],
    [explorer.action.onExplore, explorer.action.explore],
    [explorer.brand.ink, explorer.brand.sun],
  ])('nhãn nút %s trên %s đạt 4.5:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  // Chủ sản phẩm chọn nhãn trắng trên nút cam: đạt 3:1 (chữ đậm lớn), chưa đạt 4.5:1.
  it.each([explorer.action.primary, explorer.action.primaryPressed])(
    'nhãn trắng trên nút cam %s đạt 3:1',
    (bg) => {
      expect(contrast(explorer.action.onPrimary, bg)).toBeGreaterThanOrEqual(3);
    },
  );
  it('viền ô nhập đạt 3:1 (thành phần không phải chữ)', () => {
    expect(contrast(explorer.day.input, explorer.day.canvas)).toBeGreaterThanOrEqual(3);
    expect(contrast(explorer.night.input, explorer.night.canvas)).toBeGreaterThanOrEqual(3);
  });
});
