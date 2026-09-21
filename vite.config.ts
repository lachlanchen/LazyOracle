import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
})
