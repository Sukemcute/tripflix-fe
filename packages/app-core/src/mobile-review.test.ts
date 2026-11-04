import { describe, expect, it } from 'vitest';
import {
  calculateTripQuote,
  isValidTripDate,
  searchReviewTrips,
  shiftTripDate,
  validateReviewContact,
} from './mobile-review';

describe('mobile review booking', () => {
  it('quotes two guests and rounds rooms up for odd guest counts', () => {
    expect(calculateTripQuote({ guests: 2, hasFlight: true })).toMatchObject({ rooms: 1, total: 6_780_000 });
    expect(calculateTripQuote({ guests: 3, hasFlight: true })).toMatchObject({ rooms: 2, total: 11_660_000 });
  });
  it('removes flights from the entire quote', () => {
    expect(calculateTripQuote({ guests: 3, hasFlight: false })).toMatchObject({
      rooms: 2,
      flights: 0,
      total: 5_960_000,
    });
  });
  it.each([0, 9, 2.5, NaN])('rejects invalid guest count %s', (guests) => {
    expect(() => calculateTripQuote({ guests, hasFlight: true })).toThrow(RangeError);
  });
  it('rejects past and impossible dates and moves the itinerary across month boundaries', () => {
    expect(isValidTripDate('2026-11-04', '2026-11-04')).toBe(false);
    expect(isValidTripDate('2026-02-30', '2026-01-01')).toBe(false);
    expect(isValidTripDate('2026-11-20', '2026-11-04')).toBe(true);
    expect(shiftTripDate('2026-12-31', 2)).toBe('2027-01-02');
  });
  it('validates contact fields separately without accepting a missing consent', () => {
    expect(
      validateReviewContact({
        name: 'An',
        email: 'an@example.com',
        phone: '+84 901234567',
        hasConsent: true,
      }),
    ).toEqual({ name: true, email: true, phone: true, hasConsent: true });
    expect(validateReviewContact({ name: ' ', email: 'an@', phone: '123', hasConsent: false })).toEqual({
      name: false,
      email: false,
      phone: false,
      hasConsent: false,
    });
  });
});

describe('mobile review search', () => {
  it('matches Vietnamese guest and budget phrases', () => {
    expect(searchReviewTrips('Đi biển 2 người, dưới 4 triệu/người')).toMatchObject({
      guests: 2,
      budget: 4_000_000,
      hasResults: true,
    });
    expect(searchReviewTrips('Chỉ đặt khách sạn, dưới 2 triệu/người')).toMatchObject({
      hotelOnly: true,
      hasResults: true,
      perGuest: 1_490_000,
    });
  });
  it('never returns a fixture above the budget or for an unsupported destination', () => {
    expect(searchReviewTrips('Đi biển dưới 500k')).toMatchObject({ hasResults: false });
    expect(searchReviewTrips('Đi Đà Lạt dưới 4 triệu')).toMatchObject({ hasResults: false });
    expect(searchReviewTrips('')).toMatchObject({ hasResults: false });
  });
});
