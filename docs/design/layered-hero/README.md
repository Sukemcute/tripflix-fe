# TRIPFLIX layered hero

Implemented in `apps/web/src/features/discovery/ota-hero.tsx` and its CSS module. The existing search form remains in `LiveSearchScreen`; navigation and booking behavior are preserved.

The current composition places the large slogan “Thấy là thích, nhích là đi” on the left and the original Tripflix wordmark on the right. The exploration tag is removed. The existing `TripiMascot` component reuses the transparent `hero-welcome` pose in the foreground, overlapping the lower edge of the wordmark without reserving a separate panel. Shared slogan copy updates the footer, page metadata and mobile account label through the existing i18n key.

| Layer | Asset / implementation | Details |
| --- | --- | --- |
| 1. Clean scenery | `apps/web/public/brand/hero-layered-v1/ha-long-clean.webp` | 2560 × 1440 export; sky, limestone islands and sea, no typography or boat |
| 2. Typography | `tripflix-logo-crystal.svg` in the same asset directory | Transparent, 2400 × 660 viewBox; original mixed-case Tripflix logo outlines at their original proportions, shallow glass edges, embedded destination textures, displaced water reflection, contact foam and animated ripples/spray |
| 3. Boat and wake | `boat-wake.png`, `boat-wake.webp` | 1774 × 887 RGBA, genuine transparent background; CSS bobbing |
| 4. Dynamic vectors | `seagulls-ribbon.svg` | Three seagulls and a turquoise ribbon; vector paths with independent animation |
| 5. Native UI | Hero React component + existing search form | Heading, CTA, activity links, destination card, controls and search are HTML/CSS |

Destinations, in letter order: Sa Pa, Hạ Long, Tràng An, Huế, Phú Quốc, Cao Bằng, Cầu Vàng Đà Nẵng, Hội An. Each letter has a named keyboard-accessible destination link. The existing banner pointer handler supplies subtle parallax. New animations respect `prefers-reduced-motion`.

## Fidelity and source files

`source/` preserves the original AI-generated PNGs: clean scenery **1672 × 941**, eight-scene atlas **2172 × 724**, transparent boat **1774 × 887**, and transparent contact foam **2172 × 724**. `letter-contact-foam.webp` is also exported separately. The 2560 × 1440 scenery export uses Lanczos resizing; it is not native 4K or AI super-resolution. The vector letter contours stay sharp when scaled; embedded photo textures remain raster. Destination scenes are generated artwork, not documentary photographs.

The crystal effect is a static SVG extrusion with highlights, not a Spline/WebGL model. No real-time refraction or full 3D rotation is implemented. No Spline, Photoshop, Topaz or Antigravity integration was used. Raster assets were generated with the built-in image generation tool and assembled with SVG; Pillow handles export and fontTools transforms the existing logo paths. No frontend dependency was added.

## Rebuild

From the frontend repository root, with Pillow and fontTools installed:

```powershell
python tools/build-layered-hero.py
```

The source is `apps/web/public/brand/tripflix-logo.svg`: its eight existing letter groups are scaled uniformly, without stretching, artificial slant or a substituted font. No system font is required. The script checks output dimensions, boat/foam alpha, all eight letter bounds and ripples, five small spray clusters, and nine embedded textures. All new water motion stops under `prefers-reduced-motion`. Run the existing web dev command to preview the integrated page.

## Validation — 2026-11-11

- Asset build self-check: passed.
- `pnpm --filter @tripflix/web typecheck`: passed.
- `pnpm --filter @tripflix/web test`: 10 tests passed.
- Desktop 1440 × 900 and mobile 390 × 844: five layers present, all artwork loaded, eight destination links, no horizontal page overflow.
- Keyboard Tab moves from the first destination link to the second; focus outline and tooltip are defined for keyboard use.
- Main CTA reaches `#ota-search`; destination card controls select the requested scene.
- Screenshots: `docs/evidence/layered-hero-20261111/`.

Rounded-letter / contact-water revision: asset self-check passed for eight glyph bounds, eight ripple groups, five light spray groups and nine embedded image textures. Verified again at desktop 1440 × 900 and mobile 390 × 844: all artwork loaded, five layers and eight destination links retained, no horizontal page overflow. Revision screenshots: `docs/evidence/layered-hero-soft-water-20261111/`. No application JavaScript or dependencies changed in this revision.

Logo-font revision uses the exact existing mixed-case wordmark and a smaller centered layout. The previous rounded uppercase artwork remains available as `tripflix-crystal.svg`. The new asset has its own filename so cached uppercase artwork is not reused. Rebuild checks passed; current screenshots are in `docs/evidence/layered-hero-logo-20261111/`.

No production deployment or full production build was performed. The isolated development preview cannot reach the configured backend, so booking submission was not tested. Reduced-motion CSS was inspected; an OS-level preference toggle was not tested.

Slogan/mascot layout validation (2026-11-12): web typecheck and all 10 web tests passed. At 1440px, 768px and 390px all hero images loaded, the heading matched the new slogan, eight destination links remained, and there was no horizontal document overflow. The mascot clears the CTA and destination card; page metadata also uses the new slogan. Screenshots are in `docs/evidence/layered-hero-slogan-mascot-20261112/`. At 320px the existing header navigation still causes document overflow; the hero itself stays contained and its CTA remains clear of the mascot. Native mobile screens were not tested.
