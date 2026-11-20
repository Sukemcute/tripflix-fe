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
  it('renders zoom controls and expand-viewer toggle unconditionally', () => {
    const html = renderToStaticMarkup(
      createElement(ImageViewerControls, {
        scale: 1,
        onZoomIn: vi.fn(),
        onZoomOut: vi.fn(),
        onResetZoom: vi.fn(),
        isExpanded: false,
        onToggleExpanded: vi.fn(),
      }),
    );

    expect(html).toContain(viText.api.imageZoomOut);
    expect(html).toContain(viText.api.imageZoomIn);
    expect(html).toContain('100%');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(viText.api.imageExpandViewer);
    expect(html).toContain('aria-pressed="false"');
  });

  it('enables reset at 200% zoom and switches label/aria-pressed when expanded', () => {
    const html = renderToStaticMarkup(
      createElement(ImageViewerControls, {
        scale: 2,
        onZoomIn: vi.fn(),
        onZoomOut: vi.fn(),
        onResetZoom: vi.fn(),
        isExpanded: true,
        onToggleExpanded: vi.fn(),
      }),
    );

    expect(html).toContain('200%');
    expect(html).toContain(viText.api.imageZoomReset);
    expect(html).toContain(viText.api.imageShrinkViewer);
    expect(html).toContain('aria-pressed="true"');
  });

  it('disables zoom in at max 400% scale', () => {
    const html = renderToStaticMarkup(
      createElement(ImageViewerControls, {
        scale: 4,
        onZoomIn: vi.fn(),
        onZoomOut: vi.fn(),
        onResetZoom: vi.fn(),
        isExpanded: true,
        onToggleExpanded: vi.fn(),
      }),
    );

    expect(html).toContain('400%');
    expect(html).toContain(`aria-label="${viText.api.imageZoomIn}" disabled=""`);
  });
});
