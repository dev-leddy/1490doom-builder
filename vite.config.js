import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],

  base: command === 'serve' ? '/' : '/1490doom-builder/',

  server: {
    host: true,
    port: 5173,
  },
}))
