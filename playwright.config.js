// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E de Trueque U.
 * - Reporte HTML estándar de Playwright: playwright-report/index.html
 * - Reporte de alcance (cobertura del frontend) con monocart: coverage-report/coverage/index.html
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [
      'monocart-reporter',
      {
        name: 'Trueque U · Reporte E2E y alcance del frontend',
        outputFile: `${process.env.COVERAGE_DIR || 'coverage-report'}/index.html`,
        coverage: {
          name: 'Alcance del frontend (E2E Playwright)',
          outputDir: `${process.env.COVERAGE_DIR || 'coverage-report'}/coverage`,
          reports: ['v8', 'console-summary', 'json-summary', 'json', 'lcovonly', ['text', { skipFull: true }]],

          // Solo el código servido por Vite desde el frontend (sin dependencias ni devtools).
          entryFilter: (entry) =>
            /^http:\/\/localhost:5173\/src\/.+\.(vue|js)$/.test(entry.url.split('?')[0]) && !entry.url.includes('type=style'),
          sourceFilter: (sourcePath) => /\.(vue|js)$/.test(sourcePath) && !sourcePath.includes('__tests__'),
          // Vite deja en el sourcemap solo el nombre del archivo: la ruta real sale de la URL del módulo.
          sourcePath: (filePath, info) => {
            const norm = filePath.replace(/\\/g, '/');
            const desdeUrl = (info?.distFile || '').replace(/\\/g, '/').match(/src\/.+\.(vue|js)/);
            if (desdeUrl) return `frontend/${desdeUrl[0]}`;
            const i = norm.indexOf('src/');
            return i >= 0 ? `frontend/${norm.slice(i)}` : norm;
          },

          // Incluye también los archivos que ningún test cargó (cuentan como 0 %).
          all: {
            dir: ['./frontend/src'],
            filter: (filePath) => /\.(vue|js)$/.test(filePath) && !filePath.includes('__tests__'),
          },
        },
      },
    ],
  ],

  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Levanta backend (con datos semilla) y frontend si no están corriendo. */
  webServer: [
    {
      command: 'node src/database/seed.js && node src/app.js',
      cwd: './backend',
      url: 'http://localhost:3000/api/public-info',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --port 5173 --strictPort',
      // ID ficticio: activa la rama de Google Analytics (el script externo se bloquea en tests/fixtures.js).
      env: { VITE_GA_ID: 'G-E2ETEST' },
      cwd: './frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
