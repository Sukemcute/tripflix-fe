import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const feedCss = readFileSync(resolve(here, 'social-feed.module.css'), 'utf8');
const reelsCss = readFileSync(resolve(here, '../live-posts.module.css'), 'utf8');

describe('Bottom sheet Lịch trình/Bình luận nằm trên thanh điều hướng đáy', () => {
  it('tab Bài viết: sheet Lịch trình và Bình luận', () => {
    expect(feedCss).toMatch(/\.rightPanelInFeed \{[^}]*inset: auto 0 var\(--mobile-tab-bar-space, 0px\) 0 !important;/);
  });

  it('Reels: sheet Lịch trình và panel trái/phải', () => {
    expect(reelsCss).toMatch(/\.itineraryInReels \{[^}]*inset: auto 0 var\(--mobile-tab-bar-space, 0px\) 0 !important;/);
    expect(reelsCss).toMatch(/\.rightPanel \{[^}]*inset: auto 0 var\(--mobile-tab-bar-space, 0px\) 0;/);
    expect(reelsCss).not.toMatch(/\.rightPanel \{\s*position: fixed;\s*inset: auto 0 0 0;/);
  });
});
