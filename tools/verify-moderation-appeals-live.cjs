// Local stack only. No intercepted requests or mocked API responses.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const apiBase = process.env.MODERATION_LIVE_API || 'http://localhost:8080';
const web = process.env.MODERATION_WEB_URL || 'http://localhost:3101';
const admin = process.env.MODERATION_ADMIN_URL || 'http://localhost:3200';
const targetType = process.env.MODERATION_LIVE_TARGET === 'post' ? 'post' : 'comment';
const output = path.resolve('../../outputs/moderation-p0-live-20261113', targetType);
const password = process.env.MODERATION_LIVE_PASSWORD?.trim();
const marker = `P0-QA-${Date.now()}`;
const sessions = [];
let postId;
let ownerToken;
async function api(pathname, token, method = 'GET', body, expected = 200) {
  const res = await fetch(apiBase + pathname, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method !== 'GET' ? { 'Idempotency-Key': randomUUID() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(res.status, expected, `${method} ${pathname}: HTTP ${res.status}`);
  return res.status === 204 ? undefined : res.json();
}
async function login(email) {
  const session = await api('/api/auth/login', null, 'POST', { email, password });
  sessions.push(session);
  return session.accessToken;
}
async function uiLogin(page, base, email, returnTo) {
  await page.goto(`${base}/login?returnTo=${encodeURIComponent(returnTo)}`, { timeout: 120000 });
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30000 });
}
async function eventually(work) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await work()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Timed out waiting for local event consumers');
}
async function main() {
  assert.ok(password, 'MODERATION_LIVE_PASSWORD is required');
  for (const base of [apiBase, web, admin])
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  await mkdir(output, { recursive: true });
  await eventually(async () => {
    try {
      return (await fetch(apiBase + '/api/v1/posts?limit=1', { signal: AbortSignal.timeout(3000) })).ok;
    } catch {
      return false;
    }
  });
  const member = await login('member@tripflix.local');
  ownerToken = member;
  const moderator = await login('moderator@tripflix.local');
  const post = await api(
    '/api/v1/posts',
    member,
    'POST',
    { post_type: 'vlog', title: marker, body: 'Nội dung QA riêng cho kiểm duyệt.' },
    201,
  );
  postId = post.id;
  await api(`/api/v1/posts/${postId}/publish`, member, 'POST', undefined, 201);
  const comment = await api(
    `/api/v1/posts/${postId}/comments`,
    member,
    'POST',
    { body: `${marker} Phản ánh chất lượng dịch vụ.` },
    201,
  );
  const decision = await api(
    targetType === 'post'
      ? `/api/v1/admin/posts/${postId}/moderation-actions`
      : `/api/v1/admin/moderation/comments/${comment.id}/actions`,
    moderator,
    'POST',
    targetType === 'post'
      ? { action: 'hide', reason_code: 'HARASSMENT' }
      : { action: 'hide', reasonCode: 'HARASSMENT' },
    201,
  );
  const mine = await api('/api/v1/me/moderation/decisions', member);
  const item = mine.items.find((row) => row.id === decision.actionId);
  assert.equal(item?.canAppeal, true);
  assert.ok(item.targetPreview.includes(marker));
  if (targetType === 'post') await api(`/api/v1/posts/${postId}`, member, 'GET', undefined, 404);
  else {
    const before = await api(`/api/v1/posts/${postId}/comments`, member);
    assert.ok(!before.items.some((row) => row.id === comment.id));
  }
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const authorContext = await browser.newContext({ viewport: { width: 390, height: 950 } });
    const author = await authorContext.newPage();
    await uiLogin(author, web, 'member@tripflix.local', '/account/moderation');
    const article = author.getByRole('article').filter({ hasText: marker });
    await article.getByRole('button', { name: 'Gửi khiếu nại', exact: true }).click();
    await article
      .getByLabel('Lý do khiếu nại')
      .fill(`${marker} Đây là nhận xét dịch vụ, đề nghị kiểm tra lại.`);
    await article.getByRole('button', { name: 'Gửi', exact: true }).click();
    await article.getByText('Khiếu nại: Đang xem xét').waitFor();
    await author.screenshot({ path: path.join(output, 'author-pending.png'), fullPage: true });
    const reviewerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const reviewer = await reviewerContext.newPage();
    await uiLogin(reviewer, admin, 'superadmin@tripflix.local', '/moderation');
    await reviewer.getByRole('button', { name: 'Khiếu nại', exact: true }).click();
    const appealArticle = reviewer.getByRole('article').filter({ hasText: marker });
    await appealArticle.getByText('Bằng chứng lúc quyết định:', { exact: false }).waitFor();
    reviewer.once('dialog', (dialog) => dialog.accept());
    await appealArticle.getByRole('button', { name: 'Chấp nhận khiếu nại', exact: true }).click();
    await appealArticle.waitFor({ state: 'detached' });
    const appeals = await api('/api/v1/me/moderation/appeals', member);
    const appeal = appeals.items.find((row) => row.decisionId === decision.actionId);
    assert.equal(appeal?.status, 'overturned');
    await eventually(async () => {
      const inbox = await api('/notifications?limit=50', member);
      return inbox.items.some(
        (row) => row.type === 'moderation.appeal.decided' && row.data.appealId === appeal.id,
      );
    });
    if (targetType === 'post') await api(`/api/v1/posts/${postId}`, member);
    else {
      const after = await api(`/api/v1/posts/${postId}/comments`, member);
      assert.ok(after.items.some((row) => row.id === comment.id));
    }
    await author.reload();
    await author
      .getByRole('article')
      .filter({ hasText: marker })
      .getByText('Khiếu nại: Đã chấp nhận')
      .waitFor();
    await author.screenshot({ path: path.join(output, 'author-overturned.png'), fullPage: true });
    await reviewer.screenshot({ path: path.join(output, 'reviewer-resolved.png'), fullPage: true });
    await writeFile(
      path.join(output, 'result.json'),
      JSON.stringify(
        {
          marker,
          targetType,
          postId,
          commentId: comment.id,
          decisionId: decision.actionId,
          appealId: appeal.id,
          result: 'passed',
          checks: [
            'real HTTP',
            'real PostgreSQL',
            'author UI',
            'independent reviewer UI',
            'Redis/outbox notification',
            `${targetType} restored`,
          ],
          mockedRequests: false,
        },
        null,
        2,
      ),
    );
    process.stdout.write('Live author → independent reviewer → notification → restore: passed\n');
  } finally {
    await browser.close();
  }
}
main()
  .catch((error) => {
    process.stderr.write(String(error.stack || error));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (ownerToken && postId) {
      try {
        await api(`/api/v1/posts/${postId}`, ownerToken, 'DELETE', undefined, 200);
      } catch {
        process.stderr.write('QA post cleanup needs retry\n');
      }
    }
  });
