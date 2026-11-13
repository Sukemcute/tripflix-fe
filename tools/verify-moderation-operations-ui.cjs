const runtime = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const output = path.resolve('../../outputs/admin-operations-ui-20261113');
async function main() {
  assert.ok(process.env.OPERATIONS_QA_PASSWORD);
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://localhost:3200/login?returnTo=%2Fmoderation');
    await page.getByLabel('Email', { exact: true }).fill('moderator@tripflix.local');
    await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.OPERATIONS_QA_PASSWORD.trim());
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    for (const tab of ['Nhật ký thao tác', 'Scan cần phục hồi']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      const panel = page.getByRole('region', { name: tab, exact: true });
      await expect(panel).toBeVisible();
      if (tab === 'Nhật ký thao tác') {
        const table = panel.getByRole('table');
        await expect(table.getByRole('row').nth(1)).toBeVisible();
        const headers = await table.getByRole('columnheader').all();
        for (let i = 1; i < headers.length; i++) {
          const prev = await headers[i - 1].boundingBox();
          const cur = await headers[i].boundingBox();
          assert.ok(cur.x >= prev.x + prev.width - 1, 'log columns must not overlap');
        }
        const more = panel.getByRole('button', { name: 'Xem thêm', exact: true });
        if (await more.count()) {
          const count = await table.getByRole('row').count();
          await more.click();
          await expect.poll(() => table.getByRole('row').count()).toBeGreaterThan(count);
        }
      } else {
        await expect(
          panel.getByRole('button', { name: 'Lên lịch thử lại', exact: true }).first(),
        ).toBeVisible();
      }
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await panel.scrollIntoViewIfNeeded();
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 2),
          `${tab}: page overflow at ${width}`,
        );
        if (tab === 'Scan cần phục hồi') {
          const button = await panel
            .getByRole('button', { name: 'Lên lịch thử lại', exact: true })
            .first()
            .boundingBox();
          assert.ok(button.x >= 0 && button.x + button.width <= width, 'retry button fits screen');
        }
        await page.screenshot({
          path: path.join(output, `${tab === 'Nhật ký thao tác' ? 'log' : 'scans'}-${width}.png`),
        });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(output, 'result.json'),
      JSON.stringify(
        {
          result: 'passed',
          source: 'real local API',
          checks: [
            'log column spacing',
            'load more history',
            'retry button layout',
            'no page overflow at 1440/768/390',
            'no browser errors',
          ],
          mutations: 'none',
        },
        null,
        2,
      ),
    );
    process.stdout.write('Moderation log and scans UI: passed (real API, 1440/768/390px, no mutations)\n');
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  process.stderr.write(String(error.stack || error));
  process.exitCode = 1;
});
