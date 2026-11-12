const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

const WEB = process.env.WEB_PREVIEW_URL || 'http://localhost:3100';
const ADMIN = process.env.ADMIN_PREVIEW_URL || 'http://localhost:3200';
const MOBILE = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8081';
const OUTPUT = process.env.MENTOR_EVIDENCE_DIR || join(tmpdir(), 'tripflix-mentor-demo');
const errors = [];
const checks = [];
let screenshots = 0;

class DemoPage {
  constructor(page, base) {
    this.page = page;
    this.base = base;
    page.on('pageerror', (error) => errors.push(error.message));
  }
  async visit(path = '/') {
    await this.page.goto(new URL(path, this.base).href);
  }
  async visible(text) {
    await this.page.getByText(text, { exact: true }).filter({ visible: true }).first().waitFor();
  }
  async snapshot(name) {
    await this.page.evaluate(async () => {
      for (const image of document.images) image.loading = 'eager';
      await Promise.all(
        [...document.images].map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
              }),
        ),
      );
      await document.fonts.ready;
    });
    assert.equal(
      await this.page
        .locator('img')
        .evaluateAll(
          (images) => images.filter((image) => !image.complete || image.naturalWidth === 0).length,
        ),
      0,
      'Broken images',
    );
    await this.page.screenshot({ path: join(OUTPUT, name + '.png'), fullPage: true });
    screenshots++;
  }
  async width() {
    const size = await this.page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(size.document <= size.viewport, JSON.stringify(size));
  }
  record(name) {
    checks.push(name);
    process.stdout.write('PASS ' + name + '\n');
  }
}
class OtaPage extends DemoPage {
  async search(query) {
    await this.page.getByLabel('Bạn muốn chuyến đi như thế nào?').fill(query);
    await this.page.getByRole('button', { name: 'Tìm chuyến hợp gu', exact: false }).click();
    await this.page.waitForURL((url) => url.pathname === '/search' && url.searchParams.get('q') === query);
    await this.page.getByRole('heading', { name: 'Một chuyến vừa gu bạn.' }).waitFor();
  }
}
class AdminPage extends DemoPage {
  async login(code = 'DEMO') {
    await this.page.getByLabel('Email người trải nghiệm').fill('mentor@example.com');
    await this.page.getByLabel('Mã truy cập demo', { exact: true }).fill(code);
    await this.page.getByRole('button', { name: 'Vào phiên demo', exact: false }).click();
  }
}

