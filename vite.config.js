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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: null,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB (images.js is ~3.3 MB)
      },
    }),
  ],

  base: command === 'serve' ? '/' : base,

  server: {
    host: true,
    port: 5173,
  },
}))
