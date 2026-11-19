import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  GalleryLightbox,
  getContainImageRect,
  isPointInsideContainImage,
  shouldCloseGalleryFromClick,
  syncGalleryDialogState,
} from './gallery-lightbox';

const here = dirname(fileURLToPath(import.meta.url));

describe('getContainImageRect & isPointInsideContainImage', () => {
  it('tính đúng khung ảnh dọc nằm giữa màn hình ngang (pillarbox hai bên)', () => {
    // Khung 1200x800, ảnh dọc 1000x2000 -> scale = min(1.2, 0.4) = 0.4 -> 400x800, nằm giữa [400..800, 0..800]
    const box = { left: 0, top: 0, width: 1200, height: 800 };
    expect(getContainImageRect(box, 1000, 2000)).toEqual({
      left: 400,
      top: 0,
      right: 800,
      bottom: 800,
    });

    // Viền trống bên trái và bên phải đều nằm ngoài ảnh thật
    expect(isPointInsideContainImage({ x: 200, y: 400 }, box, 1000, 2000)).toBe(false);
    expect(isPointInsideContainImage({ x: 950, y: 400 }, box, 1000, 2000)).toBe(false);
    // Giữa ảnh nằm trong ảnh thật
    expect(isPointInsideContainImage({ x: 600, y: 400 }, box, 1000, 2000)).toBe(true);
  });

  it('tính đúng khung ảnh ngang nằm giữa màn hình hẹp (letterbox trên dưới)', () => {
    // Khung 400x800, ảnh ngang 1600x800 -> scale = min(0.25, 1) = 0.25 -> 400x200, nằm giữa [0..400, 300..500]
    const box = { left: 0, top: 0, width: 400, height: 800 };
    expect(getContainImageRect(box, 1600, 800)).toEqual({
      left: 0,
      top: 300,
      right: 400,
      bottom: 500,
    });

    expect(isPointInsideContainImage({ x: 200, y: 150 }, box, 1600, 800)).toBe(false);
    expect(isPointInsideContainImage({ x: 200, y: 650 }, box, 1600, 800)).toBe(false);
    expect(isPointInsideContainImage({ x: 200, y: 400 }, box, 1600, 800)).toBe(true);
  });
});

describe('shouldCloseGalleryFromClick', () => {
  const imageEl = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
    naturalWidth: 1000,
    naturalHeight: 2000,
  };

  it('đóng khi bấm vào viền trống của next/image fill (object-fit: contain) hoặc nền dialog', () => {
    expect(
      shouldCloseGalleryFromClick({
        target: imageEl as unknown as EventTarget,
        clientX: 150,
        clientY: 400,
        detail: 1,
        imageEl,
      }),
    ).toBe(true);

    expect(
      shouldCloseGalleryFromClick({
        target: { closest: () => null },
        clientX: 600,
        clientY: 400,
        detail: 1,
        imageEl,
      }),
    ).toBe(true);
  });

  it('không đóng khi bấm trúng phần ảnh thật, bộ đếm, nút trước/sau hoặc kích hoạt bằng phím', () => {
    expect(
      shouldCloseGalleryFromClick({
        target: imageEl as unknown as EventTarget,
        clientX: 600,
        clientY: 400,
        detail: 1,
        imageEl,
      }),
    ).toBe(false);

    expect(
      shouldCloseGalleryFromClick({
        target: { closest: (sel: string) => (sel.includes('keep-open') ? {} : null) },
        clientX: 40,
        clientY: 400,
        detail: 1,
        imageEl,
      }),
    ).toBe(false);

    expect(
      shouldCloseGalleryFromClick({
        target: imageEl as unknown as EventTarget,
        clientX: 0,
        clientY: 0,
        detail: 0,
        imageEl,
      }),
    ).toBe(false);
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
    expect(dialog.close).not.toHaveBeenCalled();

    syncGalleryDialogState(dialog, true);
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);

    syncGalleryDialogState(dialog, true);
    expect(dialog.showModal).toHaveBeenCalledTimes(1);

    syncGalleryDialogState(dialog, false);
    expect(dialog.close).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(false);
  });

  it('render dialog không đặt thuộc tính open hay z-index nội tuyến để dùng top layer showModal', () => {
    const noop = () => {};
    const closedHtml = renderToStaticMarkup(
      <GalleryLightbox
        isOpen={false}
        label="Ảnh bài viết"
        currentIndex={0}
        total={0}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
      />,
    );
    expect(closedHtml).toContain('<dialog');
    expect(closedHtml).not.toContain(' open=""');
    expect(closedHtml).not.toContain('<img');

    const openHtml = renderToStaticMarkup(
      <GalleryLightbox
        isOpen
        label="Ảnh bài viết"
        imageSrc="https://media.tripflix.io.vn/sample.jpg"
        currentIndex={1}
        total={3}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
      />,
    );
    expect(openHtml).toContain('<dialog');
    expect(openHtml).not.toContain(' open=""');
    expect(openHtml).not.toContain('z-index:9999');
    expect(openHtml).toContain('2 / 3');
    expect(openHtml).toContain('<img');
    expect(openHtml).toContain('data-gallery-keep-open="true"');
  });

  it('CSS galleryStageOverlay dùng top layer, giới hạn tối đa 960px / 80vh / 92vw và nút nằm quanh vùng ảnh', () => {
    const css = readFileSync(resolve(here, '../live-posts.module.css'), 'utf8');
    expect(css).toContain('.galleryStageOverlay:not([open])');
    expect(css).toContain('.galleryStageOverlay::backdrop');
    expect(css).toContain('--gallery-max-width: 960px');
    expect(css).toContain('--gallery-max-height: 80vh');
    expect(css).toContain('--gallery-mobile-max-width: 92vw');
    expect(css).toContain('width: auto;');
    expect(css).toContain('height: auto;');
    expect(css).toContain('object-fit: contain;');
    expect(css).toContain("'prev media next'");
    expect(css).toContain('@media (max-width: 767px)');
  });
});
