// PLAYWRIGHT_PACKAGE trỏ tới runtime sẵn có, không thêm dependency.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const output = process.env.HELD_EVIDENCE_DIR || join(tmpdir(), 'tripflix-held');
const base = process.env.HELD_ADMIN_URL || 'http://localhost:3201';
const id = '11111111-1111-4111-8111-111111111111';
const caseId = '22222222-2222-4222-8222-222222222222';
const now = '2026-11-16T07:00:00.000Z';
const post = {
  id, title: 'Bài đang kiểm tra TF91', body: 'Nội dung được giữ để staff kiểm tra', post_type: 'vlog',
  status: 'held', visibility: 'public', is_verified: false,
  author: { id, display_name: 'Tác giả kiểm thử' }, media_ids: [], cover_media_id: null,
  hashtags: [], trip_attachment: null, reaction_counts: {}, reaction_total: 0, comment_count: 0,
  bookmark_count: 0, share_count: 0, created_at: now, updated_at: now, moderation_history: [],
};
const item = {
  id: caseId, targetId: id, targetType: 'post', postId: id, authorId: id, status: 'pending',
  sources: ['rule'], severity: 90, flags: {}, reportCount: 0, isAutoHidden: false,
  resolution: null, createdAt: now, updatedAt: now, targetPreview: post.body,
};
class HeldAdminPage {
  constructor(page) { this.page = page; }
  async open() {
    await this.page.goto(`${base}/moderation`);
    await this.page.getByRole('button', { name: 'Quản lý bài viết', exact: true }).click();
    await this.page.getByText(post.title, { exact: true }).waitFor();
  }
  async detail() { await this.page.getByRole('button', { name: 'Xem chi tiết', exact: true }).click(); }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(output, name), fullPage: true });
  }
}
async function run() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const requests = [];
    await context.route('**/api/**', async route => {
      const req = route.request(); const path = new URL(req.url()).pathname.replace(/^\/bff/, '').replace(/^\/api\/api\//, '/api/');
      const headers = { 'access-control-allow-origin': new URL(base).origin,
        'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let body;
      if (path.endsWith('/auth/refresh')) body = { accessToken: 'test-session', tokenType: 'Bearer', expiresIn: 3600 };
      else if (path.endsWith('/auth/me') || path.endsWith('/admin/me')) body = { id, email: 'staff@example.test',
        displayName: 'Trang', role: 'moderator', emailVerified: true, createdAt: now };
      else if (path.endsWith('/moderation/stats')) body = { pendingTotal: 1, pendingUrgent: 1, autoHidden24h: 0, reports24h: 0, generatedAt: now };
      else if (path === '/api/v1/admin/posts') body = { items: [post], next_cursor: null };
      else if (path === `/api/v1/admin/posts/${id}`) body = post;
      else if (req.method() === 'POST') { requests.push(req.postDataJSON()); body = { status: 'published' }; }
      else if (path.includes(`/moderation/queue/${caseId}`)) body = { ...item,
        target: { status: 'held', text: post.body, mediaIds: [], postId: id }, reports: [], actions: [], scans: [] };
      else body = { items: [item], total: 1, nextCursor: null };
      return route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    const ui = new HeldAdminPage(page);
    await ui.open();
    assert.ok(await page.getByText('Đang kiểm tra', { exact: true }).count());
    await ui.detail();
    const release = page.getByRole('button', { name: 'Cho hiển thị', exact: true });
    await release.waitFor();
    assert.equal(await release.isDisabled(), true);
    const reason = page.getByRole('combobox').last();
    await reason.selectOption('OTHER');
    assert.equal(await release.isEnabled(), true);
    await ui.snapshot('held-post-1440.png');
    await release.click();
    await page.getByText('Đã lưu', { exact: false }).first().waitFor();
    assert.ok(requests.some(r => r.action === 'restore' && r.reason_code === 'OTHER'));
    await page.getByRole('button', { name: 'Chờ duyệt (1)', exact: true }).click();
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('Đang kiểm tra', { exact: true }).waitFor();
    await dialog.getByRole('combobox').first().selectOption('OTHER');
    const releaseHeld = dialog.getByRole('button', { name: 'Cho hiển thị', exact: true });
    // Có cả dismiss và restore đều nhả held; chọn dismiss để kiểm đường đóng hồ sơ.
    assert.ok(await releaseHeld.first().isEnabled());
    await ui.snapshot('held-queue-1440.png');
    await releaseHeld.first().click();
    await dialog.waitFor({ state: 'hidden' });
    assert.ok(requests.some(r => r.action === 'dismiss' && r.reasonCode === 'OTHER'));
    await context.close();
    console.log(JSON.stringify({ passed: true, output }));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
