// Real mobile screens with isolated auth/hotel/checkout fixtures; no live reservation or payment.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-tripi-stay');
const name = 'Biển Xanh — nơi ở Tripi gợi ý';
const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
const month = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
const initial = { dateFrom: `${month}-01`, dateTo: `${month}-03` };
const later = { dateFrom: `${month}-12`, dateTo: `${month}-15` };

async function fixture(browser, width, trip) {
  const context = await browser.newContext({
    viewport: { width, height: width === 320 ? 667 : 844 },
    isMobile: true,
    hasTouch: true,
  });
  const hotelRequests = [],
    checkoutRequests = [],
    errors = [];
  const card = {
    ref: 'stay-1',
    kind: 'stay',
    id: 'qa-hotel',
    title: name,
    priceFrom: 1200000,
    priceBasis: 'per_night',
    currency: 'VND',
    observedAt: new Date().toISOString(),
    checkIn: initial.dateFrom,
    checkOut: initial.dateTo,
  };
  await context.addInitScript(
    ({ trip, card }) => {
      localStorage.setItem(
        'tripflix.assistantChat.v1',
        JSON.stringify({
          userId: 'qa-member',
          savedAt: Date.now(),
          trip,
          messages: [
            { id: 'u1', role: 'user', text: 'Tìm nơi ở cho ngày 01 đến 03 tháng 12' },
            { id: 'a1', role: 'assistant', text: 'Đây là nơi ở mình tìm được.', cards: [card] },
            { id: 'u2', role: 'user', text: 'Thông tin chuyến đi hiện tại' },
            { id: 'a2', role: 'assistant', text: 'Mình đã cập nhật thông tin chuyến đi.' },
          ],
        }),
      );
    },
    { trip, card },
  );
  let order;
  await context.route('**/api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    if (path === '/api/auth/refresh')
      return route.fulfill({ json: { accessToken: 'qa-token', tokenType: 'Bearer', expiresIn: 900 } });
    if (path === '/api/auth/me')
      return route.fulfill({
        json: {
          id: 'qa-member',
          email: 'an@example.test',
          displayName: 'Nguyễn An',
          role: 'member',
          emailVerified: true,
          travelPreferences: {
            status: 'completed',
            interests: [],
            regions: [],
            budgetLevels: [],
            updatedAt: new Date().toISOString(),
          },
        },
      });
    if (path.endsWith('/reviews'))
      return route.fulfill({
        json: { hotelId: 'qa-hotel', summary: null, items: [], total: 0, page: 1, limit: 3 },
      });
    if (path === '/api/hotels/qa-hotel') {
      const stay = Object.fromEntries(url.searchParams);
      hotelRequests.push(stay);
      return route.fulfill({
        json: {
          id: 'qa-hotel',
          slug: 'qa-hotel',
          name,
          province: { slug: 'khanh-hoa', name: 'Khánh Hòa' },
          city: 'Nha Trang',
          stars: 4,
          brand: null,
          style: null,
          thumbnail: null,
          images: [],
          address: '12 Trần Phú, Nha Trang',
          location: null,
          rating: null,
          checkInTime: '14:00',
          checkOutTime: '12:00',
          description: '',
          highlights: [],
          amenities: [],
          nearby: [],
          languages: [],
          facts: {},
          policies: {},
          stay: {
            ...stay,
            adults: Number(stay.adults),
            nights: (Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / 86400000,
          },
          priceFrom: 1200000,
          isAvailable: true,
          calendar: [],
          rooms: [
            {
              productId: 'qa-room',
              name: 'Phòng hướng biển',
              maxGuests: 9,
              bedType: null,
              areaM2: null,
              view: null,
              images: [],
              amenities: [],
              roomsNeeded: 1,
              isAvailable: true,
              reason: null,
              remaining: 9,
              ratePlans: [
                {
                  code: 'FLEX',
                  name: 'Linh hoạt',
                  totalPrice: 2400000,
                  pricePerNight: 1200000,
                  isRefundable: true,
                  freeCancelDays: 3,
                  discountPct: null,
                  perks: [],
                },
              ],
            },
          ],
        },
      });
    }
    if (path === '/api/checkout' && req.method() === 'POST') {
      const body = req.postDataJSON();
      checkoutRequests.push(body);
      const line = body.items[0];
      order = {
        orderId: 'qa-order',
        status: 'pending',
        holdExpiresAt: new Date(Date.now() + 1200000).toISOString(),
        total: 2400000,
        adults: body.adults,
        children: body.children ?? 0,
        infants: body.infants ?? 0,
        confirmationCode: null,
        cancelReason: null,
        isGuestInfoComplete: false,
        passengersRequired: 0,
        passengerTypes: [],
        policyVersion: 'qa-policy',
        items: [
          {
            id: 'qa-line',
            productId: 'qa-room',
            productType: 'room',
            productName: 'Phòng hướng biển',
            propertyId: 'qa-hotel',
            propertyName: name,
            date: line.checkIn,
            dateTo: line.checkOut,
            nights: (Date.parse(line.checkOut) - Date.parse(line.checkIn)) / 86400000,
            qty: line.qty,
            unitPrice: 1200000,
            lineTotal: 2400000,
            ratePlanCode: 'FLEX',
            ratePlanName: 'Linh hoạt',
            isRefundable: true,
            freeCancelUntil: null,
            childUnitPrice: null,
            infantUnitPrice: null,
            confirmationCode: null,
          },
        ],
      };
      return route.fulfill({ json: { orderId: 'qa-order' } });
    }
    if (path === '/api/checkout/qa-order') return route.fulfill({ json: order });
    return route.fulfill({ json: { items: [], nextCursor: null, unreadCount: 0 } });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.setDefaultTimeout(20000);
  const button = (label) => page.getByRole('button', { name: label, exact: true });
  const snapshot = async (file) => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(output, `${file}.png`) });
  };
  return { context, page, button, snapshot, hotelRequests, checkoutRequests, errors };
}

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const checks = [];
  try {
    for (const [width, trip] of [
      [390, { ...initial, adults: 2, children: 0, infants: 0 }],
      [430, { ...later, adults: 3, children: 1, infants: 1 }],
    ]) {
      const ui = await fixture(browser, width, trip);
      const { page, button, hotelRequests, checkoutRequests } = ui;
      await page.goto(base + '/assistant');
      await page.getByText(name, { exact: true }).click();
      await page.waitForURL('**/tripi-stay?**');
      assert.equal(hotelRequests.length, 0, 'card opens review without pricing');
      assert.equal(
        new URL(page.url()).searchParams.get('checkIn'),
        trip.dateFrom,
        'old card follows latest trip',
      );
      await ui.snapshot(`review-${width}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await button('Xác nhận & xem giá phòng').click();
      await button('Chọn phòng').waitFor();
      assert(hotelRequests.length > 0);
      for (const request of hotelRequests)
        assert.deepEqual(request, {
          checkIn: trip.dateFrom,
          checkOut: trip.dateTo,
          adults: String(trip.adults),
        });
      await ui.snapshot(`hotel-${width}`);
      await button('Chọn phòng').click();
      await button('Chọn Linh hoạt').click();
      await button('Thêm vào giỏ').click();
      await page.getByRole('button', { name: /^Giỏ.*: 1$/ }).click();
      await page.waitForURL('**/cart');
      const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('tripflix.bookingCart.v1')));
      assert.equal(cart.adults, trip.adults);
      assert.equal(cart.children, trip.children);
      assert.equal(cart.infants, trip.infants);
      assert.equal(cart.items[0].checkIn, trip.dateFrom);
      assert.equal(cart.items[0].checkOut, trip.dateTo);
      await ui.snapshot(`cart-${width}`);
      await button('Đặt ngay').click();
      await page.waitForURL('**/checkout?id=qa-order');
      await page.getByText('Thông tin & thanh toán', { exact: true }).waitFor();
      assert.equal(checkoutRequests.length, 1);
      const request = checkoutRequests[0];
      assert.equal(request.adults, trip.adults);
      assert.equal(request.children ?? 0, trip.children);
      assert.equal(request.infants ?? 0, trip.infants);
      assert.equal(request.items[0].checkIn, trip.dateFrom);
      assert.equal(request.items[0].checkOut, trip.dateTo);
      await ui.snapshot(`checkout-${width}`);
      assert.deepEqual(ui.errors, []);
      checks.push({ width, trip, hotelRequests, checkout: request, result: 'passed' });
      await ui.context.close();
    }
    const ui = await fixture(browser, 320, {
      dateFrom: null,
      dateTo: null,
      adults: 2,
      children: 0,
      infants: 0,
    });
    await ui.page.goto(base + '/assistant');
    await ui.page.getByText(name, { exact: true }).click();
    await ui.page.waitForURL('**/tripi-stay?**');
    assert(await ui.button('Xác nhận & xem giá phòng').isDisabled());
    assert.equal(new URL(ui.page.url()).searchParams.get('checkIn'), '');
    await ui.snapshot('missing-dates-320');
    assert(await ui.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(ui.hotelRequests.length, 0);
    await ui.page.getByRole('button', { name: /^Nhận phòng \*/ }).click();
    await ui.button(initial.dateFrom.split('-').reverse().join('/')).click();
    await ui.button(initial.dateTo.split('-').reverse().join('/')).click();
    await ui.button('Xong · 2 đêm').click();
    await ui.button('Thêm Người lớn').click();
    assert(await ui.button('Xác nhận & xem giá phòng').isEnabled());
    assert.equal(ui.hotelRequests.length, 0, 'editing review does not request prices');
    await ui.button('Xác nhận & xem giá phòng').click();
    await ui.button('Chọn phòng').waitFor();
    assert.deepEqual(ui.hotelRequests[0], {
      checkIn: initial.dateFrom,
      checkOut: initial.dateTo,
      adults: '3',
    });
    await ui.button('Chọn phòng').click();
    await ui.button('Đổi').click();
    await ui.button('Thêm Trẻ em').click();
    assert(await ui.button('Chọn Linh hoạt').isDisabled(), 'dirty party cannot use old room quote');
    await ui.button('Cập nhật giá').click();
    assert(await ui.button('Chọn Linh hoạt').isEnabled());
    checks.push({
      width: 320,
      result: 'passed',
      cases: [
        'missing dates can be selected explicitly',
        'party edit reaches hotel query',
        'dirty room quote cannot be selected before updating',
      ],
    });
    ui.hotelRequests.length = 0;
    await ui.page.goto(base + '/hotel/qa-hotel?fromTripi=1&adults=2&children=0&infants=0');
    await ui.button('Đổi ngày & số khách').waitFor();
    assert.equal(ui.hotelRequests.length, 0, 'incomplete hotel deep link cannot price default dates');
    await ui.page.goto(
      base +
        '/hotel-rooms?id=qa-hotel&fromTripi=1&checkIn=2026-12-01&checkOut=2026-12-32&adults=2&children=0&infants=0',
    );
    await ui.page.getByText('Nhận phòng', { exact: true }).first().waitFor();
    assert.equal(ui.hotelRequests.length, 0, 'invalid room deep link cannot price');
    assert.deepEqual(ui.errors, []);
    checks.push({
      width: 320,
      result: 'passed',
      cases: [
        'missing/cleared dates block confirm',
        'invalid hotel and room deep links block pricing',
        'no horizontal overflow',
      ],
    });
    await ui.context.close();
    const guest = await fixture(browser, 390, null);
    await guest.context.route('**/api/auth/**', (route) => route.fulfill({ status: 401, json: {} }));
    const stayParams = new URLSearchParams({
      id: 'qa-hotel',
      checkIn: initial.dateFrom,
      checkOut: initial.dateTo,
      adults: '3',
      children: '1',
      infants: '1',
    });
    await guest.page.goto(`${base}/tripi-stay?${stayParams}`);
    await guest.button('Xác nhận & xem giá phòng').click();
    await guest.button('Chọn phòng').click();
    await guest.button('Chọn Linh hoạt').click();
    await guest.button('Đăng nhập để tiếp tục giữ chỗ').click();
    await guest.page.waitForURL('**/login?**');
    const returnTo = new URL(new URL(guest.page.url()).searchParams.get('returnTo'), base);
    assert.equal(returnTo.searchParams.get('fromTripi'), '1');
    for (const [key, value] of stayParams) assert.equal(returnTo.searchParams.get(key), value);
    assert.deepEqual(guest.errors, []);
    checks.push({
      width: 390,
      result: 'passed',
      cases: ['guest login return link preserves dates and all guest counts'],
    });
    await guest.context.close();
    await writeFile(
      join(output, 'qa-results.json'),
      JSON.stringify({ checks, native: 'Not run; Expo Go device verification remains pending.' }, null, 2),
    );
    console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
