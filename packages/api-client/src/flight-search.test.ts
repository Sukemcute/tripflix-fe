import { describe, expect, it } from 'vitest';
import type { FlightOfferDto } from './generated/core-api/model';
import {
  buildFlightCheckout,
  groupFlightOffers,
  groupFlightRoutes,
  parseFlightSearch,
} from './flight-search';

const route = { fromAirport: 'HAN', toAirport: 'CXR', flightCount: 3 };
const draft = { from: ' han ', to: 'cxr', date: '2026-11-06', passengers: '2' };
const today = '2026-11-06';

describe('flight search', () => {
  it('groups duplicate destination records by airport pair, sums flight counts and keeps each origin separate', () => {
    expect(
      groupFlightRoutes([
        { ...route, destinationSlug: 'khanh-hoa', destinationName: 'Khánh Hòa' },
        { ...route, destinationSlug: 'nha-trang', destinationName: 'Nha Trang' },
        { ...route, fromAirport: 'SGN', destinationSlug: 'nha-trang', destinationName: 'Nha Trang' },
      ]),
    ).toEqual([
      { airport: 'HAN', destinations: [{ code: 'CXR', name: 'Khánh Hòa / Nha Trang', flightCount: 6 }] },
      { airport: 'SGN', destinations: [{ code: 'CXR', name: 'Nha Trang', flightCount: 3 }] },
    ]);
  });

  it('groups non-adjacent cabin offers while preserving API order', () => {
    const offer = (flightKey: string, productId: string, isAvailable: boolean): FlightOfferDto => ({
      ...route,
      flightKey,
      productId,
      isAvailable,
      name: flightKey,
      airline: null,
      airlineCode: null,
      flightNumber: null,
      durationMinutes: null,
      stops: 0,
      cabinCode: null,
      isPriceTaxIncluded: true,
      cabinName: productId,
      departTime: null,
      arriveTime: null,
      destination: { slug: 'nha-trang', name: 'Nha Trang' },
      reason: isAvailable ? null : 'SOLD_OUT',
      remaining: null,
      priceFrom: null,
      fares: [],
    });
    const firstCabin = offer('A', 'A-Y', true);
    const secondFlight = offer('B', 'B-Y', true);
    const soldOutCabin = offer('A', 'A-C', false);
    expect(groupFlightOffers([firstCabin, secondFlight, soldOutCabin])).toEqual([
      [firstCabin, soldOutCabin],
      [secondFlight],
    ]);
  });

  it('keeps a known sort and drops an unknown one', () => {
    expect(parseFlightSearch({ ...draft, sort: 'price' }, today)).toEqual({
      from: 'HAN',
      to: 'CXR',
      date: today,
      passengers: 2,
      sort: 'price',
    });
    expect(parseFlightSearch({ ...draft, sort: 'cheapest' }, today)).toEqual({
      from: 'HAN',
      to: 'CXR',
      date: today,
      passengers: 2,
    });
  });

  it('builds a flight-only checkout using the selected cabin, fare and passenger count', () => {
    const search = parseFlightSearch(draft, today);
    expect(search).toEqual({ from: 'HAN', to: 'CXR', date: today, passengers: 2 });
    expect(buildFlightCheckout(search!, 'flight-cabin', 'FLEX')).toEqual({
      adults: 2,
      items: [{ productId: 'flight-cabin', checkIn: today, ratePlanCode: 'FLEX' }],
    });
  });

  it.each([
    { to: 'HAN' },
    { date: '2026-11-05' },
    { date: '2027-02-30' },
    { passengers: '0' },
    { passengers: '10' },
  ])('rejects invalid form values %j', (invalid) => {
    expect(parseFlightSearch({ ...draft, ...invalid }, today)).toBeNull();
  });
});
