import os from 'node:os'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// The end-to-end tests run against their own backend and a throw-away database,
// so they never touch backend/entries.db.
const API_PORT = 3181
const WEB_PORT = 5281
const DB_PATH = path.join(os.tmpdir(), 'organizeme-e2e.db')

// PW_CHANNEL=msedge (or chrome) uses an installed browser. Without it, Playwright uses its own
// Chromium, which is installed with `npx playwright install chromium`.
const channel = process.env.PW_CHANNEL || undefined

const CORE_SPECS = /(notebook|drawing|todos|code|states)\.spec\.js/

export default defineConfig({
  testDir: 'tests/e2e',
  // All tests share one backend and one database, so they run one after another
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 1400, height: 820 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    // The full suite runs in Chromium
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 820 }, channel } },
    // Firefox and WebKit run the specs that exercise the app itself. The axe scan, the layout
    // measurements, and the robustness checks use Chromium tooling or Chromium-specific numbers.
    // Run them with: npm run test:e2e:browsers
    { name: 'firefox', testMatch: CORE_SPECS, use: { ...devices['Desktop Firefox'], viewport: { width: 1400, height: 820 } } },
    { name: 'webkit', testMatch: CORE_SPECS, use: { ...devices['Desktop Safari'], viewport: { width: 1400, height: 820 } } }
  ],
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
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_BASE: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000
    }
  ]
})
