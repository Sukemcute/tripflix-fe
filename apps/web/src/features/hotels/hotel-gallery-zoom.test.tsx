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

describe('HotelGallery & GalleryLightbox zoom + expanded tab viewer', () => {
  it('renders zoom and expand controls in HotelGallery without browser fullscreen gating', () => {
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
    expect(html).toContain(viText.api.imageExpandViewer);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('transform:translate3d(0px, 0px, 0) scale(1)');
  });

  it('renders zoom + expand controls and un-preloaded 1x image sizes in GalleryLightbox', () => {
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
    expect(html).toContain(viText.api.imageExpandViewer);
    expect(html).toContain('data-width="1000"');
    expect(html).toContain('data-sizes="(max-width: 768px) 100vw, 60vw"');
  });

  it('uses data-expanded CSS for full tab view and has zero browser Fullscreen API references', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const hotelCss = readFileSync(resolve(here, 'hotel.module.css'), 'utf8');
    const hotelTsx = readFileSync(resolve(here, 'hotel-gallery.tsx'), 'utf8');
    const socialCss = readFileSync(resolve(here, '../social/live-posts.module.css'), 'utf8');
    const socialTsx = readFileSync(resolve(here, '../social/feed/gallery-lightbox.tsx'), 'utf8');
    const controlsCss = readFileSync(
      resolve(here, '../shared/image-viewer-controls.module.css'),
      'utf8',
    );
    const controlsTsx = readFileSync(
      resolve(here, '../shared/image-viewer-controls.tsx'),
      'utf8',
    );
    const zoomTs = readFileSync(resolve(here, '../shared/image-zoom.ts'), 'utf8');
    const hookTs = readFileSync(resolve(here, '../shared/use-image-zoom.ts'), 'utf8');

    expect(hotelCss).toContain(".photoDialog[data-expanded='true']");
    expect(hotelCss).toContain('.photoStage img');
    expect(socialCss).toContain(".galleryStageOverlay[data-expanded='true']");
    expect(controlsCss).toContain('prefers-reduced-motion: reduce');
    expect(controlsCss).toContain('touch-action: none');

    const viewerSources = [
      hotelCss,
      hotelTsx,
      socialCss,
      socialTsx,
      controlsCss,
      controlsTsx,
      zoomTs,
      hookTs,
    ].join('\n');

    expect(viewerSources).not.toContain('requestFullscreen');
    expect(viewerSources).not.toContain('exitFullscreen');
    expect(viewerSources).not.toContain('fullscreenElement');
    expect(viewerSources).not.toContain('fullscreenEnabled');
    expect(viewerSources).not.toContain(':fullscreen');
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
