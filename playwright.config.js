import { defineConfig } from '@playwright/test'

// End-to-end tests: drive the real app against the local dev servers.
// Each test signs up its own throwaway account on the LOCAL database — never production.
//   npm run test:e2e        (reuses servers already running, otherwise starts them)
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 420, height: 900 },
    // Locally use the installed Edge (no browser download); CI uses Playwright's Chromium
    channel: process.env.CI ? undefined : 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
    // Backend: Cloudflare Functions + local D1 (answers 401 to a guest, which counts as up)
    { command: 'npm run build && npx wrangler pages dev dist --port 8788', url: 'http://localhost:8788/api/auth/me', reuseExistingServer: true, timeout: 180_000 },
  ],
})