async function verifyWeb(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN' });
  const web = new OtaPage(await context.newPage(), WEB);
  try {
    await web.visit();
    await web.page.getByRole('heading', { level: 1 }).waitFor();
    await web.snapshot('01-web-home');
    await web.search('Hội An 2 người dưới 3 triệu/người');
    assert.equal(await web.page.locator('article.trip-card').count(), 1);
    await web.visible('Chậm một nhịp ở Hội An');
    await web.snapshot('02-web-search');
    await web.page.getByRole('link', { name: 'Xem chi tiết: Chậm một nhịp ở Hội An', exact: true }).click();
    await web.page.waitForURL('**/trips/hoi-an');
    await web.page.getByRole('heading', { name: 'Chậm một nhịp ở Hội An', exact: true, level: 1 }).waitFor();
    assert.ok(web.page.url().endsWith('/trips/hoi-an'));
    await web.visible('Đến Hội An · Nhận phòng · Khám phá phố cổ buổi tối');
    await web.page.getByRole('button', { name: 'Chọn chuyến này', exact: false }).click();
    await web.page.getByRole('status').waitFor();
    await web.snapshot('03-web-detail');
    web.record('OTA natural-language query → matching results → exact product detail');
    await web.visit('/search?q=' + encodeURIComponent('Nha Trang dưới 1 triệu'));
    await web.visible('Chưa có chuyến vừa yêu cầu.');
    assert.equal(await web.page.locator('article.trip-card').count(), 0);
    await web.snapshot('04-web-empty');
    await web.page.getByRole('link', { name: 'Xem tất cả chuyến', exact: true }).click();
    await web.page.waitForURL((url) => url.pathname === '/search' && !url.search);
    await web.page.getByRole('heading', { name: 'Một chuyến vừa gu bạn.' }).waitFor();
    await web.page.getByRole('combobox', { name: 'Loại chuyến', exact: true }).selectOption('hotel');
    await web.page.getByRole('button', { name: 'Áp dụng', exact: true }).click();
    await web.page.waitForURL((url) => url.searchParams.get('category') === 'hotel');
    await web.visible('Một đêm nạp lại ở Nha Trang');
    assert.equal(await web.page.locator('article.trip-card').count(), 1);
    await web.search('Đà Lạt dưới 5 triệu');
    await web.visible('Chưa có chuyến vừa yêu cầu.');
    const unknown = await web.page.goto(WEB + '/trips/unknown');
    assert.equal(unknown.status(), 404);
    await web.visible('Chuyến đi này chưa có trong danh mục.');
    web.record('OTA combined filters, empty recovery, unsupported destination and missing product');
    for (const width of [320, 768, 1440]) {
      await web.page.setViewportSize({ width, height: 1000 });
      for (const path of ['/', '/search?q=Hoi%20An', '/trips/nha-trang']) {
        await web.visit(path);
        await web.page.getByRole('heading', { level: 1 }).waitFor();
        await web.width();
      }
      if (width === 320) await web.snapshot('05-web-small');
    }
    web.record('OTA 9 responsive route/viewport checks');
  } finally {
    await context.close();
  }
}

async function verifyAdmin(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN' });
  const admin = new AdminPage(await context.newPage(), ADMIN);
  try {
    await admin.visit('/orders');
    await admin.page.waitForURL('**/login?returnTo=*');
    await admin.snapshot('06-admin-login');
    await admin.login('SAI');
    await admin.visible('Nhập email hợp lệ và mã DEMO để tiếp tục.');
    await admin.login();
    await admin.page.waitForURL('**/orders');
    await admin.page.getByRole('heading', { name: 'Đơn hàng', exact: true }).waitFor();
    const cookie = (await context.cookies()).find((cookie) => cookie.name === 'tripflix_admin_preview');
    assert.ok(cookie?.httpOnly);
    assert.equal(cookie.sameSite, 'Lax');
    await admin.snapshot('07-admin-orders');
    for (const [name, route] of [
      ['Kiểm duyệt', 'moderation'],
      ['Số liệu', 'analytics'],
      ['Lịch trống & giá', 'inventory'],
      ['Nhân sự', 'staff'],
      ['Đơn hàng', 'orders'],
    ]) {
      await admin.page.getByRole('link', { name, exact: false }).click();
      await admin.page.waitForURL('**/' + route);
      await admin.page.getByRole('heading', { name, exact: true }).waitFor();
      assert.equal(await admin.page.locator('a[aria-current="page"]').count(), 1);
    }
    await admin.page.getByLabel('Tìm trong danh sách', { exact: true }).fill('khong-co-muc');
    await admin.visible('Không có mục phù hợp. Thử từ khóa khác.');
    await admin.page.getByLabel('Tìm trong danh sách', { exact: true }).fill('Hội An');
    await admin.page.getByRole('button', { name: 'Xem: TF-DEMO-001 · Hội An', exact: true }).click();
    await admin.page.getByRole('region', { name: 'Chi tiết mục mẫu' }).waitFor();
    await admin.page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click();
    admin.record('Admin invalid/valid login, intended return route, HttpOnly session and 5 working tabs');
    for (const width of [320, 768, 1440]) {
      await admin.page.setViewportSize({ width, height: 1000 });
      await admin.width();
      if (width === 320) await admin.snapshot('08-admin-small');
    }
    await admin.page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await admin.page.waitForURL('**/login');
    await admin.visit('/orders');
    await admin.page.waitForURL('**/login?returnTo=*');
    const stranger = await browser.newContext();
    const strangerPage = await stranger.newPage();
    await strangerPage.goto(ADMIN + '/staff');
    assert.ok(strangerPage.url().includes('/login?'));
    await stranger.addCookies([{ name: 'tripflix_admin_preview', value: 'forged-session', url: ADMIN }]);
    await strangerPage.goto(ADMIN + '/orders');
    assert.ok(strangerPage.url().includes('/login?'));
    await stranger.close();
    admin.record('Admin table interactions, responsive shell, logout, isolated and forged sessions');
  } finally {
    await context.close();
  }
}

