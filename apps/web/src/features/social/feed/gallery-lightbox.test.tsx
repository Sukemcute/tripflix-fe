import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  clampGalleryIndex,
  GalleryLightbox,
  shouldCloseGalleryBackdropClick,
  stepGalleryIndex,
  syncGalleryDialogState,
} from './gallery-lightbox';

const here = dirname(fileURLToPath(import.meta.url));

describe('clampGalleryIndex & stepGalleryIndex', () => {
  it('giới hạn chỉ số trong khoảng [0, total - 1]', () => {
    expect(clampGalleryIndex(-2, 5)).toBe(0);
    expect(clampGalleryIndex(0, 5)).toBe(0);
    expect(clampGalleryIndex(3, 5)).toBe(3);
    expect(clampGalleryIndex(99, 5)).toBe(4);
    expect(clampGalleryIndex(Number.NaN, 5)).toBe(0);
    expect(clampGalleryIndex(2, 0)).toBe(0);
  });

  it('chuyển ảnh trước/sau và không vượt quá ảnh đầu hoặc cuối', () => {
    expect(stepGalleryIndex(0, -1, 5)).toBe(0);
    expect(stepGalleryIndex(1, -1, 5)).toBe(0);
    expect(stepGalleryIndex(1, 1, 5)).toBe(2);
    expect(stepGalleryIndex(4, 1, 5)).toBe(4);
  });
});

describe('shouldCloseGalleryBackdropClick', () => {
  it('chỉ đóng khi bấm trực tiếp ra phần nền tối (target === dialog)', () => {
    const dialog = {} as EventTarget;
    const innerViewer = {} as EventTarget;

    expect(shouldCloseGalleryBackdropClick({ target: dialog, dialog, detail: 1 })).toBe(true);
    expect(shouldCloseGalleryBackdropClick({ target: innerViewer, dialog, detail: 1 })).toBe(false);
    expect(shouldCloseGalleryBackdropClick({ target: dialog, dialog, detail: 0 })).toBe(false);
    expect(shouldCloseGalleryBackdropClick({ target: null, dialog, detail: 1 })).toBe(false);
  });
});

describe('syncGalleryDialogState & GalleryLightbox markup', () => {
  it('đồng bộ mở bằng showModal() và đóng bằng close() theo isOpen', () => {
    const dialog = {
      open: false,
      showModal: vi.fn(() => {
        dialog.open = true;
      }),
      close: vi.fn(() => {
        dialog.open = false;
      }),
    };

    syncGalleryDialogState(dialog, false);
    expect(dialog.showModal).not.toHaveBeenCalled();

    syncGalleryDialogState(dialog, true);
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);

    syncGalleryDialogState(dialog, false);
    expect(dialog.close).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(false);
  });

  it('render khung cố định có tiêu đề, bộ đếm 2 / 5, stage ảnh và dải thumbnail đánh dấu ảnh đang xem', () => {
    const noop = () => {};
    const images = Array.from({ length: 5 }, (_, idx) => ({
      src: `https://media.tripflix.io.vn/photo-${idx + 1}.jpg`,
    }));

    const closedHtml = renderToStaticMarkup(
      <GalleryLightbox
        isOpen={false}
        title="Hành trình Đà Lạt"
        images={images}
        currentIndex={0}
        onClose={noop}
        onSelectIndex={noop}
      />,
    );
    expect(closedHtml).toContain('<dialog');
    expect(closedHtml).not.toContain(' open=""');
    expect(closedHtml).not.toContain('<img');

    const openHtml = renderToStaticMarkup(
      <GalleryLightbox
        isOpen
        title="Hành trình Đà Lạt cuối tuần siêu chill"
        images={images}
        currentIndex={1}
        onClose={noop}
        onSelectIndex={noop}
      />,
    );
    expect(openHtml).toContain('<dialog');
    expect(openHtml).not.toContain(' open=""');
    expect(openHtml).toContain('Hành trình Đà Lạt cuối tuần siêu chill');
    expect(openHtml).toContain('2 / 5');
    expect(openHtml).toContain('aria-current="true"');
    expect(openHtml.match(/aria-label="Ảnh \d+"/g)).toHaveLength(5);

    const singleHtml = renderToStaticMarkup(
      <GalleryLightbox
        isOpen
        title="Một ảnh"
        images={[images[0]!]}
        currentIndex={0}
        onClose={noop}
        onSelectIndex={noop}
      />,
    );
    expect(singleHtml).toContain('1 / 1');
    expect(singleHtml).not.toContain('Ảnh trước');
  });

  it('CSS social dùng khung cố định giống trang khách sạn, viền coral cho thumbnail đang chọn và không import chéo hotels', () => {
    const css = readFileSync(resolve(here, '../live-posts.module.css'), 'utf8');
    const lightboxTsx = readFileSync(resolve(here, 'gallery-lightbox.tsx'), 'utf8');

    expect(lightboxTsx).not.toContain('hotels/');
    expect(css).toContain('--gallery-max-width: 60rem');
    expect(css).toContain('--gallery-max-height: 44rem');
    expect(css).toContain('object-fit: contain');
    expect(css).toContain('border-color: var(--color-coral-ink)');
    expect(css).toContain('.galleryStageOverlay:not([open])');
    expect(css).toContain('.galleryStageOverlay::backdrop');
    expect(css).toContain('@media (max-width: 640px)');
  });
});
