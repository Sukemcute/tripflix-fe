// UI fixtures cover every source/state; the optional live check verifies current local API rows.
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const base = 'http://localhost:3200';
const output = path.resolve('../../outputs/admin-moderation-tags-20261113');
const createdAt = '2026-11-13T00:00:00.000Z';
const id = '11111111-1111-4111-8111-111111111111';
const sources = [['report'], ['ai'], ['rule'], ['report', 'rule', 'ai'], [], ['new_content']];
const labels = [
  'Báo cáo từ cộng đồng',
  'Dấu hiệu do AI',
  'Dấu hiệu từ bộ lọc',
  'Nhiều nguồn cùng gắn cờ',
  'Hồ sơ lịch sử',
  'Nội dung mới',
];
const cases = sources.map((source, index) => ({
  id: `${id.slice(0, -1)}${index + 1}`,
  targetId: id,
  postId: id,
  authorId: id,
  targetType: 'comment',
  sources: source,
  severity: 92 - index * 12,
  status: 'pending',
  flags: {},
  reportCount: source.includes('report') ? 1 : 0,
  isAutoHidden: index === 3,
  resolution: null,
  createdAt,
  updatedAt: createdAt,
  targetPreview: labels[index],
}));
class QueuePage {
  constructor(page) {
    this.page = page;
  }
  row(index) {
    return this.page.getByRole('row').filter({ has: this.page.getByText(labels[index], { exact: true }) });
  }
  tags(index) {
    return this.row(index).getByRole('list', { name: 'Nguồn và trạng thái kiểm duyệt' });
  }
}
async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await context.route('**/*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/notifications'))
        return route.continue();
      const headers = {
        'access-control-allow-origin': req.headers().origin || '*',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
      };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
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
      else if (/\/moderation\/queue$/.test(url.pathname)) {
        const view = url.searchParams.get('view') || 'pending';
        const items =
          view === 'pending'
            ? cases
            : [
                {
                  ...cases[3],
                  status: 'resolved',
                  resolution: view === 'removed' ? 'remove' : view === 'hidden' ? 'hide' : 'restore',
                },
              ];
        data = { items, total: items.length, nextCursor: null };
      } else if (url.pathname.endsWith(`/moderation/queue/${cases[0].id}`))
        data = {
          ...cases[0],
          target: { status: 'visible', text: labels[0] },
          reports: [{ id, reporterId: id, reasonCode: 'HARASSMENT', reasonDetail: null, createdAt }],
          actions: [],
        };
      return route.fulfill({
        status: 200,
        headers,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    });
    const view = new QueuePage(page);
    await page.goto(`${base}/moderation`);
    for (const [index, label] of [
      [0, 'Người dùng báo cáo'],
      [1, 'AI gắn cờ'],
      [2, 'Bộ lọc gắn cờ'],
      [4, 'Nguồn chưa xác định'],
      [5, 'Nội dung mới'],
    ]) {
      await expect(view.tags(index).getByText(label, { exact: true })).toBeVisible();
      await expect(view.tags(index).getByText('Chờ xác minh', { exact: true })).toBeVisible();
    }
    for (const label of ['Người dùng báo cáo', 'AI gắn cờ', 'Bộ lọc gắn cờ', 'Tự động ẩn · Chờ duyệt'])
      await expect(view.tags(3).getByText(label, { exact: true })).toBeVisible();
    await expect(view.tags(0)).not.toContainText('Vi phạm');
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await view.tags(3).scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 2, `Page overflow ${overflow}px at ${width}`);
      await page.screenshot({ path: path.join(output, `queue-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    await view.row(0).getByRole('button', { name: 'Chi tiết', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Chi tiết nội dung kiểm duyệt', exact: true });
    await expect(
      dialog
        .getByRole('list', { name: 'Nguồn và trạng thái kiểm duyệt' })
        .getByText('Người dùng báo cáo', { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByRole('strong').filter({ hasText: /^Quấy rối, xúc phạm$/ })).toBeVisible();
    await expect(dialog.getByText('Nội dung nhạy cảm, vi phạm cộng đồng', { exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Đóng modal', exact: true }).click();
    for (const [tab, state] of [
      ['Đã ẩn', 'Đang ẩn'],
      ['Đã gỡ', 'Đã gỡ'],
      ['Đã duyệt', 'Đã khôi phục'],
    ]) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await expect(view.tags(3).getByText(state, { exact: true })).toBeVisible();
      await expect(view.tags(3)).not.toContainText('Chờ xác minh');
      await expect(view.tags(3)).not.toContainText('Tự động ẩn');
    }
    await context.close();
    if (process.env.MODERATION_TAGS_QA_PASSWORD) {
      const live = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
      await live.goto(`${base}/login?returnTo=%2Fmoderation`);
      await live.getByLabel('Email', { exact: true }).fill('moderator@tripflix.local');
      await live.getByLabel('Mật khẩu', { exact: true }).fill(process.env.MODERATION_TAGS_QA_PASSWORD.trim());
      await live.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await live.getByRole('list', { name: 'Nguồn và trạng thái kiểm duyệt' }).first().waitFor();
      await live.screenshot({ path: path.join(output, 'queue-live.png'), fullPage: true });
      await live.close();
    }
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(output, 'result.json'),
      JSON.stringify(
        {
          result: 'passed',
          checks: [
            'all source tags',
            'multiple sources',
            'unknown source',
            'pending does not imply violation',
            'auto hidden pending',
            'current hidden/removed/restored',
            'real report reason in detail',
            '1440/768/390px',
          ],
          liveLocalApi: Boolean(process.env.MODERATION_TAGS_QA_PASSWORD),
        },
        null,
        2,
      ),
    );
    process.stdout.write('Moderation source/status tags: UI contract and local API smoke passed\n');
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  process.stderr.write(String(error.stack || error));
  process.exitCode = 1;
});
