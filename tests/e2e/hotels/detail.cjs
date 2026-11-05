const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const { HotelPage } = require('../../pages/hotel-page.cjs');
const WEB = process.env.WEB_PREVIEW_URL || 'http://localhost:3100';
const OUTPUT = process.env.HOTEL_EVIDENCE_DIR || join(tmpdir(), 'tripflix-hotel-detail');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(WEB).hostname));

(async () => {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  });
  const checks = [];
  const check = (name) => {
    checks.push(name);
    process.stdout.write(`PASS ${name}\n`);
  };
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      const view = new HotelPage(page, WEB);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await view.visit('/search?q=Nha%20Trang');
      await page.getByRole('button', { name: 'Nha Trang', exact: true }).click();
      await view.click('Tìm phòng trống');
      const choose = page.getByRole('link', { name: 'Chọn phòng', exact: true }).first();
      await expect(choose).toBeVisible();
      const target = new URL(await choose.getAttribute('href'), WEB);
      const reviewsResponse = page.waitForResponse(
        (response) => new URL(response.url()).pathname.endsWith('/reviews') && response.status() === 200,
      );
      await choose.click();
      const reviews = await (await reviewsResponse).json();
      await expect(page).toHaveURL(target.href);
      await expect(view.section('rooms').getByRole('article').first()).toBeVisible();
      await expect(view.heading('Một chút về nơi bạn sẽ ở')).toBeVisible();
      await expect(view.heading('Tiện ích & dịch vụ')).toBeVisible();
      await expect(view.heading('Chính sách')).toBeVisible();
      check(`${width}px: search opens hotel with selected dates and complete sections`);
      const image = page.locator('main > div button img').first();
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0))
        .toBe(true);
      await image.click();
      await expect(page.getByRole('dialog').first()).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog').first()).not.toBeVisible();
      check(`${width}px: CloudFront image and keyboard-accessible photo viewer`);
      await view.section('reviews').scrollIntoViewIfNeeded();
      await expect(view.section('reviews').getByRole('article')).toHaveCount(reviews.items.length);
      const filtered = await view.waitForReviews(
        () => view.chooseFilter('Số sao', '5'),
        (params) => params.get('rating') === '5',
      );
      assert.ok(filtered.items.every((review) => review.rating === 5));
      await expect(view.section('reviews').getByRole('article')).toHaveCount(filtered.items.length);
      const helpful = await view.waitForReviews(
        () => view.chooseFilter('Sắp xếp', 'helpful'),
        (params) => params.get('sort') === 'helpful',
      );
      assert.ok(
        helpful.items.every(
          (review, index) => index === 0 || helpful.items[index - 1].helpfulCount >= review.helpfulCount,
        ),
      );
      if (helpful.total > 5) {
        const next = await view.waitForReviews(
          () => view.section('reviews').getByRole('button', { name: 'Tiếp', exact: true }).click(),
          (params) => params.get('page') === '2',
        );
        assert.equal(next.page, 2);
        await expect(view.section('reviews').getByText(/Trang 2/)).toBeVisible();
      }
      check(`${width}px: star filter, helpful sorting and pagination match real API`);
      const family = await view.waitForReviews(
        () => view.chooseFilter('Loại khách', 'family'),
        (params) => params.get('travelerType') === 'family' && params.get('page') === '1',
      );
      assert.ok(family.items.every((review) => review.travelerType === 'family'));
      check(`${width}px: changing filters resets pagination`);
      if (family.summary.tags.length) {
        const tag = family.summary.tags[0].tag;
        const chip = view.section('reviews').getByRole('button').filter({ hasText: tag }).first();
        const tagged = await view.waitForReviews(
          () => chip.click(),
          (params) => params.get('tag') === tag && params.get('page') === '1',
        );
        assert.ok(tagged.items.every((review) => review.tags.includes(tag)));
        if (!tagged.items.length)
          await expect(
            view.section('reviews').getByText('Không có đánh giá phù hợp với bộ lọc.', { exact: true }),
          ).toBeVisible();
        check(`${width}px: topic chips filter reviews against the real API`);
      }
      await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.screenshot({ path: join(OUTPUT, `hotel-${width}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      check(`${width}px: no horizontal overflow or uncaught browser errors`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const view = new HotelPage(page, WEB);
    await view.visit('/search?q=Vinpearl');
    const hotelChoice = page.getByRole('button', { name: /Vinpearl/ }).first();
    await expect(hotelChoice).toBeVisible();
    await hotelChoice.click();
    await view.click('Tìm phòng trống');
    await expect(page).toHaveURL(/\/hotels\//);
    await expect(view.section('rooms')).toBeVisible();
    check('Selecting a hotel suggestion opens its detail directly');
    await view.visit('/hotels/P-h-nt-01');
    await expect(view.section('rooms').getByRole('article').first()).toBeVisible();
    const hotelResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/hotels/P-h-nt-01' &&
        new URL(response.url()).searchParams.get('adults') === '3',
    );
    await page.getByLabel('Số khách', { exact: true }).fill('3');
    await view.click('Cập nhật giá');
    const updated = await (await hotelResponse).json();
    assert.equal(updated.stay.adults, 3);
    await expect(page).toHaveURL(/adults=3/);
    await expect(view.section('rooms').getByText(/3 khách/)).toBeVisible();
    check('Updating stay refreshes live room prices and URL');
    await view.visit('/hotels/not-a-real-hotel');
    await expect(view.heading('Không tìm thấy khách sạn này.')).toBeVisible({ timeout: 20000 });
    check('Unknown hotel has a recoverable not-found state');
    await page.close();

    const emptyPage = await browser.newPage();
    const emptyView = new HotelPage(emptyPage, WEB);
    await emptyPage.route('**/api/hotels/P-h-nt-01?*', async (route) => {
      const response = await route.fetch();
      const hotel = await response.json();
      await route.fulfill({
        json: {
          ...hotel,
          address: null,
          location: null,
          rating: null,
          description: null,
          highlights: [],
          nearby: [],
          amenities: [],
          languages: [],
          facts: {},
          policies: {},
          checkInTime: null,
          checkOutTime: null,
          images: [],
          thumbnail: null,
          rooms: [],
        },
      });
    });
    await emptyView.visit('/hotels/P-h-nt-01');
    await expect(emptyPage.getByText('Chưa có loại phòng nào được công bố.', { exact: true })).toBeVisible();
    for (const heading of [
      'Một chút về nơi bạn sẽ ở',
      'Điểm nổi bật',
      'Khám phá xung quanh',
      'Tiện ích nổi bật',
      'Tiện ích & dịch vụ',
      'Chính sách',
    ]) {
      await expect(emptyView.heading(heading)).toHaveCount(0);
    }
    check('Null and empty hotel details hide their sections');
    await emptyPage.close();

    const retryPage = await browser.newPage();
    const retryView = new HotelPage(retryPage, WEB);
    let hasReviewError = true;
    await retryPage.route('**/api/hotels/P-h-nt-01/reviews?*', async (route) => {
      if (hasReviewError)
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unavailable' }),
        });
      else await route.continue();
    });
    await retryView.visit('/hotels/P-h-nt-01');
    const retry = retryView.section('reviews').getByRole('button', { name: 'Thử lại', exact: true });
    await expect(retry).toBeVisible({ timeout: 20000 });
    hasReviewError = false;
    await retry.click();
    await expect(retryView.section('reviews').getByRole('article')).toHaveCount(5);
    await expect(retry).toHaveCount(0);
    check('Review API failure can be retried without losing hotel content');
    await retryPage.close();

    const photoPage = await browser.newPage();
    const photoView = new HotelPage(photoPage, WEB);
    for (const width of [1440, 390]) {
      await photoPage.setViewportSize({ width, height: 1000 });
      const hotelResponse = photoPage.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/hotels/P-h-nt-01' && response.status() === 200,
      );
      await photoView.visit('/hotels/P-h-nt-01');
      const hotel = await (await hotelResponse).json();
      await expect(photoView.heading(hotel.name)).toBeVisible();
      const photos = photoPage.locator('main > div button img');
      await expect(photos.first()).toBeVisible();
      await expect
        .poll(
          () =>
            photos.evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
          { timeout: 20000 },
        )
        .toBe(true);
      await photoPage.screenshot({ path: join(OUTPUT, `hotel-top-${width}.png`) });
      await photoView.section('rooms').scrollIntoViewIfNeeded();
      await expect(photoView.section('rooms').getByRole('article').first()).toBeVisible();
      await photoPage.screenshot({ path: join(OUTPUT, `hotel-rooms-${width}.png`) });
      await photoView.section('reviews').scrollIntoViewIfNeeded();
      await expect(photoView.section('reviews').getByRole('article').first()).toBeVisible();
      await photoPage.screenshot({ path: join(OUTPUT, `hotel-reviews-${width}.png`) });
    }
    check('Captured hotel, rooms and reviews at desktop and mobile widths');
    await photoPage.close();
    await writeFile(join(OUTPUT, 'verification.json'), JSON.stringify({ checks }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
