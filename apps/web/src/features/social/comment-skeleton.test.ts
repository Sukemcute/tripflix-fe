import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as commentSkeleton from './comment-skeleton';
import { CommentSkeletonList, ROW_WIDTH_PRESETS, getRowWidthPreset } from './comment-skeleton';
import styles from './comment-skeleton.module.css';

describe('CommentSkeletonList', () => {
  it('là component tải thuần, không kèm bình luận mẫu nào có thể hiện ra cho người dùng', () => {
    expect(typeof CommentSkeletonList).toBe('function');
    expect(Object.keys(commentSkeleton).sort()).toEqual(
      ['CommentSkeletonList', 'ROW_WIDTH_PRESETS', 'getRowWidthPreset'].sort(),
    );
  });

  it('getRowWidthPreset trả về tỷ lệ bề rộng tự nhiên theo chu kỳ', () => {
    expect(ROW_WIDTH_PRESETS).toHaveLength(8);
    expect(getRowWidthPreset(0)).toEqual({ meta: '38%', body: '88%' });
    expect(getRowWidthPreset(1).meta).toBe('44%');
    expect(getRowWidthPreset(8)).toEqual(getRowWidthPreset(0));
  });

  it('render đủ số dòng skeleton với avatar tròn và 2 thanh chữ có bề rộng khác nhau, shimmer gắn trên từng khối con', () => {
    const defaultHtml = renderToStaticMarkup(createElement(CommentSkeletonList));
    expect(defaultHtml).toContain('aria-busy="true"');
    expect(defaultHtml.match(new RegExp(styles.skeletonRow!, 'g'))).toHaveLength(8);

    const html = renderToStaticMarkup(createElement(CommentSkeletonList, { count: 5 }));
    expect(html.match(new RegExp(styles.skeletonRow!, 'g'))).toHaveLength(5);
    expect(html.match(new RegExp(styles.avatarPlaceholder!, 'g'))).toHaveLength(5);
    expect(html.match(new RegExp(styles.textBarMeta!, 'g'))).toHaveLength(5);
    expect(html.match(new RegExp(styles.textBarBody!, 'g'))).toHaveLength(5);
    // 5 dòng * (1 avatar + 2 thanh chữ) = 15 khối con mang class shimmerSweep; container không mang class này.
    expect(html.match(new RegExp(styles.shimmerSweep!, 'g'))).toHaveLength(15);
    expect(html).toContain('width:38%');
    expect(html).toContain('width:88%');
    expect(html).toContain('width:40%');
    expect(html).toContain('width:84%');
  });

  it('CSS shimmer chạy trên từng khối con (overflow: hidden, background-attachment: fixed), không phủ nền/::after lên container', () => {
    const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), 'comment-skeleton.module.css');
    const css = readFileSync(cssPath, 'utf8');
    expect(css).not.toContain('.skeletonRowsWrapper::after');
    expect(css).toContain('overflow: hidden;');
    expect(css).toContain('background-attachment: fixed;');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation: none;');
  });
});
