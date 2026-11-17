// Presentation/navigation checks with explicit API fixtures; does not verify ranking or live prices.
const assert = require('node:assert/strict');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8082';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'tripflix-explore');
const before = process.argv.includes('--before');
const hotelName = 'Khách sạn bên biển với tên rất dài để kiểm tra bố cục trên màn hình nhỏ';
const fixture = {
  items: [
    {
      province: { slug: 'qa-nha-trang', name: 'Nha Trang' },
      totalDealsCount: 3,
      otherDealsCount: 2,
      hotels: [
        {
          hotelId: 'qa-hotel-1',
          name: hotelName,
          thumbnail: `${base}/fixture-hotel.jpg`,
          stars: 4,
          brand: null,
          priceFrom: 1234567,
          reason: {
            code: 'good_deal',
            text: 'Giá tham khảo thấp hơn nhóm nơi ở cùng hạng sao. Nội dung dài để kiểm tra khả năng xuống dòng.',
          },
        },
      ],
    },
    {
      province: { slug: 'qa-hoi-an', name: 'Hội An' },
      totalDealsCount: 1,
      otherDealsCount: 0,
      hotels: [
        {
          hotelId: 'qa-hotel-2',
          name: 'Nơi ở chưa có ảnh',
          thumbnail: null,
          stars: null,
          brand: null,
          priceFrom: 876000,
          reason: { code: 'good_deal', text: 'Gợi ý từ dữ liệu kiểm thử.' },
        },
      ],
    },
  ],
};

