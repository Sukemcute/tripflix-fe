// Dùng runtime Playwright có sẵn qua PLAYWRIGHT_PACKAGE, không thêm dependency.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdir, readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const base = process.env.SEARCH_ADMIN_URL || 'http://localhost:3201';
const output = process.env.SEARCH_EVIDENCE_DIR || join(tmpdir(), 'tripflix-search-monitoring');
const kinds = ['video', 'plan', 'stay', 'post', 'food', 'cafe', 'see'];
const understood = {
  place: null,
  intents: [],
  budget: null,
  days: null,
  names: [],
  phrases: [],
  fixed: { sunworld: 'sun world' },
};
const makeItem = (id, kind, title) => ({
  id,
  kind,
  refId: id,
  title,
  subtitle: 'Đà Lạt',
  reason: 'Khớp: sun world · ♥ 12',
  priceFrom: 0,
  days: 3,
  thumbnail: null,
  location: null,
});
const video = makeItem('v1', 'video', 'Video đứng trước theo API');
const plan = makeItem('p1', 'plan', 'Lộ trình đứng sau theo API');

class SearchMonitorPage {
  constructor(page) {
    this.page = page;
  }
  get query() {
    return this.page.getByRole('textbox', { name: 'Câu tìm kiếm', exact: true });
  }
  get runButton() {
    return this.page.getByRole('button', { name: 'Phân tích truy vấn', exact: true });
  }
  async open() {
    await this.page.goto(`${base}/search-monitor`);
    await this.page.getByRole('heading', { name: 'Theo dõi tìm kiếm', exact: true }).waitFor();
  }
  async run(query) {
    await this.query.fill(query);
    const response = this.page.waitForResponse(
      (res) =>
        ['/api/search', '/api/search/posts'].includes(new URL(res.url()).pathname) &&
        res.request().method() === 'POST',
    );
    await this.runButton.click();
    await response;
    await this.runButton.waitFor({ state: 'visible' });
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.screenshot({ path: join(output, name), fullPage: true });
    assert.equal(
      await this.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'Không tràn ngang trang',
    );
  }
}

