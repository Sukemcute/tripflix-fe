import * as checkout from './generated/core-api/checkout/checkout';
import { hotelsControllerGetHotel } from './generated/core-api/hotels/hotels';
import * as gateway from './generated/core-api/mock-gateway/mock-gateway';
import { getVnpayCallbackControllerReturnUrl } from './generated/core-api/payments/payments';
import type {
  CheckoutRequestDto,
  HotelDetailDto,
  HotelsControllerGetHotelParams,
  PayRequestDto,
  SetGuestsRequestDto,
  StartVnpayRequestDto,
  TripPageDto,
  VnpayReturnResultDto,
} from './generated/core-api/model';
import { http, HttpError, type HttpResponse } from './http';
import { readEntity } from './response';

// Swagger currently gives the hotel stay and search result the same schema name.
export type CommerceHotel = Omit<HotelDetailDto, 'stay'> & {
  stay: { checkIn: string; checkOut: string; nights: number; adults: number };
};
export interface TestCard {
  number: string;
  label: string;
  outcome: string;
}

export function createOperation<Input, Output>(send: (input: Input, key: string) => Promise<Output>) {
  const attempts = new Map<string, { key: string; pending?: Promise<Output> }>();
  return (input: Input): Promise<Output> => {
    const fingerprint = JSON.stringify(input);
    let attempt = attempts.get(fingerprint);
    if (!attempt) {
      const key =
        globalThis.crypto?.randomUUID?.() ??
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
          const value = Math.floor(Math.random() * 16);
          return (char === 'x' ? value : (value & 3) | 8).toString(16);
        });
      attempt = { key };
      attempts.set(fingerprint, attempt);
    }
    if (attempt.pending) return attempt.pending;
    const current = attempt;
    current.pending = send(input, current.key)
      .catch((error: unknown) => {
        // Unknown transport/server results and in-progress 409s must replay the same operation.
        if (error instanceof HttpError && error.status < 500 && error.status !== 409)
          attempts.delete(fingerprint);
        throw error;
      })
      .finally(() => {
        current.pending = undefined;
      });
    return current.pending;
  };
}
const headers = (key: string) => ({ headers: { 'Idempotency-Key': key } });

export const commerceApi = {
  async getHotel(
    id: string,
    params: HotelsControllerGetHotelParams,
    signal?: AbortSignal,
  ): Promise<CommerceHotel> {
    const hotel = readEntity(
      (await hotelsControllerGetHotel(encodeURIComponent(id), params, { signal })).data,
      ['id', 'rooms', 'stay', 'calendar'],
    );
    const stay: unknown = hotel.stay;
    if (
      !stay ||
      typeof stay !== 'object' ||
      !('checkIn' in stay) ||
      typeof stay.checkIn !== 'string' ||
      !('checkOut' in stay) ||
      typeof stay.checkOut !== 'string' ||
      !('nights' in stay) ||
      typeof stay.nights !== 'number' ||
      !('adults' in stay) ||
      typeof stay.adults !== 'number' ||
      !Array.isArray(hotel.rooms)
    )
      throw new Error('Unexpected hotel response');
    return {
      ...hotel,
      stay: { checkIn: stay.checkIn, checkOut: stay.checkOut, nights: stay.nights, adults: stay.adults },
    };
  },
  async getCheckout(id: string, signal?: AbortSignal) {
    return readEntity((await checkout.checkoutControllerGet(encodeURIComponent(id), { signal })).data, [
      'orderId',
      'status',
      'holdExpiresAt',
      'total',
      'items',
      'policyVersion',
    ]);
  },
  async listTrips(cursor?: string, signal?: AbortSignal) {
    // Query parameters are not yet declared on this generated endpoint.
    const query = cursor ? `?${new URLSearchParams({ cursor })}` : '';
    const response = await http<HttpResponse<TripPageDto>>(
      `${checkout.getCheckoutControllerListUrl()}${query}`,
      { signal },
    );
    if (
      !response.data ||
      !Array.isArray(response.data.trips) ||
      (response.data.nextCursor !== null && typeof response.data.nextCursor !== 'string')
    )
      throw new Error('Unexpected trips response');
    return response.data;
  },
  async setGuests(id: string, body: SetGuestsRequestDto) {
    return (await checkout.checkoutControllerSetGuests(encodeURIComponent(id), body)).data;
  },
  async listTestCards(signal?: AbortSignal): Promise<TestCard[]> {
    const cards: unknown = (await gateway.mockGatewayControllerListTestCards({ signal })).data;
    if (
      !Array.isArray(cards) ||
      !cards.every(
        (card: unknown) =>
          card &&
          typeof card === 'object' &&
          'number' in card &&
          typeof card.number === 'string' &&
          'label' in card &&
          typeof card.label === 'string' &&
          'outcome' in card &&
          typeof card.outcome === 'string',
      )
    )
      throw new Error('Unexpected test cards');
    return cards as TestCard[];
  },
  async confirmVnpay(query: string) {
    const params = new URLSearchParams(query.replace(/^\?/, ''));
    if (!params.has('vnp_SecureHash')) throw new Error('Missing VNPay signature');
    return (
      await http<HttpResponse<VnpayReturnResultDto>>(`${getVnpayCallbackControllerReturnUrl()}?${params}`)
    ).data;
  },
};

export function createCheckoutOperation() {
  return createOperation(
    async (body: CheckoutRequestDto, key) =>
      (await checkout.checkoutControllerCreate(body, headers(key))).data,
  );
}
export function createCardPaymentOperation() {
  const tokens = new Map<string, string>();
  return createOperation(
    async (
      input: {
        id: string;
        cardNumber: string;
        expectedTotal: number;
        acceptedPolicyVersion: string;
        attempt?: number;
      },
      key,
    ) => {
      let paymentToken = tokens.get(key);
      if (!paymentToken) {
        paymentToken = (
          await gateway.mockGatewayControllerCreateToken({ cardNumber: input.cardNumber }, headers(key))
        ).data.paymentToken;
        tokens.set(key, paymentToken);
      }
      const body: PayRequestDto = {
        paymentToken,
        expectedTotal: input.expectedTotal,
        acceptedPolicyVersion: input.acceptedPolicyVersion,
      };
      return (await checkout.checkoutControllerPay(encodeURIComponent(input.id), body, headers(key))).data;
    },
  );
}
export function createOtpOperation() {
  return createOperation(
    async (input: { id: string; challengeId: string; otp: string }, key) =>
      (
        await checkout.checkoutControllerConfirm3ds(
          encodeURIComponent(input.id),
          { challengeId: input.challengeId, otp: input.otp },
          headers(key),
        )
      ).data,
  );
}
export function createVnpayOperation() {
  return createOperation(
    async (input: { id: string; body: StartVnpayRequestDto; attempt: number }, key) =>
      (await checkout.vnpayCheckoutControllerStart(encodeURIComponent(input.id), input.body, headers(key)))
        .data,
  );
}
