import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/amongquietstars/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'splash/*.png'],
      manifest: {
        name: 'Among Quiet Stars',
        short_name: 'Quiet Stars',
        description: 'A cozy narrative space exploration prototype.',
        theme_color: '#22163d',
        background_color: '#120b25',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/amongquietstars/',
        start_url: '/amongquietstars/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'splash/splash-640x1136.png',
            sizes: '640x1136',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webmanifest}'],
        navigateFallback: '/amongquietstars/index.html'
      },
      devOptions: {
        enabled: true
      }
    })
  ]
});
