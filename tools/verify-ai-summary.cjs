// Optional runtime: PLAYWRIGHT_PACKAGE points to an existing Playwright install.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const postId = '11111111-1111-4111-8111-111111111111';
const date = '2026-11-06T01:00:00Z';
const good = 'Đi bộ ra biển thuận tiện, gần nhiều quán ăn.';
const bad = 'Hồ bơi đông vào chiều cuối tuần.';
const ready = {
  status: 'ready',
  summary:
    'Cộng đồng thích vị trí gần biển và bữa sáng đa dạng. Hồ bơi có thể đông hơn trong video vào cuối tuần.',
  commentCountAtSummary: 18,
  generatedAt: date,
  content: {
    counts: { comments: 18, people: 7, sent: 12 },
    pros: [{ text: good, people: 3, commentIds: ['c1', 'c2', 'gone'] }],
    cons: [{ text: bad, people: 2, commentIds: ['c3', 'c4'] }],
    realityGaps: [
      {
        claim: 'Hồ bơi yên tĩnh và ít người',
        reality: 'Đông hơn vào cuối tuần.',
        people: 2,
        commentIds: ['c3', 'c4'],
      },
    ],
    topics: [
      { label: 'Bữa sáng', summary: 'Nên đến sớm để tránh chờ bàn.', people: 2, commentIds: ['c1', 'c2'] },
    ],
  },
  safety: { warnings: [] },
};
const comment = (id, body, parentCommentId = null) => ({
  id,
  postId,
  authorId: 'traveler-' + id,
  body,
  parentCommentId,
  isEdited: id === 'c2',
  createdAt: date,
  updatedAt: date,
  deletedAt: null,
});
const rootComment = comment('c1', 'Mình đi bộ ra biển khoảng 5 phút, gần nhiều quán ăn.');
const replyComment = comment('c2', 'Mình cũng ở đây tuần trước, đi ra biển rất tiện.', 'parent-1');
const detail = {
  post: {
    id: postId,
    authorId: 'creator-1',
    title: 'Một cuối tuần ở Nha Trang',
    body: 'Chuyến đi 3 ngày 2 đêm, ở gần biển và dạo phố buổi tối.',
    status: 'published',
    visibility: 'public',
    mediaIds: [],
    tripAttachment: null,
    reactionTotal: 32,
    commentCount: 18,
    bookmarkCount: 5,
    shareCount: 2,
  },
  viewerContext: { myReaction: null, isBookmarked: false },
  shareUrl: `http://localhost:3100/trips/${postId}`,
};

