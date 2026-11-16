// TF100: hàng chờ kiểm duyệt hiện nhãn riêng cho luật dụ chuyển khoản ngoài app (dữ liệu API giả lập).
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const base = 'http://localhost:3200';
const output = path.resolve('../../outputs/admin-moderation-off-platform-20261116');
const createdAt = '2026-11-16T00:00:00.000Z';
const id = '11111111-1111-4111-8111-111111111111';
const offPlatformCase = {
  id: `${id.slice(0, -1)}1`,
  targetId: id,
  postId: id,
  authorId: id,
  targetType: 'comment',
  sources: ['rule'],
  severity: 65,
  status: 'pending',
  flags: {
    rules: [
      { code: 'PHONE_VN', category: 'SPAM_OR_COMMERCIAL', match: '0912 345 678', weight: 30 },
      { code: 'CONTACT_INVITE', category: 'SPAM_OR_COMMERCIAL', match: 'ib zalo', weight: 20 },
      { code: 'OFF_PLATFORM_PAYMENT', category: 'SCAM', match: 'chuyen khoan', weight: 65 },
    ],
    reasonCode: 'SCAM',
  },
  reportCount: 0,
  isAutoHidden: false,
  resolution: null,
  createdAt,
  updatedAt: createdAt,
  targetPreview: 'ib zalo 0912 345 678 chuyển khoản cọc giữ phòng nha',
};

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await context.route('**/*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/notifications')) return route.continue();
      const headers = {
        'access-control-allow-origin': req.headers().origin || '*',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
      };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let data = { items: [], total: 0, nextCursor: null };
      if (url.pathname.endsWith('/auth/refresh'))
        data = { accessToken: 'mock-session', tokenType: 'Bearer', expiresIn: 3600 };
      else if (url.pathname.endsWith('/auth/me') || url.pathname.endsWith('/admin/me'))
        data = { id, email: 'moderator@example.test', displayName: 'Moderator', role: 'moderator', emailVerified: true, createdAt };
      else if (/\/moderation\/queue$/.test(url.pathname) && (url.searchParams.get('view') || 'pending') === 'pending')
        data = { items: [offPlatformCase], total: 1, nextCursor: null };
      else if (url.pathname.endsWith(`/moderation/queue/${offPlatformCase.id}`))
        data = { ...offPlatformCase, target: { status: 'visible', text: offPlatformCase.targetPreview }, reports: [], actions: [] };
      return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto(`${base}/moderation`);
    const row = page.getByRole('row').filter({ hasText: offPlatformCase.targetPreview });
    await expect(row).toBeVisible();
    await expect(page.getByText('Nghi dụ chuyển tiền ngoài app').first()).toBeVisible();
    await page.screenshot({ path: path.join(output, 'queue-1440.png') });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`OK: nhãn "Nghi dụ chuyển tiền ngoài app" hiện trên hàng chờ. Ảnh: ${output}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
