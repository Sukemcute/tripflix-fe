// Real HTTP + real Postgres/Redis. Only the failed-save check injects a 503; successful writes reach the backend.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright-core');
const { IntegrationPage } = require('../pages/integration-page.cjs');
const WEB = process.env.WEB_PREVIEW_URL || 'http://localhost:3100';
const ADMIN = process.env.ADMIN_PREVIEW_URL || 'http://localhost:3200';
const MOBILE = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8084';
const API = process.env.API_PREVIEW_URL || 'http://localhost:8080';
const OUTPUT = process.env.TRIPFLIX_EVIDENCE_DIR || join(tmpdir(), 'tripflix-api-integration');
for (const url of [WEB, ADMIN, MOBILE, API])
  assert.ok(
    ['localhost', '127.0.0.1'].includes(new URL(url).hostname),
    'This test only runs against local services',
  );
const password = process.env.TRIPFLIX_TEST_PASSWORD || 'tripflix-dev-123';
let memberPassword = password;
const email = `integration-${Date.now()}@example.test`;
const displayName = 'Kiểm thử tích hợp';
const title = `Bài kiểm thử ${Date.now()}`;
const checks = [];
const errors = [];
let memberToken;
let adminToken;
let postId;
let calendarRestore;
const extraPostIds = [];

