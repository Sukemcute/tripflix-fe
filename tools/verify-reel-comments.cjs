const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');

const URL = process.env.MOBILE_PREVIEW_URL || 'http://127.0.0.1:8081';
const OUTPUT = process.env.COMMENTS_EVIDENCE_DIR || join(tmpdir(), 'tripflix-reel-comments');
const errors = [];
const checks = [];

class ReelCommentsPage {
  constructor(page) {
    this.page = page;
    this.dialog = page.getByRole('dialog');
    this.input = this.dialog.getByRole('textbox', { name: 'Viết bình luận', exact: true });
    this.send = this.dialog.getByRole('button', { name: 'Gửi bình luận', exact: true });
    page.on('pageerror', (error) => errors.push(error.message));
  }
  async open(count = 7) {
    await this.page.getByRole('button', { name: 'Bình luận', exact: true }).click();
    await expect(this.dialog.getByText(`${count} bình luận`, { exact: true })).toBeVisible();
  }
  async close() {
    await this.dialog.getByRole('button', { name: 'Đóng bình luận', exact: true }).click();
    await expect(this.dialog).toBeHidden();
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(OUTPUT, name + '.png') });
  }
  record(name) {
    checks.push(name);
    process.stdout.write('PASS ' + name + '\n');
  }
}

(async () => {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN' });
  const view = new ReelCommentsPage(await context.newPage());
  const page = view.page;
  try {
    await page.goto(URL, { timeout: 60000 });
    await page.getByRole('button', { name: 'Bắt đầu khám phá', exact: true }).click();
    await view.open();
    await expect(view.send).toBeDisabled();
    await view.input.fill('   ');
    await expect(view.send).toBeDisabled();
    await view.input.fill('');
    await view.snapshot('01-comments');
    await view.dialog.getByRole('button', { name: 'Thích bình luận của Minh Anh', exact: true }).click();
    await expect(
      view.dialog.getByRole('button', { name: 'Bỏ thích bình luận của Minh Anh', exact: true }),
    ).toBeVisible();
    await view.dialog.getByRole('button', { name: 'Xem 2 câu trả lời', exact: true }).click();
    await expect(
      view.dialog.getByText('Đi một chuyến thôi, mang về cả một album kỷ niệm.', { exact: true }),
    ).toBeVisible();
    await view.dialog.getByRole('button', { name: 'Trả lời Mai Anh đi đâu', exact: true }).click();
    await expect(view.dialog.getByText('Đang trả lời Mai Anh đi đâu', { exact: true })).toBeVisible();
    await view.input.fill('Mình muốn hỏi thêm về chuyến này.');
    await view.send.click();
    await expect(view.dialog.getByText('8 bình luận', { exact: true })).toBeVisible();
    await expect(view.dialog.getByText('@Mai Anh đi đâu ', { exact: false }).first()).toBeVisible();
    await expect(view.input).toHaveValue('');
    await view.snapshot('02-replies');
    view.record(
      'comment sheet, whitespace validation, like toggle, expand thread and reply to the actual author',
    );

    await view.dialog.getByRole('tab', { name: 'Mới nhất', exact: true }).click();
    await view.input.fill('Một chuyến đi rất đáng để thử.');
    await view.send.click();
    await expect(view.dialog.getByText('9 bình luận', { exact: true })).toBeVisible();
    await expect(view.dialog.getByText('Một chuyến đi rất đáng để thử.', { exact: true })).toBeVisible();
    await view.dialog.getByRole('button', { name: 'Thêm phản ứng ❤️', exact: true }).click();
    await expect(view.input).toHaveValue('❤️');
    await view.input.fill('Bản nháp Nha Trang');
    await view.close();
    await expect(page.getByText('Nha Trang, đi là mê', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Bài tiếp theo', exact: true }).click();
    await expect(page.getByText('Chậm một nhịp ở Hội An', { exact: true })).toBeVisible();
    await view.open();
    await expect(view.input).toHaveValue('');
    await expect(
      view.dialog.getByText('Phố lên đèn đẹp quá, muốn đi Hội An ngay!', { exact: true }),
    ).toBeVisible();
    await view.dialog.getByRole('button', { name: 'Xem 2 câu trả lời', exact: true }).click();
    await expect(view.dialog.getByText('Cộng đồng Tripflix', { exact: true })).toBeVisible();
    await view.close();
    await page.getByRole('button', { name: 'Bài trước', exact: true }).click();
    await view.open(9);
    await expect(view.input).toHaveValue('Bản nháp Nha Trang');
    await view.input.fill('');
    view.record('new comments, quick reactions, counts, draft persistence and per-reel isolation');

    for (const [width, height] of [
      [320, 640],
      [390, 844],
      [430, 932],
      [390, 480],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(view.input).toBeVisible();
      const composer = await view.input.boundingBox();
      assert.ok(
        composer && composer.y >= 0 && composer.y + composer.height <= height,
        JSON.stringify(composer),
      );
      const sheet = await page.getByLabel('9 bình luận', { exact: true }).boundingBox();
      assert.ok(sheet && sheet.x >= 0 && sheet.x + sheet.width <= width, JSON.stringify(sheet));
      if (width === 320) await view.snapshot('03-comments-small');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.press('Escape');
    await expect(view.dialog).toBeHidden();
    await view.open(9);
    await view.close();
    view.record('320/390/430px layouts, reduced-height composer visibility, Escape and close button');
    assert.deepEqual(errors, [], 'Browser runtime errors');
    const report = {
      checks,
      screenshots: 3,
      browserErrors: errors,
      platform: 'Expo web / Chromium. Native keyboard and gestures require device review.',
    };
    await writeFile(join(OUTPUT, 'verification.json'), JSON.stringify(report, null, 2));
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(error.stack + '\n');
  process.exitCode = 1;
});
