import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'live-posts.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function readRule(selector: string): string {
  return css.match(new RegExp(`^\\${selector}\\s*\\{([^}]*)\\}`, 'm'))?.[1] ?? '';
}

describe('Reels: khung video vừa khung trang ở mọi chiều cao header', () => {
  it('chốt hàng lưới đúng bằng chỗ còn lại của trang', () => {
    expect(readRule('.viewerGrid')).toMatch(/grid-template-rows:\s*minmax\(0, 1fr\)/);
  });

  it('khung video cao theo ô lưới, không dùng số cứng theo header', () => {
    const stage = readRule('.mediaStageFrame');
    expect(stage).toMatch(/max-height:\s*100%/);
    expect(stage).not.toMatch(/100dvh\s*-\s*\d+px/);
  });

  it('không đổi cảm giác vuốt: track vẫn snap dọc bắt buộc', () => {
    const track = readRule('.mediaTrack');
    expect(track).toMatch(/scroll-snap-type:\s*y mandatory/);
    expect(track).toMatch(/overflow-y:\s*scroll/);
  });
});
