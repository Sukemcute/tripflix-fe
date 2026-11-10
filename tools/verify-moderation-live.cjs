// Chạy trên stack LOCAL thật; không intercept/mock request. Chỉ thay đổi bài thử do script tạo.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const base = process.env.TF32_LIVE_API_URL || 'http://localhost:8080';
const admin = process.env.TF32_LIVE_ADMIN_URL || 'http://localhost:3200';
const output = process.env.TF32_EVIDENCE_DIR || join(tmpdir(), 'tripflix-tf32-live');
const password = process.env.TF32_LIVE_PASSWORD;
const moderatorEmail = process.env.TF32_LIVE_MODERATOR_EMAIL || 'moderator@tripflix.local';
const memberEmail = process.env.TF32_LIVE_MEMBER_EMAIL || 'member@tripflix.local';
const sessions = [];
const cleanupCases = [];
let createdPost;
let browser;
let activePage;
const uiHttpErrors = [];
function observe(page) {
  activePage = page;
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/') && response.status() >= 400)
      uiHttpErrors.push({ origin: url.origin, path: url.pathname, status: response.status() });
  });
}

async function api(path, { token, body, method = 'GET', expected = 200 } = {}) {
  const response = await fetch(base + '/api' + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(method !== 'GET' ? { 'Idempotency-Key': randomUUID() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, expected, `${method} ${path}: HTTP ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
async function login(email) {
  const session = await api('/auth/login', { method: 'POST', body: { email, password } });
  sessions.push(session);
  return session.accessToken;
}
class LiveAdminPage {
  constructor(page) {
    this.page = page;
  }
  async login() {
    await this.page.goto(`${admin}/login?returnTo=%2Fmoderation`, { timeout: 120000 });
    await this.page.getByLabel('Email', { exact: true }).fill(moderatorEmail);
    await this.page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await this.page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await this.page.getByRole('button', { name: 'Hàng chờ', exact: true }).waitFor();
  }
  async caseFor(commentId) {
    await this.page.getByRole('button', { name: 'Hàng chờ', exact: true }).click();
    const row = this.page.getByRole('row').filter({ hasText: commentId.slice(0, 8) });
    await row.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
    await this.panel.getByRole('combobox').waitFor();
  }
  get panel() {
    return this.page.getByRole('region', { name: 'Chi tiết hồ sơ' });
  }
  async decide(action) {
    await this.panel.getByRole('combobox').selectOption('HARASSMENT');
    const finished = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/(decisions|actions)$/.test(new URL(response.url()).pathname),
    );
    await this.panel.getByRole('button', { name: action, exact: true }).click();
    assert.equal((await finished).status(), 201);
    await this.panel.getByRole('status').waitFor();
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(output, name), fullPage: true });
  }
}

(async () => {
  if (!password)
    throw new Error(
      'Đặt TF32_LIVE_PASSWORD bằng mật khẩu tài khoản test local; không ghi token/password vào evidence.',
    );
  if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
    throw new Error('Script chỉ dành cho stack local.');
  await mkdir(output, { recursive: true });
  const moderator = await login(moderatorEmail);
  const member = await login(memberEmail);
  await api('/v1/admin/moderation/queue', { token: member, expected: 403 });
  const title = `TF32 LIVE ${Date.now()}`;
  createdPost = await api('/v1/posts', {
    token: member,
    method: 'POST',
    expected: 201,
    body: {
      post_type: 'vlog',
      title,
      body: 'Bài kiểm thử riêng cho kiểm duyệt. Không phải bài của người dùng.',
    },
  });
  await api(`/v1/posts/${createdPost.id}/publish`, { token: member, method: 'POST', expected: 201 });
  const add = (body, parent_comment_id) =>
    api(`/v1/posts/${createdPost.id}/comments`, {
      token: member,
      method: 'POST',
      expected: 201,
      body: { body, parent_comment_id },
    });
  const root = await add('Bình luận gốc kiểm thử thực tế');
  const reply = await add('Phản hồi được ẩn theo gốc', root.id);
  const separate = await add('Phản hồi bị ẩn riêng', root.id);
  const action = (id, action, expected = 201) =>
    api(`/v1/admin/moderation/comments/${id}/actions`, {
      token: moderator,
      method: 'POST',
      expected,
      body: { action, reasonCode: 'HARASSMENT' },
    });
  const count = async () => (await api(`/v1/posts/${createdPost.id}`)).post.commentCount;
  assert.equal(await count(), 3);
  await action(separate.id, 'hide');
  assert.equal(await count(), 2);
  const report = await api(`/v1/comments/${root.id}/reports`, {
    token: member,
    method: 'POST',
    expected: 201,
    body: { reasonCode: 'HARASSMENT', reasonDetail: 'TF32 LIVE: báo cáo để kiểm thử luồng thật' },
  });
  cleanupCases.push(report.caseId);

  browser = await chromium.launch({ channel: process.env.TF32_BROWSER_CHANNEL || 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  observe(page);
  const ui = new LiveAdminPage(page);
  await ui.login();
  if (process.env.TF32_LIVE_EXISTING_POST_ID) {
    const existing = await api(`/v1/admin/posts/${process.env.TF32_LIVE_EXISTING_POST_ID}`, {
      token: moderator,
    });
    await page.getByRole('button', { name: 'Quản lý bài viết', exact: true }).click();
    await page.getByRole('combobox').selectOption(existing.status);
    const targetRow = page.getByRole('row').filter({ hasText: existing.title });
    for (let index = 0; index < 20 && !(await targetRow.count()); index++) {
      const next = page.getByRole('button', { name: 'Xem thêm', exact: true });
      if (!(await next.count())) break;
      const previousCount = await page.getByRole('row').count();
      const nextPage = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/v1/admin/posts' &&
          new URL(response.url()).searchParams.has('cursor'),
      );
      await next.click();
      const response = await nextPage;
      if ((await response.json()).items?.length) await page.getByRole('row').nth(previousCount).waitFor();
    }
    await targetRow.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
    await page
      .getByRole('article', { name: 'Nội dung bài', exact: true })
      .getByRole('heading', { name: existing.title, exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole('region', { name: 'Nội dung bài', exact: true }).getByRole('alert').count(),
      0,
    );
    await ui.snapshot('live-original-post-detail-loaded.png');
  }
  await ui.caseFor(root.id);
  await ui.snapshot('live-queue-detail.png');
  await ui.decide('Ẩn');
  assert.equal(await count(), 0);
  assert.equal((await api(`/v1/posts/${createdPost.id}/comments?flat=true`)).items.length, 0);
  await ui.decide('Khôi phục');
  assert.equal(await count(), 2);
  const visible = (await api(`/v1/posts/${createdPost.id}/comments?flat=true`)).items
    .map((item) => item.id)
    .sort();
  assert.deepEqual(visible, [root.id, reply.id].sort());
  await ui.snapshot('live-comment-restored.png');

  await page.getByRole('button', { name: 'Quản lý bài viết', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: title });
  const detailResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === `/api/v1/admin/posts/${createdPost.id}`,
  );
  await row.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
  assert.equal((await detailResponse).status(), 200);
  await page
    .getByRole('article', { name: 'Nội dung bài', exact: true })
    .getByRole('heading', { name: title, exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole('region', { name: 'Nội dung bài', exact: true }).getByRole('alert').count(),
    0,
  );
  await ui.snapshot('live-post-detail-loaded.png');
  if (process.env.TF32_LIVE_MOBILE_URL) {
    const mobileBase = process.env.TF32_LIVE_MOBILE_URL;
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(mobileBase).hostname));
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    observe(mobilePage);
    await mobilePage.goto(`${mobileBase}/login?returnTo=${encodeURIComponent(`/trip/${createdPost.id}`)}`, {
      timeout: 120000,
    });
    await mobilePage.getByLabel('Email', { exact: true }).fill(memberEmail);
    await mobilePage.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await mobilePage.getByRole('button', { name: 'Đăng nhập & tiếp tục', exact: true }).click();
    await mobilePage.getByRole('button', { name: 'Báo cáo nội dung', exact: true }).click();
    await mobilePage.getByRole('radio', { name: 'Lý do khác', exact: true }).click();
    const reported = mobilePage.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/v1/posts/${createdPost.id}/reports`,
    );
    await mobilePage.getByRole('button', { name: 'Báo cáo nội dung', exact: true }).last().click();
    const reportResponse = await reported;
    assert.equal(reportResponse.status(), 201);
    cleanupCases.push((await reportResponse.json()).caseId);
    await mobilePage.getByText('Đã gửi báo cáo. Cảm ơn bạn đã giúp cộng đồng an toàn hơn.').waitFor();
    await mobilePage.screenshot({ path: join(output, 'live-mobile-web-report-sent.png') });
    await mobileContext.close();
  }
  await api(`/v1/admin/posts/${createdPost.id}/moderation-actions`, {
    token: moderator,
    method: 'POST',
    expected: 201,
    body: { action: 'hide', reason_code: 'OTHER' },
  });
  await api(`/v1/posts/${createdPost.id}`, { expected: 404 });
  if (process.env.TF32_LIVE_MOBILE_URL) {
    const anonymous = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const viewer = await anonymous.newPage();
    await viewer.goto(`${process.env.TF32_LIVE_MOBILE_URL}/trip/${createdPost.id}`);
    await viewer.getByText('Bài viết không còn khả dụng', { exact: true }).waitFor();
    assert.equal(await viewer.getByText(title, { exact: true }).count(), 0);
    await viewer.screenshot({ path: join(output, 'live-mobile-web-hidden-post.png') });
    await anonymous.close();
  }
  if (process.env.TF32_LIVE_WEB_URL) {
    const anonymous = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const viewer = await anonymous.newPage();
    const hiddenResponse = viewer.waitForResponse(
      (response) => new URL(response.url()).pathname === `/api/v1/posts/${createdPost.id}`,
    );
    await viewer.goto(`${process.env.TF32_LIVE_WEB_URL}/trips/${createdPost.id}`);
    assert.equal((await hiddenResponse).status(), 404);
    await viewer.getByRole('alert').first().waitFor();
    assert.equal(await viewer.getByText(title, { exact: true }).count(), 0);
    await viewer.screenshot({ path: join(output, 'live-web-hidden-post.png') });
    await anonymous.close();
  }
  await api(`/v1/admin/posts/${createdPost.id}/moderation-actions`, {
    token: moderator,
    method: 'POST',
    expected: 201,
    body: { action: 'restore', reason_code: 'OTHER' },
  });
  await action(root.id, 'hide');
  await action(root.id, 'hide');
  assert.equal(await count(), 0);
  await api(`/v1/comments/${root.id}`, { token: member, method: 'DELETE' });
  assert.equal(await count(), 0);
  await action(root.id, 'restore', 409);
  const log = await api(`/v1/admin/moderation/actions?targetId=${root.id}`, { token: moderator });
  assert.ok(log.items.some((item) => item.action === 'hide'));
  assert.ok(log.items.some((item) => item.action === 'restore'));
  assert.deepEqual(errors, []);
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  console.log(
    JSON.stringify({
      realStack: true,
      apiMocks: false,
      originalPostChecked: Boolean(process.env.TF32_LIVE_EXISTING_POST_ID),
      mobileWebChecked: Boolean(process.env.TF32_LIVE_MOBILE_URL),
      webChecked: Boolean(process.env.TF32_LIVE_WEB_URL),
      postId: createdPost.id,
      caseId: report.caseId,
      passed: [
        'real-admin-login',
        'member-403',
        'report-queue-detail',
        'ui-hide-cascade',
        'ui-restore-provenance',
        'flat-comments-filter',
        'actual-post-detail-200',
        'hidden-post-404',
        'repeated-hide-no-double-count',
        'delete-hidden-no-double-count',
        'deleted-restore-409',
        'audit-log',
      ],
      output,
    }),
  );
})()
  .catch(async (error) => {
    console.error(error.message);
    if (activePage && !activePage.isClosed()) {
      await activePage.screenshot({ path: join(output, 'live-failure.png'), fullPage: true }).catch(() => {});
      console.error(
        JSON.stringify({
          page: activePage.url(),
          uiHttpErrors,
          visibleText: (await activePage.locator('body').innerText()).slice(0, 1800),
        }),
      );
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    for (const caseId of cleanupCases)
      if (sessions[0])
        await api(`/v1/admin/moderation/queue/${caseId}/decisions`, {
          token: sessions[0].accessToken,
          method: 'POST',
          expected: 201,
          body: { action: 'dismiss', reasonCode: 'OTHER' },
        }).catch(() => {});
    if (createdPost && sessions[1])
      await api(`/v1/posts/${createdPost.id}`, { token: sessions[1].accessToken, method: 'DELETE' }).catch(
        () => {},
      );
    for (const session of sessions)
      await api('/auth/logout', {
        token: session.accessToken,
        method: 'POST',
        expected: 204,
        body: { refreshToken: session.refreshToken },
      }).catch(() => {});
  });
