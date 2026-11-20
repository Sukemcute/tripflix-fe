import { AssistantError, HttpError, type AssistantCard } from '@tripflix/api-client';
import { vi as copy } from '@tripflix/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { readSafeReturnTo } from '../auth/auth-return';
import { getAssistantBookingLinks, getAssistantCardHref } from './assistant-card-href';
import { AssistantCards, hasVisibleAssistantCards, type CardActions } from './assistant-cards';
import { toRefusedReply } from './assistant-transport';

const card = (patch: Partial<AssistantCard>): AssistantCard => ({
  ref: 'r1',
  id: 'p1',
  kind: 'post',
  title: 'Đà Lạt',
  priceFrom: null,
  priceBasis: 'unavailable',
  currency: 'VND',
  observedAt: '2026-11-18T00:00:00Z',
  ...patch,
});

describe('nút đặt combo trên web', () => {
  const book = (params: Record<string, string>) => ({
    type: 'book' as const,
    label: 'Đặt theo lộ trình',
    path: '/trip-builder' as const,
    params,
  });
  it('tách phòng và vé theo params, tính ngày trả phòng qua tháng bằng UTC', () => {
    expect(
      getAssistantBookingLinks(
        book({
          hotelId: 'ks 1',
          checkIn: '2026-12-31',
          nights: '2',
          adults: '2',
          flightFrom: 'SGN',
          flightTo: 'DAD',
          flightDate: '2026-12-31',
          destination: 'Đà Nẵng',
          price: '1',
          fareCode: 'FAKE',
        }),
      ),
    ).toEqual([
      {
        label: copy.assistant.bookHotel,
        href: '/hotels/ks%201?checkIn=2026-12-31&checkOut=2027-01-02&adults=2',
      },
      { label: copy.assistant.bookFlight, href: '/flights?from=SGN&to=DAD&date=2026-12-31&passengers=2' },
    ]);
  });
  it('chỉ có khách sạn thì chỉ mở phòng', () => {
    expect(getAssistantBookingLinks(book({ hotelId: 'h1' }))).toEqual([
      { label: copy.assistant.bookHotel, href: '/hotels/h1' },
    ]);
  });
  it('chỉ có chuyến bay thì chỉ mở vé', () => {
    expect(
      getAssistantBookingLinks(
        book({
          flightFrom: 'SGN',
          flightTo: 'DAD',
          flightDate: '2026-11-21',
          adults: '3',
        }),
      ),
    ).toEqual([
      { label: copy.assistant.bookFlight, href: '/flights?from=SGN&to=DAD&date=2026-11-21&passengers=3' },
    ]);
  });
  it('thiếu các phần đặt được thì không có link', () => {
    expect(getAssistantBookingLinks(book({ destination: 'Đà Nẵng', flightFrom: 'SGN' }))).toEqual([]);
    expect(getAssistantBookingLinks({ type: 'select', label: 'Chọn', ref: 'r1' })).toEqual([]);
  });
  it.each(['/flights', '/hotel-rooms', '/checkout', 'https://evil.test', '//evil.test'])(
    'bỏ đường dẫn server không được phép: %s',
    (path) => {
      expect(
        getAssistantBookingLinks({ ...book({ hotelId: 'h1' }), path } as unknown as NonNullable<
          AssistantCard['actions']
        >[number]),
      ).toEqual([]);
    },
  );
  it.each([
    { checkIn: '2026-02-30', nights: '2' },
    { checkIn: '2026-11-21', nights: '-1' },
    { checkIn: '2026-11-21', nights: '1.5' },
  ])('không tạo ngày trả phòng từ ngày/số đêm sai: %j', (params) => {
    expect(getAssistantBookingLinks(book({ hotelId: 'h1', ...params }))).toEqual([
      { label: copy.assistant.bookHotel, href: '/hotels/h1' },
    ]);
  });
});

describe('thẻ Tripi mở đúng trang web như app', () => {
  it('nơi ở mở chi tiết khách sạn', () => {
    expect(getAssistantCardHref(card({ kind: 'stay', id: 'ks 1' }))).toBe('/hotels/ks%201');
  });
  it('vé máy bay mở trang chọn vé theo tuyến, ngày, số khách', () => {
    const href = getAssistantCardHref(
      card({ kind: 'flight', fromAirport: 'SGN', toAirport: 'HAN', flightDate: '2026-12-01', passengers: 2 }),
    );
    expect(href).toBe('/flights?from=SGN&to=HAN&date=2026-12-01&passengers=2');
  });
  it('bài viết mở ở Cảm hứng, video trong feed mở dạng reel', () => {
    expect(getAssistantCardHref(card({}))).toContain('/inspiration?open=p1');
    expect(getAssistantCardHref(card({ kind: 'video' }), { isReel: true })).toContain('kind=reel');
  });
});

