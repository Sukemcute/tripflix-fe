import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BusyLabel, LoadingDots } from './loading-dots';

describe('LoadingDots', () => {
  it('tải cả vùng thì nằm trong khối căn giữa', () => {
    expect(renderToStaticMarkup(<LoadingDots isBlock />)).toMatch(/^<output class="loading-dots-block">/);
    expect(renderToStaticMarkup(<LoadingDots />)).not.toContain('loading-dots-block');
  });
});

describe('BusyLabel', () => {
  it('đang bận thì vẫn giữ chữ (ẩn) để nút không đổi kích thước, và hiện ba chấm', () => {
    const html = renderToStaticMarkup(<BusyLabel isBusy>Đặt phòng</BusyLabel>);
    expect(html).toContain('<span class="loading-dots-slot-hidden">Đặt phòng</span>');
    expect(html).toContain('loading-dots-row');
  });

  it('không bận thì chỉ hiện chữ', () => {
    const html = renderToStaticMarkup(<BusyLabel isBusy={false}>Đặt phòng</BusyLabel>);
    expect(html).toContain('<span>Đặt phòng</span>');
    expect(html).not.toContain('loading-dots-row');
  });
});
