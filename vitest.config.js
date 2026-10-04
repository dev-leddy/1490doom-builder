import { defineConfig } from 'vitest/config'

// Unit tests only (pure logic); browser tests live in tests/e2e and run with Playwright
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
})
