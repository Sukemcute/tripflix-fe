const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const base = process.env.POSTS_ADMIN_URL || 'http://localhost:3200';
const output = path.resolve('../../outputs/admin-posts-ui-20261113');

class PostsPage {
  constructor(page) { this.page = page; this.panel = page.getByRole('region', { name: 'Quản lý bài viết', exact: true }); }
  async open() {
    await this.page.goto(`${base}/login?returnTo=%2Fmoderation`);
    await this.page.getByLabel('Email', { exact: true }).fill('moderator@tripflix.local');
    await this.page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.POSTS_QA_PASSWORD.trim());
    await this.page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await this.page.getByRole('button', { name: 'Quản lý bài viết', exact: true }).click();
    await this.panel.getByRole('button', { name: 'Xem chi tiết', exact: true }).first().waitFor();
  }
  async checkWidth(width) {
    await this.page.setViewportSize({ width, height: 1000 });
    if (width < 1000) await this.panel.getByRole('heading', { name: 'Quản lý bài viết' }).scrollIntoViewIfNeeded();
    const overflow = await this.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 2) {
      await this.page.screenshot({ path: path.join(output, `overflow-${width}.png`), fullPage: false });
      process.stdout.write(JSON.stringify(await this.page.locator('body *').evaluateAll(elements => elements.filter(el => {
        const r = el.getBoundingClientRect(); return r.right > innerWidth + 2 && getComputedStyle(el).position !== 'fixed';
      }).slice(0, 10).map(el => ({ tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width })))) + '\n');
    }
    assert.ok(overflow <= 2, `Page overflows ${overflow}px at ${width}px`);
    const headers = await this.panel.getByRole('columnheader').all();
    for (let i = 1; i < headers.length; i++) {
      const previous = await headers[i - 1].boundingBox();
      const current = await headers[i].boundingBox();
      assert.ok(current.x >= previous.x + previous.width - 1, 'Table columns overlap');
    }
    await this.page.screenshot({ path: path.join(output, `posts-${width}.png`), fullPage: false });
  }
}

async function main() {
  assert.ok(process.env.POSTS_QA_PASSWORD, 'POSTS_QA_PASSWORD is required');
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ui = new PostsPage(page);
    await ui.open();
    for (const width of [1440, 768, 390]) await ui.checkWidth(width);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await ui.panel.getByRole('combobox').selectOption('published');
    await ui.panel.locator('tbody tr').filter({ has: page.getByRole('button', { name: 'Xem chi tiết', exact: true }) }).first().waitFor();
    const first = ui.panel.getByRole('button', { name: 'Xem chi tiết', exact: true }).first();
    await first.click();
    const detail = page.getByRole('region', { name: 'Nội dung bài', exact: true });
    await detail.getByRole('button', { name: 'Ẩn bài', exact: true }).waitFor();
    assert.ok(await detail.getByRole('button', { name: 'Ẩn bài', exact: true }).isDisabled());
    await detail.getByRole('combobox').selectOption('HARASSMENT');
    assert.ok(await detail.getByRole('button', { name: 'Ẩn bài', exact: true }).isEnabled());
    await detail.getByRole('button', { name: 'Ẩn bài', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'post-detail.png'), fullPage: false });
    assert.equal(await first.getAttribute('aria-expanded'), 'true');
    assert.deepEqual(errors, []);
    await writeFile(path.join(output, 'result.json'), JSON.stringify({ result: 'passed', widths: [1440, 768, 390],
      checks: ['real local API', 'no page overflow', 'columns do not overlap', 'status filter', 'detail opens', 'no page errors'] }, null, 2));
    process.stdout.write('Post management UI: desktop/tablet/mobile layout, filter and detail passed\n');
  } finally { await browser.close(); }
}
main().catch(error => { process.stderr.write(String(error.stack || error)); process.exitCode = 1; });
