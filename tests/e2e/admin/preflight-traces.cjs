// UI regression using isolated Tempo 2.9 fixtures from the backend verify-preflight-traces.mjs script.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { resolve, join } = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const { ObservabilityService } = await import(pathToFileURL(resolve(__dirname, '../../../../tripflix-be/apps/core-api/dist/modules/analytics/observability/application/observability.service.js')).href);
  const service = new ObservabilityService({ ANALYTICS_TEMPO_URL: 'http://127.0.0.1:3215' });
  const base = process.env.PREFLIGHT_ADMIN_URL || 'http://localhost:3216';
  const output = process.env.PREFLIGHT_EVIDENCE_DIR || resolve(__dirname, '../../../../artifacts');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const calls = [];
  await context.route('**/bff/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 204 });
    if (path.endsWith('/auth/me') || path.endsWith('/admin/me')) return route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', displayName: 'Test superadmin', email: 'staff@example.test', emailVerified: true, role: 'superadmin', createdAt: new Date().toISOString() } });
    if (path.endsWith('/observability/traces')) {
      calls.push(Object.fromEntries(url.searchParams));
      const result = await service.listTraces({ range: url.searchParams.get('range') || '1h', errorsOnly: url.searchParams.get('errorsOnly') === 'true', includeSuccessfulPreflights: url.searchParams.get('includeSuccessfulPreflights') === 'true', minDurationMs: Number(url.searchParams.get('minDurationMs') || 0) });
      return route.fulfill({ json: result });
    }
    if (path.endsWith('/observability')) return route.fulfill({ json: { generatedAt: Date.now(), from: Date.now() - 3600000, to: Date.now(), metricsSource: { status: 'ready' }, summary: { requests: null, requestRate: null, errorRate: null, p50Ms: null, p95Ms: null }, series: [], services: [], routes: [] } });
    return route.fulfill({ json: {} });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const successful = page.getByRole('button', { name: 'OPTIONS CORS preflight', exact: true });
  const toggle = page.getByLabel('Hiện preflight CORS thành công', { exact: true });
  const normal = page.getByRole('button', { name: 'GET /api/posts', exact: true });
  const snapshot = async (name) => {
    await page.evaluate(() => document.fonts.ready);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
    await page.screenshot({ path: join(output, name), fullPage: true });
  };
  try {
    await page.goto(`${base}/analytics`);
    await page.getByRole('heading', { name: 'Số liệu & giám sát', exact: true }).last().waitFor();
    await page.getByRole('button', { name: 'Traces', exact: true }).click();
    await normal.waitFor();
    assert.equal(await toggle.isChecked(), false);
    assert.equal(await successful.count(), 0);
    await page.getByRole('button', { name: 'OPTIONS /api/capabilities', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'OPTIONS unmatched', exact: true }).count(), 3);
    await snapshot('preflight_default_hidden.png');
    await toggle.check(); await successful.waitFor();
    assert(calls.some((call) => call.includeSuccessfulPreflights === 'true'));
    await snapshot('preflight_show_all.png');
    await toggle.uncheck(); await successful.waitFor({ state: 'hidden' });
    await page.getByLabel('Chỉ trace có lỗi', { exact: true }).check();
    await normal.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'OPTIONS unmatched', exact: true }).count(), 1);
    const combinedResponse = page.waitForResponse((response) => response.url().includes('includeSuccessfulPreflights=true') && response.url().includes('errorsOnly=true'));
    await toggle.check();
    await combinedResponse;
    assert.equal(await successful.count(), 0, 'Show-preflight does not override the error filter');
    await page.getByLabel('Chỉ trace có lỗi', { exact: true }).uncheck();
    await successful.waitFor();
    await page.getByLabel('Độ trễ tối thiểu', { exact: true }).selectOption('1000');
    await page.getByText('Chưa tìm thấy trace khớp bộ lọc.', { exact: true }).waitFor();
    await page.getByLabel('Độ trễ tối thiểu', { exact: true }).selectOption('0');
    await toggle.uncheck(); await normal.waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await snapshot('preflight_mobile.png');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: ['default hidden', 'show and hide', 'ordinary/legacy OPTIONS retained', 'failed preflight retained', 'combined error/duration filters', 'desktop/mobile layout'], source: 'isolated Tempo 2.9 fixture', evidence: output }));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error.stack); process.exitCode = 1; });
