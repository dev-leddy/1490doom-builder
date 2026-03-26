import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.CF_PAGES ? '/' : '/1490doom-builder/'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: command === 'serve' ? '/' : base,
      manifest: {
        name: '1490 DOOM — Company Builder',
        short_name: '1490 DOOM',
        description: 'Doom Company builder and play tracker for 1490 DOOM by Buer Games',
        theme_color: '#1a1006',
        background_color: '#1a1006',
        display: 'standalone',
        orientation: 'portrait',
        scope: command === 'serve' ? '/' : base,
        start_url: command === 'serve' ? '/' : base,
        icons: [
          { src: 'pwa-64x64.png',            sizes: '64x64',   type: 'image/png' },
          { src: 'pwa-192x192.png',           sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png',           sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cacheId: 'doom-builder-v2',
        importScripts: ['sw-redirect.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['quiz/Art/**', 'quiz/music/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/quiz/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB (images.js is ~3.3 MB)
        runtimeCaching: [
          {
            // Company avatars — CacheFirst so they're served instantly after first load
            urlPattern: /\/company-avatars\/.+\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'company-avatars-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  base: command === 'serve' ? '/' : base,

  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        quiz: 'quiz.html',
      },
    },
  },

  server: {
    host: true,
    port: 5173,
  },
}))
