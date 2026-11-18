// Real mobile screens with isolated quotes: no checkout or inventory mutation.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-trip-cards');
const baseline = process.env.CAPTURE_BASELINE === '1';
const hotelName = 'Khách sạn Biển Xanh — kỳ nghỉ dành cho cả gia đình';
const roomName = 'Phòng Gia đình hướng biển với ban công riêng và hai giường lớn';
const rateName = 'Gói nghỉ dưỡng trọn vẹn bao gồm bữa sáng cho cả gia đình';
const selection = {
  postId: 'qa-trip',
  postTitle: 'Một chuyến đi Nha Trang thật thong thả',
  authorName: 'Linh',
  trip: {
    destinationName: 'Nha Trang',
    daysCount: 3,
    hotelId: 'qa-hotel',
    hotelName,
    items: [
      { day: 1, title: 'Bay đến biển', transport: { mode: 'flight', fromAirport: 'HAN', toAirport: 'CXR' } },
      { day: 2, title: 'Dạo biển buổi sáng', notes: 'Gợi ý tham khảo, tự sắp xếp' },
    ],
  },
};
const room = {
  productId: 'qa-room',
  name: roomName,
  isAvailable: true,
  roomsNeeded: 1,
  ratePlans: [
    {
      code: 'FLEX',
      name: rateName,
      totalPrice: 123456789,
      pricePerNight: 61728394.5,
      isRefundable: true,
      freeCancelDays: 3,
      meal: 'breakfast',
      perks: [],
    },
  ],
};

