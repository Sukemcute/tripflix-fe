// PLAYWRIGHT_PACKAGE trỏ tới runtime có sẵn; không thêm dependency vào app.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const base = process.env.TF32_ADMIN_URL || 'http://localhost:3201';
const output = process.env.TF32_EVIDENCE_DIR || join(tmpdir(), 'tripflix-tf32');
const id = '11111111-1111-4111-8111-111111111111';
const timestamp = '2026-11-09T05:00:00Z';

class ModerationPage {
  constructor(page) {
    this.page = page;
  }
  async open() {
    await this.page.goto(`${base}/moderation`);
    await this.page.getByRole('button', { name: 'Hàng chờ', exact: true }).waitFor();
  }
  async detail() {
    await this.page.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
    await this.page.getByRole('heading', { name: 'Chi tiết hồ sơ' }).waitFor();
  }
  get panel() {
    return this.page.getByRole('region', { name: 'Chi tiết hồ sơ' });
  }
  get reason() {
    return this.panel.getByRole('combobox');
  }
  get hide() {
    return this.panel.getByRole('button', { name: 'Ẩn', exact: true });
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(output, name), fullPage: true });
  }
}

async function run(viewport) {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.TF32_BROWSER_CHANNEL || 'msedge',
  });
  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const state = { resolved: false, attempts: 0, decision: null, log: [] };
    const item = () => ({
      id,
      targetType: 'comment',
      targetId: id,
      postId: id,
      authorId: id,
      status: state.resolved ? 'resolved' : 'pending',
      sources: ['rule', 'report'],
      severity: 95,
      reportCount: 2,
      flags: { rules: [{ code: 'PHONE_VN', match: '0912345678' }], aiUnavailable: true },
      isAutoHidden: false,
      resolution: state.resolved ? 'hide' : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await context.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = {
        'access-control-allow-origin': request.headers().origin || new URL(base).origin,
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
      };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let body = {};
      let status = 200;
      if (url.pathname.endsWith('/auth/refresh'))
        body = { accessToken: 'mock-session', tokenType: 'Bearer', expiresIn: 3600 };
      else if (url.pathname.endsWith('/auth/me') || url.pathname.endsWith('/admin/me'))
        body = {
          id,
          email: 'moderator@example.test',
          displayName: 'Trang',
          role: 'moderator',
          emailVerified: true,
          createdAt: timestamp,
        };
      else if (url.pathname.endsWith('/decisions')) {
        assert.ok(request.headers()['idempotency-key']);
        state.attempts++;
        state.decision = request.postDataJSON();
        if (state.attempts === 1) {
          status = 503;
          body = { message: 'mock retryable error' };
        } else {
          state.resolved = true;
          state.log = [
            {
              id,
              postId: id,
              commentId: id,
              targetType: 'comment',
              moderatorId: id,
              actorType: 'staff',
              action: 'hide',
              reasonCode: state.decision.reasonCode,
              reasonDetail: state.decision.reasonDetail,
              createdAt: timestamp,
            },
          ];
          body = { actionId: id, changedCount: 3, previousStatus: 'visible', status: 'hidden' };
        }
      } else if (url.pathname.endsWith(`/queue/${id}`))
        body = {
          ...item(),
          target: {
            text: 'Mời chuyển khoản đặt cọc STK 012345678901. Liên hệ 0912345678.',
            status: state.resolved ? 'hidden' : 'visible',
            coverMediaId: null,
          },
          reports: [
            {
              id,
              reporterId: id,
              reasonCode: 'SCAM',
              reasonDetail: 'Có dấu hiệu kéo chuyển tiền ngoài app',
              createdAt: timestamp,
            },
          ],
          actions: state.log,
        };
      else if (url.pathname.endsWith('/queue')) {
        const items = state.resolved ? [] : [item()];
        body = { items, total: items.length, nextCursor: null };
      } else if (url.pathname.endsWith('/actions')) body = { items: state.log, nextCursor: null };
      return route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const ui = new ModerationPage(page);
    await ui.open();
    await ui.detail();
    assert.equal(await ui.hide.isDisabled(), true, 'Chưa chọn lý do phải khoá thao tác');
    await ui.snapshot(`admin-${viewport.width}-queue.png`);
    await ui.reason.selectOption('SCAM');
    const note = ui.panel.getByLabel('Ghi chú (tối đa 500 ký tự)');
    await note.fill('Kiểm tra thông tin chuyển khoản');
    await ui.hide.click();
    await ui.panel.getByRole('alert').waitFor();
    assert.equal(await ui.reason.inputValue(), 'SCAM');
    assert.equal(await note.inputValue(), 'Kiểm tra thông tin chuyển khoản');
    await ui.hide.click();
    await ui.panel.getByRole('status').waitFor();
    assert.equal(state.attempts, 2);
    assert.equal(state.decision.reasonCode, 'SCAM');
    await page.getByRole('button', { name: 'Nhật ký thao tác', exact: true }).click();
    await page.getByRole('cell', { name: 'Kiểm tra thông tin chuyển khoản', exact: false }).waitFor();
    await ui.snapshot(`admin-${viewport.width}-log.png`);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'Trang không tràn ngang',
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        viewport,
        passed: [
          'queue',
          'required-reason',
          'failed-save-keeps-draft',
          'retry-success',
          'idempotency-header',
          'audit-log',
          'no-page-overflow',
        ],
        output,
      }),
    );
  } finally {
    await browser.close();
  }
}
(async () => {
  await mkdir(output, { recursive: true });
  await run({ width: 1440, height: 1000 });
  await run({ width: 390, height: 844 });
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
