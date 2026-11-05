// Uses an externally installed Playwright runtime; adds no app dependency.
const assert = require('node:assert/strict');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

const BASE_URL = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8081';
const EVIDENCE_DIR = process.env.MOBILE_EVIDENCE_DIR || join(tmpdir(), 'tripflix-mobile-review');
const checks = [];
const errors = [];
let screenshotCount = 0;

class MobileReviewPage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  async click(name) {
    await this.button(name).click();
  }
  async visible(text) {
    await this.page.getByText(text, { exact: true }).filter({ visible: true }).first().waitFor();
  }
  async visit(route = '/') {
    await this.page.goto(new URL(route, BASE_URL).href);
  }
  async start() {
    await this.visit();
    await this.click('Bắt đầu khám phá');
    await this.visible('Dành cho bạn');
  }
  async signIn() {
    await this.page.getByLabel('Email nhận xác nhận', { exact: true }).fill('review@example.com');
    await this.page.getByLabel('Mật khẩu mẫu', { exact: true }).fill('review123');
    await this.click('Đăng nhập & tiếp tục');
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(EVIDENCE_DIR, `${name}.png`) });
    screenshotCount += 1;
  }
  async checkWidth() {
    const dimensions = await this.page.evaluate(() => ({
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    assert.ok(dimensions.documentWidth <= dimensions.width, JSON.stringify(dimensions));
  }
  record(name) {
    checks.push(name);
    process.stdout.write(`PASS ${name}\n`);
  }
}

async function createReview(browser, width = 390) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    locale: 'vi-VN',
    timezoneId: 'Asia/Bangkok',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, view: new MobileReviewPage(page), page };
}

async function verifyBooking(browser) {
  const { context, view, page } = await createReview(browser);
  try {
    await view.visit();
    await view.visible('Chạm cảm hứng,\ntrọn hành trình.');
    await view.snapshot('01-onboarding');
    await view.click('Bắt đầu khám phá');
    await view.visible('Dành cho bạn');
    await view.snapshot('02-reels');
    await view.click('Đặt theo lộ trình');
    await view.visible('Nha Trang,\nđi là mê.');
    await view.snapshot('03-itinerary');
    await view.click('Đặt theo lộ trình');
    await view.visible('Chuyến này, theo ý bạn.');
    await page.getByLabel('Ngày khởi hành', { exact: true }).fill('2026-02-30');
    await view.click('Xem giỏ chuyến đi');
    await view.visible('Chọn ngày hợp lệ từ ngày mai trở đi (YYYY-MM-DD).');
    const date = new Date();
    date.setDate(date.getDate() + 16);
    const departure = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    await page.getByLabel('Ngày khởi hành', { exact: true }).fill(departure);
    await page.getByRole('button', { name: 'Tăng số khách', exact: true }).click();
    await view.visible('11.660.000đ');
    await view.snapshot('04-customize');
    await view.click('Xem giỏ chuyến đi');
    await view.visible('Gói gọn cả chuyến đi.');
    await view.click('Bỏ vé máy bay');
    await view.visible('Bạn đang chọn chỉ lưu trú. Vé bay chưa nằm trong tổng tiền.');
    await view.visible('5.960.000đ');
    await view.snapshot('05-cart-hotel-only');
    await view.click('Thêm vé khứ hồi');
    await view.visible('11.660.000đ');
    await view.click('Tiếp tục thanh toán');
    await view.visible('Chào bạn trở lại!');
    await view.snapshot('06-login');
    await view.signIn();
    await view.visible('Thông tin liên hệ');
    await view.click('Thanh toán 11.660.000đ');
    await view.visible('Nhập họ tên từ 2 ký tự.');
    await page.getByLabel('Họ và tên', { exact: true }).fill('Linh An');
    assert.equal(
      await page.getByLabel('Email nhận xác nhận', { exact: true }).inputValue(),
      'review@example.com',
    );
    await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
    await page.getByRole('checkbox').click();
    await view.snapshot('07-checkout');
    await view.click('Thanh toán 11.660.000đ');
    await view.visible('Chuyến đi đã sẵn sàng.\nCòn bạn thì sao?');
    await view.snapshot('08-success');
    await view.visible('11.660.000đ');
    await view.click('Xem chuyến đi của tôi');
    await view.visible('11.660.000đ');
    await view.snapshot('09-trips');
    await view.click('Xem chi tiết đơn');
    await view.visible('3 người lớn · 2 phòng · 2 đêm');
    await view.click('Đóng');
    view.record(
      'booking: invalid date, 3 guests, flight toggle, auth resume, form validation, order snapshot',
    );
    await view.checkWidth();
  } finally {
    await context.close();
  }
}