describe('hiển thị thẻ Tripi', () => {
  const render = (cards: AssistantCard[], actions?: CardActions) =>
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(AssistantCards, { cards, actions, onOpen: () => {} }),
      ),
    );
  const actions: CardActions = { act: () => {}, canUndo: false };
  it('ẩn thẻ bài viết, kể cả khi một lượt chỉ có loại thẻ này', () => {
    const post = card({ title: 'Cuối tuần ở nhà nấu ăn cũng vui' });
    const stay = card({ kind: 'stay', ref: 'r2', title: 'Nơi ở tại Đà Lạt' });

    expect(hasVisibleAssistantCards([post])).toBe(false);
    expect(render([post])).toBe('');
    expect(hasVisibleAssistantCards([post, stay])).toBe(true);
    const html = render([post, stay]);
    expect(html).toContain(stay.title);
    expect(html).not.toContain(post.title);
  });

  it('chỉ câu trả lời mới nhất có nút chọn chuyến', () => {
    const flight = card({
      kind: 'flight',
      actions: [{ type: 'select', label: 'Chọn chuyến này', ref: 'r1' }],
    });
    expect(render([flight], actions)).toContain('Chọn chuyến này');
    expect(render([flight])).not.toContain('<button');
  });
  it('so sánh vẫn chỉ có một nút Chọn cho mỗi ref', () => {
    const stay = card({
      kind: 'compare',
      lines: [{ label: 'Khách sạn', ref: 'o1' }],
      actions: [{ type: 'select', label: 'Chọn', ref: 'o1' }],
    });
    expect(render([stay], actions).match(/<button/g)).toHaveLength(1);
    expect(render([stay])).not.toContain('<button');
  });
  it('booking hiện tiêu đề, dòng và link đặt phòng', () => {
    const html = render([
      card({
        kind: 'booking',
        title: 'Chốt chuyến Đà Nẵng',
        lines: [{ label: 'Khách sạn đã chọn' }],
        actions: [
          { type: 'book', label: 'Đặt theo lộ trình', path: '/trip-builder', params: { hotelId: 'h1' } },
        ],
      }),
    ]);
    expect(html).toContain('Chốt chuyến Đà Nẵng');
    expect(html).toContain('Khách sạn đã chọn');
    expect(html).toContain('href="/hotels/h1"');
    expect(html).not.toContain('/trip-builder');
  });
});

describe('AI từ chối lượt chat thì hiện tin của app', () => {
  it('khách hết lượt thì mời đăng nhập', () => {
    const error = new AssistantError(429, {}, 'GUEST_LIMIT_REACHED', 60, true);
    expect(toRefusedReply(error)).toEqual({
      text: copy.assistant.guestLimit,
      isLocal: true,
      action: 'login',
    });
  });
  it('hỏi nhanh quá, đang đông, token hết hạn', () => {
    expect(toRefusedReply(new AssistantError(429, {}, 'RATE_LIMITED', 5, false))?.text).toBe(
      copy.assistant.rateLimited,
    );
    expect(toRefusedReply(new AssistantError(503, {}, 'CHAT_BUSY', 5, false))?.text).toBe(
      copy.assistant.busy,
    );
    expect(toRefusedReply(new HttpError(401, {}))?.action).toBe('login');
  });
  it('lỗi khác để khung chat hiện nút thử lại', () => {
    expect(toRefusedReply(new HttpError(503, {}))).toBeNull();
  });
});

it('đăng nhập xong quay về trang chủ hoặc Cảm hứng, vẫn chặn địa chỉ lạ', () => {
  expect(readSafeReturnTo('/')).toBe('/');
  expect(readSafeReturnTo('/inspiration?open=p1')).toBe('/inspiration?open=p1');
  expect(readSafeReturnTo('//evil.test')).toBe('/account');
  expect(readSafeReturnTo('/inspiration-evil')).toBe('/account');
});
