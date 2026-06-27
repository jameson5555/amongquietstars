# Among Quiet Stars Image Assets

Upload the WebP files in this folder to your app's `/public/images` directory.

For Vite/React, public assets can be referenced directly as:

```tsx
<img src="/images/view_cockpit_forward.webp" alt="Cockpit of Among Quiet Stars" />
```

Recommended usage:

- `cabin_strip_4608.webp` / `cabin_strip_2304.webp` — high- and standard-resolution four-station cabin strips, ordered Map, Cockpit, Radio, Ship, with a transparent cockpit-window aperture; station indices and UI calibration live in `src/data/cabinScene.ts`
- `view_cockpit_forward.webp` — portrait cozy painterly forward cockpit plate with embedded top/bottom overlay screens and an alpha-cut transparent canopy opening for the live space layer
- `view_map_ceiling.webp` — portrait port-side cabin view with two embedded navigation screens and cockpit context at the edge
- `journal_tablet_overlay.webp` — transparent tablet cutout for the floating journal overlay
- `view_ship_aft.webp` — legacy portrait aft cabin plate used as the static fallback
- `view_radio_console.webp` — portrait starboard radio console plate with an embedded message display
- `flyby_ship_*.webp` — transparent small ship sprites used for sparse randomized cockpit-window fly-bys
- `nebula_vista_01.webp`, `nebula_vista_02.webp`, `nebula_vista_03.webp` — opaque full-window travel/voyage backdrops
- `hyperdrive.gif` — animated radial star-tunnel shown through the cockpit window during active travel
- `space_station_lumen_rest.webp` — transparent destination object for Glass Harbor / station views
- `asteroid_belt_outpost.webp` — transparent destination object for asteroid/outpost systems
- `planet_*.webp` — transparent destination objects for cockpit/map/encounter use

A manifest is included as `image-manifest.json`. PNG fallbacks are intentionally omitted because the app targets modern browsers.

The strip source is preserved as `source-images/cabin_strip_v1.png`. Replacement strips must remain 9:4 with four equal 9:16 quarters in Map, Cockpit, Radio, Ship order; run `npm run assets:cabin-strip` after replacing it and update the scene definition when screen geometry changes.
The cockpit cutout is generated from `source-images/view_cockpit_forward_source.png` with `npm run assets:cockpit-window`.
Destination objects/backdrops are generated from `source-images/*_source.png` with `npm run assets:destinations`.
