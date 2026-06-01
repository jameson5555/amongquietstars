# Among Quiet Stars Image Assets

Upload the WebP files in this folder to your app's `/public/images` directory.

For Vite/React, public assets can be referenced directly as:

```tsx
<img src="/images/cockpit_background.webp" alt="Cockpit of Among Quiet Stars" />
```

Recommended usage:

- `cabin_panorama_placeholder.svg` — stitched placeholder interior panorama for the panoramic in-ship UI
- `cockpit_background.webp` — main cockpit/home screen hero background
- `title_background.webp` — title/start screen
- `nebula_vista_01.webp`, `nebula_vista_02.webp`, `nebula_vista_03.webp` — travel/voyage backgrounds
- `space_station_lumen_rest.webp` — home station / docked state
- `asteroid_belt_outpost.webp` — asteroid/field encounter background
- `planet_*.webp` — star map or system detail tiles
- `journal_pages_background.webp` — Journal of Wonders header/background

A manifest is included as `image-manifest.json`, and a TypeScript helper is included as `image-assets.ts`. PNG fallbacks are intentionally omitted because the app targets modern browsers.
