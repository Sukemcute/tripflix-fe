// Kiểm tra khảo sát sở thích trên web (SCRUM-160) bằng trình duyệt thật.
// Chạy với web dev đang mở: WEB_URL=http://localhost:3100 PLAYWRIGHT_PACKAGE=<đường dẫn playwright> node tools/verify-web-onboarding.cjs
// Phần tài khoản dùng API giả lập (route chặn /api/auth/*) nên không cần backend; ảnh lưu ở WEB_EVIDENCE_DIR.
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.WEB_URL || 'http://localhost:3100';
const output = process.env.WEB_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'tripflix-web-onboarding');
const KEY = 'tripflix.onboarding.v1';
const results = [];
const pass = (name) => {
  results.push(name);
  console.log('ok -', name);
};
const local = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
const interest = (page, title) => page.getByRole('checkbox', { name: new RegExp(`^${title}`) });
const pace = (page, title) => page.getByRole('radio', { name: new RegExp(`^${title}`) });
// Bấm vào cả thẻ như người dùng (ô thật bị ẩn hình, ảnh phủ lên trên).
// Ảnh bằng chứng: chờ ảnh tải xong, tua hết hiệu ứng CSS để ảnh không bị chụp giữa chừng.
const settle = (page) =>
  page
    .waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 15000 })
    .catch(() => {});
const pick = (option) => option.page().locator('label').filter({ has: option }).click();

