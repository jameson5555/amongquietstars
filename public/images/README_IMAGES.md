# Among Quiet Stars Image Assets

Upload the WebP files in this folder to your app's `/public/images` directory.

For Vite/React, public assets can be referenced directly as:

```tsx
<img src="/images/cockpit_background.webp" alt="Cockpit of Among Quiet Stars" />
```

Recommended usage:

- `cabin_panorama_placeholder.svg` — stitched placeholder interior panorama for the panoramic in-ship UI
- `view_cockpit_forward.webp` — portrait cozy painterly forward cockpit plate with embedded top/bottom overlay screens and a tall canopy opening
- `view_map_ceiling.webp` — portrait port-side cabin view with two embedded navigation screens and cockpit context at the edge
- `view_journal_tablet.webp` — portrait downward lap-tablet plate retained as a fallback
- `journal_tablet_overlay.webp` — transparent tablet cutout for the floating journal overlay
- `view_ship_aft.webp` — portrait aft cabin plate with two embedded monitor zones for ship stats and upgrades
- `view_radio_console.webp` — portrait starboard radio console plate with an embedded message display
- `cockpit_background.webp` — main cockpit/home screen hero background
- `title_background.webp` — title/start screen
- `nebula_vista_01.webp`, `nebula_vista_02.webp`, `nebula_vista_03.webp` — travel/voyage backgrounds
- `space_station_lumen_rest.webp` — home station / docked state
- `asteroid_belt_outpost.webp` — asteroid/field encounter background
- `planet_*.webp` — star map or system detail tiles
- `journal_pages_background.webp` — Journal of Wonders header/background

A manifest is included as `image-manifest.json`, and a TypeScript helper is included as `image-assets.ts`. PNG fallbacks are intentionally omitted because the app targets modern browsers.
