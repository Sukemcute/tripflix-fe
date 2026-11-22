// Exercise the real registration/session/navigation UI with isolated auth API fixtures.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const evidence =
  process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-signup-onboarding');
const KEY = 'tripflix.onboarding.v1';
const profile = {
  id: 'qa-new-member',
  email: 'signup@example.test',
  displayName: 'QA Onboarding',
  role: 'member',
  createdAt: '2026-11-17T00:00:00Z',
  emailVerified: true,
  phone: null,
  dateOfBirth: '2000-05-20',
  gender: 'female',
  nationality: 'VN',
  travelPreferences: null,
};
const token = { accessToken: 'qa-access', tokenType: 'Bearer', expiresIn: 900 };

class SignupPage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  async goto(target = '/create') {
    await this.page.goto(`${base}/login?returnTo=${encodeURIComponent(target)}`);
  }
  async register() {
    await this.button('Chưa có tài khoản? Đăng ký').click();
    await this.page.getByLabel('Tên hiển thị', { exact: true }).fill(profile.displayName);
    await this.page.getByLabel('Email', { exact: true }).fill(profile.email);
    await this.page.getByLabel('Mật khẩu', { exact: true }).fill('QA-onboarding-journey-2026!');
    await this.page.getByLabel('Ngày sinh (ngày/tháng/năm)', { exact: true }).fill('20/05/2000');
    await this.button('Nữ').click();
    await this.page.getByRole('checkbox').click();
    await this.button('Gửi mã xác thực').click();
    await this.page.getByLabel('Mã xác thực email', { exact: true }).fill('12345678');
    await this.button('Tạo tài khoản').click();
  }
  async login(email = profile.email) {
    await this.page.getByLabel('Email', { exact: true }).fill(email);
    await this.page.getByLabel('Mật khẩu', { exact: true }).fill('QA-onboarding-journey-2026!');
    await this.button('Đăng nhập & tiếp tục').click();
  }
  async selectTaste() {
    await this.page.getByRole('checkbox', { name: 'Biển & đảo', exact: true }).click();
    await this.button('Chọn nhịp chuyến đi').click();
    await this.page.getByRole('radio', { name: 'Chậm một chút', exact: true }).click();
    await this.button('Xem gu của tôi').click();
  }
  async stored() {
    return this.page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key + '.account'))?.record ?? JSON.parse(localStorage.getItem(key)),
      KEY,
    );
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.waitForFunction(() =>
      [...document.getAnimations()].every((animation) => animation.playState !== 'running'),
    );
    await this.page.screenshot({ path: join(evidence, name + '.png') });
  }
}

