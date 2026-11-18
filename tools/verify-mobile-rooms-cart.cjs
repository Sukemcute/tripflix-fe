const assert = require('node:assert/strict');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-rooms-cart');
const baseline = process.env.CAPTURE_BASELINE === '1';
const checkIn = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
const checkOut = new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10);
const hotelName = 'Khách sạn Biển Xanh dành cho những ngày nghỉ thong thả';
const roomName = 'Phòng Gia đình hướng biển với ban công riêng và hai giường lớn';
const basic = 'Gói tiết kiệm dành cho gia đình';
const flex = 'Gói linh hoạt có bữa sáng và hoàn huỷ';
const key = 'tripflix.bookingCart.v1';
const amenities = [
  'Wi-Fi tốc độ cao trong phòng',
  'Ban công riêng nhìn ra biển',
  'Bàn làm việc và ghế thư giãn',
  'Máy pha cà phê',
  'Tủ lạnh mini',
  'Điều hoà',
  'Két an toàn',
  'Máy sấy tóc',
];
const rate = (code, name, refundable) => ({
  code,
  name,
  isRefundable: refundable,
  freeCancelDays: 3,
  totalPrice: 4000000,
  pricePerNight: 1333333,
  listPricePerNight: 1500000,
  discountPct: 10,
  meal: 'breakfast',
  perks: ['Bữa sáng cho khách lưu trú', 'Wi-Fi miễn phí'],
});
const room = {
  productId: 'qa-room',
  name: roomName,
  maxGuests: 4,
  bedType: '2 giường lớn',
  areaM2: 42,
  view: 'sea',
  images: [base + '/qa-room.jpg'],
  amenities,
  roomsNeeded: 1,
  isAvailable: true,
  remaining: 2,
  reason: null,
  ratePlans: [rate('BASIC', basic, false), rate('FLEX', flex, true)],
};
const hotel = {
  id: 'qa-hotel',
  name: hotelName,
  province: { slug: 'khanh-hoa', name: 'Khánh Hòa' },
  images: [],
  thumbnail: null,
  amenities: [],
  highlights: [],
  nearby: [],
  languages: [],
  facts: {},
  policies: {},
  calendar: [],
  stay: { checkIn, checkOut, nights: 3, adults: 2 },
  priceFrom: 1333333,
  isAvailable: true,
  rooms: [room],
};
const line = {
  productId: 'qa-room',
  ratePlanCode: 'BASIC',
  propertyId: 'qa-hotel',
  propertyName: hotelName,
  roomName,
  ratePlanName: basic,
  checkIn,
  checkOut,
  maxGuests: 4,
  stayPricePerRoom: 4000000,
  maxQty: 2,
  qty: 1,
};
class RoomsCartPage {
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
  async rooms(pick = false) {
    await this.page.goto(
      `${base}/hotel-rooms?id=qa-hotel&checkIn=${checkIn}&checkOut=${checkOut}&adults=2${pick ? '&pick=trip&pickKey=qa&pickId=stay-1' : ''}`,
    );
    await this.page.getByText(roomName, { exact: true }).waitFor();
  }
  async cart(count = 1) {
    await this.page.evaluate(
      ({ key, line, count }) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            adults: 2,
            children: 0,
            infants: 0,
            items:
              count === 1
                ? [line]
                : [line, { ...line, productId: 'qa-room-2', roomName: 'Phòng thứ hai hướng vườn' }],
          }),
        ),
      { key, line, count },
    );
    await this.page.goto(base + '/cart');
    await this.page.getByText(hotelName, { exact: true }).first().waitFor();
  }
}
(async () => {
  await mkdir(output, { recursive: true });
  const image = await readFile(join(__dirname, '../apps/mobile/assets/brand/hotel.jpg'));
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
      await context.route('**/qa-room.jpg', (r) => r.fulfill({ contentType: 'image/jpeg', body: image }));
      let soldOut = false;
      let roomCount = width === 390 ? 2 : 1;
      await context.route('**/api/**', (r) => {
        const path = new URL(r.request().url()).pathname;
        if (path === '/api/auth/refresh') return r.fulfill({ status: 401, json: {} });
        if (path === '/api/hotels/qa-hotel')
          return r.fulfill({
            json: {
              ...hotel,
              rooms: [
                { ...room, isAvailable: !soldOut, remaining: soldOut ? 0 : 2 },
                { ...room, productId: 'qa-room-2', name: 'Phòng thứ hai hướng vườn' },
              ].slice(0, roomCount),
            },
          });
        if (path === '/api/recommendations/trip-addons')
          return r.fulfill({ json: { missing: 'flight', flights: null, stays: null } });
        return r.fulfill({ json: { items: [], nextCursor: null } });
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      const ui = new RoomsCartPage(page);
      await ui.rooms();
      await page.getByText(roomName, { exact: true }).first().scrollIntoViewIfNeeded();
      await ui.snapshot(`${baseline ? 'before' : 'after'}-rooms-${width}`);
      await ui.noOverflow();
      if (!baseline) {
        assert.equal(
          await page.getByText(flex, { exact: true }).count(),
          0,
          'extra rate initially collapsed',
        );
        await ui.button('Xem thêm 1 gói giá').first().click();
        await page.getByText(flex, { exact: true }).first().waitFor();
        await ui
          .button('Chọn ' + flex)
          .first()
          .click();
        const plus = ui.button('Thêm một phòng: ' + flex).first();
        const minus = ui.button('Bớt một phòng: ' + flex).first();
        const box = await plus.boundingBox();
        assert(box.width >= 44 && box.height >= 44);
        await plus.click();
        assert(await plus.isDisabled());
        await minus.click();
        await ui.button('Thu gọn gói giá').first().click();
        await page.getByText(flex, { exact: true }).first().waitFor();
        await ui.button('+5 tiện ích').first().click();
        await page.getByText('Máy sấy tóc', { exact: true }).first().waitFor();
        await ui.snapshot(`selected-rate-${width}`);
        await page
          .getByText(flex, { exact: true })
          .first()
          .locator('..')
          .locator('..')
          .screenshot({ path: join(output, `selected-rate-detail-${width}.png`) });
        await ui.noOverflow();
        await ui.button('Thêm vào giỏ').click();
        assert.equal(
          (await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).items[0].ratePlanCode,
          'FLEX',
        );
      }
      roomCount = 2;
      await ui.cart();
      await ui.snapshot(`${baseline ? 'before' : 'after'}-cart-${width}`);
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
        const plus = ui.button('Thêm ' + roomName),
          minus = ui.button('Bớt ' + roomName);
        const box = await plus.boundingBox();
        assert(box.width >= 44 && box.height >= 44);
        await plus.click();
        assert(await plus.isDisabled());
        assert.equal(
          (await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).items[0].qty,
          2,
        );
        await page.getByText('8.000.000đ', { exact: true }).first().waitFor();
        await minus.click();
        await ui.button('Xoá ' + roomName).click();
        await page.getByText('Giỏ của bạn đang trống.', { exact: true }).waitFor();
        await ui.cart(2);
        await ui.snapshot(`many-cart-${width}`);
        await ui.noOverflow();
        await ui.button('Xoá ' + roomName).click();
        assert.equal(
          (await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).items.length,
          1,
        );
        if (width === 390) {
          await page.evaluate(() => {
            for (const node of document.querySelectorAll('[dir="auto"]')) {
              const style = getComputedStyle(node);
              node.style.fontSize = parseFloat(style.fontSize) * 1.4 + 'px';
              node.style.lineHeight = parseFloat(style.lineHeight) * 1.4 + 'px';
            }
          });
          await ui.noOverflow();
          await ui.snapshot('large-text-cart-browser-preview');
          soldOut = true;
          await ui.cart();
          await page.getByText('Phòng này đã hết cho ngày bạn chọn.', { exact: true }).waitFor();
          await ui.snapshot('sold-out-cart');
          soldOut = false;
          await ui.rooms(true);
          await ui.button('Xem thêm 1 gói giá').first().click();
          await page.getByText(flex, { exact: true }).first().waitFor();
          await ui.snapshot('trip-pick-mode');
        }
        checks.push(
          `${width}px: collapsed rates, selected rate stays visible, amenities expand, 44px quantity targets, quantity max, total updates, single/multiple cart lines and remove-to-empty`,
        );
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
      nativeTested: false,
    };
    await writeFile(
      join(output, baseline ? 'baseline-results.json' : 'qa-results.json'),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
