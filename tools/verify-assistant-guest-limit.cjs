// Khách chat Tripi không cần đăng nhập; hết lượt (AI trả 429 GUEST_LIMIT_REACHED, loginRequired) thì mời
// đăng nhập; đăng nhập xong quay lại khung chat, các tin cũ còn nguyên, app tự gửi lại câu bị chặn kèm token + lịch sử.
// Chạy với Expo web: MOBILE_PREVIEW_URL=http://localhost:8090 PLAYWRIGHT_PACKAGE=<playwright> node tools/verify-assistant-guest-limit.cjs
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8090';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'tripi-guest-limit');
const GUEST_TURNS = 2;
const token = { accessToken: 'qa-access', tokenType: 'Bearer', expiresIn: 900 };
const profile = {
  id: 'qa-guest-to-member',
  email: 'guest@example.test',
  displayName: 'QA Guest',
  role: 'member',
  createdAt: '2026-11-17T00:00:00Z',
  emailVerified: true,
  phone: null,
  dateOfBirth: '2000-05-20',
  gender: 'female',
  nationality: 'VN',
  // Đã làm khảo sát: đăng nhập xong quay thẳng về khung chat, không chen màn onboarding.
  travelPreferences: {
    status: 'completed',
    interests: ['coast'],
    regions: [],
    budgetLevels: [],
    updatedAt: '2026-11-17T00:00:00Z',
  },
};
const sse = (text) =>
  [
    ['text', { delta: text }],
    ['done', { kind: 'answer', degraded: [] }],
  ]
    .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join('');
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const chats = [];
  let isAuthenticated = false;
  let guestTurns = 0;
  await context.route('**/chat', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const body = request.postDataJSON();
    const authorization = (await request.allHeaders()).authorization ?? null;
    chats.push({
      authorization,
      message: body.message,
      history: body.history,
      conversationId: body.conversationId,
    });
    if (!authorization && ++guestTurns > GUEST_TURNS)
      return route.fulfill({
        status: 429,
        headers: { ...cors, 'content-type': 'application/json' },
        body: JSON.stringify({
          code: 'GUEST_LIMIT_REACHED',
          message: 'Bạn đăng nhập để chat tiếp với Tripi nha, cuộc trò chuyện vẫn được giữ.',
          retryAfterSeconds: 3600,
          loginRequired: true,
        }),
      });
    return route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'text/event-stream' },
      body: sse(`Trả lời số ${chats.length} cho: ${body.message}`),
    });
  });
  await context.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/refresh')
      return route.fulfill(isAuthenticated ? { json: token } : { status: 401, json: {} });
    if (path === '/api/auth/password-key')
      return route.fulfill({
        json: {
          keyId: 'qa',
          publicKey: Buffer.from([9, ...new Uint8Array(31)]).toString('base64url'),
          serverTime: Math.floor(Date.now() / 1000),
        },
      });
    if (path === '/api/auth/login') {
      isAuthenticated = true;
      return route.fulfill({ json: token });
    }
    if (path === '/api/auth/me')
      return route.fulfill(isAuthenticated ? { json: profile } : { status: 401, json: {} });
    return route.fulfill({ json: { items: [], nextCursor: null, unreadCount: 0 } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const input = page.getByRole('textbox', { name: 'Bạn muốn đi đâu cùng Tripi?' });
  const send = async (text) => {
    await input.fill(text);
    await page.getByRole('button', { name: 'Gửi tin nhắn cho Tripi' }).click();
  };
  try {
    await page.goto(`${base}/assistant`);
    await input.waitFor({ timeout: 90000 });

    // 1) Khách chat được, không bị đòi đăng nhập, không gửi token.
    await send('Đi Đà Lạt 2 ngày');
    await page.getByText('Trả lời số 1 cho: Đi Đà Lạt 2 ngày').waitFor();
    await send('Thời tiết sao?');
    await page.getByText('Trả lời số 2 cho: Thời tiết sao?').waitFor();
    assert.equal(chats.filter((chat) => chat.authorization).length, 0, 'Khách không gửi token');
    assert.deepEqual(
      chats[1].history.map((turn) => turn.text),
      ['Đi Đà Lạt 2 ngày', 'Trả lời số 1 cho: Đi Đà Lạt 2 ngày'],
      'Lượt sau của khách gửi kèm lịch sử',
    );
    process.stdout.write('ok - khách chat được không cần đăng nhập, có lịch sử\n');

    // 2) Hết lượt: mời đăng nhập, câu bị từ chối vẫn hiện, ô nhập vẫn dùng được.
    await send('Gợi ý chỗ ở');
    await page.getByText('Bạn đã dùng hết lượt chat thử hôm nay', { exact: false }).waitFor();
    const login = page.getByRole('button', { name: 'Đăng nhập', exact: true });
    await login.waitFor();
    assert.equal(
      await page.getByText('Gợi ý chỗ ở', { exact: true }).count(),
      1,
      'Câu hỏi bị từ chối vẫn hiện',
    );
    await page.screenshot({ path: join(output, '1-guest-limit.png') });
    process.stdout.write('ok - hết lượt khách: hiện lời mời và nút Đăng nhập\n');

    // 3) Đăng nhập rồi quay lại khung chat với các tin cũ.
    await login.click();
    await page.waitForURL(
      (url) => url.pathname === '/login' && url.searchParams.get('returnTo') === '/assistant',
    );
    await page.getByLabel('Email', { exact: true }).fill(profile.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill('QA-guest-limit-2026!');
    await page.getByRole('button', { name: 'Đăng nhập & tiếp tục', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/assistant');
    await input.waitFor();
    for (const text of [
      'Đi Đà Lạt 2 ngày',
      'Trả lời số 1 cho: Đi Đà Lạt 2 ngày',
      'Trả lời số 2 cho: Thời tiết sao?',
    ])
      await page.getByText(text, { exact: true }).waitFor();
    process.stdout.write('ok - đăng nhập xong quay về /assistant, các tin cũ còn nguyên\n');

    // 4) App tự gửi lại câu bị chặn với token và lịch sử cũ; lời mời đăng nhập không còn trên màn.
    await page.getByText('Trả lời số 4 cho: Gợi ý chỗ ở').waitFor();
    assert.equal(chats.length, 4, 'Gửi lại đúng một lần');
    const last = chats.at(-1);
    assert.equal(last.message, 'Gợi ý chỗ ở', 'Gửi lại đúng câu bị chặn');
    assert.equal(last.authorization, 'Bearer qa-access', 'Sau đăng nhập gửi kèm token');
    assert.equal(last.conversationId, chats[0].conversationId, 'Giữ cùng cuộc trò chuyện');
    assert.deepEqual(
      last.history.map((turn) => turn.text),
      [
        'Đi Đà Lạt 2 ngày',
        'Trả lời số 1 cho: Đi Đà Lạt 2 ngày',
        'Thời tiết sao?',
        'Trả lời số 2 cho: Thời tiết sao?',
      ],
      'Lịch sử của khách được gửi tiếp, không có câu bị từ chối và lời mời đăng nhập',
    );
    assert.equal(
      await page.getByText('Bạn đã dùng hết lượt chat thử hôm nay', { exact: false }).count(),
      0,
      'Bỏ lời mời đăng nhập',
    );
    assert.equal(
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).count(),
      0,
      'Bỏ nút Đăng nhập cũ',
    );
    assert.equal(await page.getByText('Gợi ý chỗ ở', { exact: true }).count(), 1, 'Câu hỏi chỉ hiện một lần');
    process.stdout.write(
      'ok - tự gửi lại câu bị chặn: có token, cùng cuộc trò chuyện, giữ lịch sử, bỏ lời mời cũ\n',
    );

    // 5) Chat tiếp bình thường sau đó.
    await send('Còn vé máy bay?');
    await page.getByText('Trả lời số 5 cho: Còn vé máy bay?').waitFor();
    assert.equal(chats.at(-1).history.length, 6, 'Lượt sau có cả câu vừa gửi lại trong lịch sử');
    process.stdout.write('ok - chat tiếp bình thường sau khi gửi lại\n');
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(output, '2-after-login.png') });
    assert.deepEqual(errors, [], 'Không có lỗi runtime');
    process.stdout.write(`PASS. Ảnh: ${output}\n`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
