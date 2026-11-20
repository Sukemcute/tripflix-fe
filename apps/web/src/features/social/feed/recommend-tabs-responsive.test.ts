import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'social-feed.module.css'), 'utf8');

describe('Tab gợi ý Bài viết co giãn theo khung', () => {
  it('xuống 2×2 khi cột bảng tin hẹp hơn 500px, thắng .tabs của bộ chung', () => {
    expect(css).toMatch(
      /@container \(max-width: 500px\) \{\s*div\.recommendModeTabs \{\s*grid-auto-flow: row;\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
  });

  it('chữ không tràn khỏi nút', () => {
    expect(css).toMatch(/\.recommendModeTabs > button \{[^}]*min-width: 0;[^}]*padding-inline: 6px;[^}]*text-overflow: ellipsis;/);
  });
});