async function mockApi(context, role = 'moderator') {
  const calls = [];
  let failures = 0;
  let trendCalls = 0;
  let healthCalls = 0;
  await context.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const headers = {
      'access-control-allow-origin': req.headers().origin || new URL(base).origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let status = 200;
    let body;
    if (path.endsWith('/auth/refresh'))
      body = { accessToken: 'test-session', tokenType: 'Bearer', expiresIn: 3600 };
    else if (path.endsWith('/auth/me') || path.endsWith('/admin/me'))
      body = {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'staff@example.test',
        displayName: 'Trang',
        role,
        emailVerified: true,
        createdAt: '2026-11-11T05:00:00Z',
      };
    else if (path === '/api/v1/admin/search/index-health') {
      calls.push({ path });
      healthCalls++;
      const checkedAt = Date.UTC(2026, 10, 12, 5) + healthCalls * 300_000;
      const offline = healthCalls === 2;
      status = healthCalls === 3 ? 503 : 200;
      body = healthCalls === 3 ? { message: 'Unavailable' } : {
        checkedAt,
        workers: healthCalls >= 4 ? [] : [{
          id: '12345678-1111-4111-8111-111111111111',
          name: 'discovery-worker',
          lastSeenAt: offline ? checkedAt - 600_000 : checkedAt,
          status: offline ? 'offline' : 'healthy',
          jobs: [{
            job: 'explore',
            status: offline ? 'unknown' : 'succeeded',
            startedAt: checkedAt - 600_000,
            finishedAt: checkedAt - 599_200,
            lastSuccessAt: checkedAt - 599_200,
            count: 214,
            logs: [
              { at: checkedAt - 599_200, message: 'Dựng chỉ mục thành công', outcome: 'succeeded', durationMs: 800, count: 214 },
              { at: checkedAt - 1_200_000, message: 'Danh mục tạm lỗi', outcome: 'failed', durationMs: 1500, count: null },
            ],
          }],
          history: Array.from({ length: 24 }, (_, i) => ({
            at: checkedAt - (23 - i) * 300_000,
            status: i < 20 ? 'unknown' : i === 23 && offline ? 'offline' : 'healthy',
          })),
        }],
      };
    } else if (path === '/api/search' || path === '/api/search/posts') {
      const payload = req.postDataJSON();
      calls.push({ path, payload });
      if (payload.q === 'biểu đồ' && path === '/api/search') {
        trendCalls++;
        const total = trendCalls === 4 ? 0 : trendCalls * 4;
        status = trendCalls === 3 ? 503 : 200;
        body =
          status === 503
            ? { message: 'Unavailable' }
            : {
                understood: { ...understood, fixed: trendCalls === 1 ? {} : { test: 'fixed' } },
                nearUser: false,
                sections: kinds.map((kind) => ({
                  kind,
                  label: kind,
                  total: kind === 'video' ? total : 0,
                  items: [],
                })),
                suggest: [],
                dropped: [],
              };
      } else if (payload.q === 'lỗi thử' && failures++ === 0) {
        status = 503;
        body = { message: 'Unavailable' };
      } else if (path.endsWith('/posts')) {
        body = {
          understood,
          items: payload.cursor ? [makeItem('p2', 'plan', 'Bài trang tiếp')] : [video, plan],
          total: 3,
          nextCursor: payload.cursor ? null : '2',
        };
      } else {
        const empty = payload.q === 'không khớp';
        body = {
          understood,
          nearUser: Boolean(payload.loc),
          sections: kinds.map((kind) => ({
            kind,
            label: kind,
            total: empty ? 0 : kind === 'video' ? 1 : kind === 'plan' ? 2 : 0,
            items: empty ? [] : kind === 'video' ? [video] : kind === 'plan' ? [plan, video] : [],
          })),
          dropped: empty ? ['không', 'khớp'] : [],
          suggest: empty ? [{ ...plan, section: 'plan' }] : [],
        };
      }
    } else throw new Error(`Unexpected API call: ${req.method()} ${path}`);
    return route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return calls;
}

async function verify(browser, viewport) {
  const context = await browser.newContext({ viewport });
  try {
    const calls = await mockApi(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const ui = new SearchMonitorPage(page);
    await ui.open();
    assert.equal(calls.length, 0, 'Không gọi tìm kiếm khi vừa mở trang');
    assert.equal(
      await page.getByRole('link', { name: 'Theo dõi tìm kiếm', exact: true }).getAttribute('aria-current'),
      'page',
    );
    await ui.query.fill('   ');
    await ui.runButton.click();
    await page.getByRole('alert').filter({ hasText: 'Nhập câu tìm' }).waitFor();
    assert.equal(calls.length, 0);
    await page.getByRole('button', { name: 'sunworld', exact: true }).click();
    assert.equal(await ui.query.inputValue(), 'sunworld');
    assert.equal(await ui.query.getAttribute('maxlength'), '200');
    await page.getByText('Vị trí thử nghiệm (tuỳ chọn)', { exact: true }).click();
    await page.getByLabel('Vĩ độ', { exact: true }).fill('10.7');
    await ui.runButton.click();
    await page.getByRole('alert').filter({ hasText: 'Nhập đủ vĩ độ' }).waitFor();
    assert.equal(calls.length, 0);
    await page.getByLabel('Kinh độ', { exact: true }).fill('106.7');
    await ui.run('  sunworld  ');
    assert.deepEqual(calls.at(-1), {
      path: '/api/search',
      payload: { q: 'sunworld', loc: { lat: 10.7, lng: 106.7 } },
    });
    await page.getByText('Có ưu tiên khoảng cách tới vị trí thử nghiệm', { exact: true }).waitFor();
    const sectionButtons = page
      .getByRole('region', { name: 'Thứ tự vùng do engine trả về' })
      .getByRole('button');
    assert.match((await sectionButtons.allTextContents()).join('|'), /1\. video.*2\. plan/);
    await page
      .getByRole('region', { name: 'plan', exact: true })
      .getByRole('cell', { name: 'Lộ trình đứng sau theo API', exact: false })
      .waitFor();
    assert.equal(
      await page
        .getByRole('region', { name: 'plan', exact: true })
        .getByRole('cell', { name: '0', exact: true })
        .count(),
      2,
      'Giá bằng 0 không bị đổi thành thiếu giá',
    );
    await ui.snapshot(`search-${viewport.width}-query.png`);

    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Tải JSON đối chiếu', exact: true }).click();
    const download = await downloaded;
    const saved = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(saved.request.body.q, 'sunworld');
    assert.equal(saved.data.sections[0].kind, 'video');
    assert.ok(saved.elapsedMs >= 0);
    await sectionButtons.nth(1).click();
    assert.equal(await page.getByRole('region', { name: 'plan', exact: true }).count(), 0);
    const beforeRepeat = calls.length;
    await ui.run('sunworld');
    assert.equal(calls.length, beforeRepeat + 1, 'Cùng câu vẫn thử lại được');
    await page.getByRole('region', { name: 'plan', exact: true }).waitFor();
    await ui.run('không khớp');
    await page.getByRole('status').filter({ hasText: 'Không có kết quả phù hợp' }).waitFor();
    await page.getByRole('region', { name: 'Gợi ý khi nới câu tìm', exact: true }).waitFor();
    await ui.snapshot(`search-${viewport.width}-fallback.png`);

    await page.getByLabel('Phạm vi tìm kiếm', { exact: true }).selectOption('posts');
    await page.getByLabel('Loại bài', { exact: true }).selectOption('plan');
    await page.getByLabel('Số bài mỗi trang', { exact: true }).fill('2');
    await ui.run('vincom');
    assert.deepEqual(calls.at(-1), {
      path: '/api/search/posts',
      payload: { q: 'vincom', postType: 'plan', limit: 2 },
    });
    const posts = page.getByRole('region', { name: 'Bài · có phân trang', exact: true });
    assert.match(
      (await posts.getByRole('row').allTextContents()).join('|'),
      /Video đứng trước.*Lộ trình đứng sau/s,
    );
    await ui.query.fill('bản nháp chưa chạy');
    await page.getByRole('button', { name: 'Trang tiếp', exact: true }).click();
    await page.getByRole('cell', { name: 'Bài trang tiếp', exact: false }).waitFor();
    assert.deepEqual(
      calls.at(-1).payload,
      { q: 'vincom', postType: 'plan', limit: 2, cursor: '2' },
      'Phân trang dùng câu đã chạy, không dùng bản nháp',
    );
    assert.equal(await posts.getByRole('cell', { name: '3', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Trang tiếp', exact: true }).isDisabled(), true);
    await ui.snapshot(`search-${viewport.width}-posts.png`);
    await page.getByRole('button', { name: 'Về trang đầu', exact: true }).click();
    await posts.getByRole('cell', { name: 'Video đứng trước', exact: false }).waitFor();
    await ui.run('lỗi thử');
    await page.getByRole('alert').filter({ hasText: 'Không tải được dữ liệu' }).waitFor();
    assert.equal(await posts.count(), 0, 'Không hiển thị kết quả cũ khi request lỗi');
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await posts.waitFor();

    await page.getByRole('button', { name: 'Ca cần theo dõi', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Đưa vào ô thử', exact: true }).count(), 6);
    await ui.snapshot(`search-${viewport.width}-cases.png`);
    await page.getByRole('button', { name: 'Đưa vào ô thử', exact: true }).first().click();
    assert.equal(await ui.query.inputValue(), 'vincom đồng khởi');
    await page.getByRole('button', { name: 'Quy tắc & chỉ mục', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Số liệu chỉ mục cần bổ sung từ backend', exact: true })
      .waitFor();
    await ui.snapshot(`search-${viewport.width}-rules.png`);
    assert.deepEqual(errors, []);
    process.stdout.write(
      JSON.stringify({
        viewport,
        passed: [
          'moderator-navigation',
          'no-auto-search',
          'query-validation',
          'location-validation',
          'exact-request',
          'api-order',
          'zero-price',
          'export-json',
          'section-filter',
          'repeat-query',
          'fallback',
          'post-filter',
          'pagination-snapshot',
          'error-retry',
          'six-cases',
          'rules',
          'no-overflow',
          'no-browser-errors',
        ],
        output,
      }) + '\n',
    );
  } finally {
    await context.close();
  }
}

async function verifyLive(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    await mockApi(context);
    // Chỉ phiên đăng nhập được giả lập; hai API tìm kiếm đọc dữ liệu local thật.
    await context.route(/\/api\/search(?:\/posts)?$/, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const path = new URL(route.request().url()).pathname;
      const response = await context.request.post(process.env.SEARCH_LIVE_API_URL + path, {
        data: route.request().postDataJSON(),
      });
      assert.equal(response.status(), 200);
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          'access-control-allow-origin': route.request().headers().origin || new URL(base).origin,
          'access-control-allow-credentials': 'true',
        },
      });
    });
    const page = await context.newPage();
    const ui = new SearchMonitorPage(page);
    await ui.open();
    await ui.run('vin com');
    await page.getByRole('region', { name: 'Engine hiểu câu thế nào?', exact: true }).waitFor();
    await ui.snapshot('search-live-query.png');
    await ui.run('vin com');
    await ui.run('vin com');
    await page.getByRole('button', { name: 'Biến động', exact: true }).click();
    await page
      .getByRole('region', { name: 'Thời gian phản hồi theo thời gian', exact: true })
      .locator('circle')
      .nth(2)
      .waitFor();
    await ui.snapshot('search-live-trends.png');
    await page.getByRole('button', { name: 'Thử truy vấn', exact: true }).click();
    await page.getByLabel('Phạm vi tìm kiếm', { exact: true }).selectOption('posts');
    await ui.run('vincom đồng khởi');
    await page.getByRole('region', { name: 'Bài · có phân trang', exact: true }).waitFor();
    await ui.snapshot('search-live-posts.png');
    process.stdout.write('Live local search APIs rendered successfully (authentication mocked).\n');
  } finally {
    await context.close();
  }
}

async function verifyTrends(browser, viewport) {
  const context = await browser.newContext({ viewport });
  try {
    const calls = await mockApi(context);
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-11-11T03:00:00Z') });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const ui = new SearchMonitorPage(page);
    await ui.open();
    const trendsTab = page.getByRole('button', { name: 'Biến động', exact: true });
    await trendsTab.click();
    await page.getByRole('heading', { name: 'Chưa có mẫu để vẽ biểu đồ', exact: true }).waitFor();
    assert.equal(calls.length, 0);
    assert.equal(
      await page.getByRole('button', { name: 'Theo dõi mỗi 60 giây', exact: true }).isDisabled(),
      true,
    );
    await page.getByRole('button', { name: 'Đi tới ô thử truy vấn', exact: true }).click();
    await ui.run('biểu đồ');
    await trendsTab.click();
    const count = page.getByText('Mẫu của truy vấn này', { exact: true }).locator('..').locator('strong');
    const latency = page.getByRole('region', { name: 'Thời gian phản hồi theo thời gian', exact: true });
    const results = page.getByRole('region', { name: 'Số kết quả theo thời gian', exact: true });
    const sampleButton = page.getByRole('button', { name: 'Lấy mẫu ngay', exact: true });
    async function waitCount(expected) {
      await page.waitForFunction(
        ({ expected }) =>
          [...document.querySelectorAll('strong')].some(
            (node) => node.parentElement?.textContent === 'Mẫu của truy vấn này' + expected,
          ),
        { expected },
      );
      assert.equal(await count.textContent(), String(expected));
      await page.waitForFunction(() =>
        [...document.querySelectorAll('button')].some(
          (button) => button.textContent === 'Lấy mẫu ngay' && !button.disabled,
        ),
      );
    }
    async function sample(expected) {
      const response = page.waitForResponse(
        (res) => new URL(res.url()).pathname === '/api/search' && res.request().method() === 'POST',
      );
      await sampleButton.click();
      await response;
      await waitCount(expected);
    }
    await waitCount(1);
    assert.equal(await results.locator('circle').count(), 1);
    await page
      .getByText('Đã có một mẫu. Lấy thêm mẫu để xem đường biến động.', { exact: true })
      .first()
      .waitFor();
    await page.clock.fastForward(10_000);
    await sample(2);
    await page
      .getByRole('region', { name: 'Thay đổi số kết quả theo vùng', exact: true })
      .getByText('+4', { exact: true })
      .waitFor();
    await page.clock.fastForward(10_000);
    await sample(3);
    assert.equal(await latency.locator('circle').count(), 3);
    assert.equal(await results.locator('circle').count(), 2, 'Mẫu lỗi không thành 0 kết quả');
    await page.clock.fastForward(10_000);
    await sample(4);
    assert.equal(await results.locator('circle').count(), 3);
    assert.equal(
      ((await results.locator('path').getAttribute('d')).match(/M/g) || []).length,
      2,
      'Ngắt đường kết quả tại mẫu lỗi',
    );
    assert.equal(
      await page
        .getByText('Tỷ lệ không kết quả', { exact: true })
        .locator('..')
        .locator('strong')
        .textContent(),
      '33,3%',
    );
    await page.getByText('Dữ liệu các mẫu', { exact: true }).click();
    assert.equal(await page.getByRole('row').count(), 5);
    assert.match(await page.getByRole('row').nth(3).textContent(), /Lỗi.*—.*—/);
    assert.match(await page.getByRole('row').nth(4).textContent(), /Thành công.*0/);

    await page.getByRole('button', { name: 'Theo dõi mỗi 60 giây', exact: true }).click();
    await waitCount(5);
    await page.clock.fastForward(60_001);
    await waitCount(6);
    await page.getByRole('button', { name: 'Dừng theo dõi', exact: true }).click();
    const stoppedAt = calls.length;
    await page.clock.fastForward(120_000);
    assert.equal(calls.length, stoppedAt, 'Dừng thì không tiếp tục gọi API');
    await ui.snapshot(`search-${viewport.width}-trends.png`);
    assert.equal(
      await page.locator('svg').evaluateAll((nodes) => nodes.some((node) => node.outerHTML.includes('NaN'))),
      false,
    );

    await page.getByRole('button', { name: 'Thử truy vấn', exact: true }).click();
    await page.getByLabel('Phạm vi tìm kiếm', { exact: true }).selectOption('posts');
    await ui.run('biểu đồ');
    await trendsTab.click();
    await waitCount(1);
    await page
      .getByText('Cần ít nhất hai mẫu khám phá thành công để so sánh theo vùng.', { exact: true })
      .waitFor();
    assert.equal(await results.locator('circle').count(), 1, 'Không trộn hai endpoint');
    await page.reload();
    await trendsTab.click();
    await page.getByRole('heading', { name: 'Chưa có mẫu để vẽ biểu đồ', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    process.stdout.write(
      JSON.stringify({
        viewport,
        trendsPassed: [
          'empty-state',
          'one-point',
          'region-change',
          'error-gap',
          'zero-is-valid',
          'success-only-empty-rate',
          'sample-table',
          'polling-60s',
          'pause-polling',
          'separate-endpoints',
          'session-only',
          'no-overflow',
          'finite-svg',
          'no-browser-errors',
        ],
      }) + '\n',
    );
  } finally {
    await context.close();
  }
}

async function verifyWorkers(browser, viewport) {
  const context = await browser.newContext({ viewport });
  try {
    const calls = await mockApi(context);
    const page = await context.newPage();
    await page.clock.install();
    const ui = new SearchMonitorPage(page);
    await ui.open();
    assert.equal(calls.length, 0);
    await page.getByRole('button', { name: 'Worker chỉ mục', exact: true }).click();
    const worker = page.getByRole('region', { name: 'Worker discovery-worker', exact: true });
    await worker.getByText('Thành công', { exact: true }).waitFor();
    const history = worker.getByRole('list', { name: 'Lịch sử trạng thái trong 2 giờ qua', exact: true });
    assert.equal(await history.getByRole('listitem').count(), 24);
    await page.getByText('50%', { exact: true }).waitFor();
    const map = page.getByRole('region', { name: 'Bản đồ trạng thái worker', exact: true });
    const firstPoint = map.getByRole('button').first();
    await firstPoint.click();
    assert.equal(await firstPoint.getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Số mục đã dựng', exact: true }).click();
    const documentChart = page.getByRole('region', { name: 'Số mục đã dựng', exact: true });
    assert.equal(await documentChart.locator('circle').count(), 1, 'Không vẽ số mục cho lượt lỗi');
    await ui.snapshot(`search-${viewport.width}-workers.png`);
    await page.clock.fastForward(295_000);
    assert.equal(calls.length, 1);
    await page.clock.fastForward(5_001);
    await worker.getByText('Mất tín hiệu', { exact: true }).waitFor();
    assert.equal(calls.length, 2);

    const refresh = page.getByRole('button', { name: 'Kiểm tra ngay', exact: true });
    await refresh.click();
    await page.getByRole('region', { name: 'Sức khỏe worker chỉ mục', exact: true }).getByRole('alert').waitFor();
    await worker.waitFor({ state: 'hidden' });
    await refresh.click();
    await page.getByText('Chưa nhận được tín hiệu từ worker chỉ mục trong 2 giờ qua.', { exact: true }).waitFor();
    assert.equal(calls.length, 4);
    process.stdout.write(`Worker health checks passed at ${viewport.width}px.\n`);
  } finally {
    await context.close();
  }
}

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.SEARCH_BROWSER_CHANNEL || 'msedge',
  });
  try {
    await verify(browser, { width: 1440, height: 1000 });
    await verify(browser, { width: 390, height: 844 });
    await verifyTrends(browser, { width: 1440, height: 1000 });
    await verifyTrends(browser, { width: 390, height: 844 });
    await verifyWorkers(browser, { width: 1440, height: 1000 });
    await verifyWorkers(browser, { width: 390, height: 844 });
    for (const role of ['superadmin', 'member']) {
      const context = await browser.newContext();
      try {
        const calls = await mockApi(context, role);
        const page = await context.newPage();
        if (role === 'superadmin') await new SearchMonitorPage(page).open();
        else {
          await page.goto(`${base}/search-monitor`);
          await page.getByRole('alert').filter({ hasText: 'Trang này dành cho quản trị viên' }).waitFor();
          assert.equal(
            await page.getByRole('button', { name: 'Phân tích truy vấn', exact: true }).count(),
            0,
          );
        }
        assert.equal(calls.length, 0);
      } finally {
        await context.close();
      }
    }
    process.stdout.write('Access checks passed: superadmin allowed, member blocked.\n');
    if (process.env.SEARCH_LIVE_API_URL) await verifyLive(browser);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