class TripPage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(output, name + '.png') });
  }
  async noOverflow() {
    assert(await this.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
}

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const checks = [],
    errors = [];
  try {
    for (const width of [375, 390, 430]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      let quoteMode = 'normal';
      await context.addInitScript((trip) => {
        localStorage.setItem('tripflix.tripBooking.v1', JSON.stringify(trip));
        localStorage.setItem(
          'tripflix.onboarding.v1',
          JSON.stringify({ version: 1, status: 'skipped', interests: [], pace: null }),
        );
      }, selection);
      await context.route('**/api/**', (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if ((path === '/api/flights' || path === '/api/hotels/qa-hotel') && quoteMode === 'error')
          return route.fulfill({ status: 503, json: {} });
        if (path === '/api/auth/refresh') return route.fulfill({ status: 401, json: {} });
        if (path === '/api/flights/routes') return route.fulfill({ json: [] });
        if (path === '/api/flights')
          return route.fulfill({
            json: {
              flights:
                quoteMode === 'soldout'
                  ? []
                  : [
                      {
                        productId: 'qa-flight',
                        flightKey: 'QA123',
                        name: 'Hà Nội đi Cam Ranh',
                        fromAirport: 'HAN',
                        toAirport: 'CXR',
                        flightNumber: 'VN 123',
                        departTime: '09:30',
                        cabinName: 'Phổ thông linh hoạt',
                        isAvailable: true,
                        fares: [
                          {
                            code: 'FLEX',
                            name: 'Phổ thông linh hoạt',
                            totalPrice: 98765432,
                            isRefundable: false,
                            freeCancelDays: 0,
                          },
                        ],
                      },
                    ],
            },
          });
        if (path === '/api/hotels/qa-hotel') {
          const checkIn = url.searchParams.get('checkIn'),
            checkOut = url.searchParams.get('checkOut');
          return route.fulfill({
            json: {
              id: 'qa-hotel',
              name: hotelName,
              city: 'Nha Trang',
              province: { name: 'Khánh Hòa' },
              calendar: [],
              stay: { checkIn, checkOut, nights: 2, adults: 2 },
              rooms: quoteMode === 'soldout' ? [] : [room],
            },
          });
        }
        return route.fulfill({ json: { items: [], nextCursor: null } });
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      const ui = new TripPage(page);
      await page.goto(base + '/book');
      const flight = page.getByRole('checkbox', { name: 'HAN → CXR', exact: true });
      await flight.waitFor();
      await page.getByRole('checkbox', { name: hotelName, exact: true }).waitFor();
      await page.getByText(roomName, { exact: false }).waitFor();
      await flight.scrollIntoViewIfNeeded();
      await ui.snapshot(`${baseline ? 'before' : 'after'}-cards-${width}`);
      await ui.noOverflow();
      if (!baseline) {
        await flight
          .locator('..')
          .locator('..')
          .screenshot({ path: join(output, `after-flight-card-${width}.png`) });
        const hotel = page.getByRole('checkbox', { name: hotelName, exact: true });
        await hotel
          .locator('..')
          .locator('..')
          .screenshot({ path: join(output, `after-hotel-card-${width}.png`) });
        await page.getByText('Huỷ miễn phí trước ngày nhận phòng 3 ngày', { exact: true }).waitFor();
        const bookLabelSize = await ui
          .button('Đặt ngay')
          .getByText('Đặt ngay', { exact: true })
          .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
        assert(bookLabelSize >= 14, 'booking CTA is readable outside compact typography');
        const title = page.getByText('HAN → CXR', { exact: true });
        const bounds = await title.boundingBox();
        assert(bounds.height <= 30, 'flight route stays on one line at default font size');
        const detail = page.getByText(roomName, { exact: false }).first();
        assert.equal(
          await detail.evaluate((node) => getComputedStyle(node).webkitLineClamp),
          'none',
          'room detail is not truncated',
        );
        await flight.click();
        assert.equal(await flight.getAttribute('aria-checked'), 'false');
        assert.equal(
          await page.getByLabel('Tổng vé bay và chỗ ở', { exact: true }).textContent(),
          '123.456.789đ',
        );
        await flight.click();
        assert.equal(await flight.getAttribute('aria-checked'), 'true');
        const open = ui.button('Xem chi tiết & đổi').first();
        await open.click();
        await page.waitForURL((url) => url.pathname === '/flights');
        assert.equal(new URL(page.url()).searchParams.get('pickId'), 'f0');
        await page.goBack();
        await page.getByRole('checkbox', { name: hotelName, exact: true }).waitFor();
        await ui.button('Đổi chỗ ở').click();
        await page.waitForURL((url) => url.pathname === '/search');
        assert.equal(new URL(page.url()).searchParams.get('pick'), 'trip');
        await page.goBack();
        await page.getByText('2 người lớn', { exact: false }).first().click();
        await ui.button('Thêm người lớn').waitFor();
        await ui.snapshot(`after-passengers-${width}`);
        await ui.noOverflow();
        await ui.button('Thêm người lớn').click();
        await page.getByText('3 người lớn', { exact: false }).first().waitFor();
        checks.push(
          `${width}px: route on one line, long room details untruncated, large prices, selection, flight/hotel change params and passenger update`,
        );
        if (width === 390) {
          await page.evaluate(() => {
            for (const node of document.querySelectorAll('[dir="auto"]')) {
              const style = getComputedStyle(node);
              node.style.fontSize = parseFloat(style.fontSize) * 1.4 + 'px';
              node.style.lineHeight = parseFloat(style.lineHeight) * 1.4 + 'px';
            }
          });
          await hotel.scrollIntoViewIfNeeded();
          await ui.noOverflow();
          await ui.snapshot('large-text-browser-preview');
          quoteMode = 'soldout';
          await page.reload();
          await page.getByText('Hết chỗ ngày này', { exact: true }).first().waitFor();
          assert(await ui.button('Đặt ngay').isDisabled());
          assert(await page.getByRole('checkbox', { name: 'HAN → CXR', exact: true }).isDisabled());
          await ui.snapshot('sold-out');
          quoteMode = 'error';
          await page.reload();
          await page
            .getByText('Chưa lấy được giá vé và phòng. Thử chọn lại ngày.', { exact: true })
            .first()
            .waitFor();
          assert(await ui.button('Đặt ngay').isDisabled());
          await ui.snapshot('quote-error');
          quoteMode = 'normal';
          const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
          await page.evaluate(
            ({ date, hotelName, roomName, rateName }) =>
              sessionStorage.setItem(
                'tripflix.tripBuilder.v1',
                JSON.stringify({
                  destination: { destinationName: 'Nha Trang', destinationPlaceId: '' },
                  adults: 2,
                  items: [
                    {
                      kind: 'hotel',
                      key: 'h1',
                      hotelName,
                      roomName,
                      rateName,
                      checkIn: date,
                      nights: 2,
                      productId: 'qa-room',
                      ratePlanCode: 'FLEX',
                      totalPrice: 123456789,
                    },
                    {
                      kind: 'flight',
                      key: 'f1',
                      date,
                      from: 'HAN',
                      to: 'CXR',
                      productId: 'qa-flight',
                      ratePlanCode: 'FLEX',
                      flightNumber: 'VN123',
                      departTime: '09:30',
                      fareName: 'Phổ thông linh hoạt',
                      totalPrice: 98765432,
                    },
                  ],
                }),
              ),
            { date, hotelName, roomName, rateName },
          );
          await page.goto(base + '/trip-builder');
          await page.getByText(hotelName, { exact: true }).waitFor();
          await ui.noOverflow();
          await ui.snapshot('self-builder-cards');
          await ui.button('Bỏ').first().click();
          assert.equal(await page.getByText(hotelName, { exact: true }).count(), 0);
          await ui.button('Bỏ').click();
          assert(await ui.button('Giữ chỗ').isDisabled());
          checks.push(
            'Browser enlarged text 140% (not native), sold-out/error quote blocks checkout, self-builder shares card and removes items without breaking total/empty CTA',
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
      apiFixtures: true,
      nativeFontAndDeviceTested: false,
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
