// Runs real mobile screens against isolated auth/post fixtures; never publishes a live post.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8083';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'mobile-post-draft');
const key = 'tripflix.postDraft.v1.qa-member.qa-post';
const caption = 'Một ngày đi biển cùng bạn bè, mình muốn kể thật nhiều điều.';
const point = (patch = {}) => ({
  key: 'p1',
  kind: 'activity',
  hotelId: '',
  productId: '',
  ratePlanCode: '',
  roomName: '',
  time: '',
  title: '',
  location: '',
  mode: null,
  category: null,
  fromCode: '',
  toCode: '',
  note: '',
  ...patch,
});
const trip = () => ({
  destinationName: '',
  destinationPlaceId: '',
  days: [{ points: [point()] }],
  posterMediaId: null,
  bookingId: null,
  estimatedCostPerPerson: null,
  preserved: {},
});
let currentPage;
const recovery = (patch = {}) => ({
  version: 1,
  userId: 'qa-member',
  editorKey: 'new',
  postId: null,
  savedAt: Date.now(),
  content: {
    title: 'Bài đang viết',
    body: caption,
    hashtags: 'bien, cafe',
    visibility: 'private',
    hasTripPlan: true,
    tripDraft: trip(),
    video: null,
    ...patch,
  },
});

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const checks = [],
    errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await context.addInitScript(() => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (globalThis.qaBlockDraftWrites && key.startsWith('tripflix.postDraft.v1.'))
          throw new DOMException('QA storage full', 'QuotaExceededError');
        return setItem.call(this, key, value);
      };
    });
    let releaseUpdate;
    let holdUpdate = false;
    let owner = 'qa-member',
      failSave = true;
    const serverRequests = [];
    await context.route('**/api/**', async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      if (path === '/api/auth/refresh')
        return route.fulfill({ json: { accessToken: 'qa-token', tokenType: 'Bearer', expiresIn: 900 } });
      if (path === '/api/auth/me')
        return route.fulfill({
          json: {
            id: owner,
            displayName: 'Nguyễn An',
            email: 'an@example.test',
            role: 'member',
            emailVerified: true,
            travelPreferences: {
              status: 'completed',
              interests: [],
              regions: [],
              budgetLevels: [],
              updatedAt: new Date().toISOString(),
            },
          },
        });
      if (path === '/api/v1/posts/qa-post' && req.method() === 'GET')
        return route.fulfill({
          json: {
            post: {
              id: 'qa-post',
              title: 'Bản trên máy chủ',
              body: 'Nội dung máy chủ',
              hashtags: [],
              visibility: 'public',
              tripAttachment: null,
            },
            viewerContext: {},
            shareUrl: '',
          },
        });
      if (path === '/api/v1/posts/qa-post' && req.method() === 'PATCH') {
        serverRequests.push(req.postDataJSON());
        if (holdUpdate) {
          holdUpdate = false;
          await new Promise((resolve) => {
            releaseUpdate = resolve;
          });
        }
        return failSave
          ? route.abort('internetdisconnected')
          : route.fulfill({ json: { id: 'qa-post', title: 'Bản trên máy chủ', status: 'draft' } });
      }
      return route.fulfill({ json: { items: [], nextCursor: null, unreadCount: 0 } });
    });
    let page = await context.newPage();
    const observe = (p) => {
      currentPage = p;
      p.on('pageerror', (e) => errors.push(e.message));
      p.on('dialog', (d) => d.accept());
      p.setDefaultTimeout(15000);
    };
    observe(page);
    const button = (name) => page.getByRole('button', { name, exact: true });
    const field = (name) => page.getByRole('textbox', { name, exact: true });
    const snapshot = async (name) => {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(output, name + '.png') });
    };
    const saved = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
    await page.goto(base + '/create?postId=qa-post');
    await field('Kể về chuyến đi của bạn').fill(caption);
    await field('Hashtag').fill('bien, banbe');
    await page.getByRole('button', { name: /Ai cũng xem được bài này/ }).click();
    await page.getByRole('button', { name: /Chia sẻ lộ trình/ }).click();
    await field('Điểm đến').fill('Nha Trang');
    await field('Chi phí ước tính / người (tuỳ chọn)').fill('2500000');
    await field('Hoạt động trong ngày').fill('Ngắm bình minh');
    await field('Giờ').fill('06:30');
    await page.getByRole('button', { name: /Thêm ngày/ }).click();
    await field('Hoạt động trong ngày').fill('Đi cà phê cùng bạn');
    await button('Xong').first().click();
    await page.getByText('Đã lưu trên thiết bị · Chưa đồng bộ máy chủ.', { exact: true }).waitFor();
    const draft = await saved();
    assert.equal(draft.content.body, caption);
    assert.equal(draft.content.hashtags, 'bien, banbe');
    assert.equal(draft.content.visibility, 'private');
    assert.equal(draft.content.hasTripPlan, true);
    assert.equal(draft.content.tripDraft.days.length, 2);
    assert.equal(draft.content.tripDraft.days[0].points[0].time, '06:30');
    assert.equal(draft.content.tripDraft.days[1].points[0].title, 'Đi cà phê cùng bạn');
    await button('Quay lại').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Tiếp tục viết', exact: true }).waitFor();
    await snapshot('exit-dialog-390');
    await page.getByRole('dialog').getByRole('button', { name: 'Tiếp tục viết', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await field('Kể về chuyến đi của bạn').inputValue(), caption);
    await button('Quay lại').click();
    await button('Lưu trên thiết bị & thoát').click();
    await page.waitForURL((url) => !url.pathname.includes('/create'));
    await page.goto(base + '/create?postId=qa-post');
    await page.getByText('Đã khôi phục bản soạn trên thiết bị này.', { exact: true }).waitFor();
    assert.equal(await field('Kể về chuyến đi của bạn').inputValue(), caption);
    assert.equal(await field('Hashtag').inputValue(), 'bien, banbe');
    await page.getByText('Chỉ mình tôi xem được', { exact: true }).waitFor();
    await snapshot('restored-390');
    checks.push(
      'header exit: continue writing / keep on device; full caption, hashtags, privacy, two-day itinerary restored',
    );

    await button('Lưu máy chủ').click();
    await button('Lưu máy chủ').waitFor({ state: 'visible' });
    assert.equal(serverRequests.length, 1);
    assert.equal((await saved()).content.body, caption, 'failed server save retains device draft');
    checks.push('offline server-save failure retains local content');
    await page.close();
    page = await context.newPage();
    observe(page);
    await page.goto(base + '/create?postId=qa-post');
    await field('Kể về chuyến đi của bạn').waitFor();
    assert.equal(await field('Kể về chuyến đi của bạn').inputValue(), caption);
    checks.push('closing and reopening the browser page restores persisted draft');
    failSave = false;
    holdUpdate = true;
    await button('Lưu máy chủ').click();
    await field('Kể về chuyến đi của bạn').fill(caption + ' Gõ tiếp trong lúc lưu.');
    await page.getByText('Đã lưu trên thiết bị · Chưa đồng bộ máy chủ.', { exact: true }).waitFor();
    assert(releaseUpdate, 'server update is held in flight');
    releaseUpdate();
    await button('Lưu máy chủ').waitFor();
    assert.equal((await saved()).content.body, caption + ' Gõ tiếp trong lúc lưu.');
    checks.push('an older successful server save does not delete newer edits typed while saving');
    await button('Lưu máy chủ').click();
    await page.waitForFunction((key) => localStorage.getItem(key) === null, key);
    checks.push('successful server save clears only its matching local draft');

    await field('Kể về chuyến đi của bạn').fill(caption + ' Viết thêm.');
    await button('Quay lại').click();
    await button('Bỏ thay đổi & thoát').click();
    await page.waitForURL((url) => !url.pathname.includes('/create'));
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), null);
    await page.goto(base + '/create?postId=qa-post');
    await field('Kể về chuyến đi của bạn').waitFor();
    assert.equal(await field('Kể về chuyến đi của bạn').inputValue(), 'Nội dung máy chủ');
    checks.push('discard removes the device copy and reloads server content');

    await field('Kể về chuyến đi của bạn').fill(caption);
    await page.getByText('Đã lưu trên thiết bị · Chưa đồng bộ máy chủ.', { exact: true }).waitFor();
    owner = 'qa-other';
    await page.reload();
    await field('Kể về chuyến đi của bạn').waitFor();
    assert.equal(await field('Kể về chuyến đi của bạn').inputValue(), 'Nội dung máy chủ');
    checks.push('another account does not restore the previous account draft');
    owner = 'qa-member';

    const fresh = recovery({
      video: {
        uri: 'blob:expired',
        durationMs: 12000,
        width: 720,
        height: 1280,
        mimeType: 'video/mp4',
        sizeBytes: 1000,
      },
    });
    await page.evaluate(
      (fresh) => localStorage.setItem('tripflix.postDraft.v1.qa-member.new', JSON.stringify(fresh)),
      fresh,
    );
    await page.goto(base + '/create');
    await page.getByText(/Video tạm không còn dùng được/).waitFor();
    assert.equal(await field('Kể về chuyến đi của bạn').inputValue(), caption);
    assert(await button('Lưu máy chủ').isDisabled());
    assert(await button('Đăng bài').isDisabled());
    const chooser = page.waitForEvent('filechooser');
    await button('Chọn lại video').click();
    await (await chooser).setFiles([]);
    await button('Chọn lại video').waitFor();
    assert.equal(
      await field('Kể về chuyến đi của bạn').inputValue(),
      caption,
      'canceling picker does not clear caption',
    );
    await page.setViewportSize({ width: 320, height: 667 });
    await button('Quay lại').click();
    // New-post header returns to video preview; the close button leaves the editor.
    await button('Quay lại').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Tiếp tục viết', exact: true }).waitFor();
    await snapshot('exit-dialog-320');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('dialog').getByRole('button', { name: 'Tiếp tục viết', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    checks.push(
      'missing temporary video warns and blocks posting; canceled media picker retains content; 320px dialog fits',
    );
    await button('Tiếp tục viết').click();
    await page.evaluate(() => {
      globalThis.qaBlockDraftWrites = true;
    });
    await field('Kể về chuyến đi của bạn').fill(caption + ' Nội dung khi bộ nhớ đầy.');
    await page
      .getByText(/Chưa lưu được trên thiết bị/)
      .first()
      .waitFor();
    await button('Quay lại').click();
    await button('Quay lại').click();
    await button('Lưu trên thiết bị & thoát').click();
    assert(await button('Bỏ thay đổi & thoát').isVisible(), 'failed device save keeps exit dialog open');
    assert.equal(new URL(page.url()).pathname, '/create');
    await snapshot('storage-failure-320');
    await page.evaluate(() => {
      globalThis.qaBlockDraftWrites = false;
    });
    await button('Lưu trên thiết bị & thoát').click();
    await page.waitForURL((url) => !url.pathname.includes('/create'));
    await page.goto(base + '/create');
    await field('Kể về chuyến đi của bạn').waitFor();
    assert.equal(await field('Kể về chuyến đi của bạn').inputValue(), caption + ' Nội dung khi bộ nhớ đầy.');
    checks.push('storage-full failure prevents leaving; retry succeeds and restores unsaved text');
    assert.deepEqual(errors, []);
    await writeFile(
      join(output, 'qa-results.json'),
      JSON.stringify(
        {
          passed: checks.length,
          checks,
          errors,
          native: 'Android Back/swipe/background/force-stop and native file recovery not run.',
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
    await context.close();
  } finally {
    if (currentPage && !currentPage.isClosed()) {
      await currentPage.screenshot({ path: join(output, 'last-state.png') });
      await writeFile(join(output, 'last-state.txt'), await currentPage.locator('body').innerText());
    }
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
