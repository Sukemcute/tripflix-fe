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

async function guestFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
  const page = await context.newPage();
  const patches = [];
  page.on('request', (request) => request.method() === 'PATCH' && patches.push(request.url()));
  await page.goto(`${base}/onboarding`);
  await page.getByRole('heading', { name: 'Chuyến đi, theo gu của bạn.' }).waitFor();
  await page.screenshot({ path: join(output, '1-welcome.png') });
  await page.getByRole('button', { name: 'Chọn gu của tôi' }).click();

  assert.equal(await page.getByRole('checkbox').count(), 6, 'đủ 6 sở thích');
  for (const title of ['Biển & đảo', 'Núi & thiên nhiên', 'Phố cổ & văn hoá', 'Ăn uống', 'Thành phố & về đêm', 'Nghỉ dưỡng'])
    await interest(page, title).waitFor();
  pass('guest: 6 sở thích đúng nhãn');
  const next = page.getByRole('button', { name: 'Tiếp tục' });
  assert(await next.isDisabled(), 'chưa chọn thì chưa tiếp tục');

  await interest(page, 'Thành phố & về đêm').check({ force: true });
  await interest(page, 'Ăn uống').check({ force: true });
  assert.equal(await page.getByText('✓ Đã chọn').count(), 2, 'mục đã chọn có dấu ✓ và chữ');
  await page.getByText('Đã chọn 2 · gợi ý chọn 2–5 điều bạn thích.').waitFor();
  pass('guest: mục đã chọn có ✓ + chữ, gợi ý 2–5');
  await page.screenshot({ path: join(output, '2-interests.png') });
  await next.click();

  await pace(page, 'Chậm một chút').check({ force: true });
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByText('Ăn uống · Thành phố & về đêm').waitFor();
  await page.screenshot({ path: join(output, '3-review.png') });

  await page.getByRole('button', { name: '← Quay lại' }).click();
  assert(await pace(page, 'Chậm một chút').isChecked(), 'Back giữ nhịp đi');
  await page.getByRole('button', { name: '← Quay lại' }).click();
  assert(await interest(page, 'Ăn uống').isChecked() && (await interest(page, 'Thành phố & về đêm').isChecked()));
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
  await page.screenshot({ path: join(output, '4-guest-saved.png') });

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
  await page.screenshot({ path: join(output, '5-mobile-width.png'), fullPage: true });
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
      return route.fulfill({ headers: cors, json: { accessToken: 't', tokenType: 'Bearer', expiresIn: 900 } });
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
  await interest(page, 'Biển & đảo').check({ force: true });
  await interest(page, 'Ăn uống').check({ force: true });
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await pace(page, 'Đi thật nhiều').check({ force: true });
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Lưu sở thích' }).click();

  await page.getByText('Chưa lưu được sở thích vào tài khoản. Lựa chọn của bạn vẫn được giữ.').waitFor();
  assert.equal(await page.getByText('Đã lưu sở thích của bạn.').count(), 0, 'lỗi thì không báo đã lưu');
  await page.getByText('Biển & đảo · Ăn uống').waitFor();
  await page.screenshot({ path: join(output, '6-account-error.png') });
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
  await page.screenshot({ path: join(output, '7-account-saved.png') });
  await page.getByRole('link', { name: 'Tiếp tục' }).click();
  await page.waitForURL(`${base}/account`);
  pass('tài khoản: tiếp tục về /account');
  await context.close();
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
  } finally {
    await browser.close();
  }
  console.log(`Web onboarding: ${results.length} nhóm kiểm tra pass. Ảnh: ${output}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
