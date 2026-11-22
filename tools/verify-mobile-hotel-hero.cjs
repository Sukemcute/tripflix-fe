// Real screens, isolated read-only hotel/review/image fixtures; never creates a reservation.
const assert = require('node:assert/strict');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-hotel-hero');
const baseline = process.env.CAPTURE_BASELINE === '1';
const hotelName = 'Khách sạn Biển Xanh — Khu nghỉ dưỡng dành cho những ngày thong thả';
const checkIn = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
const checkOut = new Date(Date.now() + 16 * 86400000).toISOString().slice(0, 10);
const hotel = {
  id: 'qa-hotel',
  slug: 'qa-hotel',
  name: hotelName,
  province: { slug: 'khanh-hoa', name: 'Khánh Hòa' },
  city: 'Nha Trang',
  stars: 4,
  brand: null,
  style: null,
  thumbnail: null,
  images: [base + '/qa-photo-1.jpg', base + '/qa-photo-2.jpg'],
  address: '12 Trần Phú, phường Lộc Thọ, thành phố Nha Trang, Khánh Hòa',
  location: { lat: 12.24, lng: 109.19 },
  rating: { average: 4.7, count: 128, source: 'Google' },
  checkInTime: '14:00',
  checkOutTime: '12:00',
  description: 'Nơi nghỉ bên biển dành cho những chuyến đi chậm rãi.',
  highlights: [],
  amenities: [],
  nearby: [],
  languages: [],
  facts: {},
  policies: {},
  stay: { checkIn, checkOut, nights: 2, adults: 3 },
  priceFrom: 2345678,
  isAvailable: true,
  rooms: [
    {
      productId: 'qa-room',
      name: 'Phòng hướng biển',
      maxGuests: 3,
      bedType: null,
      areaM2: null,
      view: null,
      images: [base + '/qa-photo-1.jpg', base + '/qa-photo-2.jpg'],
      amenities: [],
      roomsNeeded: 2,
      isAvailable: false,
      reason: 'SOLD_OUT',
      remaining: 0,
      ratePlans: [],
    },
  ],
  calendar: [],
};

class HotelPage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  async goto() {
    await this.page.goto(
      `${base}/hotel?id=qa-hotel&checkIn=${checkIn}&checkOut=${checkOut}&adults=3&children=1&infants=1`,
    );
    await this.page.getByText(hotelName, { exact: true }).waitFor();
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(output, name + '.png') });
  }
  async noOverflow() {
    assert(
      await this.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'no horizontal page overflow',
    );
  }
}

