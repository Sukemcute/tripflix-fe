// Real mobile routes with read-only auth/profile/order/draft fixtures.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-profile-ui');
const baseline = process.env.CAPTURE_BASELINE === '1';
const draft = {
  id: 'qa-draft',
  authorId: 'qa-member',
  postType: 'vlog',
  title: 'Ba ngày săn mây ở Đà Lạt',
  body: 'Những chỗ mình muốn kể tiếp.',
  status: 'draft',
  visibility: 'private',
  hashtags: [],
  mediaIds: [],
  coverMediaId: null,
  images: [],
  tripAttachment: null,
  reactionCounts: {},
  reactionTotal: 0,
  commentCount: 0,
  shareCount: 0,
  bookmarkCount: 0,
  publishedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
  isVerified: false,
};
const trip = {
  orderId: 'qa-pending',
  status: 'pending',
  holdExpiresAt: new Date(Date.now() + 1200000).toISOString(),
  total: 4500000,
  adults: 2,
  children: 0,
  infants: 0,
  confirmationCode: null,
  cancelReason: null,
  tripStatus: null,
  createdAt: new Date().toISOString(),
  paidAt: null,
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  items: [
    {
      id: 'room',
      productType: 'room',
      productName: 'Phòng hướng biển',
      propertyName: 'Khách sạn Biển Xanh',
      date: '2026-12-01',
      dateTo: '2026-12-03',
      qty: 1,
      nights: 2,
      unitPrice: 2250000,
      lineTotal: 4500000,
      ratePlanName: 'Linh hoạt',
      isRefundable: false,
    },
  ],
};
class ProfilePage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  async goto(path = '/me') {
    await this.page.goto(base + path);
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.screenshot({ path: join(output, name + '.png') });
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
      let mode = 'normal',
        member = true;
      const privateReads = [];
      await context.route('**/api/**', (r) => {
        const req = r.request(),
          url = new URL(req.url()),
          path = url.pathname;
        if (
          !['GET', 'HEAD'].includes(req.method()) &&
          (path.startsWith('/api/checkout') ||
            path.startsWith('/api/v1/me/posts') ||
            /\/api\/v1\/posts\/[^/]+/.test(path))
        )
          writes.push(path);
        if (path === '/api/auth/refresh')
          return r.fulfill(
            member
              ? { json: { accessToken: 'qa-token', tokenType: 'Bearer', expiresIn: 900 } }
              : { status: 401, json: { message: 'Unauthorized' } },
          );
        if (path === '/api/auth/me')
          return r.fulfill(
            member
              ? {
                  json: {
                    id: 'qa-member',
                    email: 'an@example.test',
                    displayName:
                      mode === 'long' ? 'Nguyễn Hoàng Minh Anh yêu những hành trình rất dài' : 'Nguyễn An',
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
                }
              : { status: 401, json: {} },
          );
        if (path.endsWith('/profile'))
          return r.fulfill({
            json: {
              id: path.split('/').at(-2),
              displayName:
                mode === 'long' ? 'Nguyễn Hoàng Minh Anh yêu những hành trình rất dài' : 'Nguyễn An',
              followingCount: 12,
              followerCount: 37,
              likeCount: 128,
            },
          });
        if (path.endsWith('/follow')) return r.fulfill({ json: { isFollowing: false } });
        if (
          path === '/api/checkout' ||
          (path === '/api/v1/me/posts' && url.searchParams.get('status') === 'draft')
        ) {
          privateReads.push(path);
          if (mode === 'error') return r.fulfill({ status: 503, json: { message: 'Unavailable' } });
          if (path === '/api/checkout')
            return r.fulfill({
              json: {
                trips: ['empty', 'long'].includes(mode)
                  ? []
                  : [
                      mode === 'expired'
                        ? { ...trip, holdExpiresAt: '2020-01-01T00:00:00Z' }
                        : mode === 'paying'
                          ? { ...trip, status: 'paying' }
                          : trip,
                    ],
                nextCursor: null,
              },
            });
          return r.fulfill({
            json: { items: ['empty', 'long'].includes(mode) ? [] : [draft], nextCursor: null },
          });
        }
        if (path === '/api/v1/posts/qa-draft')
          return r.fulfill({
            json: { post: draft, viewerContext: { isAuthor: true }, shareUrl: 'https://example.test/draft' },
          });
        if (path === '/api/checkout/qa-pending')
          return r.fulfill({
            json: {
              ...trip,
              isGuestInfoComplete: false,
              passengersRequired: 0,
              passengerTypes: [],
              policyVersion: 'qa-v1',
            },
          });
        return r.fulfill({ json: { items: [], nextCursor: null, unreadCount: 0 } });
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      const ui = new ProfilePage(page);
      await ui.goto();
      await page.getByRole('heading', { name: 'Nguyễn An', exact: true }).last().waitFor();
      await ui.snapshot(`${baseline ? 'before' : 'after'}-profile-${width}`);
      if (baseline) {
        await ui.goto('/settings');
        await ui.button('Chuyến đi của tôi').waitFor();
        await ui.snapshot(`before-settings-${width}`);
      } else {
        await ui.button('Tiếp tục thanh toán').waitFor();
        await ui.button('Viết tiếp bản nháp').waitFor();
        const styles = await page.getByTestId('profile-pending').evaluate((node) => ({
          radius: getComputedStyle(node).borderTopLeftRadius,
          topBorder: getComputedStyle(node).borderTopWidth,
          background: getComputedStyle(node).backgroundColor,
        }));
        assert.equal(styles.radius, '10px');
        assert.equal(styles.topBorder, '0px');
        assert.notEqual(styles.background, 'rgb(255, 255, 255)');
        assert.equal(await ui.button('Xem đơn và vé').count(), 1);
        assert.equal(await ui.button('Xem nội dung đã lưu').count(), 1);
        await ui.button('Tiếp tục thanh toán').click();
        await page.waitForURL('**/checkout?id=qa-pending');
        await ui.goto();
        await ui.button('Viết tiếp bản nháp').click();
        await page.waitForURL('**/create?postId=qa-draft');
        await ui.goto();
        await ui.button('Xem đơn và vé').click();
        await page.waitForURL('**/my-trips');
        await ui.goto();
        await ui.button('Xem nội dung đã lưu').click();
        await page.waitForURL('**/saved');
        await ui.goto();
        await page.getByRole('tab', { name: 'Bài viết', exact: true }).click();
        await page.getByRole('tab', { name: 'Đang kiểm tra', exact: true }).click();
        const tabBoxes = await page
          .getByRole('tablist', { name: 'Bạn đã chia sẻ', exact: true })
          .getByRole('tab')
          .evaluateAll((nodes) =>
            nodes.map((n) => ({
              height: n.getBoundingClientRect().height,
              border: getComputedStyle(n).borderBottomWidth,
              underline: getComputedStyle(n).textDecorationLine,
            })),
          );
        assert.equal(tabBoxes.length, 3);
        assert(
          tabBoxes.every((b) => b.height >= 48 && b.border === '0px' && !b.underline.includes('underline')),
        );
        await ui.goto('/settings');
        await ui.button('Cài đặt tài khoản').waitFor();
        assert.equal(await ui.button('Chuyến đi của tôi').count(), 0);
        assert.equal(await ui.button('Chuyến đi đã lưu').count(), 0);
        await ui.snapshot(`after-settings-${width}`);
        await ui.button('Gu du lịch').click();
        await page.waitForURL('**/onboarding?mode=edit');
        mode = 'paying';
        await ui.goto();
        await ui.button('Kiểm tra đơn').click();
        await page.waitForURL('**/booking/qa-pending');
        mode = 'empty';
        await ui.goto();
        await ui.button('Xem đơn và vé').waitFor();
        assert.equal(await ui.button('Tiếp tục thanh toán').count(), 0);
        assert.equal(await ui.button('Viết tiếp bản nháp').count(), 0);
        await ui.snapshot(`empty-profile-${width}`);
        mode = 'expired';
        await page.reload();
        await ui.button('Viết tiếp bản nháp').waitFor();
        assert.equal(await ui.button('Tiếp tục thanh toán').count(), 0);
        mode = 'error';
        await page.reload();
        await page.getByText('Chưa tải được đơn gần đây.', { exact: true }).waitFor();
        await page.getByText('Chưa tải được bản nháp.', { exact: true }).waitFor();
        await ui.snapshot(`error-profile-${width}`);
        mode = 'long';
        await page.reload();
        await page
          .getByRole('heading', { name: 'Nguyễn Hoàng Minh Anh yêu những hành trình rất dài', exact: true })
          .last()
          .waitFor();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (width === 390) {
          await page.setViewportSize({ width: 844, height: 390 });
          await ui.button('Xem nội dung đã lưu').scrollIntoViewIfNeeded();
          await ui.snapshot('landscape-profile');
          await ui.button('Xem nội dung đã lưu').click();
          await page.waitForURL('**/saved');
          await ui.goto();
          await page.setViewportSize({ width: 390, height: 844 });
          await page.evaluate(() =>
            document.querySelectorAll('[dir="auto"]').forEach((node) => {
              const style = getComputedStyle(node);
              node.style.fontSize = parseFloat(style.fontSize) * 1.4 + 'px';
              node.style.lineHeight = parseFloat(style.lineHeight) * 1.4 + 'px';
            }),
          );
          await ui.button('Xem nội dung đã lưu').scrollIntoViewIfNeeded();
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await ui.snapshot('large-text-profile');
          await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
          await page.setViewportSize({ width: 768, height: 1024 });
          await page.reload();
          await ui.button('Xem đơn và vé').waitFor();
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await ui.snapshot('tablet-reduced-motion-dark-system-profile');
          await page.setViewportSize({ width, height: 844 });
        }
        const beforePublic = privateReads.length;
        await ui.goto('/user/qa-other');
        await page.getByRole('heading').last().waitFor();
        await ui.button('Theo dõi').waitFor();
        assert(await ui.button('Theo dõi').isEnabled());
        assert.equal(await ui.button('Xem đơn và vé').count(), 0);
        assert.equal(
          privateReads.length,
          beforePublic,
          'other public profile never reads private orders/drafts',
        );
        member = false;
        await ui.goto();
        await ui.button('Đăng nhập / Đăng ký').waitFor();
        const beforeGuest = privateReads.length;
        await ui.snapshot(`guest-profile-${width}`);
        await ui.button('Xem nội dung đã lưu').click();
        await page.waitForURL(
          (url) => url.pathname === '/login' && url.searchParams.get('returnTo') === '/saved',
        );
        assert.equal(privateReads.length, beforeGuest);
        checks.push({
          width,
          navigation: true,
          pendingDraftEmptyErrorGuestPublic: true,
          states: [
            'member',
            'guest',
            'pending',
            'paying',
            'expired',
            'draft',
            'empty',
            'orders_error',
            'draft_error',
            'long_name',
            'public_profile',
          ],
          landscapeLargeTextTabletReducedMotion: width === 390,
          overflow: false,
        });
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
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
