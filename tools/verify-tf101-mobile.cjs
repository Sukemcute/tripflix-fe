const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_PACKAGE || 'playwright') + '/test');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const postId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const output = path.resolve(process.env.TF101_OUTPUT || '../../outputs/tf101-mobile');

class CommentsPage {
  constructor(page) { this.page = page; }
  async open() { await this.page.goto(`http://localhost:8082/trip/${postId}?comment=comment-1`, { timeout: 60000 }); }
  get notice() { return this.page.getByText('Bình luận này vi phạm Tiêu chuẩn cộng đồng', { exact: true }); }
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let hidden = false;
    let reads = 0;
    let socket;
    const watched = [];
    const post = { id: postId, authorId: userId, authorName: 'Người kiểm thử', postType: 'vlog', status: 'published', visibility: 'public',
      title: 'TF101 — Bình luận realtime', body: 'Kiểm tra bình luận bị ẩn và trạng thái hiển thị cho tác giả.',
      hashtags: [], mediaIds: [], images: [], coverMediaId: null, tripAttachment: null, reactionCounts: {}, reactionTotal: 0,
      commentCount: 1, shareCount: 0, bookmarkCount: 0, isVerified: false, createdAt: '2026-11-17T08:00:00Z', updatedAt: '2026-11-17T08:00:00Z', publishedAt: '2026-11-17T08:00:00Z' };
    const comment = () => ({ id: 'comment-1', postId, authorId: userId, authorName: 'Người kiểm thử', parentCommentId: null,
      body: hidden ? '' : 'Bình luận trước khi hệ thống kiểm duyệt', status: hidden ? 'hidden' : 'visible',
      moderationState: hidden ? 'hidden' : null, likeCount: 0, isLiked: false, replyCount: 0, isEdited: false,
      createdAt: post.createdAt, updatedAt: post.updatedAt, deletedAt: null });
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      let body = { items: [], nextCursor: null, total: 0 };
      if (url.pathname.endsWith('/auth/refresh')) body = { accessToken: 'tf101-fixture-token', tokenType: 'Bearer', expiresIn: 3600 };
      else if (url.pathname.endsWith('/auth/me')) body = { id: userId, email: 'fixture@example.test', displayName: 'Người kiểm thử', role: 'member', emailVerified: true };
      else if (url.pathname.includes('/comments')) { reads++; body = { items: [comment()], nextCursor: null, total: 1 }; }
      else if (url.pathname === `/api/v1/posts/${postId}`) body = { post: { ...post, commentCount: hidden ? 0 : 1 }, viewerContext: { myReaction: null, isBookmarked: false }, shareUrl: '' };
      else if (url.pathname === '/api/v1/posts') body = { items: [post], nextCursor: null, total: 1 };
      await route.fulfill({ json: body });
    });
    await page.route('**/notifications**', (route) => route.fulfill({ json: { items: [], nextCursor: null, unreadCount: 0 } }));
    await page.routeWebSocket(/\/ws\//, (ws) => {
      socket = ws;
      ws.send('0' + JSON.stringify({ sid: 'tf101', upgrades: [], pingInterval: 25000, pingTimeout: 20000 }));
      ws.onMessage((message) => {
        if (String(message).startsWith('40')) ws.send('40' + JSON.stringify({ sid: 'tf101' }));
        if (String(message).startsWith('42')) watched.push(JSON.parse(String(message).slice(2)));
      });
    });
    const view = new CommentsPage(page);
    await view.open();
    await expect(page.getByText('Bình luận trước khi hệ thống kiểm duyệt', { exact: true })).toBeVisible();
    await expect.poll(() => watched.some(([event]) => event === 'post.watch')).toBe(true);
    const before = reads;
    hidden = true;
    socket.send('42' + JSON.stringify(['post.comments.changed', { postId }]));
    await expect(view.notice).toBeVisible();
    assert.ok(reads > before, 'Realtime phải tải lại API bình luận');
    await expect(page.getByText('Bình luận trước khi hệ thống kiểm duyệt', { exact: true })).toHaveCount(0);
    const row = page;
    await expect(row.getByRole('button', { name: 'Tìm hiểu thêm', exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Sửa', exact: true })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Xóa', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, 'hidden-comment-expo-web.png'), fullPage: true });
    await page.getByRole('button', { name: 'Tìm hiểu thêm', exact: true }).click();
    await expect(page).toHaveURL(/moderation-status/);
    console.log('PASS: Expo web + mocked API/Socket.IO: hidden placeholder, delete, moderation navigation; screenshot saved (not Android native)');
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
