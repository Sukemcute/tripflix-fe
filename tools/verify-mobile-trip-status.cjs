// Real mobile screen with isolated API fixtures; no real orders or payments.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-trip-status');
const baseline = process.env.CAPTURE_BASELINE === '1';
const now = new Date('2026-11-19T03:00:00Z');
const room = {
  id: 'room',
  productType: 'room',
  productName: 'Deluxe hướng vườn dành cho gia đình có ban công riêng',
  propertyName: 'Khách sạn Biển Xanh Nha Trang',
  propertyId: 'hotel',
  date: '2026-12-01',
  dateTo: '2026-12-03',
  nights: 2,
  qty: 1,
  lineTotal: 3000000,
  unitPrice: 1500000,
  ratePlanName: 'Linh hoạt',
  ratePlanCode: 'FLEX',
  isRefundable: true,
  freeCancelUntil: null,
  confirmationCode: null,
  childUnitPrice: null,
  infantUnitPrice: null,
};
const flight = {
  ...room,
  id: 'flight',
  productType: 'flight',
  propertyName: null,
  fromAirport: 'HAN',
  toAirport: 'CXR',
  productName: 'Bay Hà Nội – Nha Trang, Vietnam Airlines, hạng phổ thông',
  qty: 2,
  nights: 0,
};
const makeTrip = (orderId, patch = {}) => ({
  orderId,
  status: 'pending',
  total: 7500000,
  adults: 2,
  children: 0,
  infants: 0,
  confirmationCode: null,
  cancelReason: null,
  holdExpiresAt: '2026-11-19T03:10:00Z',
  createdAt: now.toISOString(),
  paidAt: null,
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  tripStatus: null,
  items: [
    room,
    flight,
    {
      ...flight,
      id: 'return',
      fromAirport: 'CXR',
      toAirport: 'HAN',
      productName: 'Bay Nha Trang – Hà Nội, Vietnam Airlines, hạng phổ thông',
    },
  ],
  ...patch,
});
const trips = [
  makeTrip('pending'),
  makeTrip('paying', { status: 'paying' }),
  makeTrip('paid', { status: 'paid', confirmationCode: 'TF-PAID', tripStatus: 'upcoming' }),
  makeTrip('completed', { status: 'paid', confirmationCode: 'TF-DONE', tripStatus: 'completed' }),
  makeTrip('expired', { status: 'expired' }),
  makeTrip('cancelled', { status: 'cancelled' }),
  makeTrip('refunded', { status: 'cancelled', confirmationCode: 'TF-REFUND' }),
  makeTrip('processing', { status: 'cancelled', confirmationCode: 'TF-PROCESS' }),
  makeTrip('review', { status: 'cancelled', confirmationCode: 'TF-REVIEW' }),
  makeTrip('refund-error', { status: 'cancelled', confirmationCode: 'TF-ERROR' }),
];
class TripsPage {
  constructor(page) {
    this.page = page;
  }
  tab(name) {
    return this.page.getByRole('tab', { name, exact: true });
  }
  card(id) {
    return this.page.getByTestId(`trip-${id}`);
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(output, name + '.png') });
  }
  async goto() {
    await this.page.goto(base + '/my-trips');
    await this.page.getByText('Khách sạn Biển Xanh Nha Trang', { exact: true }).first().waitFor();
  }
}
(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const checks = [],
    errors = [],
    writes = [];
  try {
    for (const width of [375, 390, 430]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      let mode = 'normal';
      const cursors = [];
      await context.route('**/api/**', (r) => {
        const req = r.request(),
          url = new URL(req.url()),
          path = url.pathname;
        if (
          !['GET', 'HEAD'].includes(req.method()) &&
          (path.startsWith('/api/checkout') || path.startsWith('/api/mock-gateway'))
        )
          writes.push(path);
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
                updatedAt: now.toISOString(),
              },
            },
          });
        if (path === '/api/checkout') {
          if (mode === 'error')
            return r.fulfill({ status: 503, json: { message: 'Không tải được chuyến đi. Thử lại.' } });
          const cursor = url.searchParams.get('cursor');
          if (cursor) cursors.push(cursor);
          return r.fulfill({
            json: {
              trips:
                mode === 'edge'
                  ? [
                      makeTrip('unknown-hold', {
                        holdExpiresAt: 'invalid',
                        startDate: null,
                        endDate: null,
                        items: [],
                      }),
                      makeTrip('hotel-only', { status: 'paid', confirmationCode: 'TF-HOTEL', items: [room] }),
                      makeTrip('flight-only', {
                        status: 'paid',
                        confirmationCode: 'TF-FLIGHT',
                        items: [flight],
                      }),
                      makeTrip('multi-hotel', {
                        status: 'paid',
                        items: [
                          room,
                          {
                            ...room,
                            id: 'room-two',
                            propertyName: 'Khu nghỉ dưỡng Vườn Nắng có tên dài dành cho gia đình bên bờ biển',
                          },
                        ],
                      }),
                    ]
                  : mode === 'empty'
                    ? []
                    : mode === 'pagination'
                      ? cursor
                        ? [trips[0]]
                        : [trips[4]]
                      : trips,
              nextCursor: mode === 'pagination' && !cursor ? 'next-page' : null,
            },
          });
        }
        if (path.startsWith('/api/checkout/')) {
          const id = path.split('/').pop(),
            trip = trips.find((t) => t.orderId === id) || trips[0];
          if (id === 'refund-error')
            return r.fulfill({ status: 503, json: { message: 'Không tải được thông tin hoàn tiền.' } });
          const refundStatus =
            id === 'refunded' ? 'refunded' : id === 'processing' ? 'processing' : 'needs_review';
          return r.fulfill({
            json: {
              ...trip,
              refund:
                trip.confirmationCode && trip.status === 'cancelled'
                  ? {
                      status: refundStatus,
                      amount: 6500000,
                      feeAmount: 1000000,
                      method: 'mock',
                      bankCode: null,
                      refundedAt: null,
                    }
                  : null,
              policyVersion: 'qa-v1',
              isGuestInfoComplete: false,
              passengersRequired: 0,
              passengerTypes: [],
            },
          });
        }
        return r.fulfill({ json: { items: [], nextCursor: null, unreadCount: 0 } });
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.clock.install({ time: now });
      const ui = new TripsPage(page);
      if (baseline) {
        await page.goto(base + '/my-trips');
        await page.getByText(room.productName, { exact: false }).first().waitFor();
        await ui.snapshot(`before-trips-${width}`);
      } else {
        await ui.goto();
        await ui.card('pending').getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).waitFor();
        const payButton = await ui
          .card('pending')
          .getByRole('button', { name: 'Tiếp tục thanh toán', exact: true })
          .boundingBox();
        assert(payButton.height >= 44);
        const beforeTime = /\n(\d+):(\d{2})\n/.exec(await ui.card('pending').innerText());
        assert(beforeTime, 'countdown is visible');
        const beforeSeconds = Number(beforeTime[1]) * 60 + Number(beforeTime[2]);
        assert(beforeSeconds > 540 && beforeSeconds <= 600);
        const cardColors = await ui
          .card('pending')
          .evaluate((node) => ({
            background: getComputedStyle(node).backgroundColor,
            radius: getComputedStyle(node).borderTopLeftRadius,
            border: getComputedStyle(node).borderTopWidth,
          }));
        assert.notEqual(
          cardColors.background,
          'rgb(255, 255, 255)',
          'pending card has a distinct brand surface',
        );
        assert.equal(cardColors.radius, '10px');
        assert.equal(cardColors.border, '0px');
        const tabBoxes = await page
          .getByRole('tab')
          .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().toJSON()));
        assert(tabBoxes.every((box) => box.height >= 48));
        assert(
          tabBoxes.every((box) => box.y === tabBoxes[0].y),
          'filters share one row',
        );
        assert.equal(await ui.card('paid').count(), 0);
        await ui.snapshot(`after-trips-${width}`);
        await page.clock.runFor(2000);
        const afterTime = /\n(\d+):(\d{2})\n/.exec(await ui.card('pending').innerText());
        assert(Number(afterTime[1]) * 60 + Number(afterTime[2]) <= beforeSeconds - 2, 'countdown advances');
        await ui.card('pending').getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).click();
        await page.waitForURL('**/checkout?id=pending');
        await page.goto(base + '/my-trips');
        await ui.tab('Sắp đi').click();
        await ui.card('paid').getByText('TF-PAID', { exact: true }).waitFor();
        await ui.snapshot(`paid-${width}`);
        await ui.card('paid').getByRole('button', { name: 'Xem thông tin đặt chỗ', exact: true }).click();
        await page.waitForURL('**/booking/paid');
        await page.goto(base + '/my-trips');
        await ui.tab('Đã đi').click();
        await ui.card('completed').waitFor();
        assert.equal(
          await ui.card('paid').count(),
          0,
          'server tripStatus controls completed, not device date',
        );
        await ui.tab('Đã hủy').click();
        await ui.card('refunded').getByText('Đã hoàn tiền', { exact: true }).waitFor();
        assert.match(await ui.card('refunded').innerText(), /6\.500\.000đ/);
        await ui.card('processing').getByText('Đang hoàn tiền', { exact: true }).waitFor();
        await ui.card('review').getByText('Hoàn tiền cần kiểm tra', { exact: true }).waitFor();
        await ui
          .card('refund-error')
          .getByText('Chưa tải được tình trạng hoàn tiền. Mở chi tiết đơn để kiểm tra.', { exact: true })
          .waitFor();
        assert.equal(
          await ui.card('expired').getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).count(),
          0,
        );
        await ui.card('refunded').scrollIntoViewIfNeeded();
        await ui.snapshot(`refunded-${width}`);
        await ui
          .card('refunded')
          .getByRole('button', { name: 'Xem chi tiết hoàn tiền', exact: true })
          .click();
        await page.waitForURL('**/booking/refunded');
        await page.goto(base + '/my-trips');
        await ui.tab('Cần xử lý').click();
        await page.clock.fastForward(600000);
        assert.equal(await ui.card('pending').count(), 0, 'expired hold leaves actionable tab');
        await ui.tab('Đã hủy').click();
        await ui.card('pending').getByText('Hết thời hạn giữ chỗ', { exact: true }).waitFor();
        assert.equal(
          await ui.card('pending').getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).count(),
          0,
        );
        await ui.card('pending').scrollIntoViewIfNeeded();
        await ui.snapshot(`elapsed-hold-${width}`);
        await ui.tab('Cần xử lý').click();
        await ui.card('paying').getByRole('button', { name: 'Kiểm tra đơn thanh toán', exact: true }).click();
        await page.waitForURL('**/booking/paying');
        await page.goto(base + '/my-trips');
        const underlines = await page
          .getByRole('tab')
          .evaluateAll(
            (nodes) =>
              nodes.filter(
                (n) =>
                  getComputedStyle(n).borderBottomWidth !== '0px' ||
                  getComputedStyle(n).textDecorationLine.includes('underline'),
              ).length,
          );
        assert.equal(underlines, 0);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        // Fresh contexts are unnecessary: a full reload recreates the query client for each fixture mode.
        mode = 'empty';
        await page.reload();
        await page.getByText('Chưa có đơn cần xử lý', { exact: true }).waitFor();
        await ui.snapshot(`empty-${width}`);
        mode = 'error';
        await page.reload();
        await page.getByText('Không tải được chuyến đi. Thử lại.', { exact: true }).first().waitFor();
        await ui.snapshot(`error-${width}`);
        mode = 'pagination';
        await page.reload();
        const nextPage = page.waitForResponse(
          (response) => new URL(response.url()).searchParams.get('cursor') === 'next-page',
        );
        await page.getByRole('button', { name: 'Xem thêm', exact: true }).click();
        await nextPage;
        assert(cursors.includes('next-page'), 'cursor pagination requests next page');
        await ui.tab('Đã hủy').click();
        await ui.card('expired').waitFor();
        if (width === 390) {
          mode = 'edge';
          await page.reload();
          await ui
            .card('unknown-hold')
            .getByText('Chưa xác nhận thời hạn giữ chỗ. Mở chi tiết đơn để kiểm tra.', { exact: true })
            .waitFor();
          assert.equal(
            await ui
              .card('unknown-hold')
              .getByRole('button', { name: 'Tiếp tục thanh toán', exact: true })
              .count(),
            0,
          );
          await ui.tab('Sắp đi').click();
          await ui
            .card('hotel-only')
            .getByRole('heading', { name: room.propertyName, exact: true })
            .waitFor();
          await ui.card('flight-only').getByRole('heading', { name: 'HAN → CXR', exact: true }).waitFor();
          await ui.card('multi-hotel').getByText('+1 nơi lưu trú khác', { exact: true }).waitFor();
          await page.evaluate(() =>
            document.querySelectorAll('[dir="auto"]').forEach((node) => {
              const style = getComputedStyle(node);
              node.style.fontSize = parseFloat(style.fontSize) * 1.4 + 'px';
              node.style.lineHeight = parseFloat(style.lineHeight) * 1.4 + 'px';
            }),
          );
          await ui
            .card('hotel-only')
            .getByRole('button', { name: 'Xem thông tin đặt chỗ', exact: true })
            .scrollIntoViewIfNeeded();
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await ui.snapshot('large-text-browser-preview');
          await page.setViewportSize({ width: 844, height: 390 });
          await page.reload();
          await ui.tab('Sắp đi').click();
          const landscapeAction = ui
            .card('hotel-only')
            .getByRole('button', { name: 'Xem thông tin đặt chỗ', exact: true });
          await landscapeAction.scrollIntoViewIfNeeded();
          const box = await landscapeAction.boundingBox();
          assert(box.y >= 0 && box.y + box.height <= 390, 'landscape CTA is reachable above viewport edge');
          await ui.snapshot('landscape-browser-preview');
          await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
          await page.setViewportSize({ width: 768, height: 1024 });
          await page.reload();
          await ui.tab('Sắp đi').click();
          await ui.card('hotel-only').waitFor();
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await ui.snapshot('tablet-reduced-motion-dark-system');
        }
        checks.push({
          width,
          states: [
            'pending',
            'paying',
            'paid',
            'completed',
            'expired',
            'cancelled',
            'refunded',
            'processing',
            'needs_review',
            'refund_error',
            'empty',
            'error',
            'pagination',
          ],
          countdown: true,
          navigation: true,
          overflow: false,
          edgeCasesAndLargeText: width === 390,
          landscapeTabletReducedMotion: width === 390,
        });
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, [], 'read-only journeys never mutate orders');
    await writeFile(
      join(output, baseline ? 'baseline.json' : 'qa-results.json'),
      JSON.stringify({ passed: true, previewOnly: true, checks, errors, writes }, null, 2),
    );
    console.log(JSON.stringify({ passed: true, checks, errors, writes }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
