import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// CHANGE THIS to match your GitHub repo name (e.g. '/time-tracker/')
const REPO_NAME = '/time-tracker/';

export default defineConfig({
  base: REPO_NAME,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Time Tracker',
        short_name: 'Time',
        description: 'Personal time tracking and routine management',
        theme_color: '#E8672E',
        background_color: '#FAF8F5',
        display: 'standalone',
        orientation: 'portrait',
        scope: REPO_NAME,
        start_url: REPO_NAME,
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
