// Run against the mobile dev server; use the existing external Playwright runtime.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const baseUrl = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8082';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'tripflix-onboarding');
const KEY = 'tripflix.onboarding.v1';

class OnboardingPage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  choice(name) {
    return this.page.getByRole('checkbox', { name, exact: true });
  }
  pace(name) {
    return this.page.getByRole('radio', { name, exact: true });
  }
  async goto(path = '/') {
    await this.page.goto(new URL(path, baseUrl).href);
  }
  async click(name) {
    await this.button(name).click();
  }
  async visible(name) {
    await this.button(name).waitFor();
  }
  async stored() {
    return this.page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
  }
  async snapshot(name) {
    await this.page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    });
    // Wait for the semantic stage to finish its actual entry animation, not a fixed timeout.
    await this.page.waitForFunction(() =>
      [...document.getAnimations()].every((animation) => animation.playState !== 'running'),
    );
    await this.page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
  }
  async noHorizontalOverflow() {
    assert(
      await this.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'page must fit horizontally',
    );
  }
  async inViewport(name) {
    const box = await this.button(name).boundingBox();
    const size = this.page.viewportSize();
    assert(
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= size.width + 1 &&
        box.y + box.height <= size.height + 1,
      `${name} must fit the viewport`,
    );
  }
}

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    headless: true,
  });
  const checks = [];
  const pageErrors = [];
  async function fresh(width = 390, height = 844, init) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    if (init) await context.addInitScript(init);
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error.message));
    return { context, page, ui: new OnboardingPage(page) };
  }
  try {
    const { context, page, ui } = await fresh();
    await ui.goto();
    await ui.visible('Chọn gu của tôi');
    assert(new URL(page.url()).pathname === '/onboarding', 'fresh launch opens onboarding');
    await ui.snapshot('01-welcome-390');
    await ui.click('Chọn gu của tôi');
    assert(await ui.button('Chọn nhịp chuyến đi').isDisabled(), 'empty interests cannot continue');
    await ui.choice('Biển & đảo').click();
    await ui.choice('Núi & thiên nhiên').click();
    assert((await ui.choice('Biển & đảo').getAttribute('aria-checked')) === 'true');
    await ui.snapshot('02-interests-390');
    await ui.click('Chọn nhịp chuyến đi');
    assert(await ui.button('Xem gu của tôi').isDisabled(), 'pace needs a selection');
    await ui.pace('Chậm một chút').click();
    await ui.snapshot('03-pace-390');
    await ui.click('Quay lại');
    assert(
      (await ui.choice('Núi & thiên nhiên').getAttribute('aria-checked')) === 'true',
      'back preserves choices',
    );
    await ui.click('Chọn nhịp chuyến đi');
    await page.reload();
    await ui.visible('Xem gu của tôi');
    assert(
      (await ui.pace('Chậm một chút').getAttribute('aria-checked')) === 'true',
      'reload restores the draft and step',
    );
    await ui.click('Xem gu của tôi');
    await ui.snapshot('04-review-390');
    await ui.click('Sửa trải nghiệm');
    await ui.choice('Núi & thiên nhiên').click();
    await ui.click('Chọn nhịp chuyến đi');
    await ui.click('Xem gu của tôi');
    await ui.click('Lưu và khám phá');
    await page.waitForURL((url) => url.pathname === '/');
    const saved = await ui.stored();
    assert.equal(saved.status, 'completed');
    assert.deepEqual(saved.interests, ['coast']);
    assert.equal(saved.pace, 'slow');
    await page.reload();
    await page.getByRole('tab', { name: 'Dành cho bạn', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/');
    checks.push('Fresh launch, choose, back, reload draft, edit review, save, returning visitor');
    // develop moved the menu out of the profile tab into /settings (TF47B).
    await ui.goto('/settings');
    await ui.click('Gu du lịch');
    await ui.click('Chọn gu của tôi');
    await ui.choice('Núi & thiên nhiên').click();
    assert.equal(await ui.choice('Núi & thiên nhiên').getAttribute('aria-checked'), 'true');
    await ui.click('Quay lại');
    await ui.click('Đóng');
    await ui.visible('Gu du lịch');
    assert.equal((await ui.stored()).status, 'completed');
    await ui.goto('/');
    await page.getByRole('tab', { name: 'Dành cho bạn', exact: true }).waitFor();
    checks.push('Settings opens editor; editing does not re-trigger first-run gate or reset completion');
    await context.close();

    for (const [width, height] of [
      [375, 667],
      [430, 932],
      [320, 568],
    ]) {
      const { context, ui } = await fresh(width, height);
      await ui.goto('/onboarding');
      await ui.visible('Chọn gu của tôi');
      await ui.inViewport('Chọn gu của tôi');
      await ui.inViewport('Khám phá trước');
      await ui.noHorizontalOverflow();
      await ui.snapshot(`05-welcome-${width}`);
      await ui.click('Chọn gu của tôi');
      await ui.choice('Nghỉ dưỡng').click();
      await ui.snapshot(`06-interests-${width}`);
      await ui.inViewport('Chọn nhịp chuyến đi');
      await ui.noHorizontalOverflow();
      await ui.click('Chọn nhịp chuyến đi');
      await ui.pace('Vừa đi, vừa nghỉ').click();
      await ui.snapshot(`07-pace-${width}`);
      await ui.click('Xem gu của tôi');
      await ui.snapshot(`08-review-${width}`);
      await ui.noHorizontalOverflow();
      checks.push(`Layout ${width}x${height}, visible CTAs, all stages fit horizontally`);
      await context.close();
    }

    {
      const { context, page, ui } = await fresh();
      await ui.goto();
      await ui.visible('Chọn gu của tôi');
      await ui.click('Khám phá trước');
      await page.waitForURL((url) => url.pathname === '/');
      assert.equal((await ui.stored()).status, 'skipped');
      await page.reload();
      await page.getByRole('tab', { name: 'Dành cho bạn', exact: true }).waitFor();
      checks.push('Skip without login, persisted across reload');
      await context.close();
    }
    {
      const { context, page, ui } = await fresh();
      await ui.goto('/explore');
      await page.getByText('Khám phá', { exact: true }).first().waitFor();
      assert.equal(new URL(page.url()).pathname, '/explore');
      assert.equal(await ui.stored(), null);
      checks.push('Direct explore link preserves destination without onboarding interruption');
      await context.close();
    }
    {
      const { context, page, ui } = await fresh();
      await ui.goto('/?reel=onboarding-deep-link-test');
      await page.getByRole('tab', { name: 'Dành cho bạn', exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(await ui.stored(), null);
      checks.push('Root reel deep link bypasses first-run gate');
      await context.close();
    }
    {
      const { context, page, ui } = await fresh(390, 844, () => {
        const original = Storage.prototype.setItem;
        globalThis.blockOnboardingSave = true;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'tripflix.onboarding.v1' && globalThis.blockOnboardingSave)
            throw new Error('Storage full');
          return original.call(this, key, value);
        };
      });
      await ui.goto('/onboarding');
      await ui.visible('Chọn gu của tôi');
      await ui.click('Chọn gu của tôi');
      await ui.choice('Phố cổ & văn hoá').click();
      await ui.click('Chọn nhịp chuyến đi');
      await ui.pace('Đi thật nhiều').click();
      await ui.click('Xem gu của tôi');
      await ui.click('Lưu và khám phá');
      await ui.visible('Khám phá lần này');
      assert.equal(new URL(page.url()).pathname, '/onboarding');
      assert.equal(await ui.stored(), null);
      await ui.snapshot('09-storage-error');
      await page.evaluate(() => {
        globalThis.blockOnboardingSave = false;
      });
      await ui.click('Lưu và khám phá');
      await page.waitForURL((url) => url.pathname === '/');
      assert.deepEqual((await ui.stored()).interests, ['culture']);
      checks.push('Storage failure retains selections, no false success, retry succeeds');
      await context.close();
    }
    assert.deepEqual(pageErrors, [], 'no runtime page errors');
    await writeFile(
      join(output, 'qa-results.json'),
      JSON.stringify({ checks, pageErrors, passed: true, nativeTested: false }, null, 2),
    );
    console.log(JSON.stringify({ passed: true, checks, output }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
