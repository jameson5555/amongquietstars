# Among Quiet Stars

A mobile-first vertical slice prototype for a cozy narrative space exploration game. The player lives aboard a small home-ship named **Among Quiet Stars**, travels between nearby systems, records odd discoveries, and follows the early shape of a quiet mystery.

## Development

```bash
npm install
npm run dev
```

The Vite dev server runs locally and serves the PWA-capable React app.

## Build

```bash
npm run build
```

The build script generates placeholder app icons and splash screens, then writes the static production app to `dist/`.

## Preview

```bash
npm run preview
```

The app is configured with `base: '/amongquietstars/'`, matching deployment under `jamesonmacarthur.com/amongquietstars/`.

## Deployment

Upload the contents of `dist/` to the `amongquietstars` directory on shared/cPanel hosting. No Node runtime, server API, database, or SSR support is required in production.

The included `.htaccess` supports SPA fallback routing and serves static assets directly.

## PWA

The app uses `vite-plugin-pwa` with a generated web app manifest, offline asset caching, standalone display mode, Android-friendly icons, and first-load offline support.

## Resetting Prototype Progress

Use the **Reset Save** button in the Ship screen to clear local progress during testing.