async function api(path, method = 'GET', body, token) {
  const response = await fetch(new URL(path, API), {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'idempotency-key': crypto.randomUUID(),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = response.status === 204 ? undefined : await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
  return payload;
}
async function loginApi(account) {
  return (
    await api('/api/auth/login', 'POST', {
      email: account,
      password: account === email ? memberPassword : password,
    })
  ).accessToken;
}
async function check(name, action) {
  await action();
  checks.push(name);
  process.stdout.write(`PASS ${name}\n`);
}
async function eventually(action) {
  let failure;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      return await action();
    } catch (error) {
      failure = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw failure;
}
function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

(async () => {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const contexts = [];
  async function screen(baseUrl, mobile = false) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 412, height: 915 } : { width: 1440, height: 1000 },
    });
    contexts.push(context);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => errors.push(error.message));
    return new IntegrationPage(page, baseUrl);
  }
  const web = await screen(WEB);
  const admin = await screen(ADMIN);
  const mobile = await screen(MOBILE, true);
  try {
    await check('Web đăng ký và đăng nhập qua BE thật', async () => {
      await web.visit('/login');
      await web.click('Tạo tài khoản mới');
      await web.fill('Tên hiển thị', displayName);
      await web.fill('Email', email);
      await web.fill('Mật khẩu', password);
      await web.click('Tạo tài khoản');
      await web.page.getByRole('heading', { name: displayName, exact: true }).waitFor();
      memberToken = await loginApi(email);
      assert.equal((await api('/api/auth/me', 'GET', undefined, memberToken)).displayName, displayName);
    });
    await check('Tải lại trang khôi phục phiên bằng cookie HttpOnly', async () => {
      const before = (await web.page.context().cookies(`${API}/api/auth`)).find(
        (cookie) => cookie.name === 'tripflix_refresh',
      );
      assert.equal(before.httpOnly, true);
      assert.equal(before.path, '/api/auth');
      await web.page.reload();
      await web.page.getByRole('heading', { name: displayName, exact: true }).waitFor();
      const after = (await web.page.context().cookies(`${API}/api/auth`)).find(
        (cookie) => cookie.name === 'tripflix_refresh',
      );
      assert.notEqual(after.value, before.value);
      assert.equal(
        await web.page.evaluate(() => Object.keys(localStorage).some((key) => /token|password/i.test(key))),
        false,
      );
    });
    await check('Lưu bản nháp và đăng bài chữ vào database', async () => {
      await web.click('Chia sẻ trải nghiệm');
      await web.fill('Tiêu đề', title);
      await web.fill('Nội dung', 'Nội dung kiểm thử tích hợp FE và BE, dùng dữ liệu local.');
      await web.click('Lưu bản nháp');
      await web.visible('Bản nháp đã được lưu vào tài khoản của bạn.');
      const href = await web.page
        .getByRole('link', { name: 'Xem chi tiết', exact: true })
        .getAttribute('href');
      postId = href.split('/').pop();
      await web.visit(href);
      await web.page.getByRole('heading', { name: title, exact: true }).waitFor();
      await web.click('Đăng bài');
      await eventually(async () =>
        assert.equal(
          (await api(`/api/v1/posts/${postId}`, 'GET', undefined, memberToken)).post.status,
          'published',
        ),
      );
    });
    await check('Thích và lưu bài được giữ sau khi tải lại', async () => {
      await web.click('Thích');
      await eventually(async () =>
        assert.equal(
          (await api(`/api/v1/posts/${postId}`, 'GET', undefined, memberToken)).viewerContext.myReaction,
          'like',
        ),
      );
      await web.click('Lưu bài');
      await web.button('Bỏ lưu').waitFor();
      await web.page.reload();
      await web.button('Bỏ lưu').waitFor();
      assert.equal(await web.button('Thích').getAttribute('aria-pressed'), 'true');
      assert.equal(
        (await api('/api/v1/me/bookmarks', 'GET', undefined, memberToken)).items.some(
          (post) => post.id === postId,
        ),
        true,
      );
      await web.page.screenshot({ path: join(OUTPUT, 'web-post.png'), fullPage: true });
    });
    await check('Bình luận lỗi vẫn giữ nội dung; thử lại, sửa, xóa thành công', async () => {
      const failedBody = 'Bình luận được giữ lại khi mạng lỗi';
      await web.fill('Viết bình luận', failedBody);
      await web.page.route(`**/api/v1/posts/${postId}/comments`, async (route) =>
        route.request().method() === 'POST'
          ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
          : route.continue(),
      );
      await web.click('Gửi');
      await web.visible('Không tải được dữ liệu. Vui lòng thử lại.');
      assert.equal(await web.page.getByLabel('Viết bình luận', { exact: true }).inputValue(), failedBody);
      await web.page.unroute(`**/api/v1/posts/${postId}/comments`);
      await web.click('Gửi');
      await web.visible(failedBody);
      await web.click('Sửa');
      await web.fill('Sửa', 'Bình luận đã sửa');
      await web.click('Gửi');
      await web.visible('Bình luận đã sửa');
      await web.page
        .getByRole('article')
        .filter({ hasText: 'Bình luận đã sửa' })
        .getByRole('button', { name: 'Xóa', exact: true })
        .click();
      await eventually(async () =>
        assert.equal(
          (await api(`/api/v1/posts/${postId}/comments`)).items.some(
            (comment) => comment.body === 'Bình luận đã sửa',
          ),
          false,
        ),
      );
    });
    await check('Web tìm địa điểm, giá phòng thật và trạng thái không có phòng', async () => {
      await web.visit('/search?q=da%20nang');
      await web.button('Đà Nẵng').waitFor();
      await web.click('Đà Nẵng');
      await web.fill('Ngày nhận phòng', dateAfter(7));
      await web.fill('Ngày trả phòng', dateAfter(9));
      await web.click('Tìm phòng trống');
      const stays = await api(
        `/api/stays?placeId=da-nang&checkIn=${dateAfter(7)}&checkOut=${dateAfter(9)}&adults=2`,
      );
      assert.ok(stays.items.length);
      await web.page.getByRole('heading', { name: stays.items[0].name, exact: true }).waitFor();
      await web.page.screenshot({ path: join(OUTPUT, 'web-search.png'), fullPage: true });
      await web.fill('Giá tối đa mỗi đêm (đ)', '1');
      await web.click('Tìm phòng trống');
      await web.visible('Không có khách sạn phù hợp. Hãy đổi ngày hoặc bộ lọc.');
      const hotel = (await api('/api/suggest?q=da%20nang&types=place,hotel')).items.find(
        (entry) => entry.type === 'hotel',
      );
      await web.click(`${hotel.name}${hotel.subtitle ? ` · ${hotel.subtitle}` : ''}`);
      await web.visible(
        'Trang chi tiết khách sạn đang được hoàn thiện. Bạn vẫn có thể tìm phòng trống theo nơi đến.',
      );
      assert.equal(await web.button('Tìm phòng trống').isDisabled(), true);
    });
    await check('Admin dùng đăng nhập thật và quản lý quyền, khóa/mở khóa tài khoản', async () => {
      adminToken = await loginApi('superadmin@tripflix.local');
      await admin.login('superadmin@tripflix.local', password);
      await admin.page.getByRole('heading', { name: 'Kiểm duyệt', exact: true }).waitFor();
      await admin.visit('/staff');
      await admin.fill('Tìm kiếm', email);
      await admin.click('Tìm kiếm');
      await admin.visible(email);
      await admin.click('Cấp quyền kiểm duyệt');
      await admin.button('Gỡ quyền kiểm duyệt').waitFor();
      await admin.click('Gỡ quyền kiểm duyệt');
      await admin.button('Cấp quyền kiểm duyệt').waitFor();
      await admin.click('Khóa tài khoản');
      await admin.button('Mở khóa').waitFor();
      await assert.rejects(() => loginApi(email));
      await admin.click('Mở khóa');
      await admin.button('Khóa tài khoản').waitFor();
      memberToken = await loginApi(email);
      await admin.page.screenshot({ path: join(OUTPUT, 'admin-staff.png'), fullPage: true });
    });
    await check('Admin sửa lịch giá và đọc lại từ database', async () => {
      const roomId = process.env.TRIPFLIX_TEST_ROOM_TYPE || 'P-h-dn-01--DLX';
      const date = dateAfter(7);
      const url = `/api/admin/commerce/room-types/${encodeURIComponent(roomId)}/calendar`;
      const original = await api(`${url}?from=${date}&to=${date}`, 'GET', undefined, adminToken);
      calendarRestore = { url, from: date, to: date, price: original[0].price };
      await admin.visit('/inventory');
      await admin.fill('Mã loại phòng / chuyến bay', roomId);
      await admin.fill('Từ ngày', date);
      await admin.fill('Đến ngày', date);
      await admin.click('Xem lịch');
      await admin.page.getByRole('heading', { name: 'Lưu thay đổi', exact: true }).waitFor();
      await admin.fill('Giá', String(original[0].price + 1000));
      await admin.click('Lưu thay đổi');
      await admin.visible('Đã lưu thay đổi.');
      assert.equal(
        (await api(`${url}?from=${date}&to=${date}`, 'GET', undefined, adminToken))[0].price,
        original[0].price + 1000,
      );
      await admin.page.screenshot({ path: join(OUTPUT, 'admin-calendar.png'), fullPage: true });
      await api(url, 'PATCH', { from: date, to: date, price: original[0].price }, adminToken);
      calendarRestore = null;
    });
    await check('Kiểm duyệt ẩn/khôi phục bài và lưu lịch sử thật', async () => {
      await admin.visit('/moderation');
      const row = admin.page.getByRole('row').filter({ hasText: title });
      await row.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
      await admin.fill('Lý do', 'INTEGRATION_TEST');
      await admin.click('Ẩn bài');
      await eventually(async () =>
        assert.equal(
          (await api(`/api/v1/admin/posts/${postId}`, 'GET', undefined, adminToken)).status,
          'hidden',
        ),
      );
      const hidden = await fetch(new URL(`/api/v1/posts/${postId}`, API), {
        headers: { authorization: `Bearer ${memberToken}` },
      });
      assert.equal(hidden.status, 404);
      await admin.visible('Đã lưu thay đổi.');
      await admin.fill('Lý do', 'INTEGRATION_TEST_RESTORE');
      await admin.click('Khôi phục');
      await eventually(async () =>
        assert.equal(
          (await api(`/api/v1/posts/${postId}`, 'GET', undefined, memberToken)).post.status,
          'published',
        ),
      );
      await admin.page.screenshot({ path: join(OUTPUT, 'admin-moderation.png'), fullPage: true });
    });
    await check('Mobile web đăng nhập, khôi phục phiên, đọc bài và lưu/bỏ lưu', async () => {
      await mobile.login(email, password);
      await mobile.visible(displayName);
      await mobile.page.reload();
      await mobile.visible(displayName);
      await mobile.visit(`/trip/${postId}`);
      await mobile.visible(title);
      await mobile.button('Bỏ lưu').waitFor();
      await mobile.click('Bỏ lưu');
      await mobile.button('Lưu bài').waitFor();
      await mobile.click('Lưu bài');
      await mobile.button('Bỏ lưu').waitFor();
      await mobile.page.screenshot({ path: join(OUTPUT, 'mobile-post.png'), fullPage: true });
    });
    await check('Mobile lưu và đăng bài chữ qua API thật', async () => {
      await mobile.visit('/create');
      const mobileTitle = `Bài chữ mobile ${Date.now()}`;
      await mobile.fill('Tiêu đề', mobileTitle);
      await mobile.fill('Nội dung', 'Bài chữ kiểm thử từ mobile.');
      await mobile.click('Đăng bài');
      await mobile.visible('Đã đăng');
      const created = (await api('/api/v1/me/posts', 'GET', undefined, memberToken)).items.find(
        (post) => post.title === mobileTitle,
      );
      assert.equal(created?.status, 'published');
      extraPostIds.push(created.id);
    });
    await check('Mobile tìm phòng thật và chặn thanh toán chưa hỗ trợ', async () => {
      await mobile.visit('/search?q=da%20nang');
      await mobile.button('Đà Nẵng').waitFor();
      await mobile.click('Đà Nẵng');
      await mobile.click('Tìm phòng trống');
      await mobile.page.getByRole('heading', { name: 'Nhà cổ Cẩm Thanh', exact: true }).waitFor();
      await mobile.page.screenshot({ path: join(OUTPUT, 'mobile-search.png'), fullPage: true });
      await mobile.visit('/checkout');
      await mobile.visible(
        'Đặt chỗ và thanh toán đang được hoàn thiện. Hiện bạn có thể tìm khách sạn còn phòng và xem giá thực tế.',
      );
      assert.equal(await mobile.button('Thanh toán').count(), 0);
    });
    await check('Moderator chỉ xem kiểm duyệt; member bị chặn trang quản trị', async () => {
      const moderator = await screen(ADMIN);
      await moderator.login('moderator@tripflix.local', password);
      await moderator.page.getByRole('heading', { name: 'Kiểm duyệt', exact: true }).waitFor();
      assert.equal(await moderator.page.getByRole('link', { name: 'Nhân sự', exact: true }).count(), 0);
      await moderator.visit('/staff');
      await moderator.visible('Tính năng này dành cho quản trị viên cao nhất.');
      const memberAdmin = await screen(ADMIN);
      await memberAdmin.login(email, password);
      await memberAdmin.visible('Trang này dành cho quản trị viên và kiểm duyệt viên.');
    });
    await check('Đổi hồ sơ, mật khẩu và thu hồi phiên được lưu thật', async () => {
      // Trang tài khoản dạng hồ sơ (TF06M): xem trước, bấm "Chỉnh sửa" mới sửa; mật khẩu, thiết bị ở mục "Bảo mật & thiết bị".
      await web.login(email, password);
      await web.page.getByRole('heading', { name: displayName, exact: true }).waitFor();
      await web.click('Chỉnh sửa');
      await web.fill('Tên hiển thị', `${displayName} mới`);
      await web.fill('Số điện thoại', '0912 345 678');
      await web.click('Lưu thay đổi');
      await web.page.getByRole('heading', { name: `${displayName} mới`, exact: true }).waitFor();
      await web.page.reload();
      await web.page.getByRole('heading', { name: `${displayName} mới`, exact: true }).waitFor();
      await web.visible('0912345678');
      await web.click('Bảo mật & thiết bị');
      await web.fill('Mật khẩu hiện tại', memberPassword);
      await web.fill('Mật khẩu mới', `${password}-updated`);
      await web.fill('Nhập lại mật khẩu mới', `${password}-updated`);
      await web.click('Đổi mật khẩu');
      await web.visible('Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.');
      memberPassword = `${password}-updated`;
      memberToken = await loginApi(email);
      await web.visit('/account?tab=security');
      // Thiết bị đăng nhập qua API không có tên; thiết bị của trình duyệt có nhãn "Thiết bị hiện tại".
      const other = web.page.getByRole('listitem').filter({ hasText: 'Thiết bị chưa đặt tên' }).first();
      await other.getByRole('button', { name: 'Đăng xuất thiết bị', exact: true }).click();
      await other.waitFor({ state: 'detached' });
      const revoked = await fetch(new URL('/api/auth/me', API), {
        headers: { authorization: `Bearer ${memberToken}` },
      });
      assert.equal(revoked.status, 401);
      memberToken = await loginApi(email);
      await web.click('Đăng xuất mọi thiết bị');
      await web.click('Đăng xuất tất cả');
      await web.page.getByRole('link', { name: 'Đăng nhập', exact: true }).first().waitFor();
    });
    assert.deepEqual(errors, [], 'No browser runtime errors');
    await writeFile(
      join(OUTPUT, 'results.json'),
      JSON.stringify({ checks, browserErrors: errors, testEmail: email }, null, 2),
    );
    process.stdout.write(`Completed ${checks.length} real integration journeys. Evidence: ${OUTPUT}\n`);
  } catch (error) {
    for (const [name, screen] of [
      ['web', web],
      ['admin', admin],
      ['mobile', mobile],
    ])
      await screen.page
        .screenshot({ path: join(OUTPUT, `${name}-failure.png`), fullPage: true })
        .catch(() => {});
    await writeFile(
      join(OUTPUT, 'failure.json'),
      JSON.stringify({ checks, error: error.message, browserErrors: errors }, null, 2),
    );
    throw error;
  } finally {
    if (calendarRestore && adminToken) {
      const { url, ...body } = calendarRestore;
      await api(url, 'PATCH', body, adminToken).catch(() => {});
    }
    if (postId && memberToken) {
      memberToken = await loginApi(email).catch(() => memberToken);
      for (const id of extraPostIds)
        await api(`/api/v1/posts/${id}`, 'DELETE', undefined, memberToken).catch(() => {});
      await api(`/api/v1/posts/${postId}`, 'DELETE', undefined, memberToken).catch(() => {});
    }
    for (const context of contexts) await context.close();
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
