// Real Core/Redis/Postgres/Admin/OpenAI. S3 bytes are the real FFmpeg artifact,
// served by Playwright for CDN requests and by the explicit AI proof adapter.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_PACKAGE || 'playwright') + '/test');
const { api } = require('./verify-creator-comment-controls-live.cjs');
const { login } = require('./verify-be10-live.cjs');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve(process.env.BE09_FRAME_PROOF_DIR || '../be09-video-acceptance');
const sql = (q) =>
  execFileSync(
    'docker',
    ['exec', 'tripflix-postgres-1', 'psql', '-U', 'postgres', '-d', 'core', '-At', '-c', q],
    { encoding: 'utf8' },
  ).trim();
async function main() {
  await expect
    .poll(
      async () => {
        try {
          return (await fetch('http://localhost:3000/health')).status;
        } catch {
          return 0;
        }
      },
      { timeout: 60000, intervals: [1000] },
    )
    .toBe(200);
  const password = process.env.CREATOR_QA_PASSWORD?.trim();
  assert.ok(password);
  const owner = (await api('/auth/login', null, 'POST', { email: 'member@tripflix.local', password }))
    .accessToken;
  const staff = (await api('/auth/login', null, 'POST', { email: 'moderator@tripflix.local', password }))
    .accessToken;
  const authorId = JSON.parse(Buffer.from(owner.split('.')[1], 'base64url')).sub;
  assert.match(authorId, /^[0-9a-f-]{36}$/);
  const assetId = randomUUID(),
    prefix = `qa/videos/${assetId}/r1`;
  sql(
    `insert into content.media_assets (id,owner_id,kind,status,mime_type,file_size_bytes,source_key,hls_prefix,duration_sec,aspect) values ('${assetId}','${authorId}','video','ready','video/mp4',100,'qa/${assetId}/source.mp4','${prefix}',6,'16:9')`,
  );
  sql(`insert into content.renditions (asset_id,level) values ('${assetId}',360)`);
  const title = 'BE09 video nghiệm thu ' + Date.now();
  const postId = (
    await api(
      '/v1/posts',
      owner,
      'POST',
      {
        post_type: 'video',
        title,
        body: 'Video kiểm tra lấy mẫu có cảnh giữa khác cảnh đầu và cuối.',
        media_ids: [assetId],
        cover_media_id: assetId,
      },
      201,
    )
  ).id;
  await api(`/v1/posts/${postId}/publish`, owner, 'POST', undefined, 201);
  const endpoint = `/v1/admin/moderation/posts/${postId}/parts`;
  await api(endpoint, null, 'GET', undefined, 401);
  await api(endpoint, owner, 'GET', undefined, 403);
  let evidence;
  await expect
    .poll(
      async () => {
        evidence = await api(endpoint, staff);
        return evidence.items.find((i) => i.modality === 'video_sampling')?.status;
      },
      { timeout: 90000, intervals: [1000] },
    )
    .toBe('waiting');
  await expect
    .poll(() => sql(`select request_id from content.media_frame_scans where asset_id='${assetId}'`).length, {
      timeout: 90000,
      intervals: [1000],
    })
    .toBe(36);
  const requestId = sql(`select request_id from content.media_frame_scans where asset_id='${assetId}'`);
  assert.match(requestId, /^[0-9a-f-]{36}$/);
  const extracted = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8'));
  const manifest = {
    ...extracted,
    assetId,
    requestId,
    hlsPrefix: prefix,
    frames: extracted.frames.map((f) => ({
      timestampMs: f.timestampMs,
      key: `${prefix}/moderation/uniform-v1/${requestId}/${f.timestampMs}.jpg`,
    })),
  };
  execFileSync('docker', [
    'exec',
    'tripflix-redis-1',
    'redis-cli',
    'XADD',
    'stream:media',
    '*',
    'event',
    JSON.stringify({
      eventId: randomUUID(),
      type: 'media.frames.completed',
      version: 1,
      occurredAt: new Date().toISOString(),
      producer: 'video-worker-proof',
      userId: authorId,
      payload: manifest,
    }),
  ]);
  await expect
    .poll(
      async () => {
        evidence = await api(endpoint, staff);
        return evidence.items.filter((i) => i.modality === 'video_frame' && i.status === 'passed').length;
      },
      { timeout: 120000, intervals: [1000] },
    )
    .toBe(3);
  assert.deepEqual(
    evidence.items.filter((i) => i.modality === 'video_frame').map((i) => i.timestampMs),
    [0, 2950, 5900],
  );
  assert.ok(
    evidence.items
      .filter((i) => i.modality === 'video_frame')
      .every(
        (i) => i.model === 'omni-moderation-latest' && i.sampleDurationMs === 6000 && i.sampleCount === 3,
      ),
  );
  await api(
    `/v1/posts/${postId}/reports`,
    staff,
    'POST',
    { reasonCode: 'OTHER', reasonDetail: 'QA video sampled frames' },
    201,
  );
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(`https://d399hxccn6y84z.cloudfront.net/${prefix}/**`, async (route) => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1);
      const file = name === 'poster_540.jpg' ? '0.jpg' : name;
      if (!/^(0|2950|5900)\.jpg$|^master\.m3u8$|^seg\d{3}\.ts$/.test(file)) {
        await route.abort();
        return;
      }
      await route.fulfill({
        status: 200,
        body: await readFile(path.join(output, file)),
        headers: {
          'access-control-allow-origin': 'http://localhost:3200',
          'access-control-allow-credentials': 'true',
          'content-type': file.endsWith('.jpg')
            ? 'image/jpeg'
            : file.endsWith('.m3u8')
              ? 'application/vnd.apple.mpegurl'
              : 'video/mp2t',
        },
      });
    });
    await login(page, 'moderator@tripflix.local', postId);
    const region = page.getByRole('region', { name: 'Kết quả quét caption và ảnh' });
    await expect(region.getByText('Phạm vi lấy mẫu video', { exact: true })).toBeVisible();
    await expect(region.getByText('3/3 khung hình đã có kết quả', { exact: true })).toBeVisible();
    await region.getByRole('button', { name: 'Xem video tại 0:02.950', exact: true }).click();
    const video = region.locator('video');
    await expect
      .poll(() => video.evaluate((v) => v.readyState), { timeout: 30000 })
      .toBeGreaterThanOrEqual(3);
    await expect
      .poll(() => video.evaluate((v) => Math.abs(v.currentTime - 2.95)), { timeout: 15000 })
      .toBeLessThan(0.15);
    await expect.poll(() => video.evaluate((v) => v.seeking), { timeout: 15000 }).toBe(false);
    assert.equal(await video.evaluate((v) => v.error?.code ?? null), null);
    await video.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'video-timestamp-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await region.getByText('Khung hình video · 0:02.950', { exact: true }).scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: path.join(output, 'video-frames-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
  await writeFile(
    path.join(output, 'result.json'),
    JSON.stringify(
      {
        postId,
        assetId,
        title,
        storageFixture: true,
        realFFmpeg: true,
        realCore: true,
        realRedis: true,
        realOpenAI: true,
        apiMocked: false,
        cdnBytesIntercepted: true,
        playbackTimestamp: 2.95,
        evidence,
      },
      null,
      2,
    ),
  );
  // Remove the fixture-only post: its frame URLs do not exist in S3 without credentials.
  await api(`/v1/posts/${postId}`, owner, 'DELETE', undefined, 200);
  console.log(
    JSON.stringify({
      postId,
      frames: 3,
      realOpenAI: true,
      playbackTimestamp: 2.95,
      fixturePostDeleted: true,
    }),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
