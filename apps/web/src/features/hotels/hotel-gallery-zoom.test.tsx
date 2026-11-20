import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { vi as viText } from '@tripflix/i18n';

import { HotelGallery, HotelPhoto } from './hotel-gallery';
import { canNavigateSlides, INITIAL_IMAGE_ZOOM_STATE, resolveZoomKeyboardAction } from '../shared/image-zoom';
import { GalleryLightbox, stepGalleryIndex } from '../social/feed/gallery-lightbox';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) =>
    createElement('img', {
      src: String(props.src ?? ''),
      alt: String(props.alt ?? ''),
      'data-sizes': String(props.sizes ?? ''),
      'data-width': String(props.width ?? ''),
    }),
}));

vi.mock('./hotel.module.css', () => ({
  default: new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    },
  ),
}));

vi.mock('../shared/image-viewer-controls.module.css', () => ({
  default: new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    },
  ),
}));

vi.mock('../live-posts.module.css', () => ({
  default: new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    },
  ),
}));

describe('HotelGallery & GalleryLightbox zoom integration', () => {
  it('renders zoom controls in HotelGallery dialog without altering photo count', () => {
    const html = renderToStaticMarkup(
      createElement(HotelGallery, {
        name: 'Vinpearl Resort Cần Thơ',
        images: [
          'https://media.tripflix.io.vn/hotel-1.jpg',
          'https://media.tripflix.io.vn/hotel-2.jpg',
        ],
      }),
    );

    expect(html).toContain('Vinpearl Resort Cần Thơ');
    expect(html).toContain('1 / 2');
    expect(html).toContain('100%');
    expect(html).toContain(viText.api.imageZoomIn);
    expect(html).toContain(viText.api.imageZoomOut);
    expect(html).toContain('transform:translate3d(0px, 0px, 0) scale(1)');
    expect(html).not.toContain(viText.api.imageEnterFullscreen);
  });

  it('renders zoom controls and un-preloaded 1x image sizes in GalleryLightbox', () => {
    const html = renderToStaticMarkup(
      createElement(GalleryLightbox, {
        isOpen: true,
        title: 'Chuyến đi Cần Thơ',
        images: [
          { src: 'https://media.tripflix.io.vn/post-1.jpg' },
          { src: 'https://media.tripflix.io.vn/post-2.jpg' },
        ],
        currentIndex: 0,
        onClose: vi.fn(),
        onSelectIndex: vi.fn(),
      }),
    );

    expect(html).toContain('1 / 2');
    expect(html).toContain('100%');
    expect(html).toContain(viText.api.imageZoomIn);
    expect(html).toContain('data-width="1000"');
    expect(html).toContain('data-sizes="(max-width: 768px) 100vw, 60vw"');
  });

  it('defines fullscreen and reduced-motion styles in both hotel and social CSS', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const hotelCss = readFileSync(resolve(here, 'hotel.module.css'), 'utf8');
    const socialCss = readFileSync(resolve(here, '../social/live-posts.module.css'), 'utf8');
    const controlsCss = readFileSync(
      resolve(here, '../shared/image-viewer-controls.module.css'),
      'utf8',
    );

    expect(hotelCss).toContain('.photoDialog:fullscreen');
    expect(hotelCss).toContain('.photoStage img');
    expect(socialCss).toContain('.galleryStageOverlay:fullscreen');
    expect(controlsCss).toContain('prefers-reduced-motion: reduce');
    expect(controlsCss).toContain('touch-action: none');
  });

  it('upgrades HotelPhoto resolution only when highRes is enabled (scale > 1)', () => {
    const lowResHtml = renderToStaticMarkup(
      createElement(HotelPhoto, {
        url: 'https://media.tripflix.io.vn/room.jpg',
        alt: 'Phòng VIP',
        highRes: false,
      }),
    );
    const highResHtml = renderToStaticMarkup(
      createElement(HotelPhoto, {
        url: 'https://media.tripflix.io.vn/room.jpg',
        alt: 'Phòng VIP',
        highRes: true,
      }),
    );

    expect(lowResHtml).toContain('data-width="1000"');
    expect(lowResHtml).toContain('data-sizes="(max-width: 768px) 100vw, 60vw"');
    expect(highResHtml).toContain('data-width="2000"');
    expect(highResHtml).toContain('data-sizes="100vw"');
  });

  it('blocks slide switching while zoomed and re-enables after reset to 1x', () => {
    const zoomedScale = 2;
    expect(canNavigateSlides(zoomedScale)).toBe(false);
    expect(resolveZoomKeyboardAction('0')).toBe('reset');
    expect(canNavigateSlides(INITIAL_IMAGE_ZOOM_STATE.scale)).toBe(true);
    expect(stepGalleryIndex(0, 1, 3)).toBe(1);
  });
});
