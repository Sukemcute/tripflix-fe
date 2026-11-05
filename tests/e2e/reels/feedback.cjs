// Deterministic API fixtures: no writes reach a backend. Native gestures still need an iPhone check.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const { ReelsPage } = require('../../pages/reels-page.cjs');
const OUTPUT = process.env.REELS_EVIDENCE_DIR || join(tmpdir(), 'tripflix-reels-feedback');
const errors = [];
const checks = [];
const record = (name) => {
  checks.push(name);
  process.stdout.write(`PASS ${name}\n`);
};

(async () => {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  let liked = false,
    saved = false,
    failNext = false,
    feedRequests = 0;
  let releaseMutation;
  let holdMutation;
  const title = 'Một sớm bình yên ở Nha Trang';
  const caption = 'Nắng sớm, biển xanh và một chuyến đi thật chậm. '.repeat(15);
  const card = () => ({
    postId: 'reel-one',
    title,
    caption,
    author: { id: 'creator', name: 'Mai Anh đi đâu', avatarUrl: null, isKol: false },
    video: {
      hlsUrl: 'https://example.test/video.m3u8',
      posters: {
        w360: '/reels-test-poster.svg',
        w540: '/reels-test-poster.svg',
        w720: '/reels-test-poster.svg',
      },
      durationSec: 10,
      aspect: '9:16',
      levels: [360],
    },
    counts: { likes: 12 + Number(liked), saves: 4 + Number(saved), comments: 24, shares: 2 },
    viewerState: { liked, saved },
    region: null,
    tags: [],
    linkedProductIds: [],
    reason: null,
  });
  await page.route('**/reels-test-poster.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960"><rect width="540" height="960" fill="#246c7c"/><path d="M0 500 Q200 380 540 520V960H0" fill="#b1d8d1"/><path d="M0 760 Q300 650 540 780V960H0" fill="#edd7ac"/></svg>',
    }),
  );
  await page.route('https://example.test/**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path.endsWith('/auth/refresh'))
      return json({ accessToken: 'fixture', tokenType: 'Bearer', expiresIn: 3600 });
    if (path.endsWith('/auth/me'))
      return json({ id: 'viewer', email: 'viewer@example.test', displayName: 'Bạn', role: 'user' });
    if (path.endsWith('/feed')) {
      feedRequests++;
      return json({ items: [card()], nextCursor: null });
    }
    if (path.endsWith('/reaction') || path.endsWith('/bookmark')) {
      if (holdMutation) await holdMutation;
      if (failNext) {
        failNext = false;
        return json({ message: 'Unavailable' }, 503);
      }
      const body = request.postDataJSON();
      if (path.endsWith('/reaction')) liked = body.type === 'like';
      else saved = body.is_bookmarked;
      return json({});
    }
    if (path.endsWith('/comments'))
      return json({
        items: Array.from({ length: 24 }, (_, i) => ({
          id: `comment-${i}`,
          authorId: 'creator',
          body: `Bình luận ${i + 1}: Nhìn biển là muốn xách balo đi ngay!`,
          createdAt: '2026-11-05T01:00:00Z',
        })),
        nextCursor: null,
      });
    if (path.endsWith('/posts/reel-one'))
      return json({
        post: {
          id: 'reel-one',
          title,
          body: caption,
          reactionTotal: 12 + Number(liked),
          bookmarkCount: 4 + Number(saved),
          commentCount: 24,
          shareCount: 2,
        },
        viewerContext: { myReaction: liked ? 'like' : null, isBookmarked: saved },
        shareUrl: 'https://example.test/reel-one',
      });
    return json({ items: [], nextCursor: null });
  });
  try {
    const view = new ReelsPage(page);
    await view.open();
    await expect(view.like).toBeVisible();
    // Wait for the initial detail request so it cannot be mistaken for a mutation refresh.
    await expect(page.getByText('Mai Anh đi đâu', { exact: true })).toBeVisible();
    const baseline = feedRequests;
    const before = await page.getByTestId('reel-reel-one').boundingBox();
    holdMutation = new Promise((resolve) => {
      releaseMutation = resolve;
    });
    await view.like.click();
    await expect(view.unlike).toBeVisible();
    await expect(view.unlike).toContainText('13');
    assert.deepEqual(await page.getByTestId('reel-reel-one').boundingBox(), before);
    releaseMutation();
    holdMutation = null;
    await expect(view.unlike).toBeEnabled();
    const save = page.getByRole('button', { name: 'Lưu bài', exact: true });
    await save.click();
    await expect(page.getByRole('button', { name: 'Bỏ lưu', exact: true })).toBeEnabled();
    assert.equal(feedRequests, baseline);
    record('like/save update immediately without feed requests or moving the reel');

    failNext = true;
    await view.unlike.click();
    await expect(view.unlike).toBeEnabled();
    await expect(view.unlike).toContainText('13');
    assert.equal(feedRequests, baseline);
    record('failed mutation restores the selected state and count');
    await page.getByRole('button', { name: 'Chưa thực hiện được. Chạm để thử lại.', exact: true }).click();
    await expect(view.like).toBeEnabled();
    record('inline retry recovers after a failed save');
    await page.screenshot({ path: join(OUTPUT, '01-collapsed.png') });

    await page.getByRole('button', { name: 'Xem thêm', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Xem bài đăng', exact: true })).toBeVisible();
    await page.screenshot({ path: join(OUTPUT, '02-expanded.png') });
    await page.getByRole('button', { name: 'Thu gọn', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Xem bài đăng', exact: true })).toBeHidden();
    record('long caption expands in a bounded scroll area and collapses');
    await page.mouse.move(195, 150);
    await page.mouse.down();
    await expect(page.getByRole('button', { name: 'Xem thêm', exact: true })).toBeHidden();
    await page.mouse.up();
    await expect(page.getByRole('button', { name: 'Xem thêm', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tạm dừng video', exact: true })).toBeVisible();
    record('hold hides the overlay; release restores it without toggling playback');

    for (const [width, height] of [
      [320, 640],
      [390, 844],
      [430, 932],
    ]) {
      await page.setViewportSize({ width, height });
      await view.open();
      await expect(view.comments).toBeVisible();
      await view.comments.click();
      await expect(view.close).toBeVisible();
      const input = page.getByRole('textbox', { name: 'Viết bình luận', exact: true });
      await expect(input).toBeVisible();
      await expect
        .poll(async () => {
          const box = await input.boundingBox();
          return box.y + box.height;
        })
        .toBeLessThanOrEqual(height);
      await view.list.evaluate((element) => {
        element.scrollTop = 350;
        element.dispatchEvent(new Event('scroll'));
      });
      await expect.poll(() => view.list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await expect(input).toBeVisible();
      await view.drag(view.list, 130);
      await expect(view.close).toBeVisible();
      if (width === 390) await page.screenshot({ path: join(OUTPUT, '03-comments.png') });
      await view.drag(view.header, 160);
      await expect(view.close).toBeHidden();
      await view.comments.click();
      await expect(view.close).toBeVisible();
      await expect
        .poll(async () => {
          const box = await input.boundingBox();
          return box.y + box.height;
        })
        .toBeLessThanOrEqual(height);
      await view.drag(view.list, 160);
      await expect(view.close).toBeHidden();
    }
    record('320/390/430px: pinned composer, list scroll arbitration, header swipe and top-of-list dismissal');
    assert.deepEqual(errors, []);
    await writeFile(
      join(OUTPUT, 'verification.json'),
      JSON.stringify(
        {
          checks,
          errors,
          platform:
            'Expo web / Chromium; mocked API. iPhone keyboard and touch arbitration need device verification.',
        },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
