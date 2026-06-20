import { defineConfig } from 'vitest/config'

export default defineConfig({
  // core has no CSS — stop Vite from walking up and loading the web app's
  // postcss.config.js (which requires tailwindcss, not installed here).
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
