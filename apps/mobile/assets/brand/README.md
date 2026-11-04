# Mobile V1 assets

Copied from the approved local `tripflix-ui-design/assets` handoff on 2026-11-04.
These assets are bundled; no image or font CDN is required at runtime.

- `tripflix-logo.svg`: the supplied updated Tripflix symbol and original wordmark paths.
- `tripi-*.png`: four transparent mascot poses derived from the supplied Tripi guide in the design phase.
- `be-vietnam-pro-0.ttf` through `4.ttf`: Be Vietnam Pro regular, medium, semibold, bold and extra bold,
  sourced by the design handoff from [Google Fonts](https://fonts.google.com/specimen/Be+Vietnam+Pro).
  The handed-off `.woff2` filenames contained TrueType bytes (`00010000`); files are renamed `.ttf` for native loading,
  with unchanged contents.
- Photos are layout illustrations, not verified photographs of the named destinations or hotel:
  [beach](https://images.unsplash.com/photo-1514282401047-d79a71a590e8),
  [Hội An mood](https://images.unsplash.com/photo-1559592413-7cec4d0cae2b),
  [hotel](https://images.unsplash.com/photo-1540541338287-41700207dee6),
  [sea](https://images.unsplash.com/photo-1507525428034-b723cf961d3e).

Use verified catalog media when connecting production discovery and booking.
Icons use the existing `@expo/vector-icons` Ionicons dependency; the prototype's Phosphor web font is not loaded in native.
