// Local thật: chỉ bootstrap bearer vào phiên Web; comment API, Core và Socket.IO thật.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_PACKAGE || 'playwright') + '/test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TF101_LIVE_API_URL || 'http://localhost:8080';
const web = process.env.TF101_LIVE_WEB_URL || 'http://localhost:3100';
const password = process.env.TF101_LIVE_PASSWORD;
const emailA = process.env.TF101_LIVE_EMAIL_A || 'member@tripflix.local';
const emailB = process.env.TF101_LIVE_EMAIL_B || 'moderator@tripflix.local';
const output = path.resolve(process.env.TF101_LIVE_OUTPUT || '../../outputs/tf101-live');
const tag = `TF101-LIVE-${Date.now()}`;
const events = [];
async function api(url, token, method = 'GET', body, expected = 200) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(method !== 'GET' ? { 'Idempotency-Key': randomUUID() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, expected, `${method} ${url}: HTTP ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
class LiveCommentsPage {
  constructor(page) {
    this.page = page;
    this.signals = [];
    this.watches = [];
    this.reads = 0;
    this.failures = [];
    page.on('response', (res) => {
      if (res.status() >= 400) { const url = new URL(res.url()); this.failures.push({ origin: url.origin, path: url.pathname, status: res.status() }); }
      if (res.request().method() === 'GET' && new URL(res.url()).pathname.endsWith('/comments')) this.reads++;
    });
    page.on('websocket', (ws) => {
      ws.on('framesent', ({ payload }) => {
        if (typeof payload === 'string' && payload.startsWith('42')) {
          const [event, body] = JSON.parse(payload.slice(2));
          if (event === 'post.watch') this.watches.push(body.postId);
        }
      });
      ws.on('framereceived', ({ payload }) => {
        if (typeof payload === 'string' && payload.startsWith('42')) {
          const [event, body] = JSON.parse(payload.slice(2));
          if (event === 'post.comments.changed') this.signals.push(body);
        }
      });
    });
  }
  async login(accessToken, postId, commentId, accountLabel) {
    // Seeded QA users are authenticated against the real API first. Inject only
    // that short-lived bearer into the browser's refresh bootstrap to avoid
    // repeatedly consuming the local email OTP rate limit; all app traffic and
    // Socket.IO remain real.
    await this.page.context().route('**/api/auth/refresh', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ accessToken, tokenType: 'Bearer', expiresIn: 900 }),
    }));
    await this.page.goto(`${web}/trips/${postId}?comment=${commentId}`, { timeout: 60000 });
    try { await expect(this.page.getByText(tag + ' seed', { exact: true })).toBeVisible({ timeout: 30000 }); }
    catch (error) {
      await this.page.screenshot({ path: path.join(output, 'login-failure-' + accountLabel + '.png'), fullPage: true });
      console.error(JSON.stringify({ url: this.page.url(), failures: this.failures }));
      throw error;
    }
    await expect.poll(() => this.watches.includes(postId), { timeout: 15000 }).toBe(true);
    await expect.poll(() => this.reads, { timeout: 15000 }).toBeGreaterThanOrEqual(1);
  }
}
async function main() {
  assert.ok(password, 'TF101_LIVE_PASSWORD is required');
  await mkdir(output, { recursive: true });
  const a = await api('/api/auth/login', null, 'POST', { email: emailA, password });
  const b = await api('/api/auth/login', null, 'POST', { email: emailB, password });
  assert.notEqual(a.accessToken, b.accessToken);
  let post;
  let browser;
  try {
    post = await api('/api/v1/posts', a.accessToken, 'POST', { post_type: 'vlog', title: tag, body: 'Bài kiểm tra realtime local riêng.' }, 201);
    await api(`/api/v1/posts/${post.id}/publish`, a.accessToken, 'POST', undefined, 201);
    const seed = await api(`/api/v1/posts/${post.id}/comments`, a.accessToken, 'POST', { body: tag + ' seed' }, 201);
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const contextA = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const contextB = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const viewA = new LiveCommentsPage(await contextA.newPage());
    const viewB = new LiveCommentsPage(await contextB.newPage());
    await Promise.all([viewA.login(a.accessToken, post.id, seed.id, 'author'), viewB.login(b.accessToken, post.id, seed.id, 'viewer')]);
    const beforeOwn = viewA.reads;
    const createdResponse = viewA.page.waitForResponse((res) => res.request().method() === 'POST' && new URL(res.url()).pathname.endsWith('/comments'));
    await viewA.page.getByRole('textbox', { name: 'Viết bình luận của bạn...' }).fill(tag + ' own');
    await viewA.page.getByRole('button', { name: 'Gửi', exact: true }).click();
    const own = await (await createdResponse).json();
    await expect(viewB.page.getByText(tag + ' own', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect.poll(() => viewA.signals.some((event) => event.commentId === own.id), { timeout: 15000 }).toBe(true);
    assert.equal(viewA.reads, beforeOwn, 'Own created không được refetch bình luận');
    events.push('Hai phiên độc lập nhận socket thật; người khác thấy bình luận mới, người gửi không refetch');

    await api(`/api/v1/comments/${own.id}`, a.accessToken, 'PATCH', { body: `đcm ${tag}` });
    await expect(viewA.page.getByText('Bình luận này vi phạm Tiêu chuẩn cộng đồng', { exact: true })).toBeVisible({ timeout: 60000 });
    await expect(viewB.page.getByText(tag + ' own', { exact: true })).toHaveCount(0, { timeout: 20000 });
    await expect(viewB.page.getByText(`đcm ${tag}`, { exact: true })).toHaveCount(0);
    await expect(viewB.page.getByText('Bình luận này vi phạm Tiêu chuẩn cộng đồng', { exact: true })).toHaveCount(0);
    const authorList = await api(`/api/v1/posts/${post.id}/comments`, a.accessToken);
    const hidden = authorList.items.find((item) => item.id === own.id);
    assert.equal(hidden.body, ''); assert.equal(hidden.status, 'hidden');
    assert.equal(hidden.moderationState, 'hidden');
    assert.ok(!('hiddenByActionId' in hidden) && !('cascadeRootCommentId' in hidden));
    const otherList = await api(`/api/v1/posts/${post.id}/comments`, b.accessToken);
    assert.ok(!otherList.items.some((item) => item.id === own.id));
    const inbox = await api('/notifications?limit=50', a.accessToken);
    assert.ok(!inbox.items.some((item) => item.type === 'moderation.comment.hide' && item.data?.commentId === own.id));
    events.push('Core tự ẩn bình luận; tác giả thấy khung xám, người khác mất dòng; API redact đúng và không có inbox tự ẩn');
    await viewA.page.screenshot({ path: path.join(output, 'author-hidden.png'), fullPage: true });
    await viewB.page.screenshot({ path: path.join(output, 'other-viewer.png'), fullPage: true });
    await writeFile(path.join(output, 'result.json'), JSON.stringify({ tag, postId: post.id, checks: events, authorSignals: viewA.signals, otherSignals: viewB.signals }, null, 2));
    console.log('PASS: ' + events.join('; '));
  } finally {
    await browser?.close();
    if (post) await api(`/api/v1/posts/${post.id}`, a.accessToken, 'DELETE');
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