async function verifySaveAndCreate(browser) {
  const { context, view, page } = await createReview(browser);
  try {
    await view.start();
    await view.click('Lưu');
    await view.signIn();
    await view.visible('Đã lưu');
    await page.getByRole('tab', { name: /Tôi/ }).click();
    await view.click('Chuyến đi đã lưu');
    await view.visible('Cảm hứng để dành');
    await view.snapshot('10-saved');
    await view.click('Quay lại');
    await view.click('Chia sẻ chuyến đi');
    await view.visible('Đi rồi, kể tụi mình nghe.');
    await view.click('Gửi bài kiểm duyệt');
    await view.visible('Thêm ảnh/video và viết ít nhất 10 ký tự để kể về chuyến đi.');
    await view.click('Thêm ảnh hoặc video');
    await view.click('Dùng ảnh mẫu để review');
    await page
      .getByLabel('Kể về chuyến đi của bạn', { exact: true })
      .fill('Một buổi chiều rất đẹp ở Hội An, muốn quay lại thêm lần nữa.');
    await view.snapshot('11-create');
    await view.click('Gửi bài kiểm duyệt');
    await view.visible('Câu chuyện đã được gửi!');
    await view.click('Về trang cá nhân');
    await view.visible('Bài chia sẻ đang chờ kiểm duyệt');
    await view.snapshot('12-profile');
    await view.click('Thông báo');
    await view.visible('Đã nhận câu chuyện của bạn');
    await view.snapshot('13-notifications');
    view.record('social: save resumes after login, saved list, draft validation, sample post, notification');
  } finally {
    await context.close();
  }
}

async function verifyDiscovery(browser) {
  const { context, view, page } = await createReview(browser);
  try {
    await view.start();
    await page.getByRole('tab', { name: /Khám phá/ }).click();
    await view.visible('Một chiếc hẹn\nvới thế giới.');
    await view.snapshot('14-explore');
    await view.click('Chưa biết đi đâu? Hỏi Tripi nhé.');
    await view.visible('Bạn muốn đi đâu,\nkể mình nghe nhé.');
    await view.snapshot('15-assistant');
    await view.click('Chỉ đặt khách sạn, dưới 2 triệu/người');
    await view.click('Chuyến đi hợp gu');
    await view.visible('Chỉ lưu trú · Chưa gồm vé máy bay');
    await page.getByText('1.490.000đ', { exact: false }).filter({ visible: true }).first().waitFor();
    await view.snapshot('16-search');
    await page.getByRole('button').filter({ hasText: 'Vinpearl Resort Nha Trang' }).click();
    await view.visible('Một khoảng nghỉ, ngay bên biển xanh.');
    await view.snapshot('17-hotel');
    await view.visit('/search');
    await page.getByLabel('Tìm theo nhu cầu của bạn', { exact: true }).fill('Đi biển dưới 500k');
    await view.click('Tìm chuyến');
    await view.visible('Chưa thấy chuyến hợp gu');
    view.record('discovery: explore, assistant, hotel-only budget, hotel detail, empty search');
  } finally {
    await context.close();
  }
}

async function verifyResponsive(browser) {
  const screens = [
    ['/', 'Chạm cảm hứng,\ntrọn hành trình.'],
    ['/explore', 'Một chiếc hẹn\nvới thế giới.'],
    ['/itinerary', 'Nha Trang,\nđi là mê.'],
    ['/hotel', 'Một khoảng nghỉ, ngay bên biển xanh.'],
    ['/customize', 'Chuyến này, theo ý bạn.'],
    ['/cart', 'Gói gọn cả chuyến đi.'],
    ['/search?scenario=empty', 'Chưa thấy chuyến hợp gu'],
    ['/assistant', 'Bạn muốn đi đâu,\nkể mình nghe nhé.'],
    ['/saved', 'Để dành một chiếc hẹn.'],
    ['/trips', 'Một chuyến đi đang chờ bạn.'],
    ['/notifications', 'Chưa có thông báo mới'],
    ['/me', 'Chào bạn mê xê dịch!'],
    ['/login', 'Chào bạn trở lại!'],
    [
      '/cart?scenario=unavailable',
      'Phòng đã hết chỗ vào ngày bạn chọn. Chưa dịch vụ nào được giữ và chưa có khoản thu nào.',
    ],
  ];
  for (const width of [320, 390, 430]) {
    const { context, view } = await createReview(browser, width);
    try {
      for (const [route, text] of screens) {
        await view.visit(route);
        await view.visible(text);
        await view.checkWidth();
      }
      view.record(`responsive: ${screens.length} routes at ${width}px, no horizontal overflow`);
    } finally {
      await context.close();
    }
  }
}

