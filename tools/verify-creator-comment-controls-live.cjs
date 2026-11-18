// Local QA data only; no intercepted API responses.
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const apiBase = 'http://localhost:8080/api';
const web = 'http://localhost:3100';
const password = process.env.CREATOR_QA_PASSWORD?.trim();
const output = path.resolve('../../outputs/creator-comments-20261118');
let owner, member, postId, heldPostId;
async function api(url, token, method = 'GET', body, status = 200) {
  const result = await fetch(apiBase + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method !== 'GET' ? { 'Idempotency-Key': randomUUID() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(result.status, status, `${method} ${url}: ${result.status}`);
  return result.status === 204 ? null : result.json();
}
async function login(page, email, returnTo) {
  await page.goto(`${web}/login?returnTo=${encodeURIComponent(returnTo)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await expect.poll(async () => {
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    return page.getByRole('button', { name: 'Đăng nhập', exact: true }).isEnabled();
  }, { timeout: 20000 }).toBe(true);
  const oldMail = new Set(
    (await (await fetch('http://localhost:8025/api/v1/messages')).json()).messages.map(
      (message) => message.ID,
    ),
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByLabel('Mã xác thực email', { exact: true }).waitFor();
  let code;
  for (let attempt = 0; attempt < 30; attempt++) {
    const messages = (await (await fetch('http://localhost:8025/api/v1/messages')).json()).messages;
    const message = messages.find(
      (message) => !oldMail.has(message.ID) && message.To.some((recipient) => recipient.Address === email),
    );
    if (message) {
      const content = await (await fetch(`http://localhost:8025/api/v1/message/${message.ID}`)).json();
      code = (content.Text || content.HTML || '').match(/\b\d{8}\b/)?.[0];
      if (code) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(code, 'Local Mailpit login code must arrive');
  await page.getByLabel('Mã xác thực email', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20000 });
  if (new URL(page.url()).pathname === '/onboarding') {
    await page.getByRole('button', { name: 'Khám phá trước', exact: true }).click();
    await page.waitForURL((url) => url.pathname !== '/onboarding', { timeout: 20000 });
  }
  await page.goto(web + returnTo, { waitUntil: 'domcontentloaded', timeout: 60000 });
}
async function main() {
  assert.ok(password);
  await mkdir(output, { recursive: true });
  owner = (await api('/auth/login', null, 'POST', { email: 'member@tripflix.local', password })).accessToken;
  member = (await api('/auth/login', null, 'POST', { email: 'moderator@tripflix.local', password }))
    .accessToken;
  const marker = `CREATOR-QA-${Date.now()}`;
  postId = (
    await api(
      '/v1/posts',
      owner,
      'POST',
      { post_type: 'vlog', title: marker, body: 'Bài kiểm tra bộ lọc riêng' },
      201,
    )
  ).id;
  await api(`/v1/posts/${postId}/publish`, owner, 'POST', undefined, 201);
  await api(`/v1/posts/${postId}/comment-settings`, member, 'GET', undefined, 403);
  await api(`/v1/posts/${postId}/filtered-comments`, null, 'GET', undefined, 401);
  await api(
    `/v1/posts/${postId}/comment-settings`,
    owner,
    'PATCH',
    { enabled: true, keywords: Array.from({ length: 51 }, (_, i) => `từ ${i}`) },
    400,
  );
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const reader = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await login(page, 'member@tripflix.local', `/inspiration?open=${postId}`);
    await page.locator('summary').filter({ hasText: /^Quản lý bình luận$/ }).click();
    const controls = page
      .locator('details')
      .filter({ has: page.locator('summary').filter({ hasText: /^Quản lý bình luận$/ }) });
    await controls.getByLabel('Từ khóa cần lọc', { exact: true }).fill('lọcqa');
    await controls.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await controls.getByText('Đã lưu cài đặt bình luận.', { exact: true }).waitFor();
    const settings = await api(`/v1/posts/${postId}/comment-settings`, owner);
    assert.deepEqual(settings.keywords, ['lọcqa']);
    assert.equal((await api(`/v1/posts/${postId}`, member)).post.commentKeywords, undefined);
    const held = await api(
      `/v1/posts/${postId}/comments`,
      member,
      'POST',
      { body: 'Bình luận LỌCQA cần chủ bài duyệt' },
      201,
    );
    assert.equal(held.status, 'held');
    assert.equal(held.creatorReview, 'pending');
    assert.ok(!(await api(`/v1/posts/${postId}/comments`, null)).items.some((item) => item.id === held.id));
    assert.equal((await api(`/v1/posts/${postId}`, owner)).post.commentCount, 0);
    await login(reader, 'moderator@tripflix.local', `/inspiration?open=${postId}`);
    await expect(
      reader.getByText('Bình luận được bộ lọc của chủ bài giữ lại, chờ chủ bài duyệt.', { exact: true }),
    ).toBeVisible();
    await page.locator('summary').filter({ hasText: /^Quản lý bình luận$/ }).click();
    await expect(controls.getByLabel('Từ khóa cần lọc', { exact: true })).toBeHidden();
    await page.locator('summary').filter({ hasText: /^Quản lý bình luận$/ }).click();
    await expect(controls.getByText(held.body, { exact: true })).toBeVisible({ timeout: 20000 });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width === 390) {
        await page.goto(`${web}/inspiration?open=${postId}`);
        await page
          .locator(`[data-feed-post-id="${postId}"]`)
          .getByRole('button', { name: 'Bình luận (0)', exact: true })
          .click();
        await page.locator('summary').filter({ hasText: /^Quản lý bình luận$/ }).click();
      }
      await expect(controls.getByText(held.body, { exact: true })).toBeVisible();
      await controls.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
      await page.screenshot({ path: path.join(output, `creator-controls-${width}.png`) });
    }
    await controls.getByRole('button', { name: 'Cho hiển thị', exact: true }).click();
    await expect(controls.getByText(held.body, { exact: true })).toBeHidden();
    assert.ok((await api(`/v1/posts/${postId}/comments`, null)).items.some((item) => item.id === held.id));
    assert.equal((await api(`/v1/posts/${postId}`, owner)).post.commentCount, 1);
    const field = reader.getByRole('textbox', { name: 'Viết bình luận của bạn...', exact: true });
    await field.fill('Bản nháp giữ khi chủ bài tắt');
    await controls.getByLabel('Cho phép bình luận', { exact: true }).uncheck();
    await controls.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(
      reader.getByText('Chủ bài đã tắt bình luận. Bản nháp của bạn được giữ lại.', { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await api(`/v1/posts/${postId}/comments`, member, 'POST', { body: 'Không được đăng' }, 403);
    await controls.getByLabel('Cho phép bình luận', { exact: true }).check();
    await controls.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(field).toHaveValue('Bản nháp giữ khi chủ bài tắt', { timeout: 20000 });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${web}/inspiration?open=${postId}`);
    await expect(page.locator('summary').filter({ hasText: /^Quản lý bình luận$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Đăng bài', exact: true }).first().click();
    const composer = page.getByRole('dialog', { name: 'Đăng bài', exact: true });
    await composer.getByRole('textbox', { name: 'Tiêu đề', exact: true }).fill(marker + '-HELD');
    await composer
      .getByRole('textbox', { name: 'Nội dung', exact: true })
      .fill('chuyển khoản trước qua stk 0123456789 vcb nhé');
    const publishedResponse = page.waitForResponse(
      (response) => /\/posts\/[^/]+\/publish$/.test(response.url()) && response.request().method() === 'POST',
    );
    await composer.getByRole('button', { name: 'Đăng bài viết', exact: true }).click();
    const publication = await (await publishedResponse).json();
    heldPostId = publication.id;
    assert.equal(publication.status, 'held');
    await expect(
      page.getByText('Bài viết đang được kiểm tra, chưa hiển thị công khai.', { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: path.join(output, 'author-held-post.png') });
    await api(`/v1/posts/${heldPostId}`, null, 'GET', undefined, 404);
    assert.ok((await api('/v1/me/posts?status=held', owner)).items.some((item) => item.id === heldPostId));
    await page.goto(web + '/account?tab=mine');
    const heldCard = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: marker + '-HELD', exact: true }) });
    await expect(
      heldCard.getByText('Bài viết đang được kiểm tra, chưa hiển thị công khai.', { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: path.join(output, 'author-held-account.png') });
    await writeFile(
      path.join(output, 'result.json'),
      JSON.stringify(
        {
          result: 'passed',
          api: 'real',
          checks: [
            'owner-only settings/queue',
            'keyword validation',
            'no keyword leak',
            'held invisible to guest',
            'creator queue + approve',
            'public counts',
            'held author UI',
            '1440/390 layout',
            'disable enforced by server',
            'draft preserved on disable/enable',
            'author held post toast + guest denied',
            'author can find held post in own account',
          ],
        },
        null,
        2,
      ),
    );
    process.stdout.write('Creator controls live Web/API acceptance passed\n');
  } catch (error) {
    for (const [i, context] of browser.contexts().entries())
      for (const [j, page] of context.pages().entries()) {
        await page.screenshot({ path: path.join(output, `failure-${i}-${j}.png`) }).catch(() => {});
      }
    throw error;
  } finally {
    await browser.close();
  }
}
if (require.main === module)
  main()
    .catch((error) => {
      process.stderr.write(String(error.stack || error));
      process.exitCode = 1;
    })
    .finally(async () => {
      if (owner && postId) await api(`/v1/posts/${postId}`, owner, 'DELETE').catch(() => {});
      if (owner && heldPostId) await api(`/v1/posts/${heldPostId}`, owner, 'DELETE').catch(() => {});
    });

module.exports = { api, login };
