const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const id = '11111111-1111-4111-8111-111111111111';
const base = process.env.TF32_MOBILE_WEB_URL || 'http://localhost:8084';
const output = process.env.TF32_EVIDENCE_DIR || join(tmpdir(), 'tripflix-tf32');

class ReportPage {
  constructor(page) {
    this.page = page;
  }
  async open() {
    await this.page.goto(`${base}/trip/${id}`, { timeout: 120000 });
    await this.page.getByRole('button', { name: 'Báo cáo nội dung', exact: true }).waitFor();
  }
  async report() {
    await this.page.getByRole('button', { name: 'Báo cáo nội dung', exact: true }).click();
    await this.page.getByRole('radio', { name: 'Lừa đảo' }).waitFor();
  }
}
(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.TF32_BROWSER_CHANNEL || 'msedge',
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const state = { missing: false, reports: 0 };
    await context.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = {
        'access-control-allow-origin': request.headers().origin || base,
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
      };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let status = 200;
      let body = {};
      if (url.pathname.endsWith('/auth/refresh'))
        body = { accessToken: 'mock-session', tokenType: 'Bearer', expiresIn: 3600 };
      else if (url.pathname.endsWith('/auth/me'))
        body = {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'member@example.test',
          displayName: 'Người xem',
          role: 'member',
          emailVerified: true,
          createdAt: new Date().toISOString(),
        };
      else if (url.pathname.endsWith('/reports')) {
        assert.ok(request.headers()['idempotency-key']);
        const input = request.postDataJSON();
        assert.equal(input.reasonCode, 'SCAM');
        state.reports++;
        status = 201;
        body = { id };
      } else if (url.pathname.endsWith('/comments'))
        body = { items: [], total: 0, nextCursor: null, hasMore: false };
      else if (url.pathname.endsWith('/ai-summary')) status = 404;
      else if (url.pathname.endsWith(`/posts/${id}`)) {
        status = state.missing ? 404 : 200;
        body = state.missing
          ? {}
          : {
              post: {
                id,
                authorId: id,
                title: 'Bài dùng kiểm tra báo cáo',
                body: 'Nội dung bài thử',
                status: 'published',
                mediaIds: [],
                hashtags: [],
                createdAt: new Date().toISOString(),
                tripAttachment: null,
                reactionTotal: 0,
                commentCount: 0,
                bookmarkCount: 0,
                shareCount: 0,
              },
              viewerContext: { myReaction: null, isBookmarked: false },
              shareUrl: `${base}/trip/${id}`,
            };
      }
      return route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const ui = new ReportPage(page);
    await ui.open();
    await ui.report();
    await page.getByRole('radio', { name: 'Lừa đảo' }).click();
    await page.getByLabel('Ghi chú (tối đa 500 ký tự)').fill('Mời chuyển tiền ngoài app');
    await page.screenshot({ path: join(output, 'mobile-web-report.png') });
    await page.getByRole('button', { name: 'Báo cáo nội dung', exact: true }).last().click();
    await page.getByText('Đã gửi báo cáo. Cảm ơn bạn đã giúp cộng đồng an toàn hơn.').waitFor();
    assert.equal(state.reports, 1);
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    state.missing = true;
    await page.reload();
    await page.getByText('Bài viết không còn khả dụng', { exact: true }).waitFor();
    assert.equal(await page.getByText('Nội dung bài thử', { exact: true }).count(), 0);
    await page.screenshot({ path: join(output, 'mobile-web-post-unavailable.png') });
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        passed: [
          'report-modal',
          'reason-and-note',
          'authenticated-post',
          'idempotency-header',
          'success',
          '404-without-stale-content',
        ],
        output,
        platform: 'Expo web; không thay cho kiểm tra Android',
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
