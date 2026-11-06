// Local integration: real API/Postgres/Redis, only transport and delayed-result scenarios are injected.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir, networkInterfaces } = require('node:os');
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const { CommercePage } = require('../../pages/commerce-page.cjs');
const { registerAccount } = require('../../fixtures/register-account.cjs');
const API = process.env.API_PREVIEW_URL || 'http://localhost:8080';
const MOBILE = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8081';
const OUTPUT = process.env.COMMERCE_EVIDENCE_DIR || join(tmpdir(), 'tripflix-commerce');
const localHosts = new Set([
  'localhost',
  '127.0.0.1',
  ...Object.values(networkInterfaces())
    .flat()
    .filter(Boolean)
    .map((adapter) => adapter.address),
]);
for (const url of [API, MOBILE])
  assert.ok(localHosts.has(new URL(url).hostname), 'Integration tests must target this machine');
const checks = [];
const errors = [];
const ids = [];
const notes = [];
let token;
async function api(path, method = 'GET', body) {
  const response = await fetch(new URL(path, API), {
    method,
    headers: {
      'content-type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return data;
}
function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function record(name) {
  checks.push(name);
  process.stdout.write(`PASS ${name}\n`);
}

(async () => {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const view = new CommercePage(page, MOBILE, expect);
  const email = `commerce-${Date.now()}@example.test`;
  const password = `Test-${crypto.randomUUID()}!`;
  const checkIn = dateAfter(7),
    checkOut = dateAfter(9);
  const hotelPath = `/hotel/P-h-dn-01?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`;
  try {
    await registerAccount(api, { email, password, displayName: 'Kiểm thử commerce' });
    token = (await api('/api/auth/login', 'POST', { email, password })).accessToken;
    const listProbe = await fetch(new URL('/api/checkout', API), {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(listProbe.status, 200, 'TF37 must be running; this test does not replace GET /api/checkout');
    const initialTrips = await listProbe.json();
    assert.deepEqual(initialTrips, { trips: [], nextCursor: null });
    await view.login(email, password);
    const hotel = await api(`/api/hotels/P-h-dn-01?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`);
    await view.visit(hotelPath);
    const room = hotel.rooms.find((room) => room.isAvailable);
    assert.ok(room);
    await expect(
      page.getByText(`Số phòng còn lại: ${room.remaining}`, { exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({ path: join(OUTPUT, '01-hotel.png'), fullPage: true });
    record('Hotel route uses real availability, selected dates and actual remaining rooms');

    ids.push(await view.hold(hotelPath));
    await view.contact('4000002500003155');
    await view.pay();
    await page.getByLabel('Mã OTP', { exact: true }).fill('000000');
    await view.button('Xác nhận OTP').click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByLabel('Số thẻ', { exact: true })).toBeEditable();
    await view.pay();
    await page.getByLabel('Mã OTP', { exact: true }).fill('123456');
    await page.screenshot({ path: join(OUTPUT, '02-otp.png'), fullPage: true });
    await view.button('Xác nhận OTP').click();
    await view.expectPaid();
    await page.screenshot({ path: join(OUTPUT, '03-paid.png'), fullPage: true });
    assert.equal((await api(`/api/checkout/${ids[0]}`)).status, 'paid');
    record('Real hold, guests, card token, wrong OTP recovery, new payment and paid confirmation');

    await view.button('Xem chuyến đi của tôi').click();
    await expect(view.button('Chi tiết đặt chỗ').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Bài đã lưu', exact: true }).click();
    await expect(
      page.getByText('Bạn chưa lưu bài nào. Mở một bài đăng để lưu lại.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('tab', { name: 'Bài đã đăng', exact: true }).click();
    await expect(
      page.getByText('Chưa có bài đăng nào. Hãy quay lại sau hoặc tạo bản nháp đầu tiên của bạn.', {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('tab', { name: 'Chuyến đã đặt', exact: true }).click();
    await view.button('Chi tiết đặt chỗ').first().click();
    await view.expectPaid();
    record('Three trips tabs render API responses and opening a booking loads its real order');

    ids.push(await view.hold(hotelPath));
    await view.contact('4000000000000002');
    await view.pay();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(view.button('Thanh toán')).toBeEnabled();
    await page.getByLabel('Số thẻ', { exact: true }).fill('4242424242424242');
    const payRequests = [];
    let hasAborted = false;
    await page.route('**/api/checkout/*/pay', async (route) => {
      payRequests.push({
        key: route.request().headers()['idempotency-key'],
        body: route.request().postData(),
      });
      if (!hasAborted) {
        hasAborted = true;
        await route.abort('failed');
      } else await route.continue();
    });
    await view.pay();
    await view.button('Thử lại').click();
    await view.expectPaid();
    await page.unroute('**/api/checkout/*/pay');
    assert.equal(payRequests.length, 2);
    assert.ok(payRequests[0].key);
    assert.deepEqual(payRequests[0], payRequests[1]);
    record('A declined card can change; network retry reuses exact payment body and UUID');

    // Place an order through the API as a web client while the app already has cached trips.
    await view.button('Xem chuyến đi của tôi').click();
    await expect(view.button('Chi tiết đặt chỗ')).toHaveCount(ids.length);
    const firstCount = await view.button('Chi tiết đặt chỗ').count();
    const latestHotel = await api(`/api/hotels/P-h-dn-01?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`);
    const webRoom = latestHotel.rooms.find((offer) => offer.isAvailable);
    assert.ok(webRoom, 'An available room is required for the separate web booking');
    const webOrder = await api('/api/checkout', 'POST', {
      adults: 2,
      items: [
        {
          productId: webRoom.productId,
          checkIn,
          checkOut,
          qty: webRoom.roomsNeeded,
          ratePlanCode: webRoom.ratePlans[0].code,
        },
      ],
    });
    ids.push(webOrder.orderId);
    await api(`/api/checkout/${webOrder.orderId}/guests`, 'PUT', {
      contact: { fullName: 'WEB TEST', phone: '0901234567' },
      guests: [],
    });
    const paymentToken = (await api('/api/mock-gateway/tokens', 'POST', { cardNumber: '4242424242424242' }))
      .paymentToken;
    await api(`/api/checkout/${webOrder.orderId}/pay`, 'POST', {
      paymentToken,
      expectedTotal: webOrder.total,
      acceptedPolicyVersion: webOrder.policyVersion,
    });
    await page.getByText('Khám phá', { exact: true }).click();
    await page.getByText('Chuyến đi', { exact: true }).last().click();
    await expect(view.button('Chi tiết đặt chỗ')).toHaveCount(firstCount + 1);
    await page.screenshot({ path: join(OUTPUT, '04-trips-refreshed.png'), fullPage: true });
    record('Real TF37 API: booking outside the app appears when reopening the trips tab');
    const firstPage = await api('/api/checkout?limit=1');
    assert.equal(firstPage.trips.length, 1);
    assert.ok(firstPage.nextCursor);
    const secondPage = await api(`/api/checkout?limit=1&cursor=${encodeURIComponent(firstPage.nextCursor)}`);
    assert.equal(secondPage.trips.length, 1);
    assert.notEqual(secondPage.trips[0].orderId, firstPage.trips[0].orderId);
    record('Real TF37 cursor pagination returns a different next order');

    const pendingId = await view.hold(hotelPath);
    ids.push(pendingId);
    await view.contact('4242424242424242');
    let payCount = 0,
      pendingReads = 2;
    await page.route(`**/api/checkout/${pendingId}`, async (route) => {
      const response = await route.fetch();
      const order = await response.json();
      if (payCount > 0 && pendingReads-- > 0)
        return route.fulfill({ json: { ...order, status: 'paying', confirmationCode: null } });
      await route.fulfill({ response });
    });
    await page.route(`**/api/checkout/${pendingId}/pay`, async (route) => {
      payCount++;
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.fulfill({
        status: 202,
        json: { outcome: 'pending', orderId: pendingId, message: 'Đang đối soát kết quả kiểm thử.' },
      });
    });
    await view.pay();
    await expect(page.getByText('Đang đối soát kết quả kiểm thử.', { exact: true })).toBeVisible();
    await expect(view.button('Thanh toán')).toBeDisabled();
    await expect(view.button('Thử lại')).toHaveCount(0);
    await view.expectPaid();
    assert.equal(payCount, 1);
    await page.unroute(`**/api/checkout/${pendingId}`);
    await page.unroute(`**/api/checkout/${pendingId}/pay`);
    record('202 pending locks payment and polls the order until paid without another payment request');

    await page.route('**/api/payments/vnpay/return?*', (route) =>
      route.fulfill({ json: { orderId: null, isValidSignature: true, isSuccess: false } }),
    );
    await view.visit('/payments/vnpay/return?vnp_SecureHash=test&vnp_ResponseCode=24');
    await expect(
      page.getByText('VNPay chưa xác nhận thanh toán thành công. Vui lòng kiểm tra trạng thái đơn.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('Đặt chỗ thành công', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: join(OUTPUT, '05-vnpay-not-success.png'), fullPage: true });
    record('VNPay isSuccess=false never displays a successful booking');
    assert.equal(errors.length, 0, errors.join('\n'));
  } catch (error) {
    await page.screenshot({ path: join(OUTPUT, 'failure.png'), fullPage: true });
    await writeFile(join(OUTPUT, 'failure.txt'), await page.locator('body').innerText());
    throw error;
  } finally {
    await writeFile(
      join(OUTPUT, 'results.json'),
      JSON.stringify({ checks, errors, notes, orderIds: ids }, null, 2),
    );
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(error.stack + '\n');
  process.exitCode = 1;
});
