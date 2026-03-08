import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],

  // Cloudflare Pages sets CF_PAGES=1 — serve from root.
  // GitHub Pages needs the repo-name sub-path.
  // Local dev always uses '/'.
  base: process.env.CF_PAGES ? '/' : (command === 'serve' ? '/' : '/1490doom-builder/'),

  server: {
    host: true,
    port: 5173,
  },
}))
