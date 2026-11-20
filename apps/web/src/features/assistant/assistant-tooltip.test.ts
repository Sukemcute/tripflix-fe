import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const widget = readFileSync(resolve(here, 'assistant-widget.tsx'), 'utf8');
const providers = readFileSync(resolve(here, '../../app/providers.tsx'), 'utf8');

describe('Chú thích nút Tripi dùng chú thích chung của web', () => {
  it('nút Tripi, Trò chuyện mới, Thu nhỏ dùng data-tooltip thay title của trình duyệt', () => {
    expect(widget).not.toMatch(/\stitle=\{copy\./);
    expect(widget).toContain('data-tooltip={copy.name}');
    expect(widget).toContain('data-tooltip={copy.reset}');
    expect(widget).toContain('data-tooltip={copy.minimize}');
  });

  it('TooltipLayer gắn một lần ở gốc trang', () => {
    expect(providers).toContain("import { TooltipLayer } from '@/features/shared/tooltip-layer';");
    expect(providers).toContain('<TooltipLayer />');
  });
});
