// Run against the exported mobile app, using an externally installed Playwright.
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const baseUrl = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8084';
const evidence = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'tripi-chat-qa');

class AssistantPage {
  constructor(page) {
    this.page = page;
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  get bubble() {
    return this.button('Trò chuyện với Tripi');
  }
  get input() {
    return this.page.getByRole('textbox', { name: 'Bạn muốn đi đâu cùng Tripi?' });
  }
  async open() {
    await this.bubble.click();
    await this.input.waitFor();
  }
  async observeExpansion() {
    await this.page.evaluate(() => {
      globalThis.assistantOpeningFrames = (async () => {
        const frames = [];
        for (let i = 0; i < 150 && frames.length < 32; i++) {
          await new Promise(requestAnimationFrame);
          const frame = document.querySelector('[data-testid="assistant-morph-frame"]');
          if (frame && frame.checkVisibility({ visibilityProperty: true })) {
            const { x, y, width, height } = frame.getBoundingClientRect();
            frames.push({ x, y, width, height });
          }
        }
        return frames;
      })();
    });
    await this.open();
    return this.page.evaluate(() => globalThis.assistantOpeningFrames);
  }
  async minimize() {
    await this.button('Thu nhỏ cuộc trò chuyện').last().click();
    await this.bubble.waitFor();
  }
  async observeCollapse() {
    await this.page.evaluate(() => {
      globalThis.assistantClosingFrames = (async () => {
        const frames = [];
        for (let i = 0; i < 90; i++) {
          await new Promise(requestAnimationFrame);
          const frame = document.querySelector('[data-testid="assistant-morph-frame"]');
          if (!frame) break;
          const { x, y, width, height } = frame.getBoundingClientRect();
          frames.push({ x, y, width, height });
        }
        return frames;
      })();
    });
    await this.minimize();
    return this.page.evaluate(() => globalThis.assistantClosingFrames);
  }
  async snapshot(name) {
    await this.page.evaluate(() => document.fonts.ready);
    if (await this.page.getByTestId('assistant-morph-frame').count()) {
      await this.page.waitForFunction(() => {
        const frame = document.querySelector('[data-testid="assistant-morph-frame"]');
        return frame && frame.getBoundingClientRect().width >= Math.min(innerWidth, 430) - 1;
      });
    }
    await this.page.screenshot({ path: join(evidence, `${name}.png`) });
  }
}

(async () => {
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  });
  const errors = [];
  try {
    for (const width of [390, 320, 430]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        reducedMotion: width === 390 ? 'no-preference' : 'reduce',
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', (error) => errors.push(error.message));
      const view = new AssistantPage(page);
      await page.goto(`${baseUrl}/explore`);
      await view.bubble.waitFor();
      if (width === 390) {
        await view.snapshot('01-bubble');
        const before = await view.bubble.boundingBox();
        await page.mouse.move(before.x + 32, before.y + 32);
        await page.mouse.down();
        await page.mouse.move(40, 240, { steps: 20 });
        await page.mouse.up();
        await view.bubble.waitFor();
        const after = await view.bubble.boundingBox();
        assert.ok(after.x < width / 2 && after.y < before.y - 100, 'Bubble follows drag and docks left');
        assert.equal(await view.input.count(), 0, 'Drag must not open chat');
      }
      const frames = await view.observeExpansion();
      assert.ok(frames.length > 1, 'Opening produces visible frames');
      assert.ok(Math.abs(frames.at(-1).width - width) < 2, 'Chat expands to viewport width');
      if (width === 390) {
        assert.ok(frames[0].width < width * 0.65, 'Opening begins at bubble size, not nearly full size');
        assert.ok(frames.at(-1).height > frames[0].height * 2, 'Chat grows in both dimensions');
        assert.ok(
          frames[0].x < width / 2,
          `Opening follows bubble moved to the left: ${JSON.stringify(frames[0])}`,
        );
        process.stdout.write(
          `Morph: ${Math.round(frames[0].width)}x${Math.round(frames[0].height)} -> ${Math.round(frames.at(-1).width)}x${Math.round(frames.at(-1).height)}\n`,
        );
      } else {
        assert.ok(
          frames.every((frame) => Math.abs(frame.width - width) < 2),
          'Reduced motion skips expansion',
        );
      }
      if (width === 390) {
        const closingFrames = await view.observeCollapse();
        const last = closingFrames.at(-1);
        assert.ok(
          last.width < width * 0.5 && last.height < frames.at(-1).height * 0.5,
          'Closing contracts back to a bubble',
        );
        assert.ok(
          Math.abs(last.x - frames[0].x) < 24 && Math.abs(last.y - frames[0].y) < 24,
          'Closing returns to the measured bubble origin',
        );
        await view.open();
      }
      // Interrupt the entrance, then reopen: the exit callback must not leave an invisible modal.
      await view.button('Thu nhỏ cuộc trò chuyện').last().click({ force: true });
      await view.bubble.waitFor();
      await view.open();
      assert.equal(await view.button('Gửi tin nhắn cho Tripi').isDisabled(), true);
      await view.snapshot(`02-welcome-${width}`);
      await view.button('Tìm cảm hứng').click();
      assert.equal(await view.input.inputValue(), 'Cuối tuần này nên đi đâu gần Hà Nội?');
      await view.minimize();
      await view.open();
      assert.equal(
        await view.input.inputValue(),
        'Cuối tuần này nên đi đâu gần Hà Nội?',
        'Draft survives minimizing',
      );
      await view.button('Gửi tin nhắn cho Tripi').click();
      await page.getByText('Tripi đã nhận được ý tưởng của bạn!', { exact: false }).waitFor();
      await view.snapshot(`03-conversation-${width}`);
      await view.minimize();
      await view.open();
      await page.getByText('Cuối tuần này nên đi đâu gần Hà Nội?', { exact: true }).waitFor();
      await view.button('Bắt đầu cuộc trò chuyện mới').click();
      await view.button('Giữ cuộc trò chuyện').click();
      await page.getByText('Cuối tuần này nên đi đâu gần Hà Nội?', { exact: true }).waitFor();
      await view.button('Bắt đầu cuộc trò chuyện mới').click();
      await view.button('Bắt đầu lại').click();
      await page.getByText('ĐI ĐÂU CŨNG CÓ TRIPI').waitFor();
      assert.equal(await view.input.inputValue(), '');
      assert.equal(await page.getByText('Tripi đã nhận được ý tưởng của bạn!', { exact: false }).count(), 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, 'No horizontal overflow');
      await view.minimize();
      await page.goto(`${baseUrl}/assistant`);
      await view.input.waitFor();
      assert.equal(await view.bubble.count(), 0, 'Dedicated route has no duplicate bubble');
      await page.goto(`${baseUrl}/`);
      await view.button('Bắt đầu khám phá').click();
      await view.bubble.waitFor();
      process.stdout.write(
        `PASS ${width}px: open, drag (390), prompt, draft, send, retain, cancel reset, reset, route, feed\n`,
      );
      await context.close();
    }
    assert.deepEqual(errors, [], 'No runtime exceptions');
    process.stdout.write(`Evidence: ${evidence}\n`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
