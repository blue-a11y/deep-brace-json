import { defineConfig, devices } from '@playwright/test';

const LOCAL_E2E_URL = 'http://127.0.0.1:4173';
const e2eBaseUrl = process.env.E2E_BASE_URL ?? LOCAL_E2E_URL;
const shouldStartLocalServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: e2eBaseUrl,
    contextOptions: {
      reducedMotion: 'reduce',
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldStartLocalServer
    ? {
        command: 'pnpm dev --host 127.0.0.1 --port 4173 --strictPort',
        url: LOCAL_E2E_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
