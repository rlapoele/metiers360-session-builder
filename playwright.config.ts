import { defineConfig } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4323',
    browserName: 'chromium',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 834, height: 1112 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : [
        {
          command: 'npm run start:api',
          env: { PORT: '4100', SEED: '42' },
          url: 'http://127.0.0.1:4100/health',
          reuseExistingServer: false,
          gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
        },
        {
          command: 'npm run build && npm start',
          env: {
            HOST: '127.0.0.1',
            PORT: '4323',
            CATALOG_API_URL: 'http://127.0.0.1:4100',
          },
          url: 'http://127.0.0.1:4323',
          reuseExistingServer: false,
          gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
        },
      ],
});
