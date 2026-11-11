# TRIPFLIX layered hero

Implemented in `apps/web/src/features/discovery/ota-hero.tsx` and its CSS module. The existing search form remains in `LiveSearchScreen`; navigation and booking behavior are preserved.

| Layer | Asset / implementation | Details |
| --- | --- | --- |
| 1. Clean scenery | `apps/web/public/brand/hero-layered-v1/ha-long-clean.webp` | 2560 × 1440 export; sky, limestone islands and sea, no typography or boat |
| 2. Typography | `tripflix-crystal.svg` in the same asset directory | Transparent, 2400 × 660 viewBox; eight outlined vector glyphs, simulated extrusion/glass edges, embedded destination textures and fading reflection |
| 3. Boat and wake | `boat-wake.png`, `boat-wake.webp` | 1774 × 887 RGBA, genuine transparent background; CSS bobbing |
| 4. Dynamic vectors | `seagulls-ribbon.svg` | Three seagulls and a turquoise ribbon; vector paths with independent animation |
| 5. Native UI | Hero React component + existing search form | Heading, CTA, activity links, destination card, controls and search are HTML/CSS |

Destinations, in letter order: Sa Pa, Hạ Long, Tràng An, Huế, Phú Quốc, Cao Bằng, Cầu Vàng Đà Nẵng, Hội An. Each letter has a named keyboard-accessible destination link. The existing banner pointer handler supplies subtle parallax. New animations respect `prefers-reduced-motion`.

## Fidelity and source files

`source/` preserves the original AI-generated PNGs: clean scenery **1672 × 941**, eight-scene atlas **2172 × 724**, and transparent boat **1774 × 887**. The 2560 × 1440 scenery export uses Lanczos resizing; it is not native 4K or AI super-resolution. The vector letter contours stay sharp when scaled; embedded photo textures remain raster. Destination scenes are generated artwork, not documentary photographs.

The crystal effect is a static SVG extrusion with highlights, not a Spline/WebGL model. No real-time refraction or full 3D rotation is implemented. No Spline, Photoshop, Topaz or Antigravity integration was used. The assets were generated with the built-in image generation tool and assembled with SVG; Pillow handles export and fontTools converts the letter contours to paths. No frontend dependency was added.

## Rebuild

From the frontend repository root, with Pillow and fontTools installed:

```powershell
python tools/build-layered-hero.py
# Other systems: supply an installed bold-italic TTF font path as the first argument.
```

The Windows default is `C:/Windows/Fonts/arialbi.ttf`. The script checks output dimensions, boat alpha and all eight self-contained letter textures. Run the existing web dev command to preview the integrated page.

## Validation — 2026-11-11

- Asset build self-check: passed.
- `pnpm --filter @tripflix/web typecheck`: passed.
- `pnpm --filter @tripflix/web test`: 10 tests passed.
- Desktop 1440 × 900 and mobile 390 × 844: five layers present, all artwork loaded, eight destination links, no horizontal page overflow.
- Keyboard Tab moves from the first destination link to the second; focus outline and tooltip are defined for keyboard use.
- Main CTA reaches `#ota-search`; destination card controls select the requested scene.
- Screenshots: `docs/evidence/layered-hero-20261111/`.

No production deployment or full production build was performed. The isolated development preview cannot reach the configured backend, so booking submission was not tested. Reduced-motion CSS was inspected; an OS-level preference toggle was not tested.
