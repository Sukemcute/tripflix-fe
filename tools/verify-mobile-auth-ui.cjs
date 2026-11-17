// UI fixtures only. Successful registration/account-onboarding flows are covered by the companion QA script.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-auth-ui');
const longError =
  'Email này chưa thể dùng để nhận mã xác thực. Vui lòng kiểm tra lại địa chỉ email, tránh khoảng trắng hoặc ký tự bị nhập sai, rồi gửi yêu cầu một lần nữa.';

class AuthPage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  field(name) {
    return this.page.getByLabel(name, { exact: true });
  }
  async goto(path = '/login') {
    await this.page.goto(new URL(path, base).href);
    await this.field('Email').waitFor();
  }
  async snapshot(name) {
    await this.page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    });
    await this.page.screenshot({ path: join(output, name + '.png'), fullPage: true });
  }
  async noOverflow() {
    assert(
      await this.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'no horizontal page overflow',
    );
  }
  async fits(locator) {
    const rect = await locator.boundingBox(),
      viewport = this.page.viewportSize();
    assert(
      rect &&
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x + rect.width <= viewport.width + 1 &&
        rect.y + rect.height <= viewport.height + 1,
      'control fits viewport',
    );
  }
  async noUnderlines() {
    const count = await this.page
      .locator('[dir="auto"]')
      .evaluateAll(
        (nodes) =>
          nodes.filter((node) => getComputedStyle(node).textDecorationLine.includes('underline')).length,
      );
    assert.equal(count, 0, 'no underlined text');
  }
  async fillProfile() {
    await this.field('Tên hiển thị').fill('Người mê những chuyến đi dài');
    await this.field('Email').fill('auth-ui@example.test');
    await this.field('Mật khẩu').fill('Journey-auth-ui-2026!');
    await this.field('Ngày sinh (ngày/tháng/năm)').fill('20/05/2000');
    await this.button('Nữ').click();
    await this.page.getByRole('checkbox').click();
  }
}

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    headless: true,
  });
  const checks = [],
    errors = [];
  try {
    for (const width of [375, 390, 430, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 667 : 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await context.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
      await context.route('**/api/auth/password-key', (route) =>
        route.fulfill({
          json: {
            keyId: 'qa',
            publicKey: Buffer.from([9, ...new Uint8Array(31)]).toString('base64url'),
            serverTime: Math.floor(Date.now() / 1000),
          },
        }),
      );
      await context.route('**/api/auth/login', (route) => route.fulfill({ status: 401, json: {} }));
      await context.route('**/api/auth/registration-code', (route) =>
        route.fulfill({
          status: 400,
          json: { code: 'VALIDATION_ERROR', errors: [{ field: 'email', message: longError }] },
        }),
      );
      const ui = new AuthPage(page);
      await ui.goto('/login?returnTo=/cart');
      await ui.fits(ui.button('Đăng nhập & tiếp tục'));
      assert(await ui.button('Đăng nhập & tiếp tục').isDisabled());
      await ui.noUnderlines();
      await ui.noOverflow();
      await ui.snapshot(`after-login-${width}`);
      await ui.goto();
      await ui.snapshot(`default-login-${width}`);
      await ui.field('Email').fill('reader@example.test');
      await ui.field('Mật khẩu').fill('Test-password-2026!');
      assert.equal(await ui.field('Mật khẩu').getAttribute('type'), 'password');
      await ui.button('Hiện mật khẩu').click();
      assert.equal(await ui.field('Mật khẩu').evaluate((input) => input.type), 'text');
      assert.equal(await ui.field('Mật khẩu').inputValue(), 'Test-password-2026!');
      await ui.button('Ẩn mật khẩu').click();
      await ui.button('Đăng nhập & tiếp tục').click();
      await page.getByRole('alert').waitFor();
      assert.equal(await ui.field('Email').inputValue(), 'reader@example.test');
      await ui.snapshot(`login-error-${width}`);

      await ui.button('Chưa có tài khoản? Đăng ký').click();
      await ui.field('Tên hiển thị').waitFor();
      await ui.field('Tên hiển thị').scrollIntoViewIfNeeded();
      assert.equal(await ui.field('Mật khẩu').getAttribute('type'), 'password');
      await ui.snapshot(`after-register-${width}`);
      await ui.noUnderlines();
      await ui.noOverflow();
      await ui.fillProfile();
      await ui.button('Quốc tịch: Việt Nam').click();
      await ui.button('Nhật Bản').click();
      await ui.button('Quốc tịch: Nhật Bản').waitFor();
      await ui.button('Đóng').waitFor({ state: 'hidden' });
      await ui.field('Mã xác thực email').scrollIntoViewIfNeeded();
      await ui.snapshot(`register-verification-${width}`);
      await ui.noOverflow();
      await ui.button('Gửi mã xác thực').click();
      await page.getByRole('alert').waitFor();
      await ui.field('Email').scrollIntoViewIfNeeded();
      assert.equal(await ui.field('Email').inputValue(), 'auth-ui@example.test');
      await page.getByText(longError, { exact: true }).waitFor();
      await ui.snapshot(`register-long-error-${width}`);
      await ui.noUnderlines();
      await ui.noOverflow();
      if (width === 390) {
        await page.setViewportSize({ width, height: 480 });
        await ui.field('Email').focus();
        await ui.field('Email').scrollIntoViewIfNeeded();
        await ui.fits(ui.field('Email'));
        await ui.snapshot('reduced-viewport-focused-field');
        checks.push(
          'Reduced viewport keeps focused field reachable; this does not replace native keyboard testing',
        );
      }
      checks.push(
        `Layout ${width}px: visible booking CTA, show/hide password, errors retain input, grouped signup, picker, no underlines or horizontal overflow`,
      );
      await context.close();
    }
    assert.deepEqual(errors, []);
    const result = {
      passed: true,
      checks,
      pageErrors: errors,
      authApiFixtures: true,
      nativeKeyboardTested: false,
      liveGoogleTested: false,
    };
    await writeFile(join(output, 'qa-results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