class SummaryPage {
  constructor(page, mode) {
    this.page = page;
    this.mode = mode;
    this.trigger = page.getByRole('button', { name: 'Tóm tắt bằng AI', exact: false });
  }
  async goto() {
    const base =
      this.mode === 'web'
        ? process.env.TRIPFLIX_WEB_URL || 'http://localhost:3100'
        : process.env.TRIPFLIX_MOBILE_WEB_URL || 'http://localhost:8083';
    await this.page.goto(
      `${base}/${this.mode === 'web' ? 'trips/' + postId : this.mode === 'reels' ? '(tabs)' : 'trip/' + postId}`,
    );
    if (this.mode === 'reels') {
      await this.page.getByRole('button', { name: 'Bình luận', exact: true }).click();
      await this.page.getByTestId('reel-comments-header').evaluate(
        (element) =>
          new Promise((resolve) => {
            let lastY = -1,
              stable = 0;
            const check = () => {
              const y = element.getBoundingClientRect().y;
              stable = Math.abs(y - lastY) < 0.1 && y < innerHeight / 2 ? stable + 1 : 0;
              lastY = y;
              if (stable >= 3) resolve();
              else requestAnimationFrame(check);
            };
            requestAnimationFrame(check);
          }),
      );
    }
    await this.trigger.waitFor({ state: 'visible', timeout: 90_000 });
  }
  async sees(text) {
    await this.page
      .getByText(text, { exact: text !== 'Cộng đồng nói gì?' })
      .first()
      .waitFor({ state: 'visible' });
  }
  async click(name) {
    await this.page.getByRole('button', { name, exact: true }).click();
  }
  async evidence() {
    await this.page.getByRole('button', { name: `Xem bình luận làm căn cứ: ${good}`, exact: true }).click();
  }
}
async function mount(browser, mode) {
  const context = await browser.newContext({
    viewport: mode === 'web' ? { width: 1440, height: 1080 } : { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.clock.install();
  page.setDefaultTimeout(20_000);
  const state = {
    response: ready,
    status: 200,
    requests: 0,
    evidenceRequests: 0,
    evidenceFail: false,
    hold: null,
    errors: [],
  };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await context.route('**/qa/**', (route) =>
    route.request().url().endsWith('poster.jpg')
      ? route.fulfill({ path: path.resolve(__dirname, '../apps/mobile/assets/brand/beach.jpg') })
      : route.fulfill({ status: 404 }),
  );
  await context.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const headers = {
      'access-control-allow-origin': route.request().headers().origin || new URL(page.url()).origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': '*',
    };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let body = {},
      code = 200;
    if (url.pathname.endsWith('/auth/refresh')) {
      if (mode === 'reels') body = { accessToken: 'qa-session-token', tokenType: 'Bearer', expiresIn: 3600 };
      else code = 401;
    } else if (url.pathname.endsWith('/auth/me'))
      body = {
        id: 'qa-viewer',
        email: 'qa@example.test',
        displayName: 'Linh',
        role: 'member',
        createdAt: date,
      };
    else if (url.pathname.endsWith('/ai-summary')) {
      state.requests++;
      if (state.hold) await state.hold;
      body = state.response;
      code = state.status;
    } else if (url.pathname.endsWith('/comments')) {
      if (url.searchParams.get('flat') === 'true') {
        state.evidenceRequests++;
        if (state.evidenceFail) code = 503;
        body = url.searchParams.has('cursor')
          ? { items: [replyComment], nextCursor: null, hasMore: false }
          : {
              items: [rootComment, comment('not-cited', 'Bình luận không được trích dẫn.')],
              nextCursor: 'next-page',
              hasMore: true,
            };
      } else
        body = {
          items: [rootComment, comment('c3', 'Mình đi chiều thứ bảy, hồ bơi đông hơn trong video.')],
          nextCursor: null,
          hasMore: false,
        };
    } else if (url.pathname.endsWith(`/posts/${postId}`)) body = detail;
    else if (url.pathname.endsWith('/feed')) {
      const origin = new URL(page.url()).origin;
      body = {
        items: [
          {
            postId,
            author: { id: 'creator-1', name: 'Mai Anh đi đây', avatarUrl: null },
            title: detail.post.title,
            caption: detail.post.body,
            video: {
              hlsUrl: origin + '/qa/video.m3u8',
              posters: {
                w360: origin + '/qa/poster.jpg',
                w540: origin + '/qa/poster.jpg',
                w720: origin + '/qa/poster.jpg',
              },
              durationSec: 15,
              aspect: '9:16',
              levels: [],
            },
            counts: { likes: 32, comments: 18, saves: 5, shares: 2 },
            viewerState: null,
          },
        ],
        nextCursor: null,
        hasMore: false,
      };
    } else if (url.pathname.endsWith('/posts')) body = { items: [], nextCursor: null, hasMore: false };
    return route.fulfill({
      status: code,
      contentType: 'application/json',
      body: JSON.stringify(body),
      headers,
    });
  });
  return { page, context, state, ui: new SummaryPage(page, mode) };
}
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  });
  const output = path.resolve(process.env.SUMMARY_EVIDENCE_DIR || 'test-results/ai-summary-flow');
  await fs.mkdir(output, { recursive: true });
  const checks = [];
  try {
    for (const mode of ['web', ...(process.env.TRIPFLIX_MOBILE_WEB_URL ? ['mobile', 'reels'] : [])]) {
      process.stdout.write(`Checking ${mode}: summary-only flow\n`);
      const { page, context, state, ui } = await mount(browser, mode);
      try {
        await ui.goto();
        assert.equal(state.requests, 0);
        assert.equal(state.evidenceRequests, 0);
        if (mode === 'reels')
          await page
            .getByRole('textbox', { name: 'Viết bình luận', exact: true })
            .fill('Nên đi vào tháng mấy nhỉ?');
        await page.screenshot({ path: path.join(output, `${mode}-01-default.png`), fullPage: true });
        let release;
        state.hold = new Promise((resolve) => {
          release = resolve;
        });
        await ui.trigger.click();
        await ui.sees('Tripi đang lấy bản tóm tắt…');
        await page.screenshot({ path: path.join(output, `${mode}-02-loading.png`), fullPage: true });
        await ui.click('Hủy');
        await ui.trigger.waitFor({ state: 'visible' });
        release();
        state.hold = null;
        await ui.trigger.click();
        await ui.sees('Cộng đồng nói gì?');
        assert.equal(state.requests, 2, 'cancelled load can be requested again');
        await page.mouse.move(0, 0);
        await page.screenshot({ path: path.join(output, `${mode}-03-summary.png`), fullPage: true });
        await ui.click('Đóng tóm tắt');
        await ui.click('Xem tóm tắt đã lưu');
        assert.equal(state.requests, 2, 'reopen uses cached result');
        await page.clock.fastForward(65_000);
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        assert.equal(state.requests, 2, 'there is no polling or focus refetch');
        await ui.sees(ready.summary);
        const card =
          mode === 'web'
            ? page.getByRole('region', { name: 'Tripi đọc giúp bạn', exact: true })
            : page.getByTestId('community-summary');
        for (const label of [
          'Xem chi tiết',
          'Được yêu thích',
          'Cần cân nhắc',
          'Video và trải nghiệm thực tế',
          'Bình luận làm căn cứ',
        ]) {
          assert.equal(await card.getByText(label, { exact: true }).count(), 0, `summary UI hides ${label}`);
        }
        assert.equal(state.evidenceRequests, 0, 'summary does not load evidence');
        if (mode === 'web') {
          await page.setViewportSize({ width: 320, height: 844 });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await page.screenshot({ path: path.join(output, 'web-320.png'), fullPage: true });
        }
        assert.deepEqual(state.errors, []);
        if (mode === 'reels')
          assert.equal(
            await page.getByRole('textbox', { name: 'Viết bình luận', exact: true }).inputValue(),
            'Nên đi vào tháng mấy nhỉ?',
            'AI navigation preserves the comment draft',
          );
        checks.push(
          `${mode}: summary text only, no details/filters/evidence, explicit loading/cancel, cached reopen, no polling, preserved draft`,
        );
      } catch (error) {
        await page.screenshot({ path: path.join(output, `${mode}-failure.png`), fullPage: true });
        throw error;
      } finally {
        await context.close();
      }
      if (mode === 'reels') continue;
      for (const [status, response, expected] of [
        [404, {}, 'Chưa có bản tóm tắt'],
        [200, { status: 'no_comments' }, 'Bắt đầu từ một trải nghiệm thật'],
        [200, { status: 'insufficient_data', content: { needed: 2 } }, 'Cần thêm trải nghiệm từ 2 người.'],
        [200, { status: 'failed' }, 'Chưa thể tạo bản tóm tắt'],
        [503, {}, 'Không tải được tóm tắt. Vui lòng thử lại.'],
      ]) {
        process.stdout.write(`Checking ${mode}: ${response.status || status}\n`);
        const test = await mount(browser, mode);
        try {
          test.state.status = status;
          test.state.response = response;
          await test.ui.goto();
          await test.ui.trigger.click();
          await test.ui.sees(expected);
          assert.equal(test.state.requests, 1);
          if (status === 503 || status === 404) {
            test.state.status = 200;
            test.state.response = ready;
            await test.ui.click(status === 503 ? 'Thử lại' : 'Kiểm tra cập nhật');
            await test.ui.sees(ready.summary);
          }
          checks.push(`${mode}: ${response.status || 'pending'}`);
        } finally {
          await test.context.close();
        }
      }
    }
    await fs.writeFile(
      path.join(output, 'verification.json'),
      JSON.stringify({ checks, mockApi: true, nativeAndroidVerified: false }, null, 2),
    );
    process.stdout.write(`PASS: ${checks.length} UI scenario groups. Evidence: ${output}\n`);
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
