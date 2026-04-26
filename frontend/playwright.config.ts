/**
 * Playwright — suite E2E de los 4 flujos de oro + smoke a11y.
 *
 * Diseño:
 *   - `baseURL` apunta a `PLAYWRIGHT_BASE_URL` (local o preview de Vercel).
 *   - `webServer` arranca `next dev` sólo en local si no hay URL externa.
 *   - 1 worker en CI para evitar race conditions con OTP/stripe webhooks.
 *   - `trace: 'on-first-retry'` para depurar sin penalizar la pasada feliz.
 *   - Retries (2) sólo en CI; localmente 0 para feedback rápido.
 *
 * Navegadores: Chromium en todos los entornos + Firefox/WebKit opt-in.
 */

import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: !isCI,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    // Headers para poder saltarse rate-limits en entorno de test.
    extraHTTPHeaders: process.env.PLAYWRIGHT_BYPASS_HEADER
      ? { 'x-playwright-bypass': process.env.PLAYWRIGHT_BYPASS_HEADER }
      : undefined,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testMatch: /a11y\.spec\.ts|smoke\.spec\.ts|cierre-duro\.spec\.ts/,
    },
    // Firefox/WebKit opt-in con PLAYWRIGHT_BROWSERS=all
    ...(process.env.PLAYWRIGHT_BROWSERS === 'all'
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],

  // Sólo arrancamos el dev server si apuntamos a localhost.
  webServer: baseURL.startsWith('http://localhost')
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
