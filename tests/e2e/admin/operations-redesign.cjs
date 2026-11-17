// Browser fixtures exercise UI states; backend socket ACL and BFF bridge have separate tests.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const base = process.env.ADMIN_TEST_URL || 'http://localhost:3210';
const output = process.env.ADMIN_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'tripflix-admin-redesign');
const uid = '11111111-1111-4111-8111-111111111111';
const memberId = '22222222-2222-4222-8222-222222222222';
const now = new Date().toISOString();
const stats = {
  pendingTotal: 24,
  pendingUrgent: 3,
  pendingPosts: 18,
  pendingComments: 6,
  oldestPendingAt: now,
  autoHidden24h: 8,
  reports24h: 12,
  pendingAppeals: 2,
  failedScans: 1,
  deferredScans: 4,
  urgentSeverity: 80,
  generatedAt: now,
};
const profile = {
  id: uid,
  email: 'admin@example.test',
  displayName: 'Nguyễn Thu Trang',
  role: 'superadmin',
  emailVerified: true,
  createdAt: now,
};
const cases = [
  'Có dấu hiệu yêu cầu chuyển khoản ngoài nền tảng',
  'Bình luận cần đối chiếu ngữ cảnh báo cáo',
  'Nội dung bị bộ lọc giữ để kiểm tra',
].map((preview, index) => ({
  id: `33333333-3333-4333-8333-33333333333${index}`,
  targetType: index === 1 ? 'comment' : 'post',
  targetId: memberId,
  postId: memberId,
  authorId: memberId,
  status: 'pending',
  sources: ['rule', 'report'],
  severity: [90, 65, 50][index],
  flags: {},
  reportCount: [4, 2, 0][index],
  isAutoHidden: false,
  resolution: null,
  createdAt: now,
  updatedAt: now,
  targetPreview: preview,
}));
const log = {
  id: uid,
  targetType: 'post',
  postId: memberId,
  commentId: null,
  moderatorId: uid,
  actorType: 'staff',
  action: 'hide',
  reasonCode: 'SCAM',
  reasonDetail: null,
  createdAt: now,
  contentVersion: null,
  policyVersion: null,
  evidenceSnapshot: null,
};
const runs = [0, 1, 2].map((index) => ({
  runId: String(index),
  trigger: 'schedule',
  startedAt: Date.now() - index * 300_000,
  finishedAt: Date.now() - index * 300_000 + 200,
  outcome: 'succeeded',
  durationMs: 180 + index * 73,
  summary: { count: 24 + index },
  error: null,
}));
const pages = [
  '/',
  '/moderation',
  '/staff',
  '/search-monitor',
  '/search-jobs',
  '/recommend-jobs',
  '/inventory',
  '/alerts',
  '/audit',
  '/reports',
  '/analytics',
  '/orders',
];

