import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const directory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(directory, 'social-feed.module.css'), 'utf8');

function readColumns(media: string | null, selector: string): string {
  const scope = media === null ? css : (css.split(`@media (${media})`)[1]?.split('@media')[0] ?? '');
  const pattern = media === null ? new RegExp(`^\\${selector}\\s*\\{([^}]*)\\}`, 'm') : new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`);
  return scope.match(pattern)?.[1]?.match(/grid-template-columns:\s*([^;]+);/)?.[1]?.trim() ?? '';
}

/** Tính một clamp(min, Nvw, max) ở bề ngang viewport cho trước. */
function resolveClamp(track: string, viewportWidth: number): number {
  const [, min = '0', vw = '0', max = '0'] = track.match(/clamp\((\d+)px,\s*(\d+)vw,\s*(\d+)px\)/) ?? [];
  return Math.min(Number(max), Math.max(Number(min), (Number(vw) * viewportWidth) / 100));
}

function readSideTracks(columns: string): [string, string] {
  const tracks = columns.match(/\w+\([^)]*\)|\S+/g) ?? [];
  return [tracks[0] ?? '', tracks[4] ?? ''];
}

describe('Bài viết: cột bên trên laptop', () => {
  it.each(['max-width: 1439px', 'max-width: 1199px'])('co theo bề ngang màn ở mốc %s, không còn số cứng', (media) => {
    for (const selector of ['.splitViewContainer', '.splitViewNoLeft', '.splitViewNoRight']) {
      const columns = readColumns(media, selector);
      expect(columns).toContain('minmax(0, 1fr)');
      for (const track of readSideTracks(columns)) expect(track).toMatch(/^(clamp\(\d+px, \d+vw, \d+px\)|0px)$/);
    }
  });

  it('giữ cột bảng tin giữa đủ rộng ở 1024px khi mở cả hai cột', () => {
    const [left, right] = readSideTracks(readColumns('max-width: 1199px', '.splitViewContainer'));
    // Bề ngang khung Cảm hứng ở 1024px: 1024 - lề 2 × 41px - dock 76px = 866px (đo bằng CDP).
    const center = 866 - resolveClamp(left, 1024) - resolveClamp(right, 1024) - 2 * 14;
    expect(center).toBeGreaterThanOrEqual(360);
  });

  it('bằng giá trị cũ ở 1439px và để nguyên desktop từ 1440px', () => {
    const [left, right] = readSideTracks(readColumns('max-width: 1439px', '.splitViewContainer'));
    expect(resolveClamp(left, 1439)).toBe(300);
    expect(resolveClamp(right, 1439)).toBe(330);
    expect(readColumns(null, '.splitViewContainer')).toBe('340px 20px minmax(0, 1fr) 20px 380px');
  });
});
