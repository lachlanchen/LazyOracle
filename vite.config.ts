import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'LazyOracle — Tarot, BaZi, I Ching',
        short_name: 'LazyOracle',
        description: 'Tarot, BaZi, I Ching, astrology, feng shui and palmistry readings, computed and explained on your own device.',
        theme_color: '#0b0d1f',
        background_color: '#0b0d1f',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Take over as soon as a new version is deployed, so a fix reaches an
        // installed app on its next launch rather than several launches later.
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        // Without this, the worker answers every navigation with the app
        // shell, which hides the standalone pages: the privacy policy and
        // support page the stores link to, the device check, and any file
        // served for download.
        navigateFallbackDenylist: [/^\/(privacy|support|model-check)\.html$/, /^\/downloads\//],
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
})
