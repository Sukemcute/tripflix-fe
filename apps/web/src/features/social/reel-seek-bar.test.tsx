import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReelSeekBar } from './reel-seek-bar';

describe('ReelSeekBar', () => {
  it('là thanh tua dùng được bằng chuột, bàn phím và trình đọc màn hình; chưa kéo thì không hiện mốc thời gian', () => {
    const html = renderToStaticMarkup(<ReelSeekBar videoRef={createRef<HTMLVideoElement>()} />);
    expect(html).toContain('type="range"');
    expect(html).toContain('aria-label="Tua video"');
    expect(html).not.toContain('<output');
    expect(html).not.toContain('data-scrubbing');
  });
});