class AdminPage {
  constructor(page) {
    this.page = page;
  }
  async open(path) {
    await this.page.goto(base + path);
    await this.page
      .getByRole('navigation', { name: 'Điều hướng quản trị', includeHidden: true })
      .waitFor({ state: 'attached' });
    await this.page.locator('main[aria-busy=true]').waitFor({ state: 'hidden' });
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(output, name), fullPage: true });
  }
}

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let role = 'superadmin';
  let failStats = false;
  let emptyQueue = false;
  const changes = [];
  await context.route('**/bff/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/bff', '');
    const send = (body) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 204 });
    if (path.endsWith('/auth/me') || path.endsWith('/admin/me')) return send({ ...profile, role });
    if (path.endsWith('/admin/realtime'))
      return route.fulfill({ contentType: 'text/event-stream', body: 'event: ready\ndata: {}\n\n' });
    if (path.endsWith('/moderation/stats'))
      return failStats
        ? route.fulfill({ status: 503 })
        : send(
            emptyQueue
              ? { ...stats, pendingTotal: 0, pendingUrgent: 0, pendingPosts: 0, pendingComments: 0 }
              : stats,
          );
    if (path.endsWith('/moderation/queue'))
      return send({ items: emptyQueue ? [] : cases, total: emptyQueue ? 0 : 24, nextCursor: null });
    if (path.endsWith('/moderation/actions')) return send({ items: [log], nextCursor: null });
    if (path.includes('/moderation/queue/'))
      return send({
        ...cases[0],
        target: { text: cases[0].targetPreview, status: 'held', coverMediaId: null },
        reports: [],
        actions: [log],
      });
    if (path.endsWith('/admin/staff')) return send([profile]);
    if (path === '/api/admin/users' && request.method() === 'GET')
      return send({
        items: [
          {
            id: memberId,
            displayName: 'Trần Minh Anh',
            email: 'member@example.test',
            role: 'member',
            status: 'active',
            createdAt: now,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      });
    if (path === '/api/admin/users' && request.method() === 'POST') {
      changes.push(request.postDataJSON());
      return send({ ...profile, id: memberId, role: 'moderator' });
    }
    if (path.endsWith('/admin/search/index-health'))
      return send({
        checkedAt: Date.now(),
        workers: [
          {
            id: 'index-1',
            name: 'Search index worker',
            status: 'healthy',
            lastSeenAt: Date.now(),
            jobs: [],
            history: [],
          },
        ],
      });
    if (path.endsWith('/discovery/jobs'))
      return send({
        checkedAt: Date.now(),
        jobs: [
          {
            job: url.searchParams.get('group') === 'search' ? 'explore' : 'recommend_build',
            group: url.searchParams.get('group'),
            intervalMs: 300_000,
            defaultIntervalMs: 300_000,
            canChangeInterval: true,
            isRunning: false,
            runs,
          },
        ],
        recommendStats: null,
      });
    if (path.includes('vocab') && path.includes('gaps'))
      return send({ items: [], queries: 0, days: 7, checkedAt: Date.now(), total: 0, nextCursor: null });
    if (path.endsWith('/moderation/appeals') || path.endsWith('/moderation/scans/failed'))
      return send({ items: [], nextCursor: null });
    if (path === '/api/v1/admin/posts') return send({ items: [], total: 0, next_cursor: null });
    return send({ items: [], total: 0, nextCursor: null });
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const ui = new AdminPage(page);
    for (const path of pages) {
      await ui.open(path);
      await page.getByRole('heading').first().waitFor();
      if (path === '/') await page.getByText(cases[0].targetPreview, { exact: true }).waitFor();
      if (path === '/staff') await page.getByText('Trần Minh Anh', { exact: true }).waitFor();
      if (path.endsWith('jobs')) await page.getByRole('table').first().waitFor();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `overflow: ${path}`,
      );
      await ui.snapshot(`${path === '/' ? 'overview' : path.slice(1)}-1440.png`);
    }
    failStats = true;
    await ui.open('/');
    await page.getByRole('alert').first().waitFor();
    assert.equal(await page.getByText('Đã xử lý hết hàng chờ', { exact: true }).count(), 0);
    await ui.snapshot('overview-error-1440.png');
    failStats = false;
    emptyQueue = true;
    await ui.open('/');
    await page.getByText('Đã xử lý hết hàng chờ', { exact: true }).first().waitFor();
    await ui.snapshot('overview-empty-1440.png');
    emptyQueue = false;
    await ui.open('/reports');
    const downloadReady = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Tải CSV', exact: true }).click();
    const download = await downloadReady;
    assert.match(await require('node:fs/promises').readFile(await download.path(), 'utf8'), /SCAM/);
    await ui.open('/staff');
    await page.getByRole('button', { name: 'Tạo tài khoản nhân sự', exact: false }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Tên hiển thị', { exact: true }).fill('Nhân sự kiểm thử');
    await dialog.getByLabel('Email', { exact: true }).fill('new@example.test');
    await dialog.getByRole('button', { name: 'Tạo tài khoản nhân sự', exact: true }).click();
    await dialog.getByText('Đã tạo nhân sự. Email đặt mật khẩu đã được gửi.').waitFor();
    assert.equal(changes.at(-1).role, 'moderator');
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.getByRole('button', { name: 'Cấp quyền kiểm duyệt', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Huỷ', exact: true }).click();
    await ui.open('/moderation');
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('heading', { name: 'Chi tiết nội dung kiểm duyệt' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/moderation', '/staff', '/search-jobs', '/inventory']) {
      await ui.open(path);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `mobile overflow: ${path}`,
      );
      await ui.snapshot(`${path === '/' ? 'overview' : path.slice(1)}-390.png`);
    }
    await page.getByRole('button', { name: 'Mở điều hướng', exact: true }).click();
    await page.getByRole('navigation').getByRole('link', { name: 'Kiểm duyệt', exact: false }).click();
    await page.waitForURL('**/moderation');
    assert.equal(
      await page.getByRole('button', { name: 'Mở điều hướng' }).getAttribute('aria-expanded'),
      'false',
    );
    role = 'moderator';
    await ui.open('/');
    assert.equal(
      await page
        .getByRole('navigation', { includeHidden: true })
        .getByRole('link', { name: 'Phân quyền & Nhân sự', includeHidden: true })
        .count(),
      0,
    );
    await ui.open('/staff');
    await page.getByText('Tính năng này dành cho quản trị viên cao nhất.', { exact: true }).waitFor();
    await page.goto(base + '/login');
    await page.getByRole('heading', { name: 'Đăng nhập quản trị', exact: true }).waitFor();
    await ui.snapshot('login-390.png');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, pages: pages.length, output, fixtureData: true }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
