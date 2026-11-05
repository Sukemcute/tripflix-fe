import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  commerceApi,
  createCardPaymentOperation,
  createCheckoutOperation,
  createOtpOperation,
  createVnpayOperation,
} from './commerce';
import { configureHttp } from './http';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const draft = {
  adults: 2,
  items: [{ productId: 'room-1', checkIn: '2026-12-01', checkOut: '2026-12-03', qty: 1, ratePlanCode: 'RO' }],
};
const card = {
  id: 'order-1',
  cardNumber: 'test-card',
  expectedTotal: 2280000,
  acceptedPolicyVersion: '2026-11-03',
};
const key = (options?: RequestInit) => new Headers(options?.headers).get('idempotency-key');
beforeEach(() => configureHttp({ baseUrl: 'https://gateway.example', getAccessToken: () => 'access-token' }));
afterEach(() => vi.restoreAllMocks());

describe('commerce operations', () => {
  it('reuses the UUID and exact checkout body after a lost response (201 replay)', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(json({ orderId: 'held' }, 201));
    const create = createCheckoutOperation();
    await expect(create(draft)).rejects.toThrow();
    expect(await create(draft)).toEqual({ orderId: 'held' });
    const first = fetch.mock.calls[0]![1];
    const second = fetch.mock.calls[1]![1];
    expect(key(first)).toMatch(/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/);
    expect(key(second)).toBe(key(first));
    expect(second?.body).toBe(first?.body);
    expect(new Headers(second?.headers).get('authorization')).toBe('Bearer access-token');
  });

  it('deduplicates simultaneous taps and uses a new key when selection changes', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => json({ orderId: 'held' }, 201));
    const create = createCheckoutOperation();
    await Promise.all([create(draft), create(draft)]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await create({ ...draft, adults: 3 });
    expect(key(fetch.mock.calls[1]![1])).not.toBe(key(fetch.mock.calls[0]![1]));
  });

  it('retains the payment token and UUID after network failure, without tokenizing again', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ paymentToken: 'tok_same' }))
      .mockRejectedValueOnce(new TypeError('lost pay response'))
      .mockResolvedValueOnce(json({ outcome: 'paid', orderId: card.id }));
    const pay = createCardPaymentOperation();
    await expect(pay(card)).rejects.toThrow();
    expect((await pay(card)).outcome).toBe('paid');
    expect(fetch).toHaveBeenCalledTimes(3);
    const requests = fetch.mock.calls.slice(1).map(([, init]) => init);
    expect(key(requests[0])).toBe(key(requests[1]));
    expect(requests[0]?.body).toBe(requests[1]?.body);
    expect(JSON.parse(String(requests[1]?.body))).toEqual({
      paymentToken: 'tok_same',
      expectedTotal: 2280000,
      acceptedPolicyVersion: '2026-11-03',
    });
  });

  it('keeps an in-progress 409 operation, but allows a fresh attempt after a definitive decline', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ paymentToken: 'tok_1' }))
      .mockResolvedValueOnce(json({ message: 'processing' }, 409))
      .mockResolvedValueOnce(json({ message: 'declined' }, 402))
      .mockResolvedValueOnce(json({ paymentToken: 'tok_2' }))
      .mockResolvedValueOnce(json({ outcome: 'paid', orderId: card.id }));
    const pay = createCardPaymentOperation();
    await expect(pay(card)).rejects.toMatchObject({ status: 409 });
    await expect(pay(card)).rejects.toMatchObject({ status: 402 });
    await pay(card);
    expect(key(fetch.mock.calls[1]![1])).toBe(key(fetch.mock.calls[2]![1]));
    expect(key(fetch.mock.calls[4]![1])).not.toBe(key(fetch.mock.calls[1]![1]));
  });

  it('preserves requires_action and 202 pending rather than treating them as paid', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ paymentToken: 'tok_3ds' }))
      .mockResolvedValueOnce(json({ outcome: 'requires_action', orderId: card.id, challengeId: 'challenge' }))
      .mockResolvedValueOnce(json({ outcome: 'pending', orderId: card.id, message: 'reconciling' }, 202));
    expect((await createCardPaymentOperation()(card)).outcome).toBe('requires_action');
    const result = await createOtpOperation()({ id: card.id, challengeId: 'challenge', otp: '123456' });
    expect(result).toMatchObject({ outcome: 'pending', message: 'reconciling' });
    expect(fetch.mock.calls[2]![0]).toContain('/3ds');
    expect(key(fetch.mock.calls[2]![1])).toBeTruthy();
  });

  it('changes payment key after accepting a changed total', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ paymentToken: 'tok_old' }))
      .mockResolvedValueOnce(json({ reason: 'PRICE_CHANGED', newTotal: 3000000 }, 409))
      .mockResolvedValueOnce(json({ paymentToken: 'tok_new' }))
      .mockResolvedValueOnce(json({ outcome: 'paid' }));
    const pay = createCardPaymentOperation();
    await expect(pay(card)).rejects.toMatchObject({ body: { reason: 'PRICE_CHANGED' } });
    await pay({ ...card, expectedTotal: 3000000 });
    expect(key(fetch.mock.calls[3]![1])).not.toBe(key(fetch.mock.calls[1]![1]));
    expect(JSON.parse(String(fetch.mock.calls[3]![1]?.body)).expectedTotal).toBe(3000000);
  });

  it('replays a VNPay transport retry but creates a new operation for an abandoned browser session', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('network'))
      .mockImplementation(async () =>
        json({ paymentUrl: 'https://sandbox.example/pay', expiresAt: '2026-12-01T00:30:00Z' }),
      );
    const start = createVnpayOperation();
    const input = {
      id: card.id,
      body: { expectedTotal: card.expectedTotal, acceptedPolicyVersion: card.acceptedPolicyVersion },
      attempt: 0,
    };
    await expect(start(input)).rejects.toThrow();
    await start(input);
    await start({ ...input, attempt: 1 });
    expect(key(fetch.mock.calls[0]![1])).toBe(key(fetch.mock.calls[1]![1]));
    expect(key(fetch.mock.calls[2]![1])).not.toBe(key(fetch.mock.calls[1]![1]));
  });
});

