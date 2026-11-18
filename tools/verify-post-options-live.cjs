// Local QA only, using the real gateway/API and seeded accounts.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_PACKAGE || 'playwright') + '/test');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { api, login } = require('./verify-creator-comment-controls-live.cjs');
const output = path.resolve('../../outputs/post-options-20261118');
const web = 'http://localhost:3100';
let owner, postId, browser;
async function main() {
  await mkdir(output, { recursive: true });
  const password = process.env.CREATOR_QA_PASSWORD?.trim();
  assert.ok(password);
  owner = (await api('/auth/login', null, 'POST', { email: 'superadmin@tripflix.local', password }))
    .accessToken;
  const readerToken = (await api('/auth/login', null, 'POST', { email: 'member@tripflix.local', password }))
    .accessToken;
  const title = 'MENU-QA-' + Date.now();
  postId = (
    await api(
      '/v1/posts',
      owner,
      'POST',
      { post_type: 'vlog', title, body: 'Bài kiểm tra menu tùy chọn.' },
      201,
    )
  ).id;
  await api(`/v1/posts/${postId}/publish`, owner, 'POST', undefined, 201);
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const reader = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const card = page.locator(`[data-post-id="${postId}"]`);
  const options = page.getByRole('menu', { name: 'Tùy chọn bài viết', exact: true });
  const trigger = card.getByRole('button', { name: 'Tùy chọn bài viết', exact: true });
  await login(page, 'superadmin@tripflix.local', `/inspiration?open=${postId}`);
  await page.locator('summary').filter({ hasText: /^Quản lý bình luận$/ }).waitFor();
  await trigger.click();
  await expect(options.getByRole('menuitem')).toHaveCount(5);
  await expect(options.getByRole('menuitem', { name: 'Chỉnh sửa bài viết', exact: true })).toBeVisible();
  await expect(options.getByRole('menuitem', { name: /Báo cáo/ })).toHaveCount(0);
  await page.screenshot({ path: path.join(output, 'owner-desktop.png') });
  await page.keyboard.press('End');
  await expect(options.getByRole('menuitem', { name: /^Xóa bài viết/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(options).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  await expect(options.getByRole('menuitem')).toHaveCount(5);
  const ownerBounds = await options.boundingBox();
  assert.ok(ownerBounds.x >= 0 && ownerBounds.x + ownerBounds.width <= 391);
  await page.screenshot({ path: path.join(output, 'owner-mobile.png') });
  await page.mouse.click(10, 160);
  await expect(options).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await trigger.click();
  await options.getByRole('menuitem', { name: /^Lưu bài viết/ }).click();
  await expect
    .poll(async () => (await api(`/v1/posts/${postId}`, owner)).viewerContext.isBookmarked)
    .toBe(true);
  await trigger.click();
  await expect(options.getByRole('menuitem', { name: /^Bỏ lưu bài viết/ })).toBeVisible();
  await options.getByRole('menuitem', { name: 'Chỉnh sửa bài viết', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Chỉnh sửa bài viết', exact: true });
  await editor.getByLabel('Tiêu đề', { exact: true }).fill(title + ' đã sửa');
  await editor.getByLabel('Nội dung', { exact: true }).fill('Nội dung đã sửa qua menu.');
  await reader.bringToFront();
  await page.bringToFront();
  await expect(editor.getByLabel('Tiêu đề', { exact: true })).toHaveValue(title + ' đã sửa');
  await editor.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(card.getByRole('heading', { name: title + ' đã sửa', exact: true })).toBeVisible();
  assert.equal((await api(`/v1/posts/${postId}`, owner)).post.body, 'Nội dung đã sửa qua menu.');
  await login(reader, 'member@tripflix.local', `/inspiration?open=${postId}`);
  const readerCard = reader.locator(`[data-post-id="${postId}"]`);
  await readerCard.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
  const readerMenu = reader.getByRole('menu', { name: 'Tùy chọn bài viết', exact: true });
  await expect(readerMenu.getByRole('menuitem')).toHaveCount(2);
  await expect(readerMenu.getByRole('menuitem', { name: /^Báo cáo bài viết/ })).toBeVisible();
  await expect(readerMenu.getByRole('menuitem', { name: /Chỉnh sửa|Xóa bài/ })).toHaveCount(0);
  await reader.screenshot({ path: path.join(output, 'reader-desktop.png') });
  await readerMenu.getByRole('menuitem', { name: /^Báo cáo bài viết/ }).click();
  const report = reader.getByRole('dialog', { name: 'Báo cáo bài viết', exact: true });
  await report.getByRole('radio').first().check();
  await report.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
  await expect(
    report.getByText('Đã gửi báo cáo. Cảm ơn bạn đã giúp cộng đồng an toàn hơn.', { exact: true }),
  ).toBeVisible();
  await report.getByRole('button', { name: 'Đóng', exact: true }).click();
  for (const width of [390]) {
    await reader.setViewportSize({ width, height: 844 });
    await reader.goto(`${web}/inspiration?open=${postId}`);
    await readerCard.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
    await expect(readerMenu).toBeVisible();
    const bounds = await readerMenu.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    await reader.screenshot({ path: path.join(output, 'reader-mobile.png') });
    await reader.keyboard.press('Escape');
  }
  await trigger.click();
  await options.getByRole('menuitem', { name: /^Chỉnh sửa quyền xem/ }).click();
  const privacy = page.getByRole('dialog', { name: 'Chỉnh sửa quyền xem', exact: true });
  await privacy.getByRole('radio', { name: /^Chỉ mình tôi/ }).check();
  await privacy.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(privacy).toBeHidden();
  await api(`/v1/posts/${postId}`, readerToken, 'GET', undefined, 404);
  await page.goto(web + '/account?tab=mine');
  const ownCard = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: title + ' đã sửa', exact: true }) });
  await ownCard.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
  await options.getByRole('menuitem', { name: /^Chỉnh sửa quyền xem/ }).click();
  await expect(privacy.getByRole('radio', { name: /^Chỉ mình tôi/ })).toBeChecked();
  await privacy.getByRole('radio', { name: /^Công khai/ }).check();
  await privacy.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(privacy).toBeHidden();
  await api(`/v1/posts/${postId}`, null);
  await ownCard.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
  await options.getByRole('menuitem', { name: /^Xóa bài viết/ }).click();
  const remove = page.getByRole('dialog', { name: 'Xóa bài viết?', exact: true });
  await remove.getByRole('button', { name: 'Hủy', exact: true }).click();
  await api(`/v1/posts/${postId}`, owner);
  await ownCard.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
  await options.getByRole('menuitem', { name: /^Xóa bài viết/ }).click();
  await remove.getByRole('button', { name: 'Xóa bài viết', exact: true }).click();
  await expect(remove).toBeHidden();
  await api(`/v1/posts/${postId}`, null, 'GET', undefined, 404);
  await writeFile(
    path.join(output, 'result.json'),
    JSON.stringify(
      {
        result: 'passed',
        api: 'real',
        checks: [
          'owner/reader menu',
          'keyboard',
          'save/un-save state',
          'edit post',
          'report submission',
          '390px bounds',
          'privacy public/private',
          'owner private-post menu',
          'cancel + confirm delete',
        ],
      },
      null,
      2,
    ),
  );
  process.stdout.write('Post options live acceptance passed\n');
}
main()
  .catch(async (error) => {
    if (browser)
      for (const [i, context] of browser.contexts().entries())
        for (const [j, page] of context.pages().entries())
          await page.screenshot({ path: path.join(output, `failure-${i}-${j}.png`) }).catch(() => {});
    process.stderr.write(String(error.stack || error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    if (owner && postId) await api(`/v1/posts/${postId}`, owner, 'DELETE').catch(() => {});
  });
