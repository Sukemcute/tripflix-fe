// Real checkout UI, isolated auth/order/payment fixtures. No real order or charge is created.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-checkout-ui');
const baseline = process.env.CAPTURE_BASELINE === '1';
const date = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const propertyA = 'Khách sạn Biển Xanh dành cho kỳ nghỉ gia đình';
const propertyB = 'Khu nghỉ dưỡng Vườn Nắng bên bờ biển Nha Trang';
const roomName = 'Phòng Gia đình hướng biển với ban công riêng';
const item = (patch) => ({
  id: 'stay-1',
  productType: 'room',
  productId: 'qa-room',
  productName: roomName,
  propertyName: propertyA,
  propertyId: 'qa-hotel',
  date: date(14),
  dateTo: date(16),
  nights: 2,
  qty: 1,
  unitPrice: 1500000,
  lineTotal: 3000000,
  ratePlanCode: 'FLEX',
  ratePlanName: 'Gói linh hoạt gồm bữa sáng',
  isRefundable: true,
  freeCancelUntil: date(11) + 'T00:00:00Z',
  childUnitPrice: null,
  infantUnitPrice: null,
  confirmationCode: null,
  ...patch,
});
// Product type is the API enum, not the cart's hotel request type.
const items = [
  item({}),
  item({
    id: 'stay-2',
    propertyName: propertyB,
    propertyId: 'qa-hotel-2',
    date: date(16),
    dateTo: date(17),
    nights: 1,
    productName: 'Phòng hướng vườn',
    lineTotal: 1500000,
    isRefundable: false,
    freeCancelUntil: null,
  }),
  item({
    id: 'flight-1',
    productType: 'flight',
    propertyName: null,
    productName: 'Vietnam Airlines VN 123 — Phổ thông',
    fromAirport: 'HAN',
    toAirport: 'CXR',
    date: date(14),
    dateTo: date(14),
    nights: 0,
    qty: 2,
    lineTotal: 4000000,
    isRefundable: false,
    freeCancelUntil: null,
  }),
  item({
    id: 'flight-2',
    productType: 'flight',
    propertyName: null,
    productName: 'Vietnam Airlines VN 456 — Phổ thông',
    fromAirport: 'CXR',
    toAirport: 'HAN',
    date: date(17),
    dateTo: date(17),
    nights: 0,
    qty: 2,
    lineTotal: 4000000,
    isRefundable: false,
    freeCancelUntil: null,
  }),
];
class CheckoutPage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  async goto() {
    await this.page.goto(base + '/checkout?id=qa-order');
    await this.page.getByText(roomName, { exact: true }).first().waitFor();
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
      let hotelOnly = false,
        expired = false,
        status = 'pending';
      const requests = [];
      await context.route('**/api/**', (r) => {
        const req = r.request(),
          path = new URL(req.url()).pathname;
        if (path === '/api/auth/refresh')
          return r.fulfill({ json: { accessToken: 'qa-token', tokenType: 'Bearer', expiresIn: 900 } });
        if (path === '/api/auth/me')
          return r.fulfill({
            json: {
              id: 'qa-member',
              email: 'an@example.test',
              displayName: 'Nguyễn An',
              role: 'member',
              emailVerified: true,
              dateOfBirth: '1995-01-01',
              gender: 'female',
              nationality: 'VN',
              travelPreferences: {
                status: 'completed',
                interests: [],
                regions: [],
                budgetLevels: [],
                updatedAt: new Date().toISOString(),
              },
            },
          });
        if (path === '/api/mock-gateway/test-cards')
          return r.fulfill({
            json: [{ number: '4000000000003220', label: 'Thẻ kiểm thử OTP', outcome: 'requires_action' }],
          });
        if (path === '/api/mock-gateway/tokens') {
          assert.equal(req.postDataJSON().cardNumber, '4000000000003220');
          return r.fulfill({ json: { paymentToken: 'qa-payment-token' } });
        }
        if (path === '/api/checkout/qa-order/guests') {
          requests.push({ path, body: req.postDataJSON() });
          return r.fulfill({ json: {} });
        }
        if (path === '/api/checkout/qa-order/pay') {
          requests.push({ path, body: req.postDataJSON() });
          status = 'paying';
          return r.fulfill({
            json: { outcome: 'requires_action', orderId: 'qa-order', challengeId: 'qa-challenge' },
          });
        }
        if (path === '/api/checkout/qa-order') {
          const chosen = hotelOnly ? items.slice(0, 2) : items;
          return r.fulfill({
            json: {
              orderId: 'qa-order',
              status: expired ? 'expired' : status,
              holdExpiresAt: new Date(Date.now() + (expired ? -60000 : 1200000)).toISOString(),
              total: chosen.reduce((sum, i) => sum + i.lineTotal, 0),
              adults: 2,
              children: 0,
              infants: 0,
              confirmationCode: null,
              cancelReason: null,
              items: chosen,
              isGuestInfoComplete: false,
              passengersRequired: hotelOnly ? 0 : 2,
              passengerTypes: hotelOnly ? [] : ['adult', 'adult'],
              policyVersion: 'qa-policy-v1',
            },
          });
        }
        return r.fulfill({ json: { items: [], nextCursor: null, unreadCount: 0 } });
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      const ui = new CheckoutPage(page);
      await ui.goto();
      await ui.snapshot(`${baseline ? 'before' : 'after'}-checkout-${width}`);
      await ui.noOverflow();
      if (!baseline) {
        await page.getByText(propertyA, { exact: true }).waitFor();
        await page.getByText(propertyB, { exact: true }).waitFor();
        await page.getByText('HAN → CXR', { exact: true }).waitFor();
        await page.getByText('CXR → HAN', { exact: true }).waitFor();
        assert.equal(
          await page.getByText('12.500.000đ', { exact: true }).count(),
          1,
          'grand total appears once in pending checkout',
        );
        await ui.button('Xem phòng, gói giá và điều kiện').click();
        await page.getByText('Gói linh hoạt gồm bữa sáng', { exact: false }).first().waitFor();
        await ui.snapshot(`expanded-summary-${width}`);
        await ui.button('Thu gọn chi tiết').click();
        await page.getByRole('tab', { name: 'VNPay', exact: true }).click();
        await page.getByRole('tab', { name: 'Thẻ giả lập', exact: true }).click();
        assert.equal(
          await page
            .locator('[dir="auto"]')
            .evaluateAll(
              (nodes) =>
                nodes.filter((node) => getComputedStyle(node).textDecorationLine.includes('underline'))
                  .length,
            ),
          0,
        );
        await page.getByRole('checkbox').click();
        await page.getByRole('button', { name: /Thẻ kiểm thử OTP/ }).click();
        await ui.button('Thanh toán').click();
        await page.getByText('Nhập họ tên người liên hệ.', { exact: true }).waitFor();
        const firstError = page.getByText('Nhập họ tên người liên hệ.', { exact: true });
        await firstError.scrollIntoViewIfNeeded();
        const errorBox = await firstError.boundingBox(),
          footerBox = await ui.button('Thanh toán').locator('..').locator('..').boundingBox();
        assert(
          errorBox.y + errorBox.height <= footerBox.y + 1,
          'field error remains reachable above payment footer',
        );
        assert.equal(requests.length, 0, 'invalid form never sends guest/payment request');
        await ui.snapshot(`form-errors-${width}`);
        hotelOnly = true;
        await ui.goto();
        await page.getByLabel('Họ và tên', { exact: true }).fill('Nguyễn An');
        await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
        await page.getByLabel('Email (tuỳ chọn)', { exact: true }).fill('an@example.test');
        await page.getByRole('checkbox').click();
        await page.getByRole('button', { name: /Thẻ kiểm thử OTP/ }).click();
        await ui.snapshot(`filled-form-${width}`);
        if (width === 390) {
          await page.evaluate(() => {
            for (const node of document.querySelectorAll('[dir="auto"]')) {
              const style = getComputedStyle(node);
              node.style.fontSize = parseFloat(style.fontSize) * 1.4 + 'px';
              node.style.lineHeight = parseFloat(style.lineHeight) * 1.4 + 'px';
            }
          });
          await ui.noOverflow();
          await ui.snapshot('large-text-browser-preview');
        }
        await ui.button('Thanh toán').click();
        await page.getByLabel('Mã OTP', { exact: true }).waitFor();
        assert.equal(requests.length, 2);
        assert.equal(requests[0].body.contact.fullName, 'Nguyễn An');
        assert.equal(requests[0].body.contact.phone, '0901234567');
        assert.equal(requests[0].body.contact.email, 'an@example.test');
        assert.deepEqual(requests[0].body.guests, []);
        assert.equal(requests[1].body.expectedTotal, 4500000);
        assert.equal(requests[1].body.acceptedPolicyVersion, 'qa-policy-v1');
        assert.equal(requests[1].body.paymentToken, 'qa-payment-token');
        assert.equal(
          await page.getByText('OTP kiểm thử: 123456', { exact: true }).count(),
          1,
          'OTP hint is not duplicated',
        );
        assert.equal(
          await page.getByText('4.500.000đ', { exact: true }).count(),
          1,
          'OTP retains the order amount without a payment footer',
        );
        await ui.snapshot(`otp-${width}`);
        await ui.noOverflow();
        if (width === 390) {
          expired = true;
          await ui.goto();
          assert.equal(await ui.button('Thanh toán').count(), 0);
          await ui.snapshot('expired-order');
          await ui.noOverflow();
        }
        checks.push(
          `${width}px: two hotels/two flight legs identifiable, summary expand/collapse, total not duplicated, method switch, inline errors block requests, filled hotel-only form preserves guest/payment payload, OTP and expired state`,
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
      nativeOrRealPaymentTested: false,
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
