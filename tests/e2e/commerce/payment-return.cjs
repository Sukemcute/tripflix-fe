// Result-screen regression checks: real account/order; only gateway response states are injected.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { registerAccount } = require('../../fixtures/register-account.cjs');
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const { CommercePage } = require('../../pages/commerce-page.cjs');
const API = process.env.API_PREVIEW_URL || 'http://localhost:8080';
const MOBILE = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8081';
const OUTPUT = process.env.PAYMENT_RETURN_EVIDENCE_DIR || join(tmpdir(), 'tripflix-payment-return');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(API).hostname));
let token;
const checks = [];
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
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return response.json();
}
function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-CA');
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
  const view = new CommercePage(page, MOBILE, expect);
  try {
    const email = `return-ui-${Date.now()}@example.test`,
      password = `Return-${crypto.randomUUID()}!`;
    await registerAccount(api, { email, password, displayName: 'Payment return UI test' });
    token = (await api('/api/auth/login', 'POST', { email, password })).accessToken;
    const checkIn = dateAfter(16),
      checkOut = dateAfter(18);
    const hotel = await api(`/api/hotels/P-h-dn-01?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`);
    const room = hotel.rooms.find((room) => room.isAvailable);
    assert.ok(room);
    const order = await api('/api/checkout', 'POST', {
      adults: 2,
      items: [
        {
          productId: room.productId,
          checkIn,
          checkOut,
          qty: room.roomsNeeded,
          ratePlanCode: room.ratePlans[0].code,
        },
      ],
    });
    await api(`/api/checkout/${order.orderId}/guests`, 'PUT', {
      contact: { fullName: 'RETURN TEST', phone: '0901234567' },
      guests: [],
    });
    const paymentToken = (await api('/api/mock-gateway/tokens', 'POST', { cardNumber: '4242424242424242' }))
      .paymentToken;
    await api(`/api/checkout/${order.orderId}/pay`, 'POST', {
      paymentToken,
      expectedTotal: order.total,
      acceptedPolicyVersion: order.policyVersion,
    });
    const paidOrder = await api(`/api/checkout/${order.orderId}`);
    const callback = { orderId: order.orderId, isValidSignature: true, isSuccess: true };
    let scenario = 'loading',
      release;
    await page.route('**/api/payments/vnpay/return?*', async (route) => {
      if (scenario === 'loading')
        await new Promise((resolve) => {
          release = resolve;
        });
      if (scenario === 'error')
        return route.fulfill({ status: 503, json: { message: 'Không thể xác nhận thanh toán lúc này.' } });
      await route.fulfill({
        json: { ...callback, isSuccess: scenario === 'success' || scenario === 'login' },
      });
    });
    await view.login(email, password);
    await view.visit('/payments/vnpay/return?vnp_SecureHash=loading');
    await expect(page.getByText('Đang xác nhận thanh toán…', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Thanh toán thành công', exact: true })).toHaveCount(0);
    scenario = 'declined';
    release();
    await expect(
      page.getByText('VNPay chưa xác nhận thanh toán thành công. Vui lòng kiểm tra trạng thái đơn.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Thanh toán thành công', exact: true })).toHaveCount(0);
    record('Loading and isSuccess=false never display payment success, even for an already-paid order');
    scenario = 'error';
    await view.visit('/payments/vnpay/return?vnp_SecureHash=error');
    await expect(page.getByText('Không thể xác nhận thanh toán lúc này.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Thanh toán thành công', exact: true })).toHaveCount(0);
    record('Verification API errors show a retry state without claiming success');
    scenario = 'success';
    await page.route(`**/api/checkout/${order.orderId}`, (route) =>
      route.fulfill({ json: { ...paidOrder, status: 'paying', confirmationCode: null } }),
    );
    await view.visit('/payments/vnpay/return?vnp_SecureHash=waiting-order');
    await expect(
      page.getByText('Đang chờ kết quả thanh toán. Đơn sẽ tự cập nhật, vui lòng chờ.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Thanh toán thành công', exact: true })).toHaveCount(0);
    await page.unroute(`**/api/checkout/${order.orderId}`);
    await expect(page.getByRole('heading', { name: 'Thanh toán thành công', exact: true })).toBeVisible({
      timeout: 12000,
    });
    record('isSuccess=true still waits for paid order status before rendering success');
    await expect(page.getByText(paidOrder.confirmationCode, { exact: true })).toBeVisible();
    await page.screenshot({ path: join(OUTPUT, '01-success-mobile.png'), fullPage: true });
    await view.button('Xem chuyến đi của tôi').click();
    await expect(page.getByText(`Mã xác nhận: ${paidOrder.confirmationCode}`, { exact: true })).toBeVisible();
    record('Success screen shows the real confirmation and opens the trips list');
    await context.clearCookies();
    scenario = 'login';
    await view.visit('/payments/vnpay/return?vnp_SecureHash=login');
    await expect(page.getByText('Đăng nhập để xem kết quả đặt chỗ của bạn.', { exact: true })).toBeVisible();
    await view.button('Đăng nhập').click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await view.button('Đăng nhập').click();
    await expect(page.getByRole('heading', { name: 'Thanh toán thành công', exact: true })).toBeVisible({
      timeout: 15000,
    });
    assert.equal(new URL(page.url()).pathname, '/payments/vnpay/return');
    record('Expired browser session can sign in and return to its original payment result');
    await view.visit('/payments/vnpay/return');
    await expect(
      page.getByText('Thiếu thông tin thanh toán. Vui lòng kiểm tra đơn trong Chuyến đi của tôi.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Thanh toán thành công', exact: true })).toHaveCount(0);
    record('Missing return parameters show a helpful state instead of success or endless loading');
  } catch (error) {
    await page.screenshot({ path: join(OUTPUT, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await writeFile(join(OUTPUT, 'results.json'), JSON.stringify({ checks }, null, 2));
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
});
