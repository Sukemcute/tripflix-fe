// Opt-in real VNPay sandbox test; never uses a production payment gateway.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir, networkInterfaces } = require('node:os');
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const { CommercePage } = require('../../pages/commerce-page.cjs');
const API = process.env.API_PREVIEW_URL || 'http://localhost:8080';
const MOBILE = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8081';
const OUTPUT = process.env.VNPAY_EVIDENCE_DIR || join(tmpdir(), 'tripflix-vnpay-direct');
const localHosts = new Set([
  'localhost',
  '127.0.0.1',
  ...Object.values(networkInterfaces())
    .flat()
    .filter(Boolean)
    .map((adapter) => adapter.address),
]);
for (const url of [API, MOBILE])
  assert.ok(localHosts.has(new URL(url).hostname), 'Test API and app must run on this machine');
const checks = [],
  errors = [];
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
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return response.json();
}
function futureDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function record(name) {
  checks.push(name);
  process.stdout.write(`PASS ${name}\n`);
}
class VnpaySandboxPage {
  constructor(page) {
    this.page = page;
  }
  async enterNcb() {
    await this.page.getByText('Thẻ nội địa và tài khoản ngân hàng', { exact: true }).click();
    // Bank logos have no accessible name on the gateway; its bank ID is stable.
    await this.page.locator('#NCB').click();
    await this.page.locator('#card_number_mask').fill('9704198526191432198');
    await this.page.locator('#cardHolder').fill('NGUYEN VAN A');
    await this.page.locator('#cardDate').fill('07/15');
  }
  async confirm() {
    await this.page.locator('#btnContinue').click();
    await this.page.locator('#btnAgree').click();
    await this.page.locator('#otpvalue').fill('123456');
    await this.page.screenshot({ path: join(OUTPUT, '02-ncb-otp.png'), fullPage: true });
    await this.page.locator('#btnConfirm').click();
  }
}
(async () => {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
  page.on('pageerror', (error) => errors.push(error.message));
  const view = new CommercePage(page, MOBILE, expect);
  let orderId, result;
  try {
    const email = `vnpay-direct-${Date.now()}@example.test`,
      password = `Sandbox-${crypto.randomUUID()}!`;
    await api('/api/auth/register', 'POST', { email, password, displayName: 'VNPay sandbox direct' });
    token = (await api('/api/auth/login', 'POST', { email, password })).accessToken;
    await view.login(email, password);
    orderId = await view.hold(
      `/hotel/P-h-dn-01?checkIn=${futureDate(12)}&checkOut=${futureDate(14)}&adults=2`,
    );
    await page.getByLabel('Họ và tên', { exact: true }).fill('NGUYEN VAN A');
    await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
    await page.getByRole('tab', { name: 'VNPay', exact: true }).click();
    await page.getByRole('button', { name: /Tôi đồng ý điều kiện đặt chỗ/ }).click();
    // Observe the real response before Expo navigates this browser tab away.
    let resolveStart, rejectStart;
    const start = new Promise((resolve, reject) => {
      resolveStart = resolve;
      rejectStart = reject;
    });
    await page.route(`**/api/checkout/${orderId}/pay-vnpay`, async (route) => {
      try {
        const response = await route.fetch();
        const payment = await response.json();
        await route.fulfill({ response });
        resolveStart({ status: response.status(), payment });
      } catch (error) {
        rejectStart(error);
        await route.abort();
      }
    });
    await view.pay();
    const startResponse = await start;
    assert.equal(startResponse.status, 200);
    const payment = startResponse.payment;
    const paymentUrl = new URL(payment.paymentUrl);
    assert.equal(paymentUrl.origin, 'https://sandbox.vnpayment.vn');
    const returnUrl = new URL(paymentUrl.searchParams.get('vnp_ReturnUrl'));
    assert.ok(localHosts.has(returnUrl.hostname));
    assert.equal(returnUrl.origin, new URL(MOBILE).origin, 'VNPay must return to the app result screen');
    assert.equal(returnUrl.pathname, '/payments/vnpay/return');
    let resolveConfirmation, rejectConfirmation;
    const confirmation = new Promise((resolve, reject) => {
      resolveConfirmation = resolve;
      rejectConfirmation = reject;
    });
    await page.route('**/api/payments/vnpay/return?*', async (route) => {
      try {
        const response = await route.fetch();
        const callback = await response.json();
        await route.fulfill({ response });
        assert.equal(response.status(), 200);
        resolveConfirmation(callback);
      } catch (error) {
        rejectConfirmation(error);
        await route.abort();
      }
    });
    await page.waitForURL((url) => url.origin === 'https://sandbox.vnpayment.vn', {
      timeout: 60000,
      waitUntil: 'domcontentloaded',
    });
    await page.screenshot({ path: join(OUTPUT, '01-gateway.png'), fullPage: true });
    record('App starts real sandbox payment and supplies the correct direct return URL');
    const gateway = new VnpaySandboxPage(page);
    await gateway.enterNcb();
    await gateway.confirm();
    await page.waitForURL((url) => url.origin === returnUrl.origin && url.pathname === returnUrl.pathname, {
      timeout: 60000,
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: 'Thanh toán thành công', exact: true })).toBeVisible({
      timeout: 20000,
    });
    const callback = await confirmation;
    const callbackQuery = new URL(page.url()).search;
    assert.deepEqual(callback, { orderId, isValidSignature: true, isSuccess: true });
    await page.screenshot({ path: join(OUTPUT, '03-automatic-success.png'), fullPage: true });
    const order = await api(`/api/checkout/${orderId}`);
    assert.equal(order.status, 'paid');
    assert.ok(order.confirmationCode);
    result = {
      orderId,
      total: order.total,
      status: order.status,
      confirmationCode: order.confirmationCode,
      callback,
      returnOrigin: returnUrl.origin,
      usedRelay: false,
    };
    record(
      'NCB and OTP return automatically to the success screen after API isSuccess=true and paid order verification',
    );
    const replay = await api('/api/payments/vnpay/return' + callbackQuery);
    assert.deepEqual(replay, callback);
    assert.equal((await api(`/api/checkout/${orderId}`)).confirmationCode, order.confirmationCode);
    record('Replaying the real signed return keeps the same paid booking and confirmation');
    await view.expectPaid();
    await expect(page.getByText(order.confirmationCode, { exact: true })).toBeVisible();
    await page.screenshot({ path: join(OUTPUT, '04-app-paid.png'), fullPage: true });
    await view.button('Xem chuyến đi của tôi').click();
    await expect(page.getByText(`Mã xác nhận: ${order.confirmationCode}`, { exact: true })).toBeVisible();
    await page.screenshot({ path: join(OUTPUT, '05-trip.png'), fullPage: true });
    record('App displays the server confirmation and the real TF37 trips list contains the VNPay booking');
  } catch (error) {
    await page.screenshot({ path: join(OUTPUT, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await writeFile(
      join(OUTPUT, 'results.json'),
      JSON.stringify({ checks, errors, result, orderId }, null, 2),
    );
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
});
