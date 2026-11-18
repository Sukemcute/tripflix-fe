// Chụp khung chat Tripi (SCRUM-167) trên Expo web với AI giả lập (SSE): chào, đang nghĩ, lộ trình,
// thời tiết, câu trả lời dài + 5 thẻ, ở 375/390/430px. Kiểm tra các nút và dữ liệu vẫn hiện đủ.
// MOBILE_PREVIEW_URL=http://localhost:8090 PLAYWRIGHT_PACKAGE=<playwright> node tools/verify-assistant-chat-design.cjs
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MOBILE_PREVIEW_URL || 'http://localhost:8090';
const output = process.env.MOBILE_EVIDENCE_DIR || join(require('node:os').tmpdir(), 'tripi-chat-design');
const now = new Date().toISOString();
const card = (fields) => ({
  priceFrom: null,
  priceBasis: 'unavailable',
  currency: 'VND',
  observedAt: now,
  ...fields,
});
const sse = (events) =>
  events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');

const TURNS = [
  {
    ask: 'Lên lộ trình Đà Lạt 2 ngày giúp mình',
    events: [
      [
        'text',
        {
          delta:
            'Lộ trình Đà Lạt 2 ngày đây nè, xếp từ khách sạn ở trung tâm. Bạn xuất phát từ đâu để mình gợi ý cách đi nha?',
        },
      ],
      [
        'cards',
        {
          items: [
            card({
              ref: 'r1',
              id: 'plan:da-lat',
              kind: 'itinerary',
              title: 'Đà Lạt 2 ngày',
              source: '© OpenStreetMap',
              lines: [
                { label: 'Ngày 1 · Sáng', detail: 'Quảng trường Lâm Viên · khoảng 1.2 km, 5 phút' },
                { label: 'Ngày 1 · Chiều', detail: 'Đồi chè Cầu Đất · khoảng 22 km, 40 phút' },
                { label: 'Ngày 1 · Tối', detail: 'Chợ đêm Đà Lạt · khoảng 23 km, 42 phút' },
                { label: 'Ngày 2 · Sáng', detail: 'Hồ Tuyền Lâm · khoảng 7 km, 15 phút' },
                { label: 'Ngày 2 · Chiều', detail: 'Thiền viện Trúc Lâm · khoảng 1 km, 4 phút' },
              ],
            }),
          ],
        },
      ],
      ['suggestions', { items: ['Mình đi từ TP.HCM', 'Đổi chỗ ở', 'Thời tiết những ngày đó'] }],
      ['done', { kind: 'answer', degraded: [] }],
    ],
    expect: ['Quảng trường Lâm Viên', 'Ngày 2', '2 ngày · 5 điểm dừng', 'Mình đi từ TP.HCM'],
    shot: 'c-itinerary',
  },
  {
    ask: 'Thời tiết cuối tuần sao?',
    events: [
      [
        'text',
        {
          delta:
            'Cuối tuần ở Đà Lạt khoảng 15–23°C, chiều thứ Bảy có thể mưa rào nha. Mang áo khoác mỏng với áo mưa cho chắc nè.',
        },
      ],
      [
        'cards',
        {
          items: [
            card({
              ref: 'r1',
              id: 'weather:da-lat',
              kind: 'weather',
              title: 'Thời tiết Đà Lạt',
              source: 'Open-Meteo.com',
              lines: [
                { label: 'T7 22/11', detail: '15–22°C, mưa rào, mưa 60%' },
                { label: 'CN 23/11', detail: '16–23°C, nắng nhẹ, mưa 20%' },
              ],
            }),
          ],
        },
      ],
      ['done', { kind: 'answer', degraded: [] }],
    ],
    expect: ['15–22°', '60% mưa', 'Open-Meteo.com'],
    shot: 'd-weather',
  },
  {
    ask: 'Gợi ý chỗ ở, vé và đồ cần mang luôn nha',
    events: [
      [
        'text',
        {
          delta:
            'Mình gom đủ cho bạn nè: hai chỗ ở gần chợ đêm, một chuyến bay sáng thứ Bảy, vài reel để xem trước, và danh sách đồ nên mang vì dự báo có mưa chiều thứ Bảy. Giá phòng và vé là giá tham khảo lúc mình tìm, bấm từng thẻ để xem giá mới nhất trước khi đặt nhé. Muốn đổi ngày hay thêm người thì nhắn mình là được.',
        },
      ],
      [
        'cards',
        {
          items: [
            card({
              ref: 'r1',
              id: 'S-1',
              kind: 'stay',
              title: 'Dalat Wonder Resort',
              priceFrom: 1250000,
              priceBasis: 'indicative_per_night',
            }),
            card({
              ref: 'r2',
              id: 'S-2',
              kind: 'stay',
              title: 'The Kupid Hotel gần chợ đêm',
              priceFrom: 680000,
              priceBasis: 'indicative_per_night',
            }),
            card({
              ref: 'r3',
              id: 'F-1',
              kind: 'flight',
              title: 'SGN → DLI · 07:10 thứ Bảy',
              priceFrom: 990000,
              priceBasis: 'per_ticket',
              fromAirport: 'SGN',
              toAirport: 'DLI',
              flightDate: '2026-11-22',
              passengers: 2,
            }),
            card({
              ref: 'r4',
              id: 'checklist:da-lat',
              kind: 'checklist',
              title: 'Đồ nên mang',
              lines: [
                { label: 'Áo khoác mỏng', detail: 'Tối xuống 15°C' },
                { label: 'Áo mưa hoặc ô', detail: 'Chiều thứ Bảy 60% mưa' },
              ],
            }),
            card({ ref: 'r5', id: 'P-9', kind: 'video', title: 'Săn mây Đà Lạt 4h sáng' }),
          ],
        },
      ],
      ['suggestions', { items: ['Đổi ngày', 'Thêm 1 người'] }],
      ['done', { kind: 'answer', degraded: [] }],
    ],
    expect: ['Dalat Wonder Resort', 'SGN → DLI · 07:10 thứ Bảy', 'Áo khoác mỏng', 'Đổi ngày'],
    shot: 'e-long-5-cards',
  },
];

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  const errors = [];
  try {
    for (const width of [375, 390, 430]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: width === 375 ? 'reduce' : 'no-preference',
      });
      let turn = 0;
      await context.route('**/chat', async (route) => {
        if (route.request().method() === 'OPTIONS')
          return route.fulfill({
            status: 204,
            headers: {
              'access-control-allow-origin': '*',
              'access-control-allow-headers': '*',
              'access-control-allow-methods': '*',
            },
          });
        const { events } = TURNS[turn++ % TURNS.length];
        await new Promise((resolve) => setTimeout(resolve, 2500));
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' },
          body: sse(events),
        });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${base}/assistant`);
      const input = page.getByRole('textbox', { name: 'Bạn muốn đi đâu cùng Tripi?' });
      await input.waitFor({ timeout: 90000 });
      await page.getByText('Chào bạn, mình là Tripi!').waitFor();
      assert.equal(
        await page.getByRole('button', { name: 'Tìm cảm hứng' }).count(),
        1,
        'Gợi ý mở đầu vẫn bấm được',
      );
      await page.screenshot({ path: join(output, `${width}-a-welcome.png`) });
      for (const [index, step] of TURNS.entries()) {
        await input.fill(step.ask);
        await page.getByRole('button', { name: 'Gửi tin nhắn cho Tripi' }).click();
        if (index === 0) {
          await page.getByLabel('Tripi đang chuẩn bị gợi ý…').waitFor();
          await page.getByText('Đang suy nghĩ…').waitFor();
          await page.screenshot({ path: join(output, `${width}-b-thinking.png`) });
        }
        for (const text of step.expect) await page.getByText(text, { exact: false }).first().waitFor();
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(output, `${width}-${step.shot}.png`) });
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `Không tràn ngang ở ${width}px`);
      process.stdout.write(`PASS ${width}px: chào, đang nghĩ, lộ trình, thời tiết, trả lời dài + 5 thẻ\n`);
      await context.close();
    }
    assert.deepEqual(errors, [], 'Không có lỗi runtime');
    process.stdout.write(`Ảnh: ${output}\n`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