class ExplorePage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  tab(name) {
    return this.page.getByRole('tab', { name, exact: true });
  }
  async goto() {
    await this.page.goto(new URL('/explore', base).href);
  }
  async snapshot(name) {
    await this.page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    });
    await this.page.waitForFunction(() =>
      [...document.getAnimations()].every((animation) => animation.playState !== 'running'),
    );
    await this.page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
  }
  async fits(name) {
    const rect = await this.button(name).boundingBox();
    const size = this.page.viewportSize();
    assert(
      rect &&
        rect.y >= 0 &&
        rect.x >= 0 &&
        rect.y + rect.height <= size.height - 40 &&
        rect.x + rect.width <= size.width + 1,
      `${name} fits above the tab bar`,
    );
  }
  async noOverflow() {
    assert(await this.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
}

(async () => {
  await mkdir(output, { recursive: true });
  const hotelImage = await readFile(join(__dirname, '../apps/mobile/assets/brand/hotel.jpg'));
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    headless: true,
  });
  const checks = [],
    errors = [],
    homeRequests = [];
  try {
    for (const width of before ? [375, 390, 430] : [375, 390, 430, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 667 : 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
      });
      await context.route('**/api/auth/refresh', (route) =>
        route.fulfill({ status: 401, json: { message: 'No session (QA fixture)' } }),
      );
      let mode = 'success';
      let release;
      const loading = new Promise((resolve) => {
        release = resolve;
      });
      await context.route('**/api/recommendations/home?*', async (route) => {
        homeRequests.push(route.request().url());
        if (mode === 'loading') await loading;
        const data =
          mode === 'empty'
            ? { items: [] }
            : mode === 'no-hotels'
              ? { items: [{ ...fixture.items[0], hotels: [] }] }
              : mode === 'broken-image'
                ? {
                    items: [
                      {
                        ...fixture.items[0],
                        hotels: [{ ...fixture.items[0].hotels[0], thumbnail: `${base}/fixture-broken.jpg` }],
                      },
                    ],
                  }
                : fixture;
        await route.fulfill(
          mode === 'error' ? { status: 503, json: { message: 'QA service unavailable' } } : { json: data },
        );
      });
      await context.route('**/fixture-hotel.jpg', (route) =>
        route.fulfill({ contentType: 'image/jpeg', body: hotelImage }),
      );
      await context.route('**/fixture-broken.jpg', (route) => route.fulfill({ status: 404, body: '' }));
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      const ui = new ExplorePage(page);
      await ui.goto();
      if (before) {
        await page.getByText('Đi đâu tiếp đây?', { exact: true }).waitFor();
        await ui.button('Biển & đảo').waitFor();
        await ui.snapshot(`before-${width}`);
        await context.close();
        continue;
      }
      await ui.button('Khám phá Nha Trang').waitFor();
      await ui.fits('Khám phá Nha Trang');
      await ui.fits('Tìm khách sạn');
      await ui.fits('Vé máy bay');
      await ui.noOverflow();
      await ui.snapshot(`after-${width}`);
      await ui.button(hotelName).scrollIntoViewIfNeeded();
      await ui.snapshot(`stays-long-name-${width}`);
      await ui.noOverflow();
      assert((await page.getByText('Chưa có ảnh', { exact: true }).count()) > 0);
      assert((await page.getByText('1.234.567đ', { exact: true }).count()) > 0);

      if (width === 390) {
        await ui.tab('Cuối tuần').click();
        await ui.button('Khám phá Hội An').waitFor();
        assert.equal(await ui.tab('Cuối tuần').getAttribute('aria-selected'), 'true');
        await ui.snapshot('weekend-390');
        await ui.tab('Biển & đảo').click();
        await ui.button('Tìm chuyến đi Hạ Long').waitFor();
        await ui.tab('Tất cả').click();
        await ui.button('Khám phá Nha Trang').click();
        await page.waitForURL(
          (url) => url.pathname === '/search' && url.searchParams.get('q') === 'Nha Trang',
        );
        await page.goBack();
        await ui.button('Khám phá Nha Trang').waitFor();
        await ui.button('Tìm khách sạn').click();
        await page.waitForURL(
          (url) => url.pathname === '/search' && url.searchParams.get('autoFocus') === '1',
        );
        await page.goBack();
        await ui.button('Vé máy bay').click();
        await page.waitForURL((url) => url.pathname === '/flights');
        await page.goBack();
        await ui.button('Tìm người dùng, video, lộ trình...').click();
        await page
          .getByRole('textbox', { name: 'Tìm người dùng, video, lộ trình...', exact: true })
          .waitFor();
        await ui.button('Đóng tìm kiếm').click();
        await ui.button(hotelName).click();
        await page.waitForURL((url) => url.pathname === '/hotel/qa-hotel-1');
        await page.goBack();
        await ui.button('Thông báo').click();
        await page.waitForURL((url) => url.pathname === '/notifications');
        checks.push('Category selection; destination/hotel/flight/search/notification navigation and Back');

        mode = 'empty';
        await ui.goto();
        await page.getByText('Không tìm thấy địa điểm phù hợp. Hãy thử tên khác.', { exact: true }).waitFor();
        await page.getByText('Một nơi để dừng chân', { exact: true }).scrollIntoViewIfNeeded();
        await ui.snapshot('empty-390');
        mode = 'error';
        await ui.goto();
        await ui.button('Thử lại').waitFor({ timeout: 20000 });
        await ui.button('Thử lại').scrollIntoViewIfNeeded();
        await ui.snapshot('error-390');
        mode = 'success';
        await ui.button('Thử lại').click();
        await ui.button(hotelName).waitFor();
        checks.push('Empty and HTTP error states; retry restores the same recommendation source');

        mode = 'loading';
        await ui.goto();
        await page.getByText('Một nơi để dừng chân', { exact: true }).waitFor();
        await page.getByRole('progressbar').waitFor();
        await page.getByRole('progressbar').scrollIntoViewIfNeeded();
        await ui.snapshot('loading-390');
        mode = 'success';
        release();
        await ui.button(hotelName).waitFor();
        checks.push('Loading skeleton uses stable hotel-row layout');
        mode = 'no-hotels';
        await ui.goto();
        await page.getByText('Không tìm thấy địa điểm phù hợp. Hãy thử tên khác.', { exact: true }).waitFor();
        mode = 'broken-image';
        await ui.goto();
        await ui.button(hotelName).waitFor();
        await page.getByText('Chưa có ảnh', { exact: true }).waitFor();
        checks.push('Empty hotel arrays and failed image requests have explicit fallback states');
      }
      checks.push(
        `Layout ${width}px: first viewport, long names, price, missing image, no horizontal overflow`,
      );
      await context.close();
    }
    assert.deepEqual(errors, []);
    assert(homeRequests.every((url) => new URL(url).searchParams.get('limit') === '3'));
    const result = {
      passed: true,
      baseline: before,
      apiFixtures: true,
      rankingOrLivePricesTested: false,
      nativeTested: false,
      checks,
      pageErrors: errors,
    };
    await writeFile(
      join(output, before ? 'baseline-results.json' : 'qa-results.json'),
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
