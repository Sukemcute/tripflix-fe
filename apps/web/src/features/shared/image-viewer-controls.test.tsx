import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { vi as viText } from '@tripflix/i18n';

import { ImageViewerControls } from './image-viewer-controls';

vi.mock('./image-viewer-controls.module.css', () => ({
  default: new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    },
  ),
}));

describe('ImageViewerControls', () => {
  it('renders zoom controls and fullscreen toggle when fullscreen is enabled', () => {
    const html = renderToStaticMarkup(
      createElement(ImageViewerControls, {
        scale: 1,
        onZoomIn: vi.fn(),
        onZoomOut: vi.fn(),
        onResetZoom: vi.fn(),
        canFullscreen: true,
        isFullscreen: false,
        onToggleFullscreen: vi.fn(),
      }),
    );

    expect(html).toContain(viText.api.imageZoomOut);
    expect(html).toContain(viText.api.imageZoomIn);
    expect(html).toContain('100%');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(viText.api.imageEnterFullscreen);
    expect(html).toContain('aria-pressed="false"');
  });

  it('hides fullscreen button when fullscreen is unavailable and enables reset when zoomed', () => {
    const html = renderToStaticMarkup(
      createElement(ImageViewerControls, {
        scale: 2,
        onZoomIn: vi.fn(),
        onZoomOut: vi.fn(),
        onResetZoom: vi.fn(),
        canFullscreen: false,
        isFullscreen: false,
        onToggleFullscreen: vi.fn(),
      }),
    );

    expect(html).toContain('200%');
    expect(html).toContain(viText.api.imageZoomReset);
    expect(html).not.toContain(viText.api.imageEnterFullscreen);
    expect(html).not.toContain(viText.api.imageExitFullscreen);
  });

  it('disables zoom in at max 400% scale and marks fullscreen active', () => {
    const html = renderToStaticMarkup(
      createElement(ImageViewerControls, {
        scale: 4,
        onZoomIn: vi.fn(),
        onZoomOut: vi.fn(),
        onResetZoom: vi.fn(),
        canFullscreen: true,
        isFullscreen: true,
        onToggleFullscreen: vi.fn(),
      }),
    );

    expect(html).toContain('400%');
    expect(html).toContain(viText.api.imageExitFullscreen);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain(`aria-label="${viText.api.imageZoomIn}" disabled=""`);
  });
});
