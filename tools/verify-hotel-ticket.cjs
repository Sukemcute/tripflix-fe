// External Playwright runtime, matching the other verification scripts in tools/.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

const base = process.env.HOME_PREVIEW_URL || 'http://localhost:3102';
const output = process.env.HOME_EVIDENCE_DIR || join(tmpdir(), 'tripflix-hotel-ticket');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Restore the previous ticket effects in the same page, keeping content, network and viewport equal.
const oldEffects = `
  [class*="stayHeader"] { filter: drop-shadow(0 14px 28px rgba(0,108,99,.1)) !important; }
  [class*="stayHeader"]::before { content: none !important; }
  [class*="stayHeader"]:hover { filter: drop-shadow(0 24px 36px rgba(0,108,99,.18)) !important; }
  [class*="stayHeader"] > [class*="stayTicket"] { background: var(--water-glass) !important; backdrop-filter: var(--home-backdrop, blur(8px)) !important; }
`;

async function sample(page, action, duration = 3000) {
  const measuring = page.evaluate((ms) => new Promise((resolve) => {
    let previous = performance.now();
    const begin = previous;
    const gaps = [];
    function frame(now) {
      gaps.push(now - previous);
      previous = now;
      if (now - begin < ms) requestAnimationFrame(frame);
      else resolve({
        fps: +(gaps.length / ((now - begin) / 1000)).toFixed(1),
        p95Ms: +gaps.toSorted((a, b) => a - b)[Math.floor(gaps.length * 0.95)].toFixed(1),
        slowFrames: gaps.filter((gap) => gap > 34).length,
      });
    }
    requestAnimationFrame(frame);
  }), duration);
  await action();
  return measuring;
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.HOME_BROWSER_CHANNEL || 'msedge' });
  try {
    const browserClient = await browser.newBrowserCDPSession();
    const { gpu } = await browserClient.send('SystemInfo.getInfo');
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const header = page.locator('[class*="stayHeader"]').first();
    const ticket = page.locator('[class*="stayTicket"]').first();
    await header.scrollIntoViewIfNeeded();
    await header.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.decode().catch(() => {}))));
    const results = [];
    for (const mode of ['before', 'after', 'before-repeat', 'after-repeat']) {
      const style = mode.startsWith('before') ? await page.addStyleTag({ content: oldEffects }) : undefined;
      await header.scrollIntoViewIfNeeded();
      await page.mouse.move(10, 300);
      await page.waitForFunction(() => !document.querySelector('[data-living-home]').hasAttribute('data-home-scrolling'));
      await sleep(300);
      const idle = await sample(page, () => sleep(3000));
      const box = await header.boundingBox();
      const hoverStart = Date.now();
      const hover = await sample(page, async () => {
        while (Date.now() - hoverStart < 3000) {
          const t = (Date.now() - hoverStart) / 1000;
          await page.mouse.move(box.x + box.width * (0.5 + Math.sin(t * 4) * 0.3), Math.max(20, Math.min(1040, box.y + box.height / 2 + Math.sin(t * 6) * 55)), { steps: 2 });
        }
      });
      await page.mouse.move(10, 300);
      await page.evaluate(() => scrollTo({ top: document.querySelector('#ota-search').getBoundingClientRect().bottom + scrollY, behavior: 'instant' }));
      const wheelStart = Date.now();
      const wheel = await sample(page, async () => {
        while (Date.now() - wheelStart < 4000) { await page.mouse.wheel(0, 90); await sleep(100); }
      }, 4000);
      const result = { mode, idle, hover, wheel };
      results.push(result);
      console.log(JSON.stringify(result));
      await header.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => !document.querySelector('[data-living-home]').hasAttribute('data-home-scrolling'));
      await page.screenshot({ path: join(output, `${mode}-1920.png`) });
      if (style) await style.evaluate((element) => element.remove());
    }
    assert.equal(await header.evaluate((element) => getComputedStyle(element).filter), 'none');
    assert.equal(await ticket.evaluate((element) => getComputedStyle(element).backdropFilter), 'none');
    assert.equal(await ticket.evaluate((element) => getComputedStyle(element).color), 'rgb(16, 47, 54)', 'Keep ticket text readable over the night water scene');
    assert.notEqual(await ticket.evaluate((element) => getComputedStyle(element).maskImage), 'none', 'Keep desktop ticket perforations');
    assert.notEqual(await header.evaluate((element) => getComputedStyle(element, '::before').boxShadow), 'none');
    await page.getByRole('button', { name: 'Hội An', exact: true }).click();
    await page.getByRole('link', { name: 'Điểm đến Hội An', exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await header.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await ticket.evaluate((element) => getComputedStyle(element).maskImage), 'none', 'Keep the mobile layout');
    await page.screenshot({ path: join(output, 'after-mobile.png') });
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    const report = { base, viewport: '1920x1080', gpuCompositing: gpu.featureStatus.gpu_compositing, results };
    await writeFile(join(output, 'metrics.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ output, gpuCompositing: report.gpuCompositing, checks: 'passed' }));
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