async function verifyCheckoutRecovery(browser) {
  for (const scenario of ['failed', 'expired']) {
    const { context, view, page } = await createReview(browser);
    try {
      await view.visit(`/checkout?scenario=${scenario}`);
      await view.signIn();
      await view.visible('Thông tin liên hệ');
      await page.getByRole('alert').filter({ visible: true }).first().waitFor();
      await view.snapshot(scenario === 'failed' ? '18-checkout-failed' : '19-checkout-expired');
      if (scenario === 'expired') {
        await view.click('Kiểm tra lại chỗ');
        await view.visible('Gói gọn cả chuyến đi.');
      } else {
        await page.getByLabel('Họ và tên', { exact: true }).fill('Linh An');
        await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
        await page.getByRole('checkbox').click();
        await view.click('Thử lại thanh toán');
        await view.visible('Chuyến đi đã sẵn sàng.\nCòn bạn thì sao?');
      }
      view.record(`checkout recovery: ${scenario}, login retains scenario and contact`);
    } finally {
      await context.close();
    }
  }
}

async function verifyMediaPicker(browser) {
  const { context, view, page } = await createReview(browser);
  async function choose(label, files) {
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), view.click(label)]);
    await chooser.setFiles(files);
  }
  const photo = join(__dirname, '../apps/mobile/assets/brand/beach.jpg');
  try {
    await view.start();
    await page.getByRole('tab', { name: /Chia sẻ/ }).click();
    await view.signIn();
    await view.visible('Đi rồi, kể tụi mình nghe.');
    await view.click('Thêm ảnh hoặc video');
    await choose('Chọn ảnh từ thư viện', [photo, join(__dirname, '../apps/mobile/assets/brand/hoian.jpg')]);
    await view.visible('beach.jpg');
    await view.visible('hoian.jpg');
    assert.equal(await view.button('Bỏ tệp đã chọn').count(), 2);
    await view.snapshot('20-picked-photos');
    await view.click('Thêm ảnh hoặc video');
    const buffer = await readFile(photo);
    await choose(
      'Chọn ảnh từ thư viện',
      Array.from({ length: 11 }, (_, index) => ({
        name: `photo-${index}.jpg`,
        mimeType: 'image/jpeg',
        buffer,
      })),
    );
    await view.visible('Bạn chỉ có thể chọn tối đa 10 ảnh cho mỗi bài viết.');
    await view.click('Đóng');
    await view.visible('beach.jpg');
    assert.equal(await view.button('Bỏ tệp đã chọn').count(), 2);
    await view.click('Thêm ảnh hoặc video');
    await choose('Chọn ảnh từ thư viện', []);
    await page.getByText('Đang mở thư viện…', { exact: true }).waitFor({ state: 'hidden' });
    await view.click('Đóng');
    await view.visible('hoian.jpg');
    view.record('media: real file chooser, multiple photos, reject 11 photos, cancel preserves draft');
    if (process.env.MOBILE_TEST_VIDEO && process.env.MOBILE_TEST_LONG_VIDEO) {
      await view.click('Thêm ảnh hoặc video');
      await choose('Chọn video từ thư viện', process.env.MOBILE_TEST_VIDEO);
      await view.visible('Video đã chọn');
      await view.snapshot('21-picked-video');
      await view.click('Thêm ảnh hoặc video');
      await choose('Chọn video từ thư viện', process.env.MOBILE_TEST_LONG_VIDEO);
      await view.visible('Chọn video dài tối đa 5 phút nhé.');
      await view.snapshot('22-video-too-long');
      await view.click('Đóng');
      await view.visible('Video đã chọn');
      assert.equal(await view.button('Bỏ tệp đã chọn').count(), 1);
      await view.click('Bỏ tệp đã chọn');
      assert.equal(await view.button('Bỏ tệp đã chọn').count(), 0);
      view.record(
        'media: video selection, five minute limit in web units, rejected video preserves draft, remove',
      );
    }
  } finally {
    await context.close();
  }
}

(async () => {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  });
  try {
    await verifyBooking(browser);
    await verifySaveAndCreate(browser);
    await verifyDiscovery(browser);
    await verifyCheckoutRecovery(browser);
    await verifyMediaPicker(browser);
    await verifyResponsive(browser);
    assert.deepEqual(errors, [], 'Browser runtime errors');
    const report = {
      checks,
      browserErrors: errors,
      screenshots: screenshotCount,
      responsiveRoutes: 42,
      platform: 'Expo web / Chromium (not Android device verification)',
    };
    await writeFile(join(EVIDENCE_DIR, 'verification.json'), JSON.stringify(report, null, 2));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack}\nRuntime errors: ${JSON.stringify(errors)}\n`);
  process.exitCode = 1;
});
