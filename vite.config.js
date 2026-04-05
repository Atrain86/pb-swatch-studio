import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Don't precache — use network-first for everything
        globPatterns: [],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/pb-swatch-studio\.netlify\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-cache',
              expiration: { maxAgeSeconds: 60 * 60 }, // 1 hour max
            },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'PaintBrain Swatch Studio',
        short_name: 'Swatch Studio',
        description: 'Build, save and share color palettes',
        theme_color: '#0e0e12',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
