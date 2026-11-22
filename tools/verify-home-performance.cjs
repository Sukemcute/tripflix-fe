// Uses an external Playwright installation, without adding an app dependency.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

const output = process.env.HOME_EVIDENCE_DIR || join(tmpdir(), 'tripflix-home-performance');
const base = process.env.HOME_PREVIEW_URL || 'http://localhost:3100';
const cpuThrottle = Number(process.env.HOME_CPU_THROTTLE || 4);

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.HOME_BROWSER_CHANNEL || 'msedge' });
  const browserClient = await browser.newBrowserCDPSession();
  const { gpu } = await browserClient.send('SystemInfo.getInfo');
  const results = [];
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        const nativeFrame = window.requestAnimationFrame.bind(window);
        window.__frames = [];
        window.requestAnimationFrame = (callback) => nativeFrame((now) => {
          const start = performance.now();
          callback(now);
          window.__frames.push(performance.now() - start);
        });
      });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.locator('[data-home-hero]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
      const metrics = await page.evaluate(async () => {
        const home = document.querySelector('[data-living-home]');
        const canvas = home.querySelector('canvas');
        const search = document.querySelector('#ota-search');
        const start = search.getBoundingClientRect().bottom + scrollY;
        scrollTo({ top: start, behavior: 'instant' });
        await new Promise((resolve) => setTimeout(resolve, 400));
        window.__frames.length = 0;
        const gaps = [];
        let backdropDuringScroll;
        let previous = performance.now();
        const begin = previous;
        await new Promise((resolve) => {
          function scroll(now) {
            gaps.push(now - previous);
            previous = now;
            const progress = Math.min(1, (now - begin) / 5000);
            if (progress > 0.3 && backdropDuringScroll === undefined) {
              backdropDuringScroll = getComputedStyle(home.querySelector('button[aria-label="Tương tác với mặt nước"]')).backdropFilter;
            }
            scrollTo({ top: start + (document.documentElement.scrollHeight - innerHeight - start) * progress, behavior: 'instant' });
            if (progress < 1) requestAnimationFrame(scroll);
            else resolve();
          }
          requestAnimationFrame(scroll);
        });
        const frames = window.__frames.slice();
        const percentile = (values, fraction) => values.toSorted((a, b) => a - b)[Math.floor((values.length - 1) * fraction)];
        return {
          callbacks: frames.length,
          callbackTotalMs: Math.round(frames.reduce((sum, n) => sum + n, 0)),
          callbackP95Ms: +percentile(frames, 0.95).toFixed(2),
          scrollGapP95Ms: +percentile(gaps, 0.95).toFixed(2),
          scrollFramesOver34Ms: gaps.filter((n) => n > 34).length,
          canvasWidth: canvas.width,
          waterVisible: home.hasAttribute('data-water-visible'),
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
          backdropDuringScroll,
        };
      });
      assert.ok(metrics.waterVisible && metrics.canvasWidth > 1, 'Water must remain visible after scrolling');
      assert.equal(metrics.horizontalOverflow, false, 'No horizontal overflow');
      assert.equal(metrics.backdropDuringScroll, viewport.width > 900 ? 'none' : 'blur(14px)', 'Only desktop suspends glass sampling during scroll');
      await page.waitForFunction(() => !document.querySelector('[data-living-home]').hasAttribute('data-home-scrolling'));
      assert.equal(await page.getByRole('button', { name: 'Tương tác với mặt nước', exact: true }).evaluate((button) => getComputedStyle(button).backdropFilter), 'blur(14px)', 'Glass must return when scrolling stops');
      if (!process.env.HOME_ALLOW_LEGACY_VISIBILITY) {
        assert.equal(await page.locator('[data-home-hero]').getAttribute('data-home-paused'), '', 'Offscreen hero animations must pause');
      }
      await page.screenshot({ path: join(output, `${viewport.width}-water.png`) });
      // The keyboard interaction must still work after scrolling and after changing motion preferences.
      const controls = page.getByRole('button', { name: 'Tương tác với mặt nước', exact: true });
      await controls.focus();
      await page.keyboard.press('Enter');
      assert.equal(await controls.getAttribute('data-ripple-used'), '');
      await page.keyboard.press(' ');
      assert.equal(await controls.getAttribute('data-food-used'), '');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => { document.activeElement.blur(); scrollTo({ top: 0, behavior: 'instant' }); });
      await page.waitForFunction(() => scrollY < 1);
      metrics.waterActiveAtTop = await page.locator('[data-living-home]').evaluate((home) => home.hasAttribute('data-water-visible'));
      if (!process.env.HOME_ALLOW_LEGACY_VISIBILITY) assert.equal(metrics.waterActiveAtTop, false, 'Water must stop behind the hero');
      if (!process.env.HOME_ALLOW_LEGACY_VISIBILITY) {
        await page.waitForFunction(() => !document.querySelector('[data-home-hero]').hasAttribute('data-home-paused'));
      }
      await page.screenshot({ path: join(output, `${viewport.width}-hero.png`) });
      assert.deepEqual(errors, [], 'No uncaught browser errors');
      results.push({ viewport, cpuThrottle, ...metrics });
      await page.close();
    }
    await writeFile(join(output, 'metrics.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ output, gpuCompositing: gpu.featureStatus.gpu_compositing, results }, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
