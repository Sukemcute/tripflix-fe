import { describe, expect, it } from 'vitest';
import { readTripBuilderSeed } from './trip-builder-seed';

const today = '2026-11-18';
const params = {
  destination: 'Đà Nẵng',
  adults: '2',
  startDate: '2026-11-21',
  days: '3',
  hotelId: 'h1',
  hotelName: 'Khách sạn A',
  checkIn: '2026-11-21',
  nights: '2',
  flightFrom: 'SGN',
  flightTo: 'DAD',
  flightDate: '2026-11-21',
};

describe('readTripBuilderSeed', () => {
  it('seeds the existing hotel and flight drafts without bookable items or prices', () => {
    expect(readTripBuilderSeed(params, today)).toEqual({
      destination: { destinationName: 'Đà Nẵng', destinationPlaceId: '' },
      adults: 2,
      dayCount: 3,
      startDate: '2026-11-21',
      hotel: { hotelId: 'h1', hotelName: 'Khách sạn A', checkIn: '2026-11-21', nights: 2 },
      flight: { from: 'SGN', to: 'DAD', date: '2026-11-21' },
    });
  });

  it('ignores prices and room/fare identities even if someone puts them in the URL', () => {
    expect(
      readTripBuilderSeed(
        {
          ...params,
          totalPrice: '1',
          productId: 'room',
          ratePlanCode: 'ECO',
          fareCode: 'ECO',
          roomId: 'room',
        },
        today,
      ),
    ).toEqual(readTripBuilderSeed(params, today));
  });

  it.each([{}, { totalPrice: '1', productId: 'room' }, { destination: ['Đà Nẵng'], adults: ['2'] }])(
    'returns no seed for ordinary navigation or unrecognized parameters %#',
    (value) => {
      expect(readTripBuilderSeed(value, today)).toBeNull();
    },
  );

  it('keeps the flight-only draft and uses its date when no startDate is given', () => {
    const seed = readTripBuilderSeed(
      { destination: 'Đà Nẵng', flightFrom: 'SGN', flightTo: 'DAD', flightDate: '2026-11-21' },
      today,
    );
    expect(seed?.startDate).toBe('2026-11-21');
    expect(seed?.flight?.from).toBe('SGN');
    expect(seed?.hotel).toBeUndefined();
  });

  it('keeps the hotel-only draft without inventing a flight', () => {
    const seed = readTripBuilderSeed(
      { destination: 'Đà Nẵng', hotelId: 'h1', checkIn: '2026-11-21', nights: '2' },
      today,
    );
    expect(seed?.hotel?.nights).toBe(2);
    expect(seed?.startDate).toBe('2026-11-21');
    expect(seed?.flight).toBeUndefined();
  });

  it.each(['2026-02-30', '2026-11-17', 'not-a-date'])('rejects invalid or past draft dates: %s', (day) => {
    const seed = readTripBuilderSeed({ ...params, checkIn: day, flightDate: day, startDate: day }, today);
    expect(seed?.hotel).toBeUndefined();
    expect(seed?.flight).toBeUndefined();
    expect(seed?.startDate).toBeUndefined();
  });

  it('accepts today and drops incomplete parts and invalid guest/day counts', () => {
    const seed = readTripBuilderSeed(
      {
        destination: 'Đà Nẵng',
        startDate: today,
        adults: '99',
        days: '-1',
        hotelId: 'h1',
        nights: '0',
        flightFrom: 'SGN',
        flightTo: 'SGN',
        flightDate: today,
      },
      today,
    );
    expect(seed).toMatchObject({ adults: 2, dayCount: 0, startDate: today });
    expect(seed?.hotel).toBeUndefined();
    expect(seed?.flight).toBeUndefined();
  });

  it('seeds the return flight only when it goes back to the origin on or after the outbound day', () => {
    const back = { returnFrom: 'DAD', returnTo: 'SGN', returnDate: '2026-11-23' };
    expect(readTripBuilderSeed({ ...params, ...back }, today)?.returnFlight).toEqual({
      from: 'DAD',
      to: 'SGN',
      date: '2026-11-23',
    });
    expect(readTripBuilderSeed({ ...params, ...back, returnTo: 'HAN' }, today)?.returnFlight).toBeUndefined();
    expect(readTripBuilderSeed({ ...params, ...back, returnDate: '2026-11-20' }, today)?.returnFlight).toBeUndefined();
    const { flightFrom: _from, ...noOutbound } = params;
    expect(readTripBuilderSeed({ ...noOutbound, ...back }, today)?.returnFlight).toBeUndefined();
  });
});
