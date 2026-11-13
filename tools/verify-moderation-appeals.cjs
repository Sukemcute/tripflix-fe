// UI contract check with mocked API; database invariants live in BE integration tests.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const output = process.env.MODERATION_QA_OUTPUT || path.resolve('../../outputs/moderation-p0-20261113');
const id = '11111111-1111-4111-8111-111111111111';
const createdAt = '2026-11-13T00:00:00.000Z';

class AuthorPage {
  constructor(page) {
    this.page = page;
  }
  async submitAppeal() {
    await this.page.getByRole('button', { name: 'Gửi khiếu nại', exact: true }).click();
    await this.page
      .getByLabel('Lý do khiếu nại', { exact: true })
      .fill('Đây là phản ánh dịch vụ, đề nghị xem lại.');
    await this.page.getByRole('button', { name: 'Gửi', exact: true }).click();
    await this.page.getByText('Khiếu nại: Đang xem xét').waitFor();
  }
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 950 } });
      let appealed = false;
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/notifications'))
          return route.continue();
        const headers = {
          'access-control-allow-origin': request.headers().origin || '*',
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
        };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        let data = {};
        if (url.pathname.endsWith('/auth/refresh'))
          data = { accessToken: 'mock-session', tokenType: 'Bearer', expiresIn: 3600 };
        else if (url.pathname.endsWith('/auth/me'))
          data = {
            id,
            email: 'member@example.test',
            displayName: 'Thành viên',
            role: 'member',
            emailVerified: true,
            createdAt,
          };
        else if (url.pathname.endsWith('/me/moderation/decisions'))
          data = {
            items: [
              {
                id,
                targetType: 'comment',
                postId: id,
                commentId: id,
                action: 'hide',
                reasonCode: 'HARASSMENT',
                createdAt,
                canAppeal: !appealed,
                appealStatus: appealed ? 'pending' : null,
              },
              {
                id: 'old',
                targetType: 'comment',
                postId: id,
                commentId: id,
                action: 'hide',
                reasonCode: 'OTHER',
                createdAt,
                canAppeal: false,
                appealStatus: null,
              },
            ],
            nextCursor: null,
          };
        else if (url.pathname.endsWith('/me/reports'))
          data = {
            items: [
              { id, targetType: 'post', targetId: id, reasonCode: 'SCAM', createdAt, caseStatus: 'resolved' },
            ],
            nextCursor: null,
          };
        else if (url.pathname.endsWith(`/decisions/${id}/appeals`)) {
          assert.ok(request.headers()['idempotency-key']);
          assert.match(request.postDataJSON().reason, /phản ánh dịch vụ/);
          appealed = true;
          data = { id, status: 'pending' };
        } else if (url.pathname.startsWith('/notifications'))
          data = { items: [], nextCursor: null, unreadCount: 0 };
        await route.fulfill({
          status: 200,
          headers,
          contentType: 'application/json',
          body: JSON.stringify(data),
        });
      });
      await page.goto(`${process.env.MODERATION_WEB_URL || 'http://localhost:3101'}/account/moderation`);
      await page.getByRole('button', { name: 'Gửi khiếu nại', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Gửi khiếu nại', exact: true }).count(), 1);
      await page.getByText('Đã có kết quả xử lý', { exact: false }).waitFor();
      await new AuthorPage(page).submitAppeal();
      assert.equal(appealed, true);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, `author-${width}.png`), fullPage: true });
      await context.close();
      process.stdout.write(`Author appeal + reports at ${width}px: passed\n`);
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    let resolved = false;
    let sameReviewer = true;
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/notifications'))
        return route.continue();
      const headers = {
        'access-control-allow-origin': request.headers().origin || '*',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
      };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let data = { items: [], total: 0, nextCursor: null };
      if (url.pathname.endsWith('/auth/refresh'))
        data = { accessToken: 'mock-session', tokenType: 'Bearer', expiresIn: 3600 };
      else if (url.pathname.endsWith('/auth/me') || url.pathname.endsWith('/admin/me'))
        data = {
          id,
          email: 'moderator@example.test',
          displayName: 'Moderator',
          role: 'moderator',
          emailVerified: true,
          createdAt,
        };
      else if (url.pathname.endsWith('/admin/moderation/appeals'))
        data = {
          items: resolved
            ? []
            : [
                {
                  appeal: { id, reason: 'Đề nghị kiểm tra lại phản ánh', createdAt, authorId: id },
                  decision: {
                    id,
                    targetType: 'comment',
                    postId: id,
                    commentId: id,
                    action: 'hide',
                    reasonCode: 'HARASSMENT',
                    moderatorId: sameReviewer ? id : 'other',
                    actorType: 'staff',
                    contentVersion: createdAt,
                  },
                  targetText: 'Dịch vụ chưa tốt',
                  targetStatus: 'hidden',
                },
              ],
          nextCursor: null,
        };
      else if (url.pathname.endsWith(`/appeals/${id}/decisions`)) {
        assert.equal(request.postDataJSON().outcome, 'overturned');
        assert.ok(request.headers()['idempotency-key']);
        resolved = true;
        data = { status: 'overturned' };
      }
      await route.fulfill({
        status: 200,
        headers,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    });
    await page.goto(`${process.env.MODERATION_ADMIN_URL || 'http://localhost:3200'}/moderation`);
    await page.getByRole('button', { name: 'Khiếu nại', exact: true }).click();
    await page
      .getByText('Bạn đã ra quyết định gốc. Cần một kiểm duyệt viên khác xét khiếu nại này.', { exact: true })
      .waitFor();
    assert.ok(await page.getByRole('button', { name: 'Giữ quyết định', exact: true }).isDisabled());
    assert.ok(await page.getByRole('button', { name: 'Chấp nhận khiếu nại', exact: true }).isDisabled());
    sameReviewer = false;
    await page.reload();
    await page.getByRole('button', { name: 'Khiếu nại', exact: true }).click();
    await page.getByText('Dịch vụ chưa tốt', { exact: false }).waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole('region', { name: 'Hàng chờ khiếu nại' }).scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 2));
      await page.screenshot({ path: path.join(output, `admin-appeals-${width}.png`) });
    }
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Chấp nhận khiếu nại', exact: true }).click();
    await page.getByText('Không có khiếu nại đang chờ.', { exact: true }).waitFor();
    assert.equal(resolved, true);
    await page.screenshot({ path: path.join(output, 'admin-appeal-resolved.png'), fullPage: true });
    await context.close();
    process.stdout.write('Admin review and overturn: passed\n');
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  process.stderr.write(String(error.stack || error));
  process.exitCode = 1;
});
