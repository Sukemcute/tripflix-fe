const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const { IntegrationPage } = require('../../pages/integration-page.cjs');
const WEB = process.env.WEB_PREVIEW_URL || 'http://localhost:3100';
const OUTPUT = process.env.DISCOVERY_EVIDENCE_DIR || join(tmpdir(), 'tripflix-commerce');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(WEB).hostname));

(async () => {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  });
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const view = new IntegrationPage(page, WEB);
      await view.visit('/search?q=hoi%20an');
      const choice = view.button('Hội An');
      await expect(choice).toBeVisible();
      await expect(choice).toHaveAccessibleDescription('Đà Nẵng');
      await expect(view.button('Hội An · Đà Nẵng')).toHaveCount(0);
      const primary = await choice.getByText('Hội An', { exact: true }).boundingBox();
      const secondary = await choice.getByText('Đà Nẵng', { exact: true }).boundingBox();
      assert.ok(secondary.y >= primary.y + primary.height, 'Parent province belongs on a separate line');
      const destination = page.getByLabel('Tìm kiếm', { exact: true });
      await destination.press('Escape');
      await expect(choice).toBeHidden();
      await destination.click();
      await expect(choice).toBeVisible();
      await choice.click();
      await expect(page.getByLabel('Tìm kiếm', { exact: true })).toHaveValue('Hội An');
      await expect(choice).toBeHidden();
      const request = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/stays');
      await view.click('Tìm phòng trống');
      assert.equal(new URL((await request).url()).searchParams.get('placeId'), 'hoi-an');
      await page.screenshot({ path: join(OUTPUT, `06-web-place-${width}.png`), fullPage: true });
      process.stdout.write(
        `PASS ${width}px: Hội An label, Đà Nẵng description, reopen suggestions after Escape, search placeId=hoi-an\n`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(error.stack + '\n');
  process.exitCode = 1;
});
