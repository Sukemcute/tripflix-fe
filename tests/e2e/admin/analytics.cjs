// Run against the real backend + Collector + Prometheus + Tempo. Credentials stay in memory.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const base = process.env.ANALYTICS_ADMIN_URL || 'http://localhost:3206';
const api = process.env.ANALYTICS_API_URL || 'http://localhost:8080';
const output = process.env.ANALYTICS_EVIDENCE_DIR || join(tmpdir(), 'tripflix-analytics');

class AnalyticsPage {
  constructor(page) {
    this.page = page;
  }
  async open() {
    await this.page.goto(`${base}/analytics`);
    await this.page.getByRole('heading', { name: 'Số liệu & giám sát', exact: true }).waitFor();
  }
  async refresh() {
    const response = this.page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/bff/api/analytics/observability' && response.ok(),
    );
    await this.page.getByRole('button', { name: 'Làm mới số liệu', exact: true }).click();
    return (await response).json();
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    assert.equal(
      await this.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'No page-wide horizontal overflow',
    );
    await this.page.screenshot({ path: join(output, name), fullPage: true });
  }
}

/** Admin không còn trang đăng nhập riêng (TF05I): đăng nhập core-api, xin mã một lần rồi mở /auth/handoff như web làm. */
async function openAdminSession(page) {
  const login = await fetch(`${api}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ANALYTICS_TEST_EMAIL || 'superadmin@tripflix.local',
      password: process.env.ANALYTICS_TEST_PASSWORD || 'tripflix-dev-123',
    }),
  });
  assert.equal(login.status, 200, 'Login failed');
  const { accessToken } = await login.json();
  const handoff = await fetch(`${api}/api/auth/admin-handoff`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
  });
  assert.equal(handoff.status, 200, 'Admin handoff failed');
  const { code } = await handoff.json();
  await page.goto(`${base}/auth/handoff#code=${encodeURIComponent(code)}`);
  await page.waitForURL(`${base}/`);
}

async function poll(read, ready, message) {
  const until = Date.now() + 90_000;
  while (Date.now() < until) {
    const value = await read();
    if (ready(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(message);
}

(async () => {
  await mkdir(output, { recursive: true });
  await poll(
    async () => (await fetch(`${api}/api/auth/password-key`)).status,
    (status) => status === 200,
    'Backend is not ready',
  );
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const ui = new AnalyticsPage(page);
  try {
    await openAdminSession(page);
    await page.goto(`${base}/analytics`);
    await page.getByRole('heading', { name: 'Số liệu & giám sát', exact: true }).waitFor();
    await page.getByLabel('Tự cập nhật mỗi 30 giây').uncheck();
    for (let index = 0; index < 24; index++)
      assert.equal((await context.request.get(`${base}/bff/api/admin/me`)).status(), 200);
    const readOverview = async () =>
      (await context.request.get(`${base}/bff/api/analytics/observability?range=15m`)).json();
    const overview = await poll(
      readOverview,
      (result) =>
        result.metricsSource?.status === 'ready' &&
        result.summary.requests > 0 &&
        result.summary.p95Ms !== null,
      'Real metrics did not arrive',
    );
    assert(overview.services.some((service) => service.name === 'core-api' && service.isHealthy));
    await page.getByLabel('Khoảng thời gian', { exact: true }).selectOption('15m');
    await page.getByText('Đang gửi', { exact: true }).first().waitFor();
    await ui.refresh();
    await ui.snapshot('analytics_desktop_live.png');

    const filteredResponse = page.waitForResponse(
      (response) => response.url().includes('service=core-api') && response.ok(),
    );
    await page.getByLabel('Dịch vụ', { exact: true }).selectOption('core-api');
    await filteredResponse;
    await page.getByRole('button', { name: 'Traces', exact: true }).click();
    const readTraces = async () =>
      (
        await context.request.get(`${base}/bff/api/analytics/observability/traces?range=15m&service=core-api`)
      ).json();
    const traces = await poll(
      readTraces,
      (result) => result.source?.status === 'ready' && result.traces?.length > 0,
      'Real traces did not arrive',
    );
    await page.getByLabel('Tìm trace theo ID', { exact: true }).fill('invalid');
    await page.getByRole('button', { name: 'Mở trace', exact: true }).click();
    await page.getByText('Trace ID cần đủ 32 ký tự hex (0–9, a–f).', { exact: true }).waitFor();
    await page
      .getByLabel('Tìm trace theo ID', { exact: true })
      .fill(process.env.ANALYTICS_TRACE_ID || traces.traces[0].traceId);
    await page.getByRole('button', { name: 'Mở trace', exact: true }).click();
    await page.getByRole('heading', { name: 'Chi tiết trace', exact: true }).waitFor();
    await page
      .getByText(/HTTP \d{3}/)
      .first()
      .waitFor();
    await ui.snapshot('analytics_trace_live.png');
    const errorFilter = page.waitForResponse(
      (response) => response.url().includes('errorsOnly=true') && response.ok(),
    );
    await page.getByLabel('Chỉ trace có lỗi').check();
    await errorFilter;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Tổng quan', exact: true }).click();
    await ui.snapshot('analytics_mobile_live.png');

    // Exercise missing/unavailable data with API fixtures after capturing only live-data evidence.
    await page.route('**/bff/api/analytics/observability?*', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/bff/api/analytics/observability') return route.continue();
      return route.fulfill({
        json: {
          ...overview,
          summary: { requests: null, requestRate: null, errorRate: null, p50Ms: null, p95Ms: null },
          series: [],
          services: [],
          routes: [],
          metricsSource: { status: 'unavailable' },
        },
      });
    });
    await page.getByLabel('Khoảng thời gian', { exact: true }).selectOption('6h');
    await page
      .getByText('Không đọc được Prometheus. Kiểm tra nguồn metric và thử làm mới.', { exact: true })
      .waitFor();
    assert.equal(errors.length, 0, errors.join('\n'));

    // Actual role denial through the backend API is covered separately by Nest HTTP tests.
    console.log(
      JSON.stringify({
        passed: [
          'real BFF login',
          'real Prometheus metrics',
          'real Tempo trace detail',
          'range and service filters',
          'trace validation',
          'error filter',
          'mobile layout',
          'upstream outage state',
        ],
        requests: overview.summary.requests,
        traces: traces.traces.length,
        evidence: output,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
