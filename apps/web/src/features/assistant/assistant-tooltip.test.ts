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

describe('Nút gửi bình luận dùng mũi tên giống nút gửi Tripi', () => {
  it('SocialIcon sendUp cùng path với AssistantIcon arrowUp và được dùng ở nút gửi bình luận', () => {
    const livePosts = readFileSync(resolve(here, '../social/live-posts.tsx'), 'utf8');
    const assistantIcon = readFileSync(resolve(here, 'assistant-icon.tsx'), 'utf8');
    expect(assistantIcon).toContain("arrowUp: 'M12 19V5M6 11l6-6 6 6'");
    expect(livePosts).toContain('<path d="M12 19V5M6 11l6-6 6 6" />');
    expect(livePosts).toContain('<SocialIcon name="sendUp" size={18} />');
  });
});
