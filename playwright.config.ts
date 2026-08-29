import { defineConfig, devices } from '@playwright/test'

const CROSS_BROWSER_SMOKE = '**/crossBrowserSmoke.e2e.ts'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-smoke',
      testMatch: CROSS_BROWSER_SMOKE,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-smoke',
      testMatch: CROSS_BROWSER_SMOKE,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