describe('commerce contract adapters', () => {
  it('sends all hotel filters, accepts the real stay shape and retains real inventory', async () => {
    const hotel = {
      id: 'hotel/1',
      rooms: [{ remaining: 27, reason: null }],
      calendar: [],
      stay: { checkIn: '2026-12-01', checkOut: '2026-12-03', nights: 2, adults: 3 },
    };
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(hotel));
    const result = await commerceApi.getHotel('hotel/1', {
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      adults: 3,
    });
    expect(result.stay).toEqual(hotel.stay);
    expect(result.rooms[0]?.remaining).toBe(27);
    const url = new URL(String(fetch.mock.calls[0]![0]));
    expect(url.pathname).toBe('/api/hotels/hotel%2F1');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      adults: '3',
    });
  });

  it('forwards opaque trip cursors and reads trips instead of items', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ trips: [], nextCursor: null }));
    expect(await commerceApi.listTrips('a+/=b')).toEqual({ trips: [], nextCursor: null });
    expect(new URL(String(fetch.mock.calls[0]![0])).searchParams.get('cursor')).toBe('a+/=b');
  });

  it('preserves every VNPay parameter and does not promote a valid signature to success', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ orderId: null, isValidSignature: true, isSuccess: false }));
    const query = 'vnp_SecureHash=hash&vnp_ResponseCode=24&vnp_OrderInfo=hello%20world&vnp_Amount=10000';
    expect(await commerceApi.confirmVnpay(query)).toMatchObject({ isSuccess: false });
    expect(Object.fromEntries(new URL(String(fetch.mock.calls[0]![0])).searchParams)).toEqual(
      Object.fromEntries(new URLSearchParams(query)),
    );
  });

  it('rejects malformed test-card responses and accepts the real card list', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ items: [] }))
      .mockResolvedValueOnce(json([{ number: 'test', label: 'OTP', outcome: 'requires_action' }]));
    await expect(commerceApi.listTestCards()).rejects.toThrow('Unexpected test cards');
    expect(await commerceApi.listTestCards()).toEqual([
      { number: 'test', label: 'OTP', outcome: 'requires_action' },
    ]);
  });
});