(async () => {
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    headless: true,
  });
  const checks = [],
    errors = [];
  async function fresh(
    previousStatus = 'completed',
    rejectRegistration = false,
    blockStorage = false,
    preferences = null,
    restored = false,
  ) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    await context.addInitScript(
      ({ key, status, block }) => {
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, status, interests: ['nature'], pace: 'active', step: 'welcome' }),
        );
        if (block) {
          const setItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key.startsWith('tripflix.onboarding.v1')) throw new Error('QA storage full');
            return setItem.call(this, key, value);
          };
        }
      },
      { key: KEY, status: previousStatus, block: blockStorage },
    );
    const requests = [];
    const account = { ...profile, travelPreferences: preferences };
    let rejectSave = false;
    let authenticated = restored;
    await context.route('**/api/**', async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      requests.push({ path, method: request.method() });
      if (path === '/api/auth/refresh')
        return route.fulfill(authenticated ? { json: token } : { status: 401, json: {} });
      if (path === '/api/auth/password-key')
        return route.fulfill({
          json: {
            keyId: 'qa',
            publicKey: Buffer.from([9, ...new Uint8Array(31)]).toString('base64url'),
            serverTime: Math.floor(Date.now() / 1000),
          },
        });
      if (path === '/api/auth/registration-code')
        return route.fulfill({ json: { registrationId: 'qa-registration', resendAfterSeconds: 0 } });
      if (path === '/api/auth/register')
        return route.fulfill(
          rejectRegistration
            ? { status: 400, json: { code: 'REGISTRATION_CODE_INVALID' } }
            : { status: 201, json: {} },
        );
      if (path === '/api/auth/login') {
        authenticated = true;
        return route.fulfill({ json: token });
      }
      if (path === '/api/auth/me' && request.method() === 'PATCH') {
        if (rejectSave) return route.fulfill({ status: 503, json: {} });
        account.travelPreferences = request.postDataJSON().travelPreferences;
        return route.fulfill({ json: account });
      }
      if (path === '/api/auth/me') return route.fulfill({ json: account });
      return route.fulfill({ json: { items: [], nextCursor: null, unreadCount: 0 } });
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    return {
      page,
      ui: new SignupPage(page),
      context,
      requests,
      account,
      rejectSave: (value) => {
        rejectSave = value;
      },
    };
  }
  try {
    {
      const { context, page, ui, requests, account } = await fresh();
      await ui.goto();
      await ui.register();
      await page.waitForURL(
        (url) => url.pathname === '/onboarding' && url.searchParams.get('source') === 'account',
      );
      await ui.button('Chọn nhịp chuyến đi').waitFor();
      assert.equal(
        await page.getByRole('checkbox', { name: 'Núi & thiên nhiên', exact: true }).getAttribute('aria-checked'),
        'false',
      );
      assert.deepEqual((await ui.stored()).interests, []);
      await ui.snapshot('01-after-signup');
      await page.getByRole('checkbox', { name: 'Biển & đảo', exact: true }).click();
      await ui.button('Chọn nhịp chuyến đi').click();
      await page.getByRole('radio', { name: 'Chậm một chút', exact: true }).click();
      await ui.button('Xem gu của tôi').click();
      await ui.snapshot('02-review-before-return');
      await ui.button('Lưu và khám phá').click();
      await page.waitForURL((url) => url.pathname === '/create');
      assert.equal((await ui.stored()).status, 'completed');
      assert.deepEqual((await ui.stored()).interests, ['coast']);
      assert.equal(account.travelPreferences.status, 'completed');
      assert.deepEqual(account.travelPreferences.interests, ['coast']);
      assert(requests.some((r) => r.path === '/api/auth/register'));
      await page.goto(`${base}/me`);
      await ui.button('Cài đặt').click();
      await ui.button('Gu du lịch').click();
      await ui.button('Chọn gu của tôi').waitFor();
      await ui.button('Đóng').click();
      await ui.button('Gu du lịch').waitFor();
      checks.push(
        'Signup → authenticated survey despite completed device record → save → create; profile/settings reopens taste editor',
      );
      await context.close();
    }
    {
      const { context, page, ui } = await fresh('skipped');
      await ui.goto('/saved');
      await ui.register();
      await ui.button('Chọn nhịp chuyến đi').waitFor();
      await ui.button('Khám phá trước').click();
      await page.waitForURL((url) => url.pathname === '/saved');
      assert.equal((await ui.stored()).status, 'skipped');
      checks.push('Previously skipped device still shows signup survey; skipping resumes saved task');
      await ui.goto('/saved');
      await ui.login();
      await ui.button('Chọn nhịp chuyến đi').waitFor();
      checks.push('Skipped account is asked again on its next login');
      await context.close();
    }
    {
      const { context, page, ui, account, rejectSave } = await fresh('completed', false, false, {
        status: 'skipped',
        interests: ['food'],
        regions: ['south'],
        budgetLevels: ['moderate'],
        updatedAt: new Date().toISOString(),
      });
      await ui.goto('/saved');
      await ui.login();
      await ui.button('Chọn nhịp chuyến đi').waitFor();
      await ui.selectTaste();
      rejectSave(true);
      await ui.button('Lưu và khám phá').click();
      await page.getByText('Chưa lưu được vào tài khoản.', { exact: false }).waitFor();
      assert.equal(account.travelPreferences.status, 'skipped');
      assert.equal(new URL(page.url()).pathname, '/onboarding');
      rejectSave(false);
      await ui.button('Lưu và khám phá').click();
      await page.waitForURL((url) => url.pathname === '/saved');
      assert.deepEqual(account.travelPreferences.interests, ['coast', 'food']);
      assert.deepEqual(account.travelPreferences.regions, ['south']);
      assert.deepEqual(account.travelPreferences.budgetLevels, ['moderate']);
      await ui.goto('/saved');
      await ui.login();
      await page.waitForURL((url) => url.pathname === '/saved');
      checks.push(
        'Incomplete existing account is prompted; failed PATCH retains draft; retry preserves web fields and stops future prompts',
      );
      const firstPreferences = account.travelPreferences;
      account.id = 'qa-second-member';
      account.email = 'second@example.test';
      account.travelPreferences = null;
      await ui.goto('/saved');
      await ui.login(account.email);
      await ui.button('Chọn nhịp chuyến đi').waitFor();
      assert.equal(
        await page.getByRole('checkbox', { name: 'Biển & đảo', exact: true }).getAttribute('aria-checked'),
        'false',
      );
      assert.equal(
        (await page.evaluate((key) => JSON.parse(localStorage.getItem(key + '.account')), KEY)).accountId,
        account.id,
      );
      await ui.button('Khám phá trước').click();
      await page.waitForURL((url) => url.pathname === '/saved');
      account.id = profile.id;
      account.email = profile.email;
      account.travelPreferences = firstPreferences;
      await ui.goto('/saved');
      await ui.login();
      await page.waitForURL((url) => url.pathname === '/saved');
      checks.push(
        'Switching accounts isolates drafts; completed first account is not blocked by second-account cache',
      );
      await context.close();
    }
    {
      const { context, page, ui, requests, account } = await fresh('skipped', false, false, {
        status: 'completed',
        interests: ['coast'],
        regions: [],
        budgetLevels: [],
        updatedAt: new Date().toISOString(),
      });
      await ui.goto('/saved');
      await page.getByLabel('Email', { exact: true }).fill(profile.email);
      await page.getByLabel('Mật khẩu', { exact: true }).fill('QA-onboarding-journey-2026!');
      await ui.button('Đăng nhập & tiếp tục').click();
      await page.waitForURL((url) => url.pathname === '/saved');
      assert.equal(account.travelPreferences.status, 'completed');
      assert(!requests.some((r) => r.path === '/api/auth/register'));
      checks.push('Existing password login keeps normal return path and does not restart onboarding');
      await context.close();
    }
    {
      const { context, page, ui } = await fresh('completed', true);
      await ui.goto();
      const rejected = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/register');
      await ui.register();
      await rejected;
      await ui.button('Tạo tài khoản').waitFor();
      assert.equal(new URL(page.url()).pathname, '/login');
      assert.equal((await ui.stored()).status, 'completed');
      checks.push('Rejected registration stays on form and does not erase existing device preferences');
      await context.close();
    }
    {
      const { context, page, ui } = await fresh('completed', false, true);
      await ui.goto('/saved');
      await ui.register();
      await ui.button('Chọn nhịp chuyến đi').waitFor();
      await ui.button('Khám phá trước').click();
      await page.waitForURL((url) => url.pathname === '/saved');
      checks.push('Account save and return succeed even when the device cache is unavailable');
      await context.close();
    }
    {
      const { context, page, ui } = await fresh('completed', false, false, null, true);
      await page.goto(base);
      await ui.button('Chọn nhịp chuyến đi').waitFor();
      await ui.button('Khám phá trước').click();
      await page.waitForURL((url) => url.pathname === '/');
      await page.getByRole('tab', { name: 'Dành cho bạn', exact: true }).waitFor();
      checks.push(
        'Restored account without survey is prompted once and skip does not create a navigation loop',
      );
      await context.close();
    }
    assert.deepEqual(errors, []);
    const result = {
      passed: true,
      checks,
      pageErrors: errors,
      authApiFixtures: true,
      realEmailOrNativeTested: false,
    };
    await writeFile(join(evidence, 'qa-results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
