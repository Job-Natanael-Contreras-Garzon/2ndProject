// @ts-check
// Fixture compartido: recolecta la cobertura V8 del frontend en cada página que abre
// un test (solo Chromium expone page.coverage) y la entrega a monocart-reporter.
import { test as base, expect } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

export const test = base.extend({
  page: async ({ page, browserName }, use, testInfo) => {
    const medir = browserName === 'chromium';
    if (medir) await page.coverage.startJSCoverage({ resetOnNavigation: false });

    await use(page);

    if (medir && !page.isClosed()) {
      const cobertura = await page.coverage.stopJSCoverage();
      await addCoverageReport(cobertura, testInfo);
    }
  },
});

export { expect };
