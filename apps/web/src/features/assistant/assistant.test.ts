import { AssistantError, HttpError, type AssistantCard } from '@tripflix/api-client';
import { vi as copy } from '@tripflix/i18n';
import { describe, expect, it } from 'vitest';
import { readSafeReturnTo } from '../auth/auth-return';
import { getAssistantCardHref } from './assistant-card-href';
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

describe('AI từ chối lượt chat thì hiện tin của app', () => {
  it('khách hết lượt thì mời đăng nhập', () => {
    const error = new AssistantError(429, {}, 'GUEST_LIMIT_REACHED', 60, true);
    expect(toRefusedReply(error)).toEqual({ text: copy.assistant.guestLimit, isLocal: true, action: 'login' });
  });
  it('hỏi nhanh quá, đang đông, token hết hạn', () => {
    expect(toRefusedReply(new AssistantError(429, {}, 'RATE_LIMITED', 5, false))?.text).toBe(
      copy.assistant.rateLimited,
    );
    expect(toRefusedReply(new AssistantError(503, {}, 'CHAT_BUSY', 5, false))?.text).toBe(copy.assistant.busy);
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