async function guestFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
  const page = await context.newPage();
  const patches = [];
  page.on('request', (request) => request.method() === 'PATCH' && patches.push(request.url()));
  await page.goto(`${base}/onboarding`);
  await page.getByRole('heading', { name: 'Chuyến đi, theo gu của bạn.' }).waitFor();
  await settle(page);
  await page.screenshot({ animations: 'disabled', path: join(output, '1-welcome.png') });
  await page.getByRole('button', { name: 'Chọn gu của tôi' }).click();

  assert.equal(await page.getByRole('checkbox').count(), 6, 'đủ 6 sở thích');
  for (const title of [
    'Biển & đảo',
    'Núi & thiên nhiên',
    'Phố cổ & văn hoá',
    'Ăn uống',
    'Thành phố & về đêm',
    'Nghỉ dưỡng',
  ])
    await interest(page, title).waitFor();
  pass('guest: 6 sở thích đúng nhãn');
  const next = page.getByRole('button', { name: 'Tiếp tục' });
  assert(await next.isDisabled(), 'chưa chọn thì chưa tiếp tục');

  await pick(interest(page, 'Thành phố & về đêm'));
  await pick(interest(page, 'Ăn uống'));
  assert.equal(await page.getByText('Đã chọn', { exact: true }).count(), 2, 'mục đã chọn có dấu ✓ và chữ');
  await page.getByText('Đã chọn 2 · gợi ý chọn 2–5 điều bạn thích.').waitFor();
  pass('guest: mục đã chọn có ✓ + chữ, gợi ý 2–5');
  await settle(page);
  await page.screenshot({ animations: 'disabled', path: join(output, '2-interests.png') });
  await next.click();

  await pick(pace(page, 'Chậm một chút'));
  await settle(page);
  await page.screenshot({ animations: 'disabled', path: join(output, '2b-pace.png') });
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('list', { name: 'Ăn uống · Thành phố & về đêm' }).waitFor();
  await settle(page);
  await page.screenshot({ animations: 'disabled', path: join(output, '3-review.png') });

  await page.getByRole('button', { name: 'Quay lại' }).click();
  assert(await pace(page, 'Chậm một chút').isChecked(), 'Back giữ nhịp đi');
  await page.getByRole('button', { name: 'Quay lại' }).click();
  assert(
    (await interest(page, 'Ăn uống').isChecked()) && (await interest(page, 'Thành phố & về đêm').isChecked()),
  );
  pass('guest: Back giữ các lựa chọn');

  await page.reload();
  await page.getByRole('heading', { name: 'Điều gì khiến bạn muốn xách ba lô?' }).waitFor();
  assert(await interest(page, 'Ăn uống').isChecked(), 'tải lại vẫn còn bản nháp');
  pass('guest: bản nháp còn sau khi tải lại');

  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Lưu sở thích' }).click();
  await page.getByRole('heading', { name: /Đã lưu sở thích trên trình duyệt này/ }).waitFor();
  const saved = await local(page);
  assert.equal(saved.status, 'completed');
  assert.deepEqual(saved.interests, ['food', 'city']);
  assert.equal(saved.pace, 'slow');
  assert(Date.parse(saved.completedAt) > 0, 'có completedAt');
  assert.equal(patches.length, 0, 'khách không gọi PATCH');
  pass('guest: hoàn tất chỉ lưu local, không gọi API');
  await settle(page);
  await page.screenshot({ animations: 'disabled', path: join(output, '4-guest-saved.png') });

  await page.evaluate((key) => localStorage.removeItem(key), KEY);
  await page.goto(`${base}/onboarding`);
  await page.getByRole('button', { name: 'Khám phá trước' }).click();
  await page.waitForURL(`${base}/`);
  assert.equal((await local(page)).status, 'skipped');
  pass('guest: Khám phá trước → trang chủ, ghi skipped');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/onboarding`);
  await page.getByRole('button', { name: 'Chọn gu của tôi' }).click();
  await page.getByRole('checkbox').first().waitFor({ state: 'attached' });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'điện thoại không tràn ngang',
  );
  await settle(page);
  await page.screenshot({ animations: 'disabled', path: join(output, '5-mobile-width.png'), fullPage: true });
  pass('guest: màn hình 390px không tràn ngang');
  await context.close();
}

async function accountFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
  const cors = {
    'access-control-allow-origin': base,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*',
  };
  const profile = {
    id: 'u1',
    email: 'trang@example.com',
    displayName: 'Trang',
    role: 'user',
    createdAt: '2026-11-01T00:00:00.000Z',
    emailVerified: true,
    phone: null,
    dateOfBirth: null,
    gender: null,
    nationality: null,
  };
  let stored = null;
  let failures = 1;
  const bodies = [];
  await context.route('**/api/auth/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (request.url().endsWith('/api/auth/refresh'))
      return route.fulfill({
        headers: cors,
        json: { accessToken: 't', tokenType: 'Bearer', expiresIn: 900 },
      });
    if (request.method() === 'PATCH') {
      bodies.push(request.postDataJSON());
      if (failures-- > 0) return route.fulfill({ status: 503, headers: cors, json: { message: 'down' } });
      stored = bodies.at(-1).travelPreferences;
    }
    return route.fulfill({ headers: cors, json: { ...profile, travelPreferences: stored } });
  });
  const page = await context.newPage();
  await page.goto(`${base}/onboarding?returnTo=%2Faccount`);
  // Đã đăng nhập thì bỏ qua màn chào, vào thẳng câu hỏi.
  await page.getByRole('heading', { name: 'Điều gì khiến bạn muốn xách ba lô?' }).waitFor();
  await pick(interest(page, 'Biển & đảo'));
  await pick(interest(page, 'Ăn uống'));
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await pick(pace(page, 'Đi thật nhiều'));
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Lưu sở thích' }).click();

  await page.getByText('Chưa lưu được sở thích vào tài khoản. Lựa chọn của bạn vẫn được giữ.').waitFor();
  assert.equal(await page.getByText('Đã lưu sở thích của bạn.').count(), 0, 'lỗi thì không báo đã lưu');
  await page.getByRole('list', { name: 'Biển & đảo · Ăn uống' }).waitFor();
  await settle(page);
  await page.screenshot({ animations: 'disabled', path: join(output, '6-account-error.png') });
  pass('tài khoản: PATCH lỗi → giữ lựa chọn, không báo đã lưu');

  await page.getByRole('button', { name: 'Thử lại' }).click();
  await page.getByRole('heading', { name: 'Đã lưu sở thích của bạn.' }).waitFor();
  assert.equal(bodies.length, 2);
  const sent = bodies[1].travelPreferences;
  assert.equal(sent.status, 'completed');
  assert.deepEqual(sent.interests, ['coast', 'food']);
  assert.deepEqual(Object.keys(sent).sort(), ['budgetLevels', 'interests', 'regions', 'status', 'updatedAt']);
  assert.equal(bodies[0].travelPreferences.updatedAt, sent.updatedAt, 'thử lại giữ thời điểm bấm hoàn tất');
  pass('tài khoản: thử lại thành công → báo đã lưu; body đúng, không gửi pace');
  await settle(page);
  await page.screenshot({ animations: 'disabled', path: join(output, '7-account-saved.png') });
  await page.getByRole('link', { name: 'Tiếp tục' }).click();
  await page.waitForURL(`${base}/account`);
  pass('tài khoản: tiếp tục về /account');
  await context.close();
}

/** API giả lập có trạng thái đăng nhập: đăng nhập 2 bước (mã), hồ sơ, PATCH, đăng xuất. */
async function loginFlow(browser) {
  const cors = {
    'access-control-allow-origin': base,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*',
  };
  const profile = {
    id: 'u2',
    email: 'khach@example.com',
    displayName: 'Khách đăng nhập',
    role: 'user',
    createdAt: '2026-11-01T00:00:00.000Z',
    emailVerified: true,
    phone: null,
    dateOfBirth: null,
    gender: null,
    nationality: null,
  };
  async function newSession(serverPreferences) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
    const state = { isAuthenticated: false, preferences: serverPreferences, patches: [] };
    await context.route('**/api/auth/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      const reply = (json, status = 200) => route.fulfill({ status, headers: cors, json });
      if (path === '/api/auth/refresh')
        return state.isAuthenticated
          ? reply({ accessToken: 't', tokenType: 'Bearer', expiresIn: 900 })
          : reply({}, 401);
      if (path === '/api/auth/password-key')
        return reply({
          keyId: 'qa',
          publicKey: Buffer.from([9, ...new Uint8Array(31)]).toString('base64url'),
          serverTime: Math.floor(Date.now() / 1000),
        });
      if (path === '/api/auth/login-code')
        return reply({ loginChallengeId: 'qa-challenge', resendAfterSeconds: 0 });
      if (path === '/api/auth/login') {
        state.isAuthenticated = true;
        return reply({ accessToken: 't', tokenType: 'Bearer', expiresIn: 900 });
      }
      if (path === '/api/auth/logout') {
        state.isAuthenticated = false;
        return route.fulfill({ status: 204, headers: cors });
      }
      if (path === '/api/auth/me' && request.method() === 'PATCH') {
        state.patches.push(request.postDataJSON());
        state.preferences = state.patches.at(-1).travelPreferences;
      }
      if (path === '/api/auth/me') return reply({ ...profile, travelPreferences: state.preferences });
      return reply({ items: [], nextCursor: null, unreadCount: 0 });
    });
    return { context, page: await context.newPage(), state };
  }
  async function signIn(page, returnTo) {
    await page.goto(`${base}/login?returnTo=${encodeURIComponent(returnTo)}`);
    await page.locator('#auth-email').fill(profile.email);
    await page.locator('#auth-password').fill('QA-onboarding-journey-2026!');
    await page.locator('.auth-submit').click();
    await page.locator('#auth-login-code').fill('12345678');
    await page.locator('.auth-submit').click();
  }

  // 1) Khách làm xong khảo sát trên máy, rồi đăng nhập: gửi đúng một lần, không mở lại khảo sát.
  const guest = await newSession(null);
  await guest.page.goto(`${base}/onboarding`);
  await guest.page.getByRole('button', { name: 'Chọn gu của tôi' }).click();
  await pick(interest(guest.page, 'Ăn uống'));
  await guest.page.getByRole('button', { name: 'Tiếp tục' }).click();
  await guest.page.getByRole('button', { name: 'Bỏ qua câu này' }).click();
  await guest.page.getByRole('button', { name: 'Lưu sở thích' }).click();
  await guest.page.getByRole('heading', { name: /Đã lưu sở thích trên trình duyệt này/ }).waitFor();
  const completedAt = (await local(guest.page)).completedAt;
  await signIn(guest.page, '/account');
  await guest.page.waitForURL(`${base}/account`);
  assert.equal(guest.state.patches.length, 1, 'đăng nhập gửi đúng một PATCH');
  const sent = guest.state.patches[0].travelPreferences;
  assert.equal(sent.status, 'completed');
  assert.deepEqual(sent.interests, ['food']);
  assert.equal(sent.updatedAt, completedAt, 'updatedAt = lúc khách bấm hoàn tất');
  pass('đăng nhập: khách đã làm khảo sát → PATCH một lần với updatedAt gốc, vào thẳng /account');

  // 2) Đăng xuất xoá bản trên máy.
  await guest.page.getByRole('button', { name: 'Đăng xuất' }).click();
  await guest.page.waitForURL(`${base}/`);
  await guest.page.waitForFunction((key) => localStorage.getItem(key) === null, KEY);
  pass('đăng xuất: xoá bản khảo sát trên máy');
  await guest.context.close();

  // 3) Tài khoản chưa có khảo sát, máy trống: đăng nhập xong được mời làm khảo sát.
  const fresh = await newSession(null);
  await signIn(fresh.page, '/account');
  await fresh.page.waitForURL(
    (url) => url.pathname === '/onboarding' && url.searchParams.get('returnTo') === '/account',
  );
  await fresh.page.getByRole('heading', { name: 'Điều gì khiến bạn muốn xách ba lô?' }).waitFor();
  assert.equal(fresh.state.patches.length, 0);
  pass('đăng nhập: hồ sơ chưa làm khảo sát → mở /onboarding, chưa gửi gì');
  await settle(fresh.page);
  await fresh.page.screenshot({ animations: 'disabled', path: join(output, '8-after-login-survey.png') });
  await fresh.context.close();

  // 4) Hồ sơ đã completed: đi thẳng, không mời lại dù máy có bản nháp.
  const done = await newSession({
    status: 'completed',
    interests: ['coast'],
    regions: [],
    budgetLevels: [],
    updatedAt: '2026-11-10T00:00:00.000Z',
  });
  await signIn(done.page, '/account');
  await done.page.waitForURL(`${base}/account`);
  assert.equal(done.state.patches.length, 0);
  pass('đăng nhập: hồ sơ đã completed → vào thẳng /account, không gửi, không mời');
  await done.context.close();
}

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    channel: process.env.CHROME_PATH ? undefined : 'chrome',
  });
  try {
    await guestFlow(browser);
    await accountFlow(browser);
    await loginFlow(browser);
  } finally {
    await browser.close();
  }
  console.log(`Web onboarding: ${results.length} nhóm kiểm tra pass. Ảnh: ${output}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