async function verifyMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN' });
  const mobile = new DemoPage(await context.newPage(), MOBILE);
  try {
    await mobile.visit();
    await mobile.page.getByRole('button', { name: 'Bắt đầu khám phá', exact: true }).click();
    await mobile.visible('Nha Trang, đi là mê');
    await mobile.page.getByRole('tab', { name: 'Thịnh hành', exact: true }).click();
    await mobile.visible('Chậm một nhịp ở Hội An');
    await mobile.snapshot('09-mobile-trending');
    await mobile.page.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
    await mobile.visible('Đến Hội An · Nhận phòng · Khám phá phố cổ buổi tối');
    await mobile.snapshot('10-mobile-detail');
    await mobile.page.getByRole('button', { name: 'Về bảng tin', exact: true }).click();
    await mobile.page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await mobile.page.getByLabel('Email nhận xác nhận', { exact: true }).fill('review@example.com');
    await mobile.page.getByLabel('Mật khẩu mẫu', { exact: true }).fill('review123');
    await mobile.page.getByRole('button', { name: 'Đăng nhập & tiếp tục', exact: true }).click();
    await mobile.visible('Chậm một nhịp ở Hội An');
    await mobile.visible('Đã lưu');
    await mobile.page.getByRole('button', { name: 'Bài tiếp theo', exact: true }).click();
    await mobile.visible('Nha Trang, đi là mê');
    assert.equal(await mobile.page.getByText('Đã lưu', { exact: true }).count(), 0);
    await mobile.page.getByRole('button', { name: 'Bài tiếp theo', exact: true }).click();
    await mobile.visible('Hẹn một sáng ở Đà Nẵng');
    await mobile.page.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
    await mobile.visible('Đến Đà Nẵng · Nhận phòng · Dạo bãi biển');
    await mobile.page.getByRole('button', { name: 'Về bảng tin', exact: true }).click();
    await mobile.page.getByRole('tab', { name: /Tôi/ }).click();
    await mobile.page.getByRole('button', { name: 'Chuyến đi đã lưu', exact: true }).click();
    await mobile.visible('Chậm một nhịp ở Hội An');
    mobile.record(
      'Mobile separate trending order, 3 distinct products, gated per-item saves and correct details',
    );
    for (const width of [320, 430]) {
      await mobile.page.setViewportSize({ width, height: 844 });
      await mobile.visit('/trip/hoi-an');
      await mobile.visible('Chậm một nhịp ở Hội An');
      await mobile.width();
    }
    mobile.record('Mobile detail responsive checks at 320/430px');
  } finally {
    await context.close();
  }
}

(async () => {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  });
  try {
    await verifyWeb(browser);
    await verifyAdmin(browser);
    await verifyMobile(browser);
    assert.deepEqual(errors, [], 'Browser runtime errors');
    const report = {
      checks,
      screenshots,
      browserErrors: errors,
      platform: 'Chromium / Expo web; no Android device verification',
    };
    await writeFile(join(OUTPUT, 'verification.json'), JSON.stringify(report, null, 2));
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(error.stack + '\n');
  process.exitCode = 1;
});