(async () => {
  await mkdir(output, { recursive: true });
  const bytes = await readFile(join(__dirname, '../apps/mobile/assets/brand/hotel.jpg'));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [],
    checks = [];
  try {
    for (const width of [375, 390, 430]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 667 : 844 },
        isMobile: true,
        hasTouch: true,
      });
      let variant = 'normal';
      let imageMode = 'normal';
      let releaseImage;
      await context.route('**/api/**', (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/auth/refresh') return route.fulfill({ status: 401, json: {} });
        if (path.endsWith('/reviews'))
          return route.fulfill({
            json: { hotelId: 'qa-hotel', summary: null, items: [], total: 0, page: 1, limit: 3 },
          });
        if (path === '/api/hotels/qa-hotel')
          return route.fulfill({
            json: {
              ...hotel,
              ...(variant === 'empty' ? { images: [], stars: null, rating: null } : {}),
              ...(variant === 'thumbnail' ? { images: [], thumbnail: base + '/qa-photo-1.jpg' } : {}),
              ...(variant === 'zero' ? { rating: { average: 0, count: 0, source: null }, priceFrom: 0 } : {}),
              ...(variant === 'room-error'
                ? {
                    rooms: hotel.rooms.map((room) => ({
                      ...room,
                      images: [base + '/qa-photo-room-1.jpg', base + '/qa-photo-room-2.jpg'],
                    })),
                  }
                : {}),
            },
          });
        return route.fulfill({ json: { items: [], nextCursor: null } });
      });
      await context.route('**/qa-photo-*.jpg', async (route) => {
        if (imageMode === 'slow')
          await new Promise((resolve) => {
            releaseImage = resolve;
          });
        if (imageMode === 'error') return route.fulfill({ status: 404, body: '' });
        await route.fulfill({ contentType: 'image/jpeg', body: bytes });
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      const ui = new HotelPage(page);
      await ui.goto();
      await ui.snapshot(`${baseline ? 'before' : 'after'}-hotel-${width}`);
      await ui.noOverflow();
      if (!baseline) {
        assert.equal(
          await page
            .locator('[dir="auto"]')
            .evaluateAll(
              (nodes) =>
                nodes.filter((node) => getComputedStyle(node).textDecorationLine.includes('underline'))
                  .length,
            ),
          0,
          'no underlined text',
        );
        await page.getByText('Hạng 4 sao', { exact: true }).waitFor();
        await page.getByText('Điểm từ khách', { exact: true }).waitFor();
        assert.equal(
          await page
            .getByText(hotelName, { exact: true })
            .evaluate((node) => getComputedStyle(node).webkitLineClamp),
          'none',
        );
        const title = await page.getByText(hotelName, { exact: true }).boundingBox();
        assert(title.y < 300, 'hotel name appears early');
        const cta = await ui.button('Chọn phòng').boundingBox();
        assert(cta.height >= 44 && cta.y + cta.height <= page.viewportSize().height, 'CTA fits viewport');
        await ui.button('Tiếp').click();
        await page.getByText('2 / 2', { exact: true }).filter({ visible: true }).waitFor();
        await ui.button('Trước').click();
        await page.getByText('1 / 2', { exact: true }).filter({ visible: true }).waitFor();
        await ui.button('Chọn phòng').click();
        await page.waitForURL((url) => url.pathname === '/hotel-rooms');
        const query = new URL(page.url()).searchParams;
        for (const [key, value] of Object.entries({
          id: 'qa-hotel',
          checkIn,
          checkOut,
          adults: '3',
          children: '1',
          infants: '1',
        }))
          assert.equal(query.get(key), value);
        await page.getByText('Phòng hướng biển', { exact: true }).waitFor();
        await ui.button('Tiếp').click();
        await page.getByText('2 / 2', { exact: true }).filter({ visible: true }).waitFor();
        await ui.button('Trước').click();
        await page.getByText('1 / 2', { exact: true }).filter({ visible: true }).waitFor();
        await page.goBack();
        await ui.button('Chọn phòng').waitFor();
        checks.push(
          `${width}px: long title readable early, stars and guest score labelled, gallery paging, CTA visible and room selection preserves dates/guest mix`,
        );
        if (width === 375) {
          imageMode = 'error';
          await ui.goto();
          const retry = ui.button('Thử tải lại ảnh');
          await retry.waitFor();
          const retryBox = await retry.boundingBox(),
            nextBox = await ui.button('Tiếp').boundingBox();
          assert(
            retryBox.y + retryBox.height <= nextBox.y,
            'retry and paging controls never overlap in the short hero',
          );
          await ui.snapshot('broken-image-short-screen');
          imageMode = 'normal';
          await retry.click();
          await retry.waitFor({ state: 'hidden' });
        }
        if (width === 390) {
          variant = 'empty';
          await ui.goto();
          await page.getByText('Chưa có ảnh', { exact: true }).waitFor();
          await page.getByText('Chưa có thông tin hạng sao', { exact: true }).waitFor();
          await page.getByText('Chưa có đánh giá từ khách', { exact: true }).waitFor();
          assert.equal(await ui.button('Tiếp').count(), 0);
          await ui.snapshot('empty-photo-stars-reviews');
          variant = 'thumbnail';
          await ui.goto();
          assert.equal(await ui.button('Tiếp').count(), 0, 'thumbnail fallback is a single image');
          await page.getByRole('img', { name: `${hotelName}. Ảnh 1 trên 1`, exact: true }).waitFor();
          await ui.snapshot('thumbnail-fallback');
          variant = 'zero';
          await ui.goto();
          await page.getByText('Chưa có đánh giá từ khách', { exact: true }).waitFor();
          await ui.button('Chọn phòng').waitFor();
          variant = 'normal';
          imageMode = 'error';
          await ui.goto();
          await page.getByText('Ảnh hiện chưa tải được', { exact: true }).first().waitFor();
          await ui.snapshot('broken-image');
          await page.getByText('Chưa tải · 1/2', { exact: true }).waitFor();
          const failedMessage = await page
            .getByText('Ảnh hiện chưa tải được', { exact: true })
            .first()
            .elementHandle();
          imageMode = 'normal';
          await ui.button('Thử tải lại ảnh').first().click();
          await failedMessage.waitForElementState('hidden');
          // Block one fresh image request so loading is deterministic, not a timing sleep.
          await page.clock.install();
          await page.route('**/qa-photo-1.jpg', async (route) => {
            await new Promise((resolve) => {
              releaseImage = resolve;
            });
            try {
              await route.fulfill({ contentType: 'image/jpeg', body: bytes });
            } catch (error) {
              // Retry remounts Image and cancels the old stalled request.
              if (!error.message.includes('Route is already handled')) throw error;
            }
          });
          await ui.goto();
          await page.getByText('Đang tải ảnh…', { exact: true }).first().waitFor();
          await ui.button('Chọn phòng').waitFor();
          await ui.snapshot('slow-image');
          await page.getByText('Đang tải · 1/2', { exact: true }).waitFor();
          const beforeLoad = await page.getByText(hotelName, { exact: true }).boundingBox();
          await page.clock.fastForward(15001);
          await page.getByText('Ảnh tải lâu hơn dự kiến', { exact: true }).first().waitFor();
          await page.getByText('Chưa tải · 1/2', { exact: true }).waitFor();
          const timeoutRetry = await ui.button('Thử tải lại ảnh').boundingBox();
          const timeoutPager = await ui.button('Tiếp').boundingBox();
          assert(
            timeoutRetry.y >= 0 && timeoutRetry.y + timeoutRetry.height <= timeoutPager.y,
            'timeout retry never overlaps pager',
          );
          await ui.button('Chọn phòng').waitFor();
          await ui.snapshot('image-timeout');
          await page.setViewportSize({ width: 375, height: 667 });
          const shortRetry = await ui.button('Thử tải lại ảnh').boundingBox();
          const shortPager = await ui.button('Tiếp').boundingBox();
          assert(
            shortRetry.y >= 0 && shortRetry.y + shortRetry.height <= shortPager.y,
            'timeout recovery fits short hero',
          );
          await ui.snapshot('image-timeout-short');
          await page.setViewportSize({ width, height: 844 });
          await page.unroute('**/qa-photo-1.jpg');
          imageMode = 'normal';
          await ui.button('Thử tải lại ảnh').click();
          releaseImage();
          await page.getByText('1 / 2', { exact: true }).waitFor();
          await page.getByText('Ảnh tải lâu hơn dự kiến', { exact: true }).waitFor({ state: 'hidden' });
          await ui.snapshot('timeout-recovered');
          await ui.noOverflow();
          const afterLoad = await page.getByText(hotelName, { exact: true }).boundingBox();
          assert(Math.abs(beforeLoad.y - afterLoad.y) < 1, 'image loading does not move hotel identity');
          await page.evaluate(() => {
            for (const node of document.querySelectorAll('[dir="auto"]')) {
              const style = getComputedStyle(node);
              node.style.fontSize = parseFloat(style.fontSize) * 1.4 + 'px';
              node.style.lineHeight = parseFloat(style.lineHeight) * 1.4 + 'px';
            }
          });
          await ui.noOverflow();
          await ui.snapshot('large-text-browser-preview');
          variant = 'room-error';
          imageMode = 'error';
          await ui.goto();
          await ui.button('Chọn phòng').click();
          await page.getByText('Phòng hướng biển', { exact: true }).waitFor();
          await page.getByText('Ảnh hiện chưa tải được', { exact: true }).first().waitFor();
          await ui.snapshot('room-image-error');
          imageMode = 'normal';
          await ui.button('Thử tải lại ảnh').first().click();
          await page.getByText('1 / 2', { exact: true }).filter({ visible: true }).waitFor();
          await ui.button('Tiếp').click();
          await page.getByText('Chưa tải · 2/2', { exact: true }).waitFor();
          await ui.button('Thử tải lại ảnh').filter({ visible: true }).click();
          await page.getByText('2 / 2', { exact: true }).filter({ visible: true }).waitFor();
          checks.push(
            'Missing photos/stars/reviews, zero review count/price, 404 hotel/room image retry, visible loading/error counters, stalled image timeout after 15s/recovery without CTA or ratio shift, room paging, 140% browser text (not native)',
          );
        }
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    const result = {
      passed: true,
      baseline,
      checks,
      pageErrors: errors,
      apiAndImageFixtures: true,
      nativeDeviceTested: false,
    };
    await writeFile(
      join(output, baseline ? 'baseline-results.json' : 'qa-results.json'),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
