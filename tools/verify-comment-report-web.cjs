const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const base = 'http://localhost:8080';
const web = 'http://localhost:3100';
const password = process.env.REPORT_QA_PASSWORD?.trim();
let postId, member, moderator, caseId;
async function api(url, token, method = 'GET', body, expected = 200) {
  const response = await fetch(base + '/api' + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === 'GET' ? {} : { 'Idempotency-Key': randomUUID() }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, expected, `${method} ${url}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}
async function main() {
  assert.ok(password, 'REPORT_QA_PASSWORD is required');
  member = (await api('/auth/login', null, 'POST', { email: 'member@tripflix.local', password })).accessToken;
  moderator = (await api('/auth/login', null, 'POST', { email: 'moderator@tripflix.local', password }))
    .accessToken;
  postId = (
    await api(
      '/v1/posts',
      member,
      'POST',
      { post_type: 'vlog', title: `REPORT-UI-QA-${Date.now()}`, body: 'Bài QA riêng' },
      201,
    )
  ).id;
  await api(`/v1/posts/${postId}/publish`, member, 'POST', undefined, 201);
  const comment = await api(
    `/v1/posts/${postId}/comments`,
    moderator,
    'POST',
    { body: 'Bình luận QA kiểm tra nút báo cáo' },
    201,
  );
  const own = await api(
    `/v1/posts/${postId}/comments`,
    member,
    'POST',
    { body: 'Bình luận QA của chính tôi' },
    201,
  );
  const reply = await api(
    `/v1/posts/${postId}/comments`,
    moderator,
    'POST',
    { body: 'Phản hồi QA kiểm tra menu', parent_comment_id: comment.id },
    201,
  );
  await api(`/v1/posts/${postId}/bookmark`, member, 'PUT', { is_bookmarked: true });
  const output = path.resolve('../../outputs/comment-report-web-20261113');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`${web}/login?returnTo=${encodeURIComponent(`/trips/${postId}`)}`);
    await page.getByLabel('Email', { exact: true }).fill('member@tripflix.local');
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const row = page
      .getByRole('article')
      .filter({ has: page.getByText(comment.body, { exact: true }) })
      .last();
    const ownRow = page
      .getByRole('article')
      .filter({ has: page.getByText(own.body, { exact: true }) })
      .last();
    await expect(ownRow.getByText(own.body, { exact: true })).toBeVisible();
    await expect(ownRow.getByRole('button', { name: 'Tùy chọn bình luận', exact: true })).toHaveCount(0);
    await row.getByRole('button', { name: 'Xem trả lời', exact: true }).click();
    const replyRow = page
      .getByRole('article')
      .filter({ has: page.getByText(reply.body, { exact: true }) })
      .last();
    await replyRow.getByRole('button', { name: 'Tùy chọn bình luận', exact: true }).click();
    await page.getByRole('button', { name: 'Báo cáo bình luận', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Đóng báo cáo', exact: true }).click();
    await expect(replyRow.getByRole('button', { name: 'Tùy chọn bình luận', exact: true })).toBeFocused();
    await row.getByRole('button', { name: 'Ẩn trả lời', exact: true }).click();
    const options = row.getByRole('button', { name: 'Tùy chọn bình luận', exact: true });
    await options.click();
    await page.screenshot({ path: path.join(output, 'comment-menu.png') });
    await page.keyboard.press('Escape');
    await expect(options).toHaveAttribute('aria-expanded', 'false');
    await options.click();
    await page.getByRole('button', { name: 'Ẩn bình luận', exact: true }).click();
    await expect(page.getByText(comment.body, { exact: true })).toBeHidden();
    await expect(page.getByText('Bạn đã ẩn bình luận này.', { exact: true })).toBeVisible();
    assert.ok(
      (await api(`/v1/posts/${postId}/comments`, moderator)).items.some((item) => item.id === comment.id),
      'personal hide must not remove comment for other viewers',
    );
    await page.reload();
    await expect(page.getByText('Bạn đã ẩn bình luận này.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
    await expect(row.getByText(comment.body, { exact: true })).toBeVisible();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await options.click();
      const menu = page.locator('[popover]:popover-open');
      const bounds = await menu.boundingBox();
      assert.ok(
        bounds &&
          bounds.x >= 0 &&
          bounds.x + bounds.width <= width &&
          bounds.y >= 0 &&
          bounds.y + bounds.height <= 844,
        'comment menu stays within viewport',
      );
      await page.screenshot({ path: path.join(output, `comment-menu-${width}.png`) });
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await options.click();
    await page.getByRole('button', { name: 'Báo cáo bình luận', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Báo cáo bình luận', exact: true });
    await expect(dialog.getByRole('radio')).toHaveCount(7);
    await expect(dialog.getByRole('button', { name: 'Gửi báo cáo', exact: true })).toBeDisabled();
    await dialog.getByRole('radio', { name: 'Quấy rối, xúc phạm', exact: true }).check();
    await dialog.getByLabel('Mô tả thêm (không bắt buộc)').fill('QA kiểm tra giao diện báo cáo bình luận');
    await page.screenshot({ path: path.join(output, 'report-dialog.png') });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const bounds = await dialog.boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width, 'dialog fits small screen');
      await dialog.getByRole('button', { name: 'Gửi báo cáo', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `report-dialog-${width}.png`) });
    }
    await dialog.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
    await dialog.getByRole('status').waitFor();
    await page.screenshot({ path: path.join(output, 'report-success.png') });
    const report = (await api('/v1/me/reports', member)).items.find((row) => row.targetId === comment.id);
    assert.ok(report);
    assert.equal(report.reasonCode, 'HARASSMENT');
    const queue = await api('/v1/admin/moderation/queue?targetType=comment&limit=100', moderator);
    caseId = queue.items.find((row) => row.targetId === comment.id)?.id;
    assert.ok(caseId, 'report must reach moderation queue');
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${web}/inspiration`);
    await page.getByRole('button', { name: 'Đã lưu', exact: true }).click();
    const card = page.getByRole('article', { name: /^REPORT-UI-QA-/ }).first();
    await card.waitFor();
    await page.screenshot({ path: path.join(output, 'feed-before-comments.png') });
    const openComments = card.getByRole('button', { name: /^Bình luận \(/ });
    if ((await openComments.getAttribute('aria-pressed')) !== 'true') await openComments.click();
    const feedRow = page
      .getByRole('listitem')
      .filter({ has: page.getByText(comment.body, { exact: true }) })
      .last();
    await feedRow.getByRole('button', { name: 'Tùy chọn bình luận', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'feed-comment-menu.png') });
    await page.getByRole('button', { name: 'Báo cáo bình luận', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Báo cáo bình luận', exact: true }).getByRole('radio'),
    ).toHaveCount(7);
    await page.getByRole('button', { name: 'Đóng báo cáo', exact: true }).click();
    process.stdout.write(
      'Comment menu / Escape / hide + reload + undo / preset reasons / 320–1440px / real API → admin queue: passed\n',
    );
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
    if (caseId && moderator)
      await api(
        `/v1/admin/moderation/queue/${caseId}/decisions`,
        moderator,
        'POST',
        { action: 'dismiss', reasonCode: 'OTHER' },
        201,
      ).catch(() => {});
    if (postId && member) await api(`/v1/posts/${postId}`, member, 'DELETE').catch(() => {});
  });
