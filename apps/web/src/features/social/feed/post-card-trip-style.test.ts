import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('thẻ đính kèm lịch trình trên bài viết (.postAttachedTrip)', () => {
  it('dùng nền xám nhạt theo token, bỏ viền và đổ bóng kể cả khi hover', () => {
    const css = readFileSync(resolve(here, 'social-feed.module.css'), 'utf8');

    const baseBlock = css.match(/\.postAttachedTrip\s*\{[^}]*\}/)?.[0] ?? '';
    expect(baseBlock).toContain('background: var(--color-surface-muted)');
    expect(baseBlock).toContain('border: 0');
    expect(baseBlock).not.toContain('border: 1px');
    expect(baseBlock).not.toContain('box-shadow');

    const hoverBlock = css.match(/\.postAttachedTrip:hover\s*\{[^}]*\}/)?.[0] ?? '';
    expect(hoverBlock).toContain('background: var(--color-sea-mist)');
    expect(hoverBlock).not.toContain('border-color');
    expect(hoverBlock).not.toContain('box-shadow');
  });
});
