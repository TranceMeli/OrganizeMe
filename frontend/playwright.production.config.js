import os from 'node:os'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// Runs the built app (vite build + vite preview) against its own backend. The dev server adds
// tooling such as the Vue devtools, so only this suite shows what a user really gets.
const API_PORT = 3182
const WEB_PORT = 5283
const DB_PATH = path.join(os.tmpdir(), 'organizeme-e2e-production.db')

// Test workers inherit this, so the shared helpers talk to the right backend
process.env.E2E_API_PORT = String(API_PORT)
process.env.E2E_WEB_PORT = String(WEB_PORT)

const channel = process.env.PW_CHANNEL || undefined

export default defineConfig({
  testDir: 'tests/production',
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-production' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 1400, height: 820 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 820 }, channel } }],
  webServer: [
    {
      command: 'node server.js',
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/todos`,
      env: { PORT: String(API_PORT), DB_PATH },
      reuseExistingServer: false,
      timeout: 30_000
    },
    {
      // The API address is baked into the bundle at build time
      command: `npx vite build --outDir dist-production && npx vite preview --outDir dist-production --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_BASE: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 180_000
    }
  ]
})
