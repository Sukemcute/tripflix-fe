// TF100: hàng chờ kiểm duyệt hiện nhãn riêng cho luật dụ chuyển khoản ngoài app.
// Kiểm trên Admin thật (đăng nhập thật, API local), cần sẵn một hồ sơ có luật OFF_PLATFORM_PAYMENT
// với nội dung chứa MODERATION_QA_TEXT. Mật khẩu truyền qua biến môi trường, không ghi vào evidence.
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');

const admin = process.env.MODERATION_ADMIN_URL || 'http://localhost:3200';
const email = process.env.MODERATION_LIVE_EMAIL || 'superadmin@tripflix.local';
const password = process.env.MODERATION_LIVE_PASSWORD;
const qaText = process.env.MODERATION_QA_TEXT || 'TF100-QA';
const output = path.resolve(process.env.MODERATION_OUTPUT || '../../outputs/admin-moderation-off-platform-20261117');

async function main() {
  assert.ok(password, 'MODERATION_LIVE_PASSWORD is required');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (error) => errors.push(error.message));
    // Chạy Admin của một nhánh khác ở cổng phụ: core-api chỉ nhận origin 3100/3200 (AUTH_WEB_ORIGINS),
    // nên gửi BFF đúng origin đã khai báo bằng ADMIN_ORIGIN.
    const originOverride = process.env.MODERATION_ORIGIN_OVERRIDE;
    if (originOverride)
      await page.route('**/bff/**', (route) =>
        route.continue({ headers: { ...route.request().headers(), origin: originOverride } }),
      );
    await page.goto(`${admin}/login?returnTo=%2Fmoderation`, { timeout: 120000 });
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30000 });
    if (!page.url().includes('/moderation')) await page.goto(`${admin}/moderation`);

    const row = page.getByRole('row').filter({ hasText: qaText });
    await expect(row).toBeVisible({ timeout: 30000 });
    await expect(row.getByText('Nghi dụ chuyển tiền ngoài app')).toBeVisible();
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'queue-1440.png') });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`OK: nhãn "Nghi dụ chuyển tiền ngoài app" hiện trên hàng chờ. Ảnh: ${output}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
