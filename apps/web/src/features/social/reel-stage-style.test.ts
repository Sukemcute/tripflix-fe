import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const directory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(directory, 'live-posts.module.css'), 'utf8');
const source = readFileSync(resolve(directory, 'live-posts.tsx'), 'utf8');

describe('Reel placeholder frame', () => {
  it('dùng cùng class kích thước và đặt chip bên trong khung chờ lẫn khung video', () => {
    expect(source).toMatch(/className=\{`\$\{styles\.mediaStageFrame\} \$\{styles\.reelStagePlaceholder\}`\}[\s\S]*?\{reelsModeTabs\}/);
    expect(source).toMatch(/className=\{styles\.mediaStageFrame\}[\s\S]*?\{reelsModeTabs\}/);
    expect(source).toMatch(/aria-busy=\{reelStageState === 'loading' \|\| undefined\}/);
    expect(source).toContain('shouldReserveStageLayout');
  });
  it('chỉ shimmer khi tải và tắt shimmer nếu giảm chuyển động', () => {
    expect(css).toMatch(/\.reelStagePlaceholder\[data-loading\]::before\s*\{[^}]*animation:\s*reel-stage-shimmer/);
    expect(css).toMatch(/\.reelStagePlaceholder\[data-loading\]::before\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.reelStagePlaceholder\[data-loading\]::before\s*\{[^}]*animation:\s*none/);
    expect(css).toMatch(/\.reelStagePlaceholderContent\s+:global\(\.secondary-button\)\s*\{[^}]*color:\s*var\(--color-ink\)/);
  });
});
